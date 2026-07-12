import { Server, Socket } from 'socket.io';
import { logger } from '../config/logger.js';

export function roomName(documentId: string) {
  return `doc:${documentId}`;
}

export function registerDocumentHandlers(_io: Server, socket: Socket) {
  socket.on('join-document', (documentId: string) => {
    if (typeof documentId !== 'string' || !documentId) return;

    socket.join(roomName(documentId));
    logger.info({ socketId: socket.id, room: roomName(documentId) }, '[socket] joined room');

    socket.to(roomName(documentId)).emit('collaborator-joined', {
      socketId: socket.id,
    });
  });

  socket.on('leave-document', (documentId: string) => {
    if (typeof documentId !== 'string' || !documentId) return;

    socket.leave(roomName(documentId));
    socket.to(roomName(documentId)).emit('collaborator-left', {
      socketId: socket.id,
    });
  });
}