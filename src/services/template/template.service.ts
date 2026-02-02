import {
  ArticleTemplate,
  ArticleTemplateSummary,
  TemplateSection,
  calculateTemplateWordCount,
  countTemplateSections,
} from '../../types/article-template';
import { getAllTemplates, getTemplateById } from '../../config/article-templates';
import { LANGUAGE_NAMES, Language } from '../../types/generation-options';

// Current year for template examples and guidance
const CURRENT_YEAR = new Date().getFullYear();

/**
 * Options for building template prompt sections
 */
export interface TemplatePromptOptions {
  /** Number of entries in the primary toplist (affects mini_review count) */
  toplistEntryCount?: number;
  /** Whether a toplist has been included */
  hasToplist?: boolean;
}

/**
 * Template Service - Manages article templates and builds template guidance for outline generation
 */
class TemplateService {
  /**
   * Get all available templates
   */
  getAllTemplates(): ArticleTemplate[] {
    return getAllTemplates();
  }

  /**
   * Get all templates as summaries (lighter weight for listing)
   */
  getAllTemplateSummaries(): ArticleTemplateSummary[] {
    return getAllTemplates().map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      icon: template.icon,
      category: template.category,
      targetWordCount: calculateTemplateWordCount(template),
      sectionCount: countTemplateSections(template),
      isBuiltIn: template.isBuiltIn,
    }));
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(id: string): ArticleTemplate | undefined {
    return getTemplateById(id);
  }

  /**
   * Build template guidance section for outline generation system prompt
   *
   * This creates detailed instructions for the LLM to follow the template structure
   * while generating localized, research-informed headings.
   */
  buildTemplatePromptSection(
    template: ArticleTemplate,
    language: Language,
    options?: TemplatePromptOptions
  ): string {
    const languageName = LANGUAGE_NAMES[language] || 'English (US)';
    const totalWordCount = calculateTemplateWordCount(template);
    const sectionCount = countTemplateSections(template);

    // Determine dynamic values based on toplist
    const toplistEntryCount = options?.toplistEntryCount;
    const hasToplist = options?.hasToplist || (toplistEntryCount !== undefined && toplistEntryCount > 0);

    // Use toplist entry count for review count if available, otherwise template default
    const reviewCount = toplistEntryCount ??
      (template.outlineSkeleton.find(s => s.isRepeatable)?.repeatCount || 10);

    let prompt = `
## TEMPLATE: ${template.name}

You MUST follow this exact section structure. Generate headings in ${languageName} that are informed by the keyword research provided.

**Template Requirements:**
- Total target word count: ~${totalWordCount} words
- Total sections: ${sectionCount}
- Generate headings that are TRANSLATED to ${languageName} and ADAPTED to the specific keyword/topic
- Do NOT use the guidance text as the actual heading - create natural, localized headings
- Current year is ${CURRENT_YEAR} - use this year in any headings that include a year
${hasToplist ? `
**TOPLIST-DRIVEN CONTENT:**
- A toplist with ${toplistEntryCount} entries has been provided
- Generate exactly ${reviewCount} individual review sections (one for each brand in the toplist)
- The main ranking heading should reference "${toplistEntryCount}" not "10" (e.g., "Top ${toplistEntryCount}" not "Top 10")
- ONLY write about brands that are in the provided toplist - do NOT invent additional brands
` : ''}
**Required Sections (in exact order):**

`;

    // Build section list
    let sectionNumber = 1;
    for (const section of template.outlineSkeleton) {
      // Adjust repeatable section count based on toplist
      const effectiveRepeatCount = section.isRepeatable && toplistEntryCount
        ? toplistEntryCount
        : section.repeatCount;

      // Adjust heading guidance for main_ranking if toplist count is known
      let adjustedSection = section;
      if (section.sectionType === 'main_ranking' && toplistEntryCount) {
        adjustedSection = {
          ...section,
          headingGuidance: section.headingGuidance.replace(
            /top 10/gi,
            `Top ${toplistEntryCount}`
          ),
        };
      }

      prompt += this.formatSectionGuidance(adjustedSection, sectionNumber, '');

      // Handle repeatable sections
      if (section.isRepeatable && effectiveRepeatCount) {
        prompt += `   (Repeat this section ${effectiveRepeatCount} times - one for each item in the toplist)\n`;
      }

      // Handle subsections
      if (section.subsections && section.subsections.length > 0) {
        for (let i = 0; i < section.subsections.length; i++) {
          const subsection = section.subsections[i];
          const subLabel = `${sectionNumber}${String.fromCharCode(97 + i)}`; // 1a, 1b, 1c...
          prompt += this.formatSectionGuidance(subsection, subLabel, '   ');
        }
      }

      sectionNumber++;
    }

    prompt += `
**Heading Generation Rules:**
1. Translate headings to ${languageName} - they must sound native, not translated
2. Include the main keyword naturally in key headings (introduction, main ranking, conclusion)
3. Use competitor research to inform heading style and terminology for this market
4. Match the componentType exactly as specified
5. Target the suggestedWordCount for each section
6. For repeatable sections (like individual reviews), generate exactly ${reviewCount} instances${hasToplist ? ' (matching the toplist)' : ''}
7. Use ${CURRENT_YEAR} (not 2024 or 2025) when including a year in headings

**Example Transformation (for Dutch market, keyword "casino zonder cruks"):**
- Template guidance: "A heading for the main top ${toplistEntryCount || 10} comparison table"
- Generated heading: "Top ${toplistEntryCount || 10} Casino's Zonder Cruks (${CURRENT_YEAR})"

- Template guidance: "A heading about payment and banking options"
- Generated heading: "Betaalmethodes & Uitbetalingen"
`;

    return prompt;
  }

  /**
   * Format a single section's guidance for the prompt
   */
  private formatSectionGuidance(
    section: TemplateSection,
    number: number | string,
    indent: string
  ): string {
    return `${indent}${number}. [${section.sectionType}] (H${section.level}, ${section.componentType}, ~${section.suggestedWordCount} words)
${indent}   Heading guidance: "${section.headingGuidance}"
${indent}   Purpose: ${section.purpose}
`;
  }

  /**
   * Get the additional system prompt for section writing (if template specifies one)
   */
  getAdditionalSystemPrompt(templateId: string): string | undefined {
    const template = this.getTemplate(templateId);
    return template?.additionalSystemPrompt;
  }

  /**
   * Check if a template exists
   */
  hasTemplate(id: string): boolean {
    return this.getTemplate(id) !== undefined;
  }
}

// Export singleton instance
export const templateService = new TemplateService();
