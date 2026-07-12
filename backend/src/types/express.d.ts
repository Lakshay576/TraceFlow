// Augments Express's Request type so `req.userId` (set by requireAuth)
// is recognized by TypeScript everywhere without casting.
// (`req.id` and `req.log` are already typed by pino-http's own types.)
//
// This file needs `export {}` to be treated as a module rather than a
// global script — which in turn means the Express augmentation must be
// wrapped in `declare global` to actually reach the global `Express`
// namespace (module augmentation and global augmentation are two
// different mechanisms; mixing them up silently breaks one or the other).

export {};

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Augments Socket.io's per-connection `socket.data` bag so `userId`/`email`
// (set by socketAuthMiddleware) are typed everywhere without casting.
// This one uses plain module augmentation (no `declare global` needed)
// since 'socket.io' is an actual importable module, not a global namespace.
declare module 'socket.io' {
  interface SocketData {
    userId: string;
    email: string;
  }
}