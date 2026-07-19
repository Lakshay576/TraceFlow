'use client';

import { io, Socket } from 'socket.io-client';
import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness.js';
import { getToken } from '../auth/session';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class SocketYjsProvider {
  public readonly doc: Y.Doc;
  public readonly awareness: Awareness;
  private socket: Socket;
  private documentId: string;
  private isSynced = false;
  private onSyncCallbacks: (() => void)[] = [];

  constructor(documentId: string) {
    this.documentId = documentId;
    this.doc = new Y.Doc();
    this.awareness = new Awareness(this.doc);

    this.socket = io(SOCKET_URL, {
      auth: { token: getToken() },
    });

    this.registerHandlers();
  }

  private registerHandlers() {
    this.socket.on('connect', () => {
      this.socket.emit('join-document', this.documentId);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[yjs-provider] connection rejected:', err.message);
    });

    this.socket.on('error', (err: { message: string }) => {
      console.error('[yjs-provider] server error:', err.message);
    });

    this.socket.on('yjs-sync', (fullState: number[]) => {
      Y.applyUpdate(this.doc, Uint8Array.from(fullState), this);
      this.isSynced = true;
      this.onSyncCallbacks.forEach((cb) => cb());
      this.onSyncCallbacks = [];
    });

    this.socket.on('yjs-update', ({ update }: { update: number[] }) => {
      Y.applyUpdate(this.doc, Uint8Array.from(update), this);
    });

    this.socket.on('awareness-sync', (update: number[]) => {
      applyAwarenessUpdate(this.awareness, Uint8Array.from(update), 'remote');
    });
    this.socket.on('awareness-update', ({ update }: { update: number[] }) => {
      applyAwarenessUpdate(this.awareness, Uint8Array.from(update), 'remote');
    });

    this.doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === this) return;
      this.socket.emit('yjs-update', {
        documentId: this.documentId,
        update: Array.from(update),
      });
    });

    this.awareness.on(
      'update',
      (
        { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown
      ) => {
        if (origin !== 'local') return;
        const changedClients = added.concat(updated, removed);
        const update = encodeAwarenessUpdate(this.awareness, changedClients);
        this.socket.emit('awareness-update', {
          documentId: this.documentId,
          update: Array.from(update),
        });
      }
    );
  }

  onceSynced(callback: () => void) {
    if (this.isSynced) callback();
    else this.onSyncCallbacks.push(callback);
  }

  destroy() {
    this.socket.emit('leave-document', this.documentId);
    this.socket.disconnect();
    this.awareness.destroy();
    this.doc.destroy();
  }
}