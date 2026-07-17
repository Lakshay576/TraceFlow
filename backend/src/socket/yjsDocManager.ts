import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness.js';
import { DocumentModel } from '../models/document.js';
import { logger } from '../config/logger.js';

/**
 * THIS FILE is the direct answer to the "multi-instance CRDT" gap we
 * flagged early in planning: the Redis adapter makes Socket.io ROOMS
 * span multiple server instances, but it does NOT relocate the live
 * Y.Doc object itself. Each server instance that has a socket connected
 * to a given document independently loads/holds its own Y.Doc here, in
 * this process's memory.
 *
 * That's fine for correctness (Yjs updates are CRDT — applying the same
 * update on two different in-memory Y.Docs converges to the same state
 * either way, and Redis makes sure every instance's copy of a room DOES
 * receive every update). But it means: if you had 100 different active
 * documents split across 2 server instances, that's still 100 Y.Docs
 * held somewhere in memory total, just possibly split unevenly — there's
 * no single "the" copy. A production system at real scale would need a
 * dedicated stateful service (or sticky routing per document) instead of
 * "any instance can independently reconstruct any document." Worth
 * saying exactly this, unprompted, in an interview.
 */

interface ActiveDoc {
  doc: Y.Doc;
  awareness: Awareness;
  lastAccessed: number;
  saveTimeout: NodeJS.Timeout | null;
  clientAttributions: Map<number, string>;
}

const activeDocuments = new Map<string, ActiveDoc>();

const DEBOUNCE_MS = 3000;

/**
 * Returns the in-memory Y.Doc for a document, loading it from MongoDB's
 * stored `yjsState` if this is the first time any socket on THIS process
 * has touched it. Subsequent calls for the same documentId are instant
 * (just a Map lookup) as long as the doc stays "active".
 */
export async function getOrLoadDoc(documentId: string): Promise<Y.Doc> {
  const existing = activeDocuments.get(documentId);
  if (existing) {
    existing.lastAccessed = Date.now();
    return existing.doc;
  }

  const doc = new Y.Doc();
  const awareness = new Awareness(doc);

  const record = await DocumentModel.findById(documentId).select('yjsState clientAttributions');

if (record?.yjsState) {
  Y.applyUpdate(doc, record.yjsState);
}

const clientAttributions = new Map<number, string>();
for (const entry of record?.clientAttributions ?? []) {
  clientAttributions.set(entry.clientId, entry.userId.toString());
}

  activeDocuments.set(documentId, {
  doc,
  awareness,
  lastAccessed: Date.now(),
  saveTimeout: null,
  clientAttributions,
});

  logger.info({ documentId }, '[yjs] document loaded into memory');
  return doc;
}

export function recordClientAttribution(documentId: string, clientId: number, userId: string): void {
  const active = activeDocuments.get(documentId);
  if (!active) return;

  if (!active.clientAttributions.has(clientId)) {
    active.clientAttributions.set(clientId, userId);
  }
}

export function getClientAttributions(documentId: string): Map<number, string> | undefined {
  return activeDocuments.get(documentId)?.clientAttributions;
}

/**
 * Awareness is intentionally NEVER persisted to MongoDB — it's ephemeral
 * by design (who's currently online, where their cursor is). Unlike
 * document content, losing it on a server restart is completely fine;
 * clients just re-announce their presence on reconnect. This is the
 * concrete version of the "ephemeral vs. persistent state" distinction
 * from the project plan.
 */
export function getAwareness(documentId: string): Awareness | undefined {
  return activeDocuments.get(documentId)?.awareness;
}

/**
 * Debounced persistence: instead of writing to Mongo on every single
 * keystroke-sized update (which would hammer the DB under real editing
 * load), we reset a timer on every update and only actually persist once
 * DEBOUNCE_MS has passed with no further edits. Tradeoff: if the process
 * crashes inside that window, up to DEBOUNCE_MS of edits since the last
 * save are lost from durable storage (though still safely merged in any
 * other connected client's in-memory Y.Doc, since Yjs updates already
 * reached them directly via the room broadcast — this only risks the
 * DURABLE copy, not what collaborators currently see).
 */
export function schedulePersist(documentId: string): void {
  const active = activeDocuments.get(documentId);
  if (!active) return;

  if (active.saveTimeout) clearTimeout(active.saveTimeout);

  active.saveTimeout = setTimeout(() => {
    persistNow(documentId).catch((err) => {
      logger.error({ err, documentId }, '[yjs] debounced persist failed');
    });
  }, DEBOUNCE_MS);
}

export async function persistNow(documentId: string): Promise<void> {
  const active = activeDocuments.get(documentId);
  if (!active) return;

  const state = Y.encodeStateAsUpdate(active.doc);
  const attributionsArray = Array.from(active.clientAttributions.entries()).map(
    ([clientId, userId]) => ({ clientId, userId })
  );

  await DocumentModel.findByIdAndUpdate(documentId, {
    yjsState: Buffer.from(state),
    clientAttributions: attributionsArray,
  });

  logger.info(
    { documentId, bytes: state.byteLength, attributedClients: attributionsArray.length },
    '[yjs] persisted state to MongoDB'
  );
}

/**
 * Called when the last socket leaves a document's room, to eventually
 * free memory for documents nobody is actively editing. Flushes any
 * pending debounced write immediately rather than losing it, then evicts
 * from the map — the next join() will simply reload from Mongo.
 */
export async function evictIfIdle(documentId: string, activeSocketCount: number): Promise<void> {
  if (activeSocketCount > 0) return;

  const active = activeDocuments.get(documentId);
  if (!active) return;

  if (active.saveTimeout) clearTimeout(active.saveTimeout);
  await persistNow(documentId);

  active.awareness.destroy();
  activeDocuments.delete(documentId);
  logger.info({ documentId }, '[yjs] document evicted from memory (idle)');
}