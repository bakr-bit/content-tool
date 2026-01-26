import express, { Application } from 'express';
import { errorHandler } from './api/middleware/error-handler';
import {
  healthRoutes,
  researchRoutes,
  outlineRoutes,
  articleRoutes,
  workflowRoutes,
  keywordsRoutes,
  componentsRoutes,
  authorsRoutes,
  projectRoutes,
} from './api/routes';
import { logger } from './utils/logger';

export function createApp(): Application {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, _res, next) => {
    logger.info({ method: req.method, path: req.path }, 'Incoming request');
    next();
  });

  // API Routes
  app.use('/api/v1/health', healthRoutes);
  app.use('/api/v1/research', researchRoutes);
  app.use('/api/v1/outline', outlineRoutes);
  app.use('/api/v1/article', articleRoutes);
  app.use('/api/v1/workflow', workflowRoutes);
  app.use('/api/v1/keywords', keywordsRoutes);
  app.use('/api/v1/components', componentsRoutes);
  app.use('/api/v1/authors', authorsRoutes);
  app.use('/api/v1/project', projectRoutes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { message: 'Endpoint not found', code: 404 },
    });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}
