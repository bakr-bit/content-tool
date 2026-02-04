import { getDefaultProvider } from '../../integrations/llm';
import { Outline, OutlineSection, GeneratedSection, LLMMessage, SectionResearchContext, VerifiedSource } from '../../types';
import { GenerationOptionsInput, ToplistDataForGeneration } from '../../types/generation-options';
import { createChildLogger } from '../../utils/logger';
import { buildSectionWriterSystemPrompt, buildSectionWriterUserPrompt } from './prompts';
import { citationService } from '../citations';
import { generateToplistMarkdownAsync, ToplistData } from '../toplist';

const logger = createChildLogger('SectionWriter');

export class SectionWriter {
  private llm = getDefaultProvider();

  /**
   * Generate markdown content for a toplist section
   * Translates content to target language if specified
   */
  private async generateToplistSection(
    section: OutlineSection,
    toplistData: ToplistDataForGeneration,
    language?: string
  ): Promise<string> {
    // Convert ToplistDataForGeneration to ToplistData format
    const toplist: ToplistData = {
      toplistId: toplistData.toplistId,
      name: toplistData.name,
      columns: toplistData.columns,
      entries: toplistData.entries.map(e => ({
        entryId: e.entryId,
        brandId: e.brandId,
        rank: e.rank,
        attributeOverrides: e.attributeOverrides as Record<string, unknown> | undefined,
        brand: e.brand ? {
          brandId: e.brand.brandId,
          name: e.brand.name,
          slug: e.brand.slug,
          logoUrl: e.brand.logoUrl,
          websiteUrl: e.brand.websiteUrl,
          attributes: e.brand.attributes as Record<string, unknown>,
          createdAt: e.brand.createdAt,
          updatedAt: e.brand.updatedAt,
        } : undefined,
      })),
      // Don't include heading here - the section heading is used instead
      headingLevel: undefined,
    };

    // Generate just the table (no heading - section provides the heading)
    // Uses async version to translate content to target language
    const markdown = await generateToplistMarkdownAsync(toplist, language);

    // Remove the heading line from the markdown since section already has heading
    const lines = markdown.split('\n');
    const tableStartIndex = lines.findIndex(line => line.startsWith('|'));
    if (tableStartIndex > 0) {
      return lines.slice(tableStartIndex).join('\n');
    }

    return markdown;
  }

  async writeSection(
    section: OutlineSection,
    outline: Outline,
    previousSections: GeneratedSection[],
    researchContext: string,
    options?: GenerationOptionsInput,
    sectionResearch?: SectionResearchContext,
    allSources?: VerifiedSource[],
    siblingSections?: OutlineSection[]
  ): Promise<GeneratedSection> {
    logger.debug({ sectionId: section.id, heading: section.heading, toplistId: section.toplistId }, 'Writing section');

    // Handle toplist sections - generate markdown directly without LLM
    if (section.toplistId && options?.toplists) {
      const toplistData = options.toplists.find(t => t.toplistId === section.toplistId);
      if (toplistData) {
        logger.debug({ sectionId: section.id, toplistId: section.toplistId }, 'Generating toplist section with translation');
        const content = await this.generateToplistSection(section, toplistData, options.language);
        const wordCount = content.split(/\s+/).filter(Boolean).length;
        return {
          id: section.id,
          heading: section.heading,
          content,
          wordCount,
        };
      }
      logger.warn({ sectionId: section.id, toplistId: section.toplistId }, 'Toplist not found in options, falling back to LLM');
    }

    // Prevent LLM from generating toplist tables when actual toplist data exists
    // This avoids duplicate toplists in the article
    if (section.componentType === 'toplist' && options?.toplists && options.toplists.length > 0) {
      logger.warn(
        { sectionId: section.id, componentType: section.componentType },
        'Section has componentType=toplist but no toplistId - converting to prose to avoid duplicate tables'
      );
      // Override to prose to prevent LLM from generating a competing table
      section = { ...section, componentType: 'prose' };
    }

    // Determine if we have any sources to cite
    const hasSources = !!sectionResearch || (allSources && allSources.length > 0);

    const systemPrompt = buildSectionWriterSystemPrompt(options, hasSources);

    // Build source context if we have topic-level sources but no section-specific research
    let sourceContext = '';
    if (!sectionResearch && allSources && allSources.length > 0) {
      sourceContext = citationService.buildSourceContext(allSources);
    }

    const userPrompt = buildSectionWriterUserPrompt(
      section,
      outline,
      previousSections,
      researchContext,
      options,
      sectionResearch,
      sourceContext,
      siblingSections
    );

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // Calculate tokens based on suggested word count (2 tokens per word + buffer)
    const targetWords = section.suggestedWordCount || 500;
    const maxTokens = Math.ceil(targetWords * 2.5) + 1000;

    const response = await this.llm.complete(messages, { maxTokens });

    const content = response.content.trim();
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    logger.debug({ sectionId: section.id, wordCount }, 'Section written');

    return {
      id: section.id,
      heading: section.heading,
      content,
      wordCount,
    };
  }

  async writeSections(
    sections: OutlineSection[],
    outline: Outline,
    researchContext: string,
    options?: GenerationOptionsInput,
    sectionResearchMap?: Map<string, SectionResearchContext>,
    allSources?: VerifiedSource[]
  ): Promise<GeneratedSection[]> {
    const generatedSections: GeneratedSection[] = [];

    for (const section of sections) {
      const sectionResearch = sectionResearchMap?.get(section.id);
      // Pass other top-level sections as siblings
      const siblingTopSections = sections.filter(s => s.id !== section.id);
      const generated = await this.writeSection(
        section,
        outline,
        generatedSections,
        researchContext,
        options,
        sectionResearch,
        allSources,
        siblingTopSections
      );
      generatedSections.push(generated);

      // Handle subsections
      if (section.subsections && section.subsections.length > 0) {
        for (const subsection of section.subsections) {
          const subsectionResearch = sectionResearchMap?.get(subsection.id);
          // Pass other subsections in the same parent as siblings
          const siblingSubsections = section.subsections.filter(s => s.id !== subsection.id);
          const generatedSub = await this.writeSection(
            subsection,
            outline,
            generatedSections,
            researchContext,
            options,
            subsectionResearch,
            allSources,
            siblingSubsections
          );
          generatedSections.push(generatedSub);
        }
      }
    }

    return generatedSections;
  }
}

export const sectionWriter = new SectionWriter();
