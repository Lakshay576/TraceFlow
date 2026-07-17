import { io } from 'socket.io-client';
import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness.js';

const SERVER_URL = 'http://localhost:4000';
const TOKEN_A = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTUzNWU5Mjk2NGJkYzhlMWQ3NzVlNmQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3ODM4NjM3MDksImV4cCI6MTc4NDQ2ODUwOX0.UFPt70S2sK8_G7yIZERcQ6w2ur_b9HVaTbzv1oVX05Y';
const TOKEN_B = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTUzOTdkMjE1NDhiNmVhZDY4ZTJmOTgiLCJlbWFpbCI6InRlc3QxQGV4YW1wbGUuY29tIiwiaWF0IjoxNzgzODYzMjUwLCJleHAiOjE3ODQ0NjgwNTB9.qmbbdnVgJ_EjZhIyOnkGwvN-iH_64mPPO808Y27cN0Y';
const DOCUMENT_ID = '6a53938f1793bcbd5eda3836';

function connect(token: string, label: string, name: string, color: string) {
  const socket = io(SERVER_URL, { auth: { token } });
  const yDoc = new Y.Doc();
  const awareness = new Awareness(yDoc);

  socket.on('connect', () => {
    console.log(`[${label}] connected, socket id: ${socket.id}`);
    socket.emit('join-document', DOCUMENT_ID);
  });

  socket.on('connect_error', (err) => {
    console.error(`[${label}] connection rejected:`, err.message);
  });

  socket.on('error', (err) => {
    console.error(`[${label}] server error event:`, err);
  });

  socket.on('yjs-sync', (fullState: number[]) => {
    Y.applyUpdate(yDoc, Uint8Array.from(fullState));
  });
  socket.on('yjs-update', ({ update }: { update: number[] }) => {
    Y.applyUpdate(yDoc, Uint8Array.from(update));
  });

  socket.on('awareness-sync', (update: number[]) => {
    applyAwarenessUpdate(awareness, Uint8Array.from(update), 'remote-sync');
    console.log(`[${label}] received awareness-sync, now tracking`, awareness.getStates().size, 'client(s)');
  });

  socket.on('awareness-update', ({ update }: { update: number[] }) => {
    applyAwarenessUpdate(awareness, Uint8Array.from(update), 'remote-update');
    console.log(`[${label}] received awareness-update, now tracking`, awareness.getStates().size, 'client(s)');
  });

  awareness.on('update', ({ added, updated }: { added: number[]; updated: number[] }, origin: unknown) => {
    if (origin !== 'local') return;
    const changedClients = added.concat(updated);
    const update = encodeAwarenessUpdate(awareness, changedClients);
    socket.emit('awareness-update', { documentId: DOCUMENT_ID, update: Array.from(update) });
  });

  function announcePresence(cursorLine: number) {
    awareness.setLocalStateField('user', { name, color });
    awareness.setLocalStateField('cursor', { line: cursorLine });
  }

  return { socket, yDoc, awareness, label, announcePresence };
}

async function main() {
  const userA = connect(TOKEN_A, 'User A', 'Alice', '#ff0000');
  const userB = connect(TOKEN_B, 'User B', 'Bob', '#00ff00');

  await new Promise((r) => setTimeout(r, 1500));

  console.log('\n--- Announcing presence ---');
  userA.announcePresence(3);
  await new Promise((r) => setTimeout(r, 500));

  userB.announcePresence(7);
  await new Promise((r) => setTimeout(r, 1000));

  console.log('\n--- FINAL PRESENCE STATE ---');
  console.log(`User A's local awareness tracks ${userA.awareness.getStates().size} client(s):`);
  for (const [id, state] of userA.awareness.getStates()) {
    console.log(`   clientId ${id}:`, JSON.stringify(state));
  }

  console.log(`\nUser B's local awareness tracks ${userB.awareness.getStates().size} client(s):`);
  for (const [id, state] of userB.awareness.getStates()) {
    console.log(`   clientId ${id}:`, JSON.stringify(state));
  }

  const aliceSeenByB = Array.from(userB.awareness.getStates().values()).some(
    (s: any) => s.user?.name === 'Alice'
  );
  const bobSeenByA = Array.from(userA.awareness.getStates().values()).some(
    (s: any) => s.user?.name === 'Bob'
  );

  console.log('\nUser B can see Alice\'s presence:', aliceSeenByB);
  console.log('User A can see Bob\'s presence:', bobSeenByA);

  console.log('\n--- Disconnecting User B ---');
  userB.socket.disconnect();
  await new Promise((r) => setTimeout(r, 1000));

  const bobStillVisible = Array.from(userA.awareness.getStates().values()).some(
    (s: any) => s.user?.name === 'Bob'
  );
  console.log('User A still sees Bob after Bob disconnected (should be false):', bobStillVisible);

  userA.socket.disconnect();
  userA.awareness.destroy();
  userB.awareness.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error('SCRIPT ERROR:', err);
  process.exit(1);
});