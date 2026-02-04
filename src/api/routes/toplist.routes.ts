import { Router, Request, Response, NextFunction } from 'express';
import { toplistApiClient } from '../../integrations/toplist-api';

const router = Router();

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

export const toplistRoutes = router;
