import { createChildLogger } from '../../utils/logger';
import {
  contentPlanStorage,
  ContentPlanPage,
  ImportPageInput,
  ContentPlanStats,
  GenerationStatus,
} from './content-plan.storage';
import { workflowOrchestrator } from '../workflow/workflow.service';
import { GenerationOptionsInput } from '../../types/generation-options';

const logger = createChildLogger('ContentPlanService');

interface BatchState {
  projectId: string;
  pageIds: string[];
  currentIndex: number;
  status: 'running' | 'cancelled' | 'completed';
  stats: ContentPlanStats;
}

// Map page type from site architect to article size preset
function mapPageTypeToSizePreset(pageType?: string): string | undefined {
  if (!pageType) return undefined;
  const lower = pageType.toLowerCase();
  if (lower.includes('pillar') || lower.includes('guide') || lower.includes('ultimate')) return 'longer';
  if (lower.includes('blog') || lower.includes('article')) return 'long';
  if (lower.includes('landing') || lower.includes('home')) return 'short';
  if (lower.includes('category') || lower.includes('hub')) return 'long';
  return 'medium';
}

export class ContentPlanService {
  private batchStates = new Map<string, BatchState>();

  importPages(projectId: string, pages: ImportPageInput[]): ContentPlanPage[] {
    if (pages.length === 0) {
      throw new Error('No pages to import');
    }
    return contentPlanStorage.importPages(projectId, pages);
  }

  getPages(projectId: string): ContentPlanPage[] {
    return contentPlanStorage.getPagesByProject(projectId);
  }

  getPage(pageId: string): ContentPlanPage | null {
    return contentPlanStorage.getPage(pageId);
  }

  getStats(projectId: string): ContentPlanStats {
    return contentPlanStorage.getStats(projectId);
  }

  updatePage(pageId: string, updates: { keywords?: string; generationStatus?: GenerationStatus }): ContentPlanPage | null {
    return contentPlanStorage.updatePage(pageId, updates);
  }

  deletePage(pageId: string): boolean {
    return contentPlanStorage.deletePage(pageId);
  }

  deletePages(projectId: string): number {
    // Cancel any running batch first
    this.cancelBatch(projectId);
    return contentPlanStorage.deletePagesByProject(projectId);
  }

  async generateSingle(
    pageId: string,
    overrideOptions?: GenerationOptionsInput
  ): Promise<ContentPlanPage | null> {
    const page = contentPlanStorage.getPage(pageId);
    if (!page) {
      throw new Error('Page not found');
    }

    if (!page.keywords && !page.metaTitle) {
      throw new Error('Page must have keywords or a meta title to generate an article');
    }

    // Mark as generating
    contentPlanStorage.updatePageStatus(pageId, 'generating');

    try {
      const options = this.buildWorkflowOptions(page, overrideOptions);

      logger.info({ pageId, keyword: options.keyword }, 'Generating article for content plan page');

      const workflow = await workflowOrchestrator.runFullWorkflow(options);
      const articleId = workflow.article?.articleId;

      if (!articleId) {
        throw new Error('Workflow completed but no article was created');
      }

      const updated = contentPlanStorage.updatePageStatus(pageId, 'completed', articleId);
      logger.info({ pageId, articleId }, 'Article generated for content plan page');
      return updated;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      contentPlanStorage.updatePageStatus(pageId, 'failed', undefined, errorMessage);
      logger.error({ pageId, error: errorMessage }, 'Failed to generate article for content plan page');
      throw error;
    }
  }

  async generateBatch(
    projectId: string,
    pageIds?: string[],
    overrideOptions?: GenerationOptionsInput
  ): Promise<void> {
    // Get pages to generate
    let pages: ContentPlanPage[];
    if (pageIds && pageIds.length > 0) {
      pages = pageIds
        .map((id) => contentPlanStorage.getPage(id))
        .filter((p): p is ContentPlanPage => p !== null && p.generationStatus !== 'completed' && p.generationStatus !== 'skipped');
    } else {
      pages = contentPlanStorage
        .getPagesByProject(projectId)
        .filter((p) => p.generationStatus === 'pending' || p.generationStatus === 'failed');
    }

    if (pages.length === 0) {
      throw new Error('No pages to generate');
    }

    const batchState: BatchState = {
      projectId,
      pageIds: pages.map((p) => p.pageId),
      currentIndex: 0,
      status: 'running',
      stats: contentPlanStorage.getStats(projectId),
    };

    this.batchStates.set(projectId, batchState);

    logger.info({ projectId, pageCount: pages.length }, 'Starting batch generation');

    // Process sequentially (don't await - runs in background)
    this.processBatch(batchState, overrideOptions).catch((error) => {
      logger.error({ projectId, error: error instanceof Error ? error.message : 'Unknown error' }, 'Batch generation failed');
    });
  }

  private async processBatch(
    batchState: BatchState,
    overrideOptions?: GenerationOptionsInput
  ): Promise<void> {
    const { projectId, pageIds } = batchState;

    for (let i = 0; i < pageIds.length; i++) {
      // Check for cancellation
      const current = this.batchStates.get(projectId);
      if (!current || current.status === 'cancelled') {
        logger.info({ projectId, processedCount: i }, 'Batch generation cancelled');
        return;
      }

      current.currentIndex = i;
      const pageId = pageIds[i];
      const page = contentPlanStorage.getPage(pageId);

      if (!page || page.generationStatus === 'completed' || page.generationStatus === 'skipped') {
        continue;
      }

      try {
        await this.generateSingle(pageId, overrideOptions);
      } catch {
        // Error already logged and page marked as failed in generateSingle
        // Continue with next page
      }

      // Update stats
      current.stats = contentPlanStorage.getStats(projectId);
    }

    const state = this.batchStates.get(projectId);
    if (state) {
      state.status = 'completed';
      state.stats = contentPlanStorage.getStats(projectId);
    }

    logger.info({ projectId }, 'Batch generation completed');
  }

  getBatchStatus(projectId: string): { running: boolean; currentIndex: number; total: number; stats: ContentPlanStats } {
    const batchState = this.batchStates.get(projectId);
    const stats = contentPlanStorage.getStats(projectId);

    if (!batchState || batchState.status !== 'running') {
      return {
        running: false,
        currentIndex: 0,
        total: 0,
        stats,
      };
    }

    return {
      running: true,
      currentIndex: batchState.currentIndex,
      total: batchState.pageIds.length,
      stats,
    };
  }

  cancelBatch(projectId: string): boolean {
    const batchState = this.batchStates.get(projectId);
    if (batchState && batchState.status === 'running') {
      batchState.status = 'cancelled';
      logger.info({ projectId }, 'Batch generation cancelled');
      return true;
    }
    return false;
  }

  private buildWorkflowOptions(
    page: ContentPlanPage,
    overrideOptions?: GenerationOptionsInput
  ): { keyword: string; geo?: string; options?: GenerationOptionsInput } {
    // Extract keywords: first = focus keyword, rest = includeKeywords
    const allKeywords = page.keywords
      ? page.keywords.split(',').map((k) => k.trim()).filter(Boolean)
      : [];

    const focusKeyword = allKeywords[0] || page.metaTitle || '';
    const includeKeywords = allKeywords.slice(1);

    // Map page type to article size preset
    const sizePreset = mapPageTypeToSizePreset(page.pageType);

    const options: GenerationOptionsInput = {
      ...overrideOptions,
      title: page.metaTitle || undefined,
      includeKeywords: includeKeywords.length > 0 ? includeKeywords : overrideOptions?.includeKeywords,
      projectId: page.projectId,
    };

    // Set article size from page type if not overridden
    if (sizePreset && !overrideOptions?.articleSize?.preset) {
      options.articleSize = {
        ...overrideOptions?.articleSize,
        preset: sizePreset as any,
      };
    }

    return {
      keyword: focusKeyword,
      geo: overrideOptions?.targetCountry || undefined,
      options,
    };
  }
}

export const contentPlanService = new ContentPlanService();
