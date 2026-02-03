import express, { Application } from 'express';
import { errorHandler } from './api/middleware/error-handler';
import { authMiddleware } from './api/middleware/auth';
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
  toplistRoutes,
  templateRoutes,
} from './api/routes';
import { authRoutes } from './api/routes/auth.routes';
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

  // Public routes
  app.use('/api/v1/health', healthRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/templates', templateRoutes); // Public - just template metadata

  // Protected routes (require authentication)
  app.use('/api/v1/research', authMiddleware, researchRoutes);
  app.use('/api/v1/outline', authMiddleware, outlineRoutes);
  app.use('/api/v1/article', authMiddleware, articleRoutes);
  app.use('/api/v1/workflow', authMiddleware, workflowRoutes);
  app.use('/api/v1/keywords', authMiddleware, keywordsRoutes);
  app.use('/api/v1/components', authMiddleware, componentsRoutes);
  app.use('/api/v1/authors', authMiddleware, authorsRoutes);
  app.use('/api/v1/project', authMiddleware, projectRoutes);
  app.use('/api/v1/toplist', authMiddleware, toplistRoutes);

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
