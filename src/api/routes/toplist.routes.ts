import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { templateStorage, brandStorage, toplistStorage } from '../../services/toplist';
import { validate } from '../middleware/validate';
import {
  createTemplateSchema,
  updateTemplateSchema,
  createBrandSchema,
  updateBrandSchema,
  createToplistSchema,
  updateToplistSchema,
  createEntrySchema,
  updateEntrySchema,
  reorderEntriesSchema,
  CreateTemplateBody,
  UpdateTemplateBody,
  CreateBrandBody,
  UpdateBrandBody,
  CreateToplistBody,
  UpdateToplistBody,
  CreateEntryBody,
  UpdateEntryBody,
  ReorderEntriesBody,
} from '../validators/schemas';

const router = Router();

// ===== Templates =====

// List all templates
router.get('/templates', (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = templateStorage.list();
    res.json({
      success: true,
      data: { templates, count: templates.length },
    });
  } catch (error) {
    next(error);
  }
});

// Get template by ID
router.get('/templates/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = templateStorage.getById(req.params.id);

    if (!template) {
      res.status(404).json({
        success: false,
        error: { message: 'Template not found', code: 404 },
      });
      return;
    }

    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
});

// Create template
router.post(
  '/templates',
  validate(createTemplateSchema),
  (req: Request<{}, {}, CreateTemplateBody>, res: Response, next: NextFunction) => {
    try {
      const template = templateStorage.create({
        templateId: uuidv4(),
        name: req.body.name,
        description: req.body.description,
        columns: req.body.columns,
      });

      res.status(201).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }
);

// Update template
router.put(
  '/templates/:id',
  validate(updateTemplateSchema),
  (req: Request<{ id: string }, {}, UpdateTemplateBody>, res: Response, next: NextFunction) => {
    try {
      const template = templateStorage.update(req.params.id, req.body);

      if (!template) {
        res.status(404).json({
          success: false,
          error: { message: 'Template not found', code: 404 },
        });
        return;
      }

      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }
);

// Delete template
router.delete('/templates/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = templateStorage.delete(req.params.id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { message: 'Template not found', code: 404 },
      });
      return;
    }

    res.json({ success: true, data: { message: 'Template deleted successfully' } });
  } catch (error) {
    next(error);
  }
});

// ===== Brands =====

// List/Search brands
router.get('/brands', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, limit, offset } = req.query;

    const result = brandStorage.list({
      search: search as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Get brand by ID
router.get('/brands/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const brand = brandStorage.getById(req.params.id);

    if (!brand) {
      res.status(404).json({
        success: false,
        error: { message: 'Brand not found', code: 404 },
      });
      return;
    }

    res.json({ success: true, data: brand });
  } catch (error) {
    next(error);
  }
});

// Create brand
router.post(
  '/brands',
  validate(createBrandSchema),
  (req: Request<{}, {}, CreateBrandBody>, res: Response, next: NextFunction) => {
    try {
      const brand = brandStorage.create({
        brandId: uuidv4(),
        name: req.body.name,
        slug: req.body.slug,
        logoUrl: req.body.logoUrl,
        websiteUrl: req.body.websiteUrl,
        attributes: req.body.attributes || {},
      });

      res.status(201).json({ success: true, data: brand });
    } catch (error: unknown) {
      // Handle unique constraint errors with user-friendly message
      if (error && typeof error === 'object' && 'code' in error && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(409).json({
          success: false,
          error: {
            message: `A brand with this slug already exists. Please use a different name or slug.`,
            code: 409
          },
        });
        return;
      }
      next(error);
    }
  }
);

// Update brand
router.put(
  '/brands/:id',
  validate(updateBrandSchema),
  (req: Request<{ id: string }, {}, UpdateBrandBody>, res: Response, next: NextFunction) => {
    try {
      // Convert null to undefined for storage compatibility
      const updates = {
        ...req.body,
        logoUrl: req.body.logoUrl ?? undefined,
        websiteUrl: req.body.websiteUrl ?? undefined,
      };
      const brand = brandStorage.update(req.params.id, updates);

      if (!brand) {
        res.status(404).json({
          success: false,
          error: { message: 'Brand not found', code: 404 },
        });
        return;
      }

      res.json({ success: true, data: brand });
    } catch (error) {
      next(error);
    }
  }
);

// Delete brand
router.delete('/brands/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = brandStorage.delete(req.params.id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { message: 'Brand not found', code: 404 },
      });
      return;
    }

    res.json({ success: true, data: { message: 'Brand deleted successfully' } });
  } catch (error) {
    next(error);
  }
});

// ===== Toplists =====

// List toplists (optionally filtered by article)
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { articleId } = req.query;
    const toplists = toplistStorage.list(articleId as string | undefined);

    res.json({
      success: true,
      data: { toplists, count: toplists.length },
    });
  } catch (error) {
    next(error);
  }
});

// ===== Library Operations =====

// List library toplists (toplists not bound to any article)
router.get('/library', (req: Request, res: Response, next: NextFunction) => {
  try {
    const toplists = toplistStorage.listLibrary();

    res.json({
      success: true,
      data: { toplists, count: toplists.length },
    });
  } catch (error) {
    next(error);
  }
});

// Save a toplist to the library
router.post('/:id/save-to-library', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body as { name?: string };
    const toplist = toplistStorage.saveToLibrary(req.params.id, name);

    if (!toplist) {
      res.status(404).json({
        success: false,
        error: { message: 'Source toplist not found', code: 404 },
      });
      return;
    }

    res.status(201).json({ success: true, data: toplist });
  } catch (error) {
    next(error);
  }
});

// Load a toplist from the library (creates a copy)
router.post('/library/:id/load', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { articleId, position } = req.body as { articleId?: string; position?: number };
    const toplist = toplistStorage.loadFromLibrary(req.params.id, articleId, position ?? 0);

    if (!toplist) {
      res.status(404).json({
        success: false,
        error: { message: 'Library toplist not found', code: 404 },
      });
      return;
    }

    res.status(201).json({ success: true, data: toplist });
  } catch (error) {
    next(error);
  }
});

// Get toplist by ID (with entries)
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const toplist = toplistStorage.getById(req.params.id, true);

    if (!toplist) {
      res.status(404).json({
        success: false,
        error: { message: 'Toplist not found', code: 404 },
      });
      return;
    }

    res.json({ success: true, data: toplist });
  } catch (error) {
    next(error);
  }
});

// Create toplist
router.post(
  '/',
  validate(createToplistSchema),
  (req: Request<{}, {}, CreateToplistBody>, res: Response, next: NextFunction) => {
    try {
      const toplist = toplistStorage.create({
        toplistId: uuidv4(),
        articleId: req.body.articleId,
        name: req.body.name,
        templateId: req.body.templateId,
        columns: req.body.columns,
        position: req.body.position ?? 0,
        markdownOutput: req.body.markdownOutput,
      });

      res.status(201).json({ success: true, data: toplist });
    } catch (error) {
      next(error);
    }
  }
);

// Update toplist
router.put(
  '/:id',
  validate(updateToplistSchema),
  (req: Request<{ id: string }, {}, UpdateToplistBody>, res: Response, next: NextFunction) => {
    try {
      // Convert null to undefined for storage compatibility
      const updates = {
        ...req.body,
        articleId: req.body.articleId ?? undefined,
        templateId: req.body.templateId ?? undefined,
        markdownOutput: req.body.markdownOutput ?? undefined,
      };
      const toplist = toplistStorage.update(req.params.id, updates);

      if (!toplist) {
        res.status(404).json({
          success: false,
          error: { message: 'Toplist not found', code: 404 },
        });
        return;
      }

      res.json({ success: true, data: toplist });
    } catch (error) {
      next(error);
    }
  }
);

// Delete toplist
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = toplistStorage.delete(req.params.id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { message: 'Toplist not found', code: 404 },
      });
      return;
    }

    res.json({ success: true, data: { message: 'Toplist deleted successfully' } });
  } catch (error) {
    next(error);
  }
});

// Generate markdown for toplist
router.post('/:id/generate-markdown', (req: Request, res: Response, next: NextFunction) => {
  try {
    const markdown = toplistStorage.generateMarkdown(req.params.id);

    res.json({ success: true, data: { markdown } });
  } catch (error) {
    next(error);
  }
});

// ===== Toplist Entries =====

// Reorder entries (must be before /:entryId routes to avoid matching "reorder" as entryId)
router.put(
  '/:id/entries/reorder',
  validate(reorderEntriesSchema),
  (req: Request<{ id: string }, {}, ReorderEntriesBody>, res: Response, next: NextFunction) => {
    try {
      const success = toplistStorage.reorderEntries(req.params.id, req.body.entryIds);

      if (!success) {
        res.status(400).json({
          success: false,
          error: { message: 'Failed to reorder entries', code: 400 },
        });
        return;
      }

      res.json({ success: true, data: { message: 'Entries reordered successfully' } });
    } catch (error) {
      next(error);
    }
  }
);

// Add entry to toplist
router.post(
  '/:id/entries',
  validate(createEntrySchema),
  (req: Request<{ id: string }, {}, CreateEntryBody>, res: Response, next: NextFunction) => {
    try {
      // Verify toplist exists
      const toplist = toplistStorage.getById(req.params.id);
      if (!toplist) {
        res.status(404).json({
          success: false,
          error: { message: 'Toplist not found', code: 404 },
        });
        return;
      }

      const entry = toplistStorage.addEntry({
        entryId: uuidv4(),
        toplistId: req.params.id,
        brandId: req.body.brandId,
        rank: req.body.rank,
        attributeOverrides: req.body.attributeOverrides,
      });

      res.status(201).json({ success: true, data: entry });
    } catch (error) {
      next(error);
    }
  }
);

// Update entry
router.put(
  '/:id/entries/:entryId',
  validate(updateEntrySchema),
  (req: Request<{ id: string; entryId: string }, {}, UpdateEntryBody>, res: Response, next: NextFunction) => {
    try {
      const entry = toplistStorage.updateEntry(req.params.entryId, req.body);

      if (!entry) {
        res.status(404).json({
          success: false,
          error: { message: 'Entry not found', code: 404 },
        });
        return;
      }

      res.json({ success: true, data: entry });
    } catch (error) {
      next(error);
    }
  }
);

// Delete entry
router.delete('/:id/entries/:entryId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = toplistStorage.deleteEntry(req.params.entryId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { message: 'Entry not found', code: 404 },
      });
      return;
    }

    res.json({ success: true, data: { message: 'Entry deleted successfully' } });
  } catch (error) {
    next(error);
  }
});

export const toplistRoutes = router;
