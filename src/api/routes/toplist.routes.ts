import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { templateStorage } from '../../services/toplist';
import { toplistApiClient } from '../../integrations/toplist-api';
import { validate } from '../middleware/validate';
import {
  createTemplateSchema,
  updateTemplateSchema,
  CreateTemplateBody,
  UpdateTemplateBody,
} from '../validators/schemas';

const router = Router();

// ===== Templates (kept local for column templates) =====

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

// ===== Brands (proxied to external Toplist API) =====

// List all brands
router.get('/brands', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brands = await toplistApiClient.listBrands();
    res.json({
      success: true,
      data: { brands, count: brands.length },
    });
  } catch (error) {
    next(error);
  }
});

// Get brand by ID
router.get('/brands/:brandId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brand = await toplistApiClient.getBrand(req.params.brandId);
    res.json({ success: true, data: brand });
  } catch (error) {
    next(error);
  }
});

// Create brand
router.post('/brands', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brand = await toplistApiClient.createBrand(req.body);
    res.status(201).json({ success: true, data: brand });
  } catch (error) {
    next(error);
  }
});

// Update brand
router.put('/brands/:brandId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brand = await toplistApiClient.updateBrand(req.params.brandId, req.body);
    res.json({ success: true, data: brand });
  } catch (error) {
    next(error);
  }
});

// Delete brand
router.delete('/brands/:brandId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await toplistApiClient.deleteBrand(req.params.brandId);
    res.json({ success: true, data: { message: 'Brand deleted successfully' } });
  } catch (error) {
    next(error);
  }
});

// ===== Toplists (proxied to external Toplist API) =====

// List toplists for a site
router.get('/sites/:siteKey/toplists', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { siteKey } = req.params;
    const toplists = await toplistApiClient.listToplists(siteKey);
    res.json({
      success: true,
      data: { toplists, count: toplists.length },
    });
  } catch (error) {
    next(error);
  }
});

// Get toplist by slug (resolved with brand data)
router.get('/sites/:siteKey/toplists/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { siteKey, slug } = req.params;
    const toplist = await toplistApiClient.getToplist(siteKey, slug);
    res.json({ success: true, data: toplist });
  } catch (error) {
    next(error);
  }
});

// Create toplist
router.post('/sites/:siteKey/toplists', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { siteKey } = req.params;
    const toplist = await toplistApiClient.createToplist(siteKey, req.body);
    res.status(201).json({ success: true, data: toplist });
  } catch (error) {
    next(error);
  }
});

// Update toplist
router.put('/sites/:siteKey/toplists/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { siteKey, slug } = req.params;
    const toplist = await toplistApiClient.updateToplist(siteKey, slug, req.body);
    res.json({ success: true, data: toplist });
  } catch (error) {
    next(error);
  }
});

// Delete toplist
router.delete('/sites/:siteKey/toplists/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { siteKey, slug } = req.params;
    await toplistApiClient.deleteToplist(siteKey, slug);
    res.json({ success: true, data: { message: 'Toplist deleted successfully' } });
  } catch (error) {
    next(error);
  }
});

// ===== Toplist Items =====

// Get toplist items (raw data for editor)
router.get('/sites/:siteKey/toplists/:slug/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { siteKey, slug } = req.params;
    const toplist = await toplistApiClient.getToplistItems(siteKey, slug);
    res.json({ success: true, data: toplist });
  } catch (error) {
    next(error);
  }
});

// Update toplist items (replace all)
router.put('/sites/:siteKey/toplists/:slug/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { siteKey, slug } = req.params;
    const { items } = req.body;
    const result = await toplistApiClient.updateToplistItems(siteKey, slug, items);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export const toplistRoutes = router;
