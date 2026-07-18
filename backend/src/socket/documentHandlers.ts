import { Server, Socket } from 'socket.io';
import * as Y from 'yjs';
import { logger } from '../config/logger.js';
import { getDocumentForUser } from '../services/document.services.js';
import { canAccessDocument } from '../models/document.js';
import { getOrLoadDoc, schedulePersist, evictIfIdle, recordClientAttribution } from './yjsDocManager.js';
import { attachAwareness, detachAwareness } from './awarenessHandlers.js';
import { logDocumentUpdate } from '../services/history.service.js';

export function roomName(documentId: string) {
  return `doc:${documentId}`;
}

/**
 * Socket.io event handlers have no equivalent of Express's global error
 * handler — there's no `next(err)` to forward a rejected Promise to. Left
 * alone, a thrown error inside an `async (data) => {...}` handler becomes
 * an unhandled rejection: it's logged by Node but the client never hears
 * back anything at all, and just silently gets nothing.
 *
 * This wraps a handler so any thrown/rejected error becomes an explicit
 * `error` event emitted back to that one socket — the closest equivalent
 * to the asyncHandler + errorHandler pattern we use on the REST side.
 */
function safeHandler<T>(socket: Socket, handler: (data: T) => Promise<void>) {
  return (data: T) => {
    handler(data).catch((err) => {
      logger.warn({ socketId: socket.id, err }, '[socket] handler error');
      socket.emit('error', { message: err instanceof Error ? err.message : 'Unknown error' });
    });
  };
}

export function registerDocumentHandlers(io: Server, socket: Socket) {
  socket.on(
    'join-document',
    safeHandler(socket, async (documentId: string) => {
      if (typeof documentId !== 'string' || !documentId) return;

      // Real permission check — reuses the exact same logic the REST API
      // uses, so "can this user see this document" has one single answer
      // regardless of whether it's asked over HTTP or a socket.
      await getDocumentForUser(documentId, socket.data.userId);

      socket.join(roomName(documentId));
      socket.data.currentDocumentId = documentId;
      logger.info(
        { socketId: socket.id, userId: socket.data.userId, room: roomName(documentId) },
        '[socket] joined room'
      );

      // Initial sync: send the newly-joined client the FULL current state
      // as one Yjs update, so their local Y.Doc catches up instantly to
      // wherever the document currently stands — rather than waiting to
      // receive only future incremental edits from this point forward.
      const doc = await getOrLoadDoc(documentId);
      const fullState = Y.encodeStateAsUpdate(doc);
      socket.emit('yjs-sync', Array.from(fullState));

      attachAwareness(io, socket, documentId);

      socket.to(roomName(documentId)).emit('collaborator-joined', {
        socketId: socket.id,
        userId: socket.data.userId,
      });
    })
  );

  socket.on(
    'yjs-update',
    safeHandler(socket, async ({ documentId, update }: { documentId: string; update: number[] }) => {
      if (typeof documentId !== 'string' || !Array.isArray(update)) return;

      const doc = await getDocumentForUser(documentId, socket.data.userId);
      if (!canAccessDocument(doc, socket.data.userId, 'editor')) {
        throw new Error('You do not have edit access to this document');
      }

      const yDoc = await getOrLoadDoc(documentId);
      const updateBytes = Uint8Array.from(update);

      // Apply to the server's authoritative in-memory copy first...
      Y.applyUpdate(yDoc, updateBytes);

      const { structs } = Y.decodeUpdate(updateBytes);
      const clientIds = new Set(structs.map((s) => s.id.client));
      for (const clientId of clientIds) {
        recordClientAttribution(documentId, clientId, socket.data.userId);
      }

      // ...then relay the SAME update to every other socket in the room.
      // We forward the raw update rather than re-encoding the whole doc —
      // it's already the minimal diff, and every client's own Y.Doc merges
      // it via the same CRDT rules regardless of who applied it first.
      socket.to(roomName(documentId)).emit('yjs-update', { update });

      schedulePersist(documentId);
      
      logDocumentUpdate(documentId, socket.data.userId, updateBytes).catch((err) => {
        logger.error({ err, documentId }, '[history] failed to log update');
      });
    })
  );

  socket.on(
    'leave-document',
    safeHandler(socket, async (documentId: string) => {
      if (typeof documentId !== 'string' || !documentId) return;

      socket.leave(roomName(documentId));
      detachAwareness(documentId, socket);
      socket.to(roomName(documentId)).emit('collaborator-left', {
        socketId: socket.id,
        userId: socket.data.userId,
      });

      const room = io.sockets.adapter.rooms.get(roomName(documentId));
      await evictIfIdle(documentId, room?.size ?? 0);
    })
  );

  socket.on('disconnect', async () => {
    const documentId = socket.data.currentDocumentId;
    if (!documentId) return;

    detachAwareness(documentId, socket);

    socket.to(roomName(documentId)).emit('collaborator-left', {
      socketId: socket.id,
      userId: socket.data.userId,
    });

    const room = io.sockets.adapter.rooms.get(roomName(documentId));
    await evictIfIdle(documentId, room?.size ?? 0).catch((err) => {
      logger.error({ err, documentId }, '[socket] evictIfIdle on disconnect failed');
    });
  });
}