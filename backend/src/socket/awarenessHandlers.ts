import { Server, Socket } from 'socket.io';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness.js';
import { logger } from '../config/logger.js';
import { getAwareness } from './yjsDocManager.js';
import { roomName } from './documentHandlers.js';

/**
 * Why this is a separate file from documentHandlers.ts, not just more
 * code in the same one: presence/awareness and document content are
 * handled by completely different Yjs mechanisms (Awareness vs. Y.Doc
 * updates), have different durability guarantees (never persisted vs.
 * always persisted), and different consistency requirements (best-effort,
 * "last write wins per client" is fine for a cursor position; it would
 * NOT be fine for document text). Keeping the code physically separate
 * mirrors that conceptual separation — useful both for maintainability
 * and as a clean thing to point to in an interview.
 */

// Ensures the room-wide awareness broadcast listener is registered only
// ONCE per document, no matter how many sockets join it — otherwise every
// additional joiner would add another duplicate broadcast listener,
// causing the same update to be sent multiple times per change.
const broadcastRegistered = new Set<string>();

function ensureBroadcastListener(io: Server, documentId: string, awareness: Awareness) {
  if (broadcastRegistered.has(documentId)) return;
  broadcastRegistered.add(documentId);

  awareness.on(
    'update',
    ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
      const changedClients = added.concat(updated, removed);
      const update = encodeAwarenessUpdate(awareness, changedClients);

      // If the change originated from a specific socket, exclude that
      // socket from the broadcast (it already has its own latest state —
      // no need to echo it back). Otherwise (e.g. server-initiated
      // removal on disconnect) broadcast to the whole room.
      const originSocket = origin as Socket | null;
      if (originSocket?.to) {
        originSocket.to(roomName(documentId)).emit('awareness-update', { update: Array.from(update) });
      } else {
        io.to(roomName(documentId)).emit('awareness-update', { update: Array.from(update) });
      }
    }
  );
}

/**
 * Called once a socket has successfully joined a document's room (from
 * documentHandlers.ts), after the yjs-sync has already been sent. Sends
 * this newly-joined client everyone's CURRENT presence state, and starts
 * tracking which awareness client IDs this socket is responsible for.
 */
export function attachAwareness(io: Server, socket: Socket, documentId: string) {
  const awareness = getAwareness(documentId);
  if (!awareness) return;

  ensureBroadcastListener(io, documentId, awareness);

  // Initial presence sync: send every currently-known state to the new
  // joiner, so they immediately see who else is here — mirrors the
  // yjs-sync pattern used for document content.
  const existingClientIds = Array.from(awareness.getStates().keys());
  if (existingClientIds.length > 0) {
    const initialUpdate = encodeAwarenessUpdate(awareness, existingClientIds);
    socket.emit('awareness-sync', Array.from(initialUpdate));
  }

  socket.data.awarenessClientIds = new Set<number>();

  const ownershipTracker = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => {
    if (origin !== socket) return;
    for (const id of [...added, ...updated]) socket.data.awarenessClientIds!.add(id);
    for (const id of removed) socket.data.awarenessClientIds!.delete(id);
  };

  awareness.on('update', ownershipTracker);
  socket.data.awarenessCleanup = () => awareness.off('update', ownershipTracker);
}

/**
 * Removes every awareness state this socket owned (e.g. its cursor),
 * and unregisters its ownership-tracking listener. Called on both
 * explicit leave-document and on disconnect.
 */
export function detachAwareness(documentId: string, socket: Socket) {
  const awareness = getAwareness(documentId);
  socket.data.awarenessCleanup?.();
  socket.data.awarenessCleanup = undefined;

  if (!awareness || !socket.data.awarenessClientIds?.size) return;

  removeAwarenessStates(awareness, Array.from(socket.data.awarenessClientIds), null);
  socket.data.awarenessClientIds.clear();
}

export function registerAwarenessHandlers(_io: Server, socket: Socket) {
  socket.on('awareness-update', ({ documentId, update }: { documentId: string; update: number[] }) => {
    if (typeof documentId !== 'string' || !Array.isArray(update)) return;

    const awareness = getAwareness(documentId);
    if (!awareness) return;

    try {
      applyAwarenessUpdate(awareness, Uint8Array.from(update), socket);
    } catch (err) {
      logger.warn({ socketId: socket.id, err }, '[awareness] failed to apply update');
    }
  });
}