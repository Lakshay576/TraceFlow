import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createRedisClients } from '../config/redis.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { registerDocumentHandlers } from './documentHandlers.js';
import { socketAuthMiddleware } from './socketAuth.js';

export async function initSocketServer(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.clientOrigin,
      credentials: true,
    },
    maxHttpBufferSize: 1e6, // 1MB
  });

  const { pubClient, subClient } = createRedisClients();
  await Promise.all([
    new Promise((resolve) => pubClient.once('ready', resolve)),
    new Promise((resolve) => subClient.once('ready', resolve)),
  ]);

  io.adapter(createAdapter(pubClient, subClient));
  logger.info('[socket] Redis adapter attached — ready for multi-instance scaling');

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id, userId: socket.data.userId }, '[socket] client connected');
    registerDocumentHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, '[socket] client disconnected');
    });
  });

  return io;
}