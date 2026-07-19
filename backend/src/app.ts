import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import authRoutes from './routes/auth.routes.js';
import documentRoutes from './routes/document.routes.js';
import helmet from 'helmet';
import { generalRateLimiter } from './middleware/rateLimiter.js';


export function createApp() {
  const app = express();

  app.use(requestLogger);
  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json());
  app.use(generalRateLimiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', env: env.nodeEnv });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);


  // Route mounts to add as later phases build them out:
  // app.use('/api/documents', documentRoutes);
  // app.use('/api/comments', commentRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}