import { v4 as uuidv4 } from 'uuid';
import { researchService } from '../research';
import { outlineService } from '../outline';
import { articleService } from '../article';
import { deepResearchService } from '../deep-research';
import { knowledgeBaseService } from '../knowledge-base';
import { vectorStoreService } from '../vector-store';
import {
  WorkflowState,
  WorkflowStatus,
  DeepResearchResult,
  GapAnalysisResult,
  SectionResearchContext,
  VerifiedSource,
  ResearchResult,
  ScrapedPage,
} from '../../types';
import { GenerationOptionsInput } from '../../types/generation-options';
import { mergeDeepResearchOptions } from '../../config/deep-research';
import { createChildLogger } from '../../utils/logger';

const logger = createChildLogger('WorkflowOrchestrator');

// In-memory storage for workflow states
const workflowStore = new Map<string, WorkflowState>();

interface FullWorkflowOptions {
  keyword: string;
  geo?: string;
  options?: GenerationOptionsInput;
  outlineId?: string;  // If provided, skip outline generation and use existing outline
}

// Extended workflow status to include deep research phases
type ExtendedWorkflowStatus = WorkflowStatus | 'deep-researching' | 'gap-analyzing' | 'section-researching';

export class WorkflowOrchestrator {
  async runFullWorkflow(input: FullWorkflowOptions): Promise<WorkflowState> {
    const { keyword, geo = 'us', options, outlineId: existingOutlineId } = input;

    const workflowId = uuidv4();
    const workflow: WorkflowState = {
      workflowId,
      status: 'pending',
      keyword,
      geo,
      startedAt: new Date().toISOString(),
    };

    workflowStore.set(workflowId, workflow);

    // Resolve deep research options
    const deepResearchOptions = mergeDeepResearchOptions(options?.deepResearch);
    const isDeepResearchEnabled = deepResearchOptions.enabled;

    logger.info(
      {
        workflowId,
        keyword,
        geo,
        deepResearchEnabled: isDeepResearchEnabled,
        topicLevelResearch: deepResearchOptions.topicLevelResearch,
        sectionLevelResearch: deepResearchOptions.sectionLevelResearch,
        includeCitations: deepResearchOptions.includeCitations,
        hasToplist: !!options?.toplists,
        toplistCount: options?.toplists?.length || 0
      },
      'Starting full workflow'
    );

    // Variables to hold deep research results
    let topicResearch: DeepResearchResult | undefined;
    let gapAnalysis: GapAnalysisResult | undefined;
    let sectionResearch: Map<string, SectionResearchContext> | undefined;
    let allSources: VerifiedSource[] | undefined;

    try {
      // Step 1: Initial Research (based on researchSource option)
      this.updateWorkflowStatus(workflowId, 'researching');

      const researchSource = deepResearchOptions.researchSource || 'internet';
      let research: ResearchResult;

      if (researchSource === 'knowledge_base') {
        // Knowledge base only - skip internet research
        logger.info({ workflowId }, 'Using knowledge base only for research');
        research = await this.conductKnowledgeBaseResearch(keyword, geo);
      } else if (researchSource === 'both') {
        // Both internet and knowledge base
        logger.info({ workflowId }, 'Using both internet and knowledge base for research');
        const internetResearch = await researchService.conductResearch({ keyword, geo });
        const kbResults = await knowledgeBaseService.search(keyword, { limit: 10 });

        // Merge KB results into scraped content
        const kbContent: ScrapedPage[] = kbResults.map((result, idx) => ({
          url: result.sourceUrl || `kb://entry-${idx}`,
          title: result.sourceTitle || 'Knowledge Base Entry',
          content: result.content,
          wordCount: result.content.split(/\s+/).length,
          scrapedAt: new Date().toISOString(),
        }));

        research = {
          ...internetResearch,
          scrapedContent: [...internetResearch.scrapedContent, ...kbContent],
        };
      } else {
        // Internet only (default)
        research = await researchService.conductResearch({ keyword, geo });
      }

      workflow.research = research;

      // Step 2: Deep Research (if enabled)
      if (isDeepResearchEnabled && deepResearchOptions.topicLevelResearch) {
        logger.info({ workflowId }, 'Starting deep research phase');

        const deepResult = await deepResearchService.researchTopic(
          keyword,
          research.scrapedContent,
          deepResearchOptions
        );

        topicResearch = deepResult.research;
        gapAnalysis = deepResult.gaps;

        // Store in workflow for output
        workflow.deepResearch = topicResearch;
        workflow.gapAnalysis = gapAnalysis;

        logger.info(
          {
            workflowId,
            sourceCount: topicResearch.sources.length,
            factCount: topicResearch.facts.length,
            gapCount: gapAnalysis.gaps.length
          },
          'Deep research complete'
        );
      }

      // Step 3: Outline - use existing or generate new
      this.updateWorkflowStatus(workflowId, 'outlining');
      let outline;
      if (existingOutlineId) {
        // Use existing outline from the Outline tab
        outline = outlineService.getOutline(existingOutlineId);
        if (!outline) {
          throw new Error(`Outline not found: ${existingOutlineId}`);
        }
        logger.info({ workflowId, outlineId: existingOutlineId }, 'Using existing outline');
      } else {
        // Generate new outline
        outline = await outlineService.generateOutline({
          researchId: research.researchId,
          options,
          deepResearch: topicResearch,
          gapAnalysis,
        });
        logger.info({ workflowId, outlineId: outline.outlineId }, 'Generated new outline');
      }
      workflow.outline = outline;

      // Step 4: Section-level research (if enabled)
      if (isDeepResearchEnabled && deepResearchOptions.sectionLevelResearch && topicResearch) {
        logger.info({ workflowId }, 'Starting section-level research');

        sectionResearch = await deepResearchService.researchSections(
          outline,
          topicResearch,
          deepResearchOptions
        );

        // Build complete research state
        const researchState = deepResearchService.buildResearchState(
          topicResearch,
          gapAnalysis || { gaps: [], uniqueAngles: [], competitorWeaknesses: [] },
          sectionResearch
        );

        allSources = researchState.allSources;

        logger.info(
          {
            workflowId,
            sectionsResearched: sectionResearch.size,
            totalSources: allSources.length
          },
          'Section-level research complete'
        );
      } else if (isDeepResearchEnabled && topicResearch) {
        // Even without section-level research, use topic research sources
        allSources = topicResearch.sources;
        logger.info(
          { workflowId, totalSources: allSources.length },
          'Using topic-level sources (section research disabled)'
        );
      }

      // Step 5: Article writing (with deep research context if available)
      this.updateWorkflowStatus(workflowId, 'writing');
      const article = await articleService.generateArticle({
        outlineId: outline.outlineId,
        options,
        sectionResearch,
        allSources: deepResearchOptions.includeCitations ? allSources : undefined,
      });
      workflow.article = article;

      // Complete
      this.updateWorkflowStatus(workflowId, 'completed');
      workflow.completedAt = new Date().toISOString();

      logger.info(
        {
          workflowId,
          articleId: article.articleId,
          wordCount: article.metadata.wordCount,
          deepResearchEnabled: isDeepResearchEnabled,
          sourcesIncluded: allSources?.length || 0
        },
        'Workflow completed'
      );

      return workflow;
    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error instanceof Error ? error.message : 'Unknown error';
      workflowStore.set(workflowId, workflow);

      logger.error({ workflowId, error: workflow.error }, 'Workflow failed');
      throw error;
    }
  }

  getWorkflow(workflowId: string): WorkflowState | undefined {
    return workflowStore.get(workflowId);
  }

  getAllWorkflows(): WorkflowState[] {
    return Array.from(workflowStore.values());
  }

  private updateWorkflowStatus(workflowId: string, status: WorkflowStatus): void {
    const workflow = workflowStore.get(workflowId);
    if (workflow) {
      workflow.status = status;
      workflowStore.set(workflowId, workflow);
      logger.debug({ workflowId, status }, 'Workflow status updated');
    }
  }

  /**
   * Conduct research using only the knowledge base (no internet search)
   */
  private async conductKnowledgeBaseResearch(keyword: string, geo: string): Promise<ResearchResult> {
    const researchId = uuidv4();

    // Search the knowledge base
    const kbResults = await knowledgeBaseService.search(keyword, { limit: 15 });

    // Also search the vector store for any indexed page content
    const vectorResults = await vectorStoreService.search(keyword, {
      limit: 10,
      contentTypes: ['page_chunk', 'fact', 'research_answer'],
    });

    // Convert KB results to scraped content format
    const scrapedContent: ScrapedPage[] = [
      ...kbResults.map((result, idx) => ({
        url: result.sourceUrl || `kb://knowledge-base-${idx}`,
        title: result.sourceTitle || 'Knowledge Base',
        content: result.content,
        wordCount: result.content.split(/\s+/).length,
        scrapedAt: new Date().toISOString(),
      })),
      ...vectorResults
        .filter(r => !kbResults.some(kb => kb.content === r.content)) // Avoid duplicates
        .map((result, idx) => ({
          url: result.sourceUrl || `kb://vector-store-${idx}`,
          title: result.sourceTitle || 'Indexed Content',
          content: result.content,
          wordCount: result.content.split(/\s+/).length,
          scrapedAt: new Date().toISOString(),
        })),
    ];

    logger.info(
      { keyword, kbResults: kbResults.length, vectorResults: vectorResults.length, totalContent: scrapedContent.length },
      'Knowledge base research complete'
    );

    return {
      researchId,
      keyword,
      geo,
      serpResults: [], // No SERP results for KB-only research
      scrapedContent,
      peopleAlsoAsk: [],
      createdAt: new Date().toISOString(),
    };
  }
}

export const workflowOrchestrator = new WorkflowOrchestrator();
