import { Router, Request, Response } from 'express';
import { getAllComponents, getComponentInfo, isValidComponentType } from '../../config/component-prompts';
import { ComponentType } from '../../types';

const router = Router();

/**
 * GET /api/v1/components
 * List all available component types with their metadata
 */
router.get('/', (_req: Request, res: Response) => {
  const components = getAllComponents();

  res.json({
    success: true,
    data: {
      components,
      count: components.length,
    },
  });
});

/**
 * GET /api/v1/components/:type
 * Get details for a specific component type
 */
router.get('/:type', (req: Request, res: Response) => {
  const { type } = req.params;

  if (!isValidComponentType(type)) {
    res.status(404).json({
      success: false,
      error: {
        message: `Component type '${type}' not found`,
        code: 404,
        availableTypes: getAllComponents().map((c) => c.id),
      },
    });
    return;
  }

  const componentInfo = getComponentInfo(type as ComponentType);

  res.json({
    success: true,
    data: {
      id: type,
      ...componentInfo,
    },
  });
});

export const componentsRoutes = router;
