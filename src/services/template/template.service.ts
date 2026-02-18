import {
  ArticleTemplate,
  ArticleTemplateSummary,
  TemplateSection,
  TemplateSectionSummary,
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
      // Include settings for form application
      articleSize: template.articleSize,
      structure: template.structure,
      suggestedTone: template.suggestedTone,
      suggestedPointOfView: template.suggestedPointOfView,
      suggestedFormality: template.suggestedFormality,
      // Include section summaries for UI display
      sections: this.getSectionSummaries(template),
    }));
  }

  /**
   * Get section summaries from a template for UI display
   */
  private getSectionSummaries(template: ArticleTemplate): TemplateSectionSummary[] {
    const sections: TemplateSectionSummary[] = [];

    const addSection = (section: TemplateSection, isSubsection = false) => {
      // Convert section type to readable name
      const name = section.sectionType
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      sections.push({
        id: section.id,
        name: isSubsection ? `  ${name}` : name,
        componentType: section.componentType,
        wordCount: section.suggestedWordCount,
        isRepeatable: section.isRepeatable,
        repeatCount: section.repeatCount,
      });

      // Add subsections
      if (section.subsections) {
        for (const subsection of section.subsections) {
          addSection(subsection, true);
        }
      }
    };

    for (const section of template.outlineSkeleton) {
      addSection(section);
    }

    return sections;
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
1. **CRITICAL: Match the heading guidance TOPIC** - The heading guidance specifies what the section should be ABOUT. Your generated heading MUST be about the SAME topic. For example:
   - If guidance says "A heading about responsible gambling", generate a heading about responsible gambling (NOT about licenses)
   - If guidance says "A heading about payment methods", generate a heading about payments (NOT about bonuses)
   - The heading topic dictates what the section writer will cover - wrong topic = wrong content
2. Translate headings to ${languageName} - they must sound native, not translated
3. Include the main keyword naturally in key headings (introduction, main ranking, conclusion)
4. Use competitor research to inform heading style and terminology for this market
5. Match the componentType exactly as specified
6. Target the suggestedWordCount for each section
7. For repeatable sections (like individual reviews), generate exactly ${reviewCount} instances${hasToplist ? ' (matching the toplist)' : ''}
8. Use ${CURRENT_YEAR} (not 2024 or 2025) when including a year in headings

**CRITICAL - Section Description Rules:**
When generating the "description" field for each section, you MUST:
1. Look for any ⚠️ CONSTRAINT lines - these are MANDATORY exclusions
2. Copy the constraint verbatim into the description (e.g., "NOTE: Do NOT cover X in this section")
3. The description is passed to the content writer - if it doesn't include the constraint, the writer WILL cover forbidden topics
4. Example: If you see "⚠️ CONSTRAINT: Do NOT list responsible gambling tools", your description MUST end with: "NOTE: Do NOT list responsible gambling tools - covered elsewhere."

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
    // Extract DEDUP constraints from purpose
    const dedupMatch = section.purpose.match(/DEDUP:([^.]+\.)/);
    const dedupConstraint = dedupMatch ? `\n${indent}   ⚠️ CONSTRAINT: ${dedupMatch[1].trim()}` : '';

    // Clean purpose (remove DEDUP for cleaner display, but keep other content)
    const cleanPurpose = section.purpose.replace(/DEDUP:[^.]+\./g, '').trim();

    return `${indent}${number}. [${section.sectionType}] (H${section.level}, ${section.componentType}, ~${section.suggestedWordCount} words)
${indent}   🎯 TOPIC: "${section.headingGuidance}" ← Your heading MUST be about this topic
${indent}   Purpose: ${cleanPurpose}${dedupConstraint}
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

  /**
   * Get DEDUP constraints for a specific section type from a template
   * Returns the constraint text if found, or undefined if no constraints
   */
  getSectionConstraints(templateId: string, sectionId: string): string | undefined {
    const template = this.getTemplate(templateId);
    if (!template) return undefined;

    // Normalize ID for comparison (handle both underscore and hyphen formats)
    const normalizeId = (id: string) => id.toLowerCase().replace(/[-_]/g, '');
    const normalizedInput = normalizeId(sectionId);

    // Find section by ID (checking both top-level and subsections)
    for (const section of template.outlineSkeleton) {
      // Check if this section matches (by sectionType or id, normalized)
      if (normalizeId(section.sectionType) === normalizedInput ||
          normalizeId(section.id) === normalizedInput) {
        const match = section.purpose.match(/DEDUP:([^.]+\.)/);
        return match ? match[1].trim() : undefined;
      }

      // Check subsections
      if (section.subsections) {
        for (const sub of section.subsections) {
          if (normalizeId(sub.sectionType) === normalizedInput ||
              normalizeId(sub.id) === normalizedInput) {
            const match = sub.purpose.match(/DEDUP:([^.]+\.)/);
            return match ? match[1].trim() : undefined;
          }
        }
      }
    }

    return undefined;
  }
}

// Export singleton instance
export const templateService = new TemplateService();
