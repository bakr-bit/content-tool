import { Router, Request, Response, NextFunction } from 'express';
import * as authorService from '../../services/author';
import { validate } from '../middleware/validate';
import {
  createAuthorSchema,
  updateAuthorSchema,
  CreateAuthorBody,
  UpdateAuthorBody,
} from '../validators/schemas';

const router = Router();

/**
 * GET /api/v1/authors
 * List all authors (built-in + custom)
 */
router.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const authors = authorService.getAllAuthors();

    res.json({
      success: true,
      data: {
        authors,
        count: authors.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/authors/:id
 * Get a single author by ID
 */
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const author = authorService.getAuthorById(req.params.id);

    if (!author) {
      res.status(404).json({
        success: false,
        error: { message: 'Author not found', code: 404 },
      });
      return;
    }

    res.json({
      success: true,
      data: author,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/authors
 * Create a new custom author
 */
router.post(
  '/',
  validate(createAuthorSchema),
  (req: Request<{}, {}, CreateAuthorBody>, res: Response, next: NextFunction) => {
    try {
      const author = authorService.createAuthor(req.body);

      res.status(201).json({
        success: true,
        data: author,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/authors/:id
 * Update a custom author (cannot update built-in)
 */
router.put(
  '/:id',
  validate(updateAuthorSchema),
  (req: Request<{ id: string }, {}, UpdateAuthorBody>, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Check if trying to update a built-in author
      if (authorService.isBuiltInAuthor(id)) {
        res.status(403).json({
          success: false,
          error: { message: 'Cannot modify built-in author profiles', code: 403 },
        });
        return;
      }

      const author = authorService.updateAuthor(id, req.body);

      if (!author) {
        res.status(404).json({
          success: false,
          error: { message: 'Author not found', code: 404 },
        });
        return;
      }

      res.json({
        success: true,
        data: author,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/authors/:id
 * Delete a custom author (cannot delete built-in)
 */
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if trying to delete a built-in author
    if (authorService.isBuiltInAuthor(id)) {
      res.status(403).json({
        success: false,
        error: { message: 'Cannot delete built-in author profiles', code: 403 },
      });
      return;
    }

    const deleted = authorService.deleteAuthor(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { message: 'Author not found', code: 404 },
      });
      return;
    }

    res.json({
      success: true,
      data: { message: 'Author deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/authors/:id/duplicate
 * Duplicate an existing author (creates new custom author)
 */
router.post('/:id/duplicate', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const author = authorService.duplicateAuthor(id);

    if (!author) {
      res.status(404).json({
        success: false,
        error: { message: 'Source author not found', code: 404 },
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: author,
    });
  } catch (error) {
    next(error);
  }
});

export const authorsRoutes = router;
