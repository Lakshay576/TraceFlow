import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createRedisClients } from '../config/redis.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { registerDocumentHandlers } from './documentHandlers.js';
import { registerAwarenessHandlers } from './awarenessHandlers.js';
import { socketAuthMiddleware } from './socketAuth.js';

/**
 * Why do we need the Redis adapter at all?
 *
 * By default, Socket.io keeps room membership and broadcasts entirely
 * in the memory of a single Node process. That works fine on one server,
 * but the moment you run two or more instances behind a load balancer
 * (which you need for horizontal scaling / zero-downtime deploys), it
 * breaks silently: User A connects to instance 1, User B connects to
 * instance 2, and when A emits an edit to their document's "room",
 * instance 1 has no way of knowing instance 2 even has a socket for
 * that room. B never receives the update.
 *
 * The Redis adapter fixes this by having every server instance publish
 * its "emit to room X" events onto a shared Redis pub/sub channel, and
 * subscribe to that same channel. So instance 1 publishes the event,
 * Redis fans it out to every subscribed instance (including instance 2),
 * and instance 2 then delivers it to its own locally-connected sockets.
 * From the app code's perspective, io.to(roomId).emit(...) just works
 * the same whether you have 1 server or 50 — Redis is what makes the
 * "rooms" concept span across process boundaries.
 */
export async function initSocketServer(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.clientOrigin,
      credentials: true,
    },
    // Keep payloads reasonable; Yjs updates are small binary diffs,
    // not full documents, so we don't need huge buffers here.
    maxHttpBufferSize: 1e6, // 1MB
  });

  const { pubClient, subClient } = createRedisClients();
  await Promise.all([
    new Promise((resolve) => pubClient.once('ready', resolve)),
    new Promise((resolve) => subClient.once('ready', resolve)),
  ]);

  io.adapter(createAdapter(pubClient, subClient));
  logger.info('[socket] Redis adapter attached — ready for multi-instance scaling');

  // io.use() runs on every incoming handshake, BEFORE 'connection' fires.
  // Rejecting here (via next(err)) means an unauthenticated client never
  // gets a connected socket at all — auth is enforced at the door, not
  // after the fact on individual events.
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id, userId: socket.data.userId }, '[socket] client connected');
    registerDocumentHandlers(io, socket);
    registerAwarenessHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, '[socket] client disconnected');
    });
  });

  return io;
}