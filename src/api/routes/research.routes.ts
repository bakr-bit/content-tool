import { Router, Request, Response, NextFunction } from 'express';
import { researchService } from '../../services/research';
import { validate } from '../middleware/validate';
import { researchRequestSchema, ResearchRequestBody } from '../validators/schemas';

const router = Router();

router.post(
  '/',
  validate(researchRequestSchema),
  async (req: Request<{}, {}, ResearchRequestBody>, res: Response, next: NextFunction) => {
    try {
      const { keyword, geo } = req.body;
      const result = await researchService.conductResearch({ keyword, geo });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const research = researchService.getResearch(req.params.id);

    if (!research) {
      res.status(404).json({
        success: false,
        error: { message: 'Research not found', code: 404 },
      });
      return;
    }

    res.json({
      success: true,
      data: research,
    });
  } catch (error) {
    next(error);
  }
});

export const researchRoutes = router;
