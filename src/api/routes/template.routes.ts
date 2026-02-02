import { Router, Request, Response } from 'express';
import { templateService } from '../../services/template';
import { calculateTemplateWordCount, countTemplateSections } from '../../types/article-template';

const router = Router();

/**
 * GET /api/v1/templates
 * List all available article templates
 */
router.get('/', (_req: Request, res: Response) => {
  const summaries = templateService.getAllTemplateSummaries();

  res.json({
    success: true,
    data: {
      templates: summaries,
      count: summaries.length,
    },
  });
});

/**
 * GET /api/v1/templates/:id
 * Get a specific template with full details
 */
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const template = templateService.getTemplate(id);

  if (!template) {
    res.status(404).json({
      success: false,
      error: {
        message: `Template not found: ${id}`,
        code: 404,
      },
    });
    return;
  }

  // Include computed values in response
  res.json({
    success: true,
    data: {
      ...template,
      targetWordCount: calculateTemplateWordCount(template),
      sectionCount: countTemplateSections(template),
    },
  });
});

export const templateRoutes = router;
