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
import { projectStorage, Project } from '../project/project.storage';
import { researchService } from '../research';
import { outlineService } from '../outline';

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

  updatePage(pageId: string, updates: {
    keywords?: string;
    generationStatus?: GenerationStatus;
    templateId?: string | null;
    tone?: string | null;
    pointOfView?: string | null;
    formality?: string | null;
    customTonePrompt?: string | null;
    articleSizePreset?: string | null;
  }): ContentPlanPage | null {
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

  async generateOutlineForPage(
    pageId: string,
    overrideOptions?: GenerationOptionsInput
  ): Promise<{ page: ContentPlanPage; outlineId: string }> {
    const page = contentPlanStorage.getPage(pageId);
    if (!page) {
      throw new Error('Page not found');
    }

    if (!page.keywords && !page.metaTitle) {
      throw new Error('Page must have keywords or a meta title to generate an outline');
    }

    // Extract focus keyword
    const allKeywords = page.keywords
      ? page.keywords.split(',').map((k) => k.trim()).filter(Boolean)
      : [];
    const focusKeyword = allKeywords[0] || page.metaTitle || '';

    // Fetch project for voice defaults
    const project = projectStorage.getProjectById(page.projectId);

    // Build options with project voice defaults
    const projectVoiceDefaults: Partial<GenerationOptionsInput> = {};
    if (project) {
      if (project.tone) projectVoiceDefaults.tone = project.tone as GenerationOptionsInput['tone'];
      if (project.pointOfView) projectVoiceDefaults.pointOfView = project.pointOfView as GenerationOptionsInput['pointOfView'];
      if (project.formality) projectVoiceDefaults.formality = project.formality as GenerationOptionsInput['formality'];
      if (project.customTonePrompt) projectVoiceDefaults.customTonePrompt = project.customTonePrompt;
    }

    // Build per-page overrides
    const pageOverrides: Partial<GenerationOptionsInput> = {};
    if (page.tone) pageOverrides.tone = page.tone as GenerationOptionsInput['tone'];
    if (page.pointOfView) pageOverrides.pointOfView = page.pointOfView as GenerationOptionsInput['pointOfView'];
    if (page.formality) pageOverrides.formality = page.formality as GenerationOptionsInput['formality'];
    if (page.customTonePrompt) pageOverrides.customTonePrompt = page.customTonePrompt;
    if (page.templateId) pageOverrides.templateId = page.templateId;
    if (page.articleSizePreset) pageOverrides.articleSize = { preset: page.articleSizePreset as any };

    const options: GenerationOptionsInput = {
      ...projectVoiceDefaults,
      ...overrideOptions,
      ...pageOverrides,
      title: page.metaTitle || undefined,
      includeKeywords: allKeywords.slice(1).length > 0 ? allKeywords.slice(1) : overrideOptions?.includeKeywords,
    };

    const geo = overrideOptions?.targetCountry || project?.geo || 'us';

    logger.info({ pageId, keyword: focusKeyword }, 'Generating outline for content plan page');

    // Step 1: Research
    const research = await researchService.conductResearch({ keyword: focusKeyword, geo });

    // Step 2: Generate outline
    const outline = await outlineService.generateOutline({
      researchId: research.researchId,
      options,
    });

    // Step 3: Save outline reference on page
    const updatedPage = contentPlanStorage.updatePageOutline(pageId, outline.outlineId);
    if (!updatedPage) {
      throw new Error('Failed to update page with outline');
    }

    logger.info({ pageId, outlineId: outline.outlineId }, 'Outline generated for content plan page');
    return { page: updatedPage, outlineId: outline.outlineId };
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

    // Fetch project for voice defaults
    const project = projectStorage.getProjectById(page.projectId);

    // Mark as generating
    contentPlanStorage.updatePageStatus(pageId, 'generating');

    try {
      const workflowInput = this.buildWorkflowOptions(page, overrideOptions, project);

      logger.info({ pageId, keyword: workflowInput.keyword, outlineId: workflowInput.outlineId }, 'Generating article for content plan page');

      const workflow = await workflowOrchestrator.runFullWorkflow(workflowInput);
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
    overrideOptions?: GenerationOptionsInput,
    project?: Project | null
  ): { keyword: string; geo?: string; options?: GenerationOptionsInput; outlineId?: string } {
    // Extract keywords: first = focus keyword, rest = includeKeywords
    const allKeywords = page.keywords
      ? page.keywords.split(',').map((k) => k.trim()).filter(Boolean)
      : [];

    const focusKeyword = allKeywords[0] || page.metaTitle || '';
    const includeKeywords = allKeywords.slice(1);

    // Map page type to article size preset
    const sizePreset = mapPageTypeToSizePreset(page.pageType);

    // Build project-level voice defaults (lowest priority)
    const projectVoiceDefaults: Partial<GenerationOptionsInput> = {};
    if (project) {
      if (project.tone) projectVoiceDefaults.tone = project.tone as GenerationOptionsInput['tone'];
      if (project.pointOfView) projectVoiceDefaults.pointOfView = project.pointOfView as GenerationOptionsInput['pointOfView'];
      if (project.formality) projectVoiceDefaults.formality = project.formality as GenerationOptionsInput['formality'];
      if (project.customTonePrompt) projectVoiceDefaults.customTonePrompt = project.customTonePrompt;
    }

    // Build per-page voice/settings overrides (highest priority)
    const pageOverrides: Partial<GenerationOptionsInput> = {};
    if (page.tone) pageOverrides.tone = page.tone as GenerationOptionsInput['tone'];
    if (page.pointOfView) pageOverrides.pointOfView = page.pointOfView as GenerationOptionsInput['pointOfView'];
    if (page.formality) pageOverrides.formality = page.formality as GenerationOptionsInput['formality'];
    if (page.customTonePrompt) pageOverrides.customTonePrompt = page.customTonePrompt;
    if (page.templateId) pageOverrides.templateId = page.templateId;
    if (page.articleSizePreset) pageOverrides.articleSize = { preset: page.articleSizePreset as any };

    // Merge order: projectVoiceDefaults < overrideOptions (batch) < pageOverrides
    const options: GenerationOptionsInput = {
      ...projectVoiceDefaults,
      ...overrideOptions,
      ...pageOverrides,
      title: page.metaTitle || undefined,
      includeKeywords: includeKeywords.length > 0 ? includeKeywords : overrideOptions?.includeKeywords,
      projectId: page.projectId,
    };

    // Set article size from page type if not overridden at any level
    if (sizePreset && !pageOverrides.articleSize && !overrideOptions?.articleSize?.preset) {
      options.articleSize = {
        ...overrideOptions?.articleSize,
        preset: sizePreset as any,
      };
    }

    return {
      keyword: focusKeyword,
      geo: overrideOptions?.targetCountry || undefined,
      options,
      outlineId: page.outlineId,
    };
  }
}

export const contentPlanService = new ContentPlanService();
