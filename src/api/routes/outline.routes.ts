import { Router, Request, Response, NextFunction } from 'express';
import { outlineService } from '../../services/outline';
import { validate } from '../middleware/validate';
import {
  outlineGenerateRequestSchema,
  outlineUpdateRequestSchema,
  OutlineGenerateRequestBody,
  OutlineUpdateRequestBody,
} from '../validators/schemas';

const router = Router();

router.post(
  '/generate',
  validate(outlineGenerateRequestSchema),
  async (req: Request<{}, {}, OutlineGenerateRequestBody>, res: Response, next: NextFunction) => {
    try {
      const { researchId, options } = req.body;
      const outline = await outlineService.generateOutline({ researchId, options });

      res.status(201).json({
        success: true,
        data: outline,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const outline = outlineService.getOutline(req.params.id);

    if (!outline) {
      res.status(404).json({
        success: false,
        error: { message: 'Outline not found', code: 404 },
      });
      return;
    }

    res.json({
      success: true,
      data: outline,
    });
  } catch (error) {
    next(error);
  }
});

router.put(
  '/:id',
  validate(outlineUpdateRequestSchema),
  async (req: Request<{ id: string }, {}, OutlineUpdateRequestBody>, res: Response, next: NextFunction) => {
    try {
      const outline = await outlineService.updateOutline(req.params.id, req.body);

      res.json({
        success: true,
        data: outline,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const outlineRoutes = router;
