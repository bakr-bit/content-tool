import { getDefaultProvider } from '../../integrations/llm';
import { Outline, OutlineSection, GeneratedSection, LLMMessage, SectionResearchContext, VerifiedSource } from '../../types';
import { GenerationOptionsInput } from '../../types/generation-options';
import { createChildLogger } from '../../utils/logger';
import { buildSectionWriterSystemPrompt, buildSectionWriterUserPrompt } from './prompts';
import { citationService } from '../citations';

const logger = createChildLogger('SectionWriter');

export class SectionWriter {
  private llm = getDefaultProvider();

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
    logger.debug({ sectionId: section.id, heading: section.heading }, 'Writing section');

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
