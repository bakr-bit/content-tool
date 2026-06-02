import { Router, Request, Response, NextFunction } from 'express';
import { workflowOrchestrator } from '../../services/workflow';
import { validate } from '../middleware/validate';
import { fullWorkflowRequestSchema, FullWorkflowRequestBody } from '../validators/schemas';
import { createChildLogger } from '../../utils/logger';

const logger = createChildLogger('WorkflowRoutes');
const router = Router();

router.post(
  '/full-generation',
  validate(fullWorkflowRequestSchema),
  async (req: Request<{}, {}, FullWorkflowRequestBody>, res: Response, next: NextFunction) => {
    try {
      const { keyword, geo, options, outlineId } = req.body;

      // Debug logging for options
      logger.info({
        keyword,
        geo,
        outlineId,
        deepResearchReceived: options?.deepResearch,
        hasDeepResearch: !!options?.deepResearch,
        deepResearchEnabled: options?.deepResearch?.enabled,
        hasToplists: !!options?.toplists,
        toplistCount: options?.toplists?.length || 0,
        toplistNames: options?.toplists?.map(t => t.name) || [],
        toplistEntryCounts: options?.toplists?.map(t => t.entries?.length || 0) || [],
      }, 'Full generation request received');

      // Kick off generation in the background and return the workflow id
      // immediately. The client polls GET /workflow/:id for progress. Running
      // the full pipeline (minutes) inside the request would exceed proxy/
      // tunnel timeouts (~100s), leaving the client hanging while the backend
      // still finished and saved a draft on each retry (duplicate articles).
      const workflow = workflowOrchestrator.startFullWorkflow({ keyword, geo, options, outlineId });

      res.status(202).json({
        success: true,
        data: workflow,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const workflow = workflowOrchestrator.getWorkflow(req.params.id);

    if (!workflow) {
      res.status(404).json({
        success: false,
        error: { message: 'Workflow not found', code: 404 },
      });
      return;
    }

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    next(error);
  }
});

export const workflowRoutes = router;
