import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { keywordsService } from '../../services/keywords';
import { validate } from '../middleware/validate';

const router = Router();

const generateKeywordsSchema = z.object({
  focusKeyword: z.string().min(1, 'Focus keyword is required').max(200),
  title: z.string().max(500).optional(),
  language: z.string().default('en-US'),
  targetCountry: z.string().length(2).default('us'),
});

type GenerateKeywordsBody = z.infer<typeof generateKeywordsSchema>;

router.post(
  '/generate',
  validate(generateKeywordsSchema),
  async (req: Request<{}, {}, GenerateKeywordsBody>, res: Response, next: NextFunction) => {
    try {
      const { focusKeyword, title, language, targetCountry } = req.body;

      const keywords = await keywordsService.generateKeywords({
        focusKeyword,
        title,
        language,
        targetCountry,
      });

      res.json({
        success: true,
        data: { keywords },
      });
    } catch (error) {
      next(error);
    }
  }
);

export const keywordsRoutes = router;
