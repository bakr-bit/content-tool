import {
  ArticleTemplate,
  ArticleTemplateSummary,
  TemplateSection,
  calculateTemplateWordCount,
  countTemplateSections,
} from '../../types/article-template';
import { getAllTemplates, getTemplateById } from '../../config/article-templates';
import { LANGUAGE_NAMES, Language } from '../../types/generation-options';

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
  buildTemplatePromptSection(template: ArticleTemplate, language: Language): string {
    const languageName = LANGUAGE_NAMES[language] || 'English (US)';
    const totalWordCount = calculateTemplateWordCount(template);
    const sectionCount = countTemplateSections(template);

    let prompt = `
## TEMPLATE: ${template.name}

You MUST follow this exact section structure. Generate headings in ${languageName} that are informed by the keyword research provided.

**Template Requirements:**
- Total target word count: ~${totalWordCount} words
- Total sections: ${sectionCount}
- Generate headings that are TRANSLATED to ${languageName} and ADAPTED to the specific keyword/topic
- Do NOT use the guidance text as the actual heading - create natural, localized headings

**Required Sections (in exact order):**

`;

    // Build section list
    let sectionNumber = 1;
    for (const section of template.outlineSkeleton) {
      prompt += this.formatSectionGuidance(section, sectionNumber, '');

      // Handle repeatable sections
      if (section.isRepeatable && section.repeatCount) {
        prompt += `   (Repeat this section ${section.repeatCount} times with different items)\n`;
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
6. For repeatable sections (like individual reviews), generate all ${template.outlineSkeleton.find(s => s.isRepeatable)?.repeatCount || 10} instances

**Example Transformation (for Dutch market, keyword "casino zonder cruks"):**
- Template guidance: "A heading for the main top 10 comparison table"
- Generated heading: "Top 10 Casino's Zonder Cruks (2025)"

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
