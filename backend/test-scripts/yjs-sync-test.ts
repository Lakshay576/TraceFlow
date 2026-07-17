// console.log('SCRIPT STARTED');
// const TOKEN_A = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTUzNWU5Mjk2NGJkYzhlMWQ3NzVlNmQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3ODM4NjM3MDksImV4cCI6MTc4NDQ2ODUwOX0.UFPt70S2sK8_G7yIZERcQ6w2ur_b9HVaTbzv1oVX05Y'; 
// const TOKEN_B = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTUzOTdkMjE1NDhiNmVhZDY4ZTJmOTgiLCJlbWFpbCI6InRlc3QxQGV4YW1wbGUuY29tIiwiaWF0IjoxNzgzODYzMjUwLCJleHAiOjE3ODQ0NjgwNTB9.qmbbdnVgJ_EjZhIyOnkGwvN-iH_64mPPO808Y27cN0Y'; 
// const DOCUMENT_ID = '6a53938f1793bcbd5eda3836';

import { io } from 'socket.io-client';
import * as Y from 'yjs';

const SERVER_URL = 'http://localhost:4000';
const TOKEN_A = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTUzNWU5Mjk2NGJkYzhlMWQ3NzVlNmQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3ODM4NjM3MDksImV4cCI6MTc4NDQ2ODUwOX0.UFPt70S2sK8_G7yIZERcQ6w2ur_b9HVaTbzv1oVX05Y';
const TOKEN_B = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTUzOTdkMjE1NDhiNmVhZDY4ZTJmOTgiLCJlbWFpbCI6InRlc3QxQGV4YW1wbGUuY29tIiwiaWF0IjoxNzgzODYzMjUwLCJleHAiOjE3ODQ0NjgwNTB9.qmbbdnVgJ_EjZhIyOnkGwvN-iH_64mPPO808Y27cN0Y';
const DOCUMENT_ID = '6a53938f1793bcbd5eda3836';

function connect(token: string, label: string) {
  const socket = io(SERVER_URL, { auth: { token } });
  const yDoc = new Y.Doc();

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
    console.log(`[${label}] received initial sync, current text: "${yDoc.getText('content')}"`);
  });

  socket.on('yjs-update', ({ update }: { update: number[] }) => {
    Y.applyUpdate(yDoc, Uint8Array.from(update));
    console.log(`[${label}] received update from peer, current text: "${yDoc.getText('content')}"`);
  });

  return { socket, yDoc, label };
}

async function main() {
  const userA = connect(TOKEN_A, 'User A');
  const userB = connect(TOKEN_B, 'User B');

  await new Promise((r) => setTimeout(r, 1500));

  userA.yDoc.getText('content').insert(0, 'Hello ');
  const updateA = Y.encodeStateAsUpdate(userA.yDoc);
  userA.socket.emit('yjs-update', { documentId: DOCUMENT_ID, update: Array.from(updateA) });

  await new Promise((r) => setTimeout(r, 500));

  userB.yDoc.getText('content').insert(userB.yDoc.getText('content').length, 'World');
  const updateB = Y.encodeStateAsUpdate(userB.yDoc, Y.encodeStateVector(userA.yDoc));
  userB.socket.emit('yjs-update', { documentId: DOCUMENT_ID, update: Array.from(updateB) });

  await new Promise((r) => setTimeout(r, 1500));

  console.log('\n--- FINAL STATE ---');
  console.log('User A sees:', JSON.stringify(userA.yDoc.getText('content').toString()));
  console.log('User B sees:', JSON.stringify(userB.yDoc.getText('content').toString()));
  console.log(
    'Converged:',
    userA.yDoc.getText('content').toString() === userB.yDoc.getText('content').toString()
  );

  userA.socket.disconnect();
  userB.socket.disconnect();
  process.exit(0);
}

main().then(() => console.log('DONE')).catch((err) => console.error('SCRIPT ERROR:', err));