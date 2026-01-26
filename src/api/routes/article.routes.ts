import { Router, Request, Response, NextFunction } from 'express';
import { articleService } from '../../services/article';
import { ArticleStatus } from '../../services/article/article.storage';
import { validate } from '../middleware/validate';
import { articleGenerateRequestSchema, ArticleGenerateRequestBody, articleUpdateRequestSchema, ArticleUpdateRequestBody } from '../validators/schemas';

const router = Router();

// List articles with pagination and filtering
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      keyword,
      status,
      sortBy,
      sortOrder,
      page,
      limit,
    } = req.query;

    const result = articleService.listArticles({
      keyword: keyword as string | undefined,
      status: status as ArticleStatus | undefined,
      sortBy: sortBy as 'created_at' | 'updated_at' | 'title' | 'keyword' | undefined,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/generate',
  validate(articleGenerateRequestSchema),
  async (req: Request<{}, {}, ArticleGenerateRequestBody>, res: Response, next: NextFunction) => {
    try {
      const { outlineId, options } = req.body;
      const article = await articleService.generateArticle({ outlineId, options });

      res.status(201).json({
        success: true,
        data: article,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const article = articleService.getArticle(req.params.id);

    if (!article) {
      res.status(404).json({
        success: false,
        error: { message: 'Article not found', code: 404 },
      });
      return;
    }

    res.json({
      success: true,
      data: article,
    });
  } catch (error) {
    next(error);
  }
});

// Update article
router.put(
  '/:id',
  validate(articleUpdateRequestSchema),
  (req: Request<{ id: string }, {}, ArticleUpdateRequestBody>, res: Response, next: NextFunction) => {
    try {
      const { title, content } = req.body;

      if (!title && !content) {
        res.status(400).json({
          success: false,
          error: { message: 'At least one of title or content must be provided', code: 400 },
        });
        return;
      }

      const updated = articleService.updateArticle(req.params.id, { title, content });

      if (!updated) {
        res.status(404).json({
          success: false,
          error: { message: 'Article not found', code: 404 },
        });
        return;
      }

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete article
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = articleService.deleteArticle(req.params.id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { message: 'Article not found', code: 404 },
      });
      return;
    }

    res.json({
      success: true,
      data: { message: 'Article deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
});

// Update article status
router.patch('/:id/status', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;

    if (!status || !['draft', 'published', 'archived'].includes(status)) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid status. Must be one of: draft, published, archived', code: 400 },
      });
      return;
    }

    const updated = articleService.updateArticleStatus(req.params.id, status as ArticleStatus);

    if (!updated) {
      res.status(404).json({
        success: false,
        error: { message: 'Article not found', code: 404 },
      });
      return;
    }

    res.json({
      success: true,
      data: { message: 'Article status updated successfully' },
    });
  } catch (error) {
    next(error);
  }
});

export const articleRoutes = router;
