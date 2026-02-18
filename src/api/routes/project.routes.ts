import { Router, Request, Response, NextFunction } from 'express';
import { projectService } from '../../services/project';
import { validate } from '../middleware/validate';
import {
  projectCreateSchema,
  projectUpdateSchema,
  ProjectCreateBody,
  ProjectUpdateBody,
} from '../validators/schemas';

const router = Router();

// List all projects
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = projectService.listProjects();

    // Add article count to each project
    const projectsWithCount = projects.map((project) => ({
      ...project,
      articleCount: projectService.getArticleCount(project.projectId),
    }));

    res.json({
      success: true,
      data: {
        projects: projectsWithCount,
        count: projectsWithCount.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create a new project
router.post(
  '/',
  validate(projectCreateSchema),
  async (req: Request<{}, {}, ProjectCreateBody>, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.createProject(req.body);

      res.status(201).json({
        success: true,
        data: {
          ...project,
          articleCount: 0,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: { message: error.message, code: 409 },
        });
        return;
      }
      next(error);
    }
  }
);

// Get a single project
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = projectService.getProject(req.params.id);

    if (!project) {
      res.status(404).json({
        success: false,
        error: { message: 'Project not found', code: 404 },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        ...project,
        articleCount: projectService.getArticleCount(project.projectId),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update a project
router.put(
  '/:id',
  validate(projectUpdateSchema),
  async (req: Request<{ id: string }, {}, ProjectUpdateBody>, res: Response, next: NextFunction) => {
    try {
      const { name, description, geo, language, authors, defaultToplistIds, tone, pointOfView, formality, customTonePrompt } = req.body;

      // Check if at least one field is provided
      const hasUpdate = name !== undefined || description !== undefined || geo !== undefined ||
        language !== undefined || authors !== undefined || defaultToplistIds !== undefined ||
        tone !== undefined || pointOfView !== undefined || formality !== undefined || customTonePrompt !== undefined;

      if (!hasUpdate) {
        res.status(400).json({
          success: false,
          error: { message: 'At least one field must be provided', code: 400 },
        });
        return;
      }

      // Convert null to undefined for storage compatibility
      const updates = {
        name,
        description: description ?? undefined,
        geo: geo ?? undefined,
        language: language ?? undefined,
        authors: authors ?? undefined,
        defaultToplistIds: defaultToplistIds ?? undefined,
        tone: tone ?? undefined,
        pointOfView: pointOfView ?? undefined,
        formality: formality ?? undefined,
        customTonePrompt: customTonePrompt ?? undefined,
      };

      const updated = await projectService.updateProject(req.params.id, updates);

      if (!updated) {
        res.status(404).json({
          success: false,
          error: { message: 'Project not found', code: 404 },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          ...updated,
          articleCount: projectService.getArticleCount(updated.projectId),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: { message: error.message, code: 409 },
        });
        return;
      }
      next(error);
    }
  }
);

// Delete a project
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await projectService.deleteProject(req.params.id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { message: 'Project not found', code: 404 },
      });
      return;
    }

    res.json({
      success: true,
      data: { message: 'Project deleted successfully' },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot delete project')) {
      res.status(409).json({
        success: false,
        error: { message: error.message, code: 409 },
      });
      return;
    }
    next(error);
  }
});

export const projectRoutes = router;
