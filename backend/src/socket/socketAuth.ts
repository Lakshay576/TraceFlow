import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

interface JwtPayload {
  userId: string;
  email: string;
}

export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
) {
  const token = socket.handshake.auth?.token;

  if (typeof token !== 'string' || !token) {
    logger.warn({ socketId: socket.id }, '[socket-auth] missing token, rejecting handshake');
    return next(new Error('Authentication required'));
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
  } catch (err) {
    logger.warn({ socketId: socket.id, err }, '[socket-auth] invalid token, rejecting handshake');
    return next(new Error('Invalid or expired token'));
  }

  socket.data.userId = payload.userId;
  socket.data.email = payload.email;

  logger.info({ socketId: socket.id, userId: payload.userId }, '[socket-auth] handshake authenticated');
  next();
}