import { Router, Request, Response, NextFunction } from 'express';
import { contentPlanService } from '../../services/content-plan';
import { validate } from '../middleware/validate';
import {
  contentPlanImportSchema,
  contentPlanGenerateSchema,
  contentPlanPageUpdateSchema,
  ContentPlanImportBody,
  ContentPlanGenerateBody,
  ContentPlanPageUpdateBody,
} from '../validators/schemas';

const router = Router();

// Import pages into a project's content plan
router.post(
  '/project/:projectId/import',
  validate(contentPlanImportSchema),
  (req: Request<{ projectId: string }, {}, ContentPlanImportBody>, res: Response, next: NextFunction) => {
    try {
      const pages = contentPlanService.importPages(req.params.projectId, req.body.pages);
      res.status(201).json({
        success: true,
        data: { pages, count: pages.length },
      });
    } catch (error) {
      next(error);
    }
  }
);

// List pages for a project
router.get('/project/:projectId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const pages = contentPlanService.getPages(req.params.projectId);
    const stats = contentPlanService.getStats(req.params.projectId);
    res.json({
      success: true,
      data: { pages, stats, count: pages.length },
    });
  } catch (error) {
    next(error);
  }
});

// Delete all pages for a project
router.delete('/project/:projectId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = contentPlanService.deletePages(req.params.projectId);
    res.json({
      success: true,
      data: { message: `Deleted ${deleted} pages` },
    });
  } catch (error) {
    next(error);
  }
});

// Start batch generation for a project
router.post(
  '/project/:projectId/generate',
  validate(contentPlanGenerateSchema),
  async (req: Request<{ projectId: string }, {}, ContentPlanGenerateBody>, res: Response, next: NextFunction) => {
    try {
      await contentPlanService.generateBatch(
        req.params.projectId,
        req.body.pageIds,
        req.body.options
      );
      res.json({
        success: true,
        data: contentPlanService.getBatchStatus(req.params.projectId),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Poll batch status
router.get('/project/:projectId/status', (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = contentPlanService.getBatchStatus(req.params.projectId);
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

// Cancel batch generation
router.post('/project/:projectId/cancel', (req: Request, res: Response, next: NextFunction) => {
  try {
    const cancelled = contentPlanService.cancelBatch(req.params.projectId);
    res.json({
      success: true,
      data: { cancelled },
    });
  } catch (error) {
    next(error);
  }
});

// Get a single page
router.get('/page/:pageId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = contentPlanService.getPage(req.params.pageId);
    if (!page) {
      res.status(404).json({
        success: false,
        error: { message: 'Page not found', code: 404 },
      });
      return;
    }
    res.json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
});

// Generate outline for a single page
router.post('/page/:pageId/generate-outline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await contentPlanService.generateOutlineForPage(req.params.pageId, req.body?.options);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: { message: error.message, code: 404 },
      });
      return;
    }
    next(error);
  }
});

// Generate a single page
router.post('/page/:pageId/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = await contentPlanService.generateSingle(req.params.pageId, req.body?.options);
    res.json({ success: true, data: page });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: { message: error.message, code: 404 },
      });
      return;
    }
    next(error);
  }
});

// Update a single page (edit keywords, skip, etc.)
router.patch(
  '/page/:pageId',
  validate(contentPlanPageUpdateSchema),
  (req: Request<{ pageId: string }, {}, ContentPlanPageUpdateBody>, res: Response, next: NextFunction) => {
    try {
      const { keywords, generationStatus, templateId, tone, pointOfView, formality, customTonePrompt, articleSizePreset } = req.body;
      const page = contentPlanService.updatePage(req.params.pageId, {
        keywords,
        generationStatus,
        templateId,
        tone,
        pointOfView,
        formality,
        customTonePrompt,
        articleSizePreset,
      });
      if (!page) {
        res.status(404).json({
          success: false,
          error: { message: 'Page not found', code: 404 },
        });
        return;
      }
      res.json({ success: true, data: page });
    } catch (error) {
      next(error);
    }
  }
);

// Delete a single page
router.delete('/page/:pageId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = contentPlanService.deletePage(req.params.pageId);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { message: 'Page not found', code: 404 },
      });
      return;
    }
    res.json({
      success: true,
      data: { message: 'Page deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
});

export const contentPlanRoutes = router;
