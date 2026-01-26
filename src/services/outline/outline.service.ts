import { v4 as uuidv4 } from 'uuid';
import { getDefaultProvider } from '../../integrations/llm';
import { researchService } from '../research';
import { Outline, OutlineSection, OutlineMetadata, LLMMessage, DeepResearchResult, GapAnalysisResult } from '../../types';
import { GenerationOptionsInput } from '../../types/generation-options';
import { NotFoundError } from '../../utils/errors';
import { createChildLogger } from '../../utils/logger';
import { buildOutlineSystemPrompt, buildOutlineUserPrompt } from './prompts';
import { validateOutline } from './validators';

const logger = createChildLogger('OutlineService');

// In-memory storage for outlines
const outlineStore = new Map<string, Outline>();

interface OutlineGenerateOptions {
  researchId: string;
  options?: GenerationOptionsInput;
  deepResearch?: DeepResearchResult;
  gapAnalysis?: GapAnalysisResult;
}

interface OutlineUpdateOptions {
  sections?: OutlineSection[];
  metadata?: Partial<OutlineMetadata>;
}

interface GeneratedOutlineResponse {
  title: string;
  sections: OutlineSection[];
  metadata: OutlineMetadata;
}

export class OutlineService {
  private llm = getDefaultProvider();

  async generateOutline(input: OutlineGenerateOptions): Promise<Outline> {
    const { researchId, options, deepResearch, gapAnalysis } = input;

    logger.info({ researchId, hasDeepResearch: !!deepResearch }, 'Generating outline');

    // Fetch research data
    const research = researchService.getResearch(researchId);
    if (!research) {
      throw new NotFoundError('Research');
    }

    // Build prompts with options and deep research context
    const systemPrompt = buildOutlineSystemPrompt(options);
    const userPrompt = buildOutlineUserPrompt(research, options, deepResearch, gapAnalysis);

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // Generate outline via LLM with sufficient tokens for complex outlines
    const response = await this.llm.completeWithJson<GeneratedOutlineResponse>(messages, {
      maxTokens: 8192, // Outlines can be large with many sections
    });

    logger.debug({ responseKeys: Object.keys(response || {}) }, 'LLM outline response structure');

    // Validate response structure
    if (!response || !response.sections || !Array.isArray(response.sections)) {
      logger.error({ response: JSON.stringify(response).slice(0, 500) }, 'Invalid outline response from LLM');
      throw new Error('LLM returned invalid outline structure - missing sections array');
    }

    // Add IDs to sections if missing
    const sectionsWithIds = this.ensureSectionIds(response.sections);

    // Validate and reorder sections (intro first, conclusion last)
    const validationResult = validateOutline(sectionsWithIds);

    if (validationResult.warnings.length > 0) {
      logger.warn({ warnings: validationResult.warnings }, 'Outline validation issues detected');
    }

    const outline: Outline = {
      outlineId: uuidv4(),
      researchId,
      keyword: research.keyword,
      title: response.title || options?.title || research.keyword,
      sections: validationResult.sections,
      metadata: {
        estimatedWordCount: response.metadata.estimatedWordCount || this.calculateWordCount(sectionsWithIds),
        suggestedKeywords: response.metadata.suggestedKeywords || [research.keyword],
        targetAudience: response.metadata.targetAudience,
        tone: response.metadata.tone || options?.tone,
      },
      createdAt: new Date().toISOString(),
    };

    // Store the outline
    outlineStore.set(outline.outlineId, outline);

    logger.info({ outlineId: outline.outlineId, sectionCount: outline.sections.length }, 'Outline generated');

    return outline;
  }

  async updateOutline(outlineId: string, updates: OutlineUpdateOptions): Promise<Outline> {
    const outline = outlineStore.get(outlineId);
    if (!outline) {
      throw new NotFoundError('Outline');
    }

    if (updates.sections) {
      outline.sections = this.ensureSectionIds(updates.sections);
    }

    if (updates.metadata) {
      outline.metadata = { ...outline.metadata, ...updates.metadata };
    }

    outline.updatedAt = new Date().toISOString();
    outlineStore.set(outlineId, outline);

    logger.info({ outlineId }, 'Outline updated');

    return outline;
  }

  getOutline(outlineId: string): Outline | undefined {
    return outlineStore.get(outlineId);
  }

  getAllOutlines(): Outline[] {
    return Array.from(outlineStore.values());
  }

  private ensureSectionIds(sections: OutlineSection[], prefix = 'section'): OutlineSection[] {
    return sections.map((section, index) => ({
      ...section,
      id: section.id || `${prefix}-${index + 1}`,
      subsections: section.subsections
        ? this.ensureSectionIds(section.subsections, `${prefix}-${index + 1}`)
        : undefined,
    }));
  }

  private calculateWordCount(sections: OutlineSection[]): number {
    return sections.reduce((total, section) => {
      const sectionCount = section.suggestedWordCount || 200;
      const subsectionCount = section.subsections
        ? this.calculateWordCount(section.subsections)
        : 0;
      return total + sectionCount + subsectionCount;
    }, 0);
  }
}

export const outlineService = new OutlineService();
