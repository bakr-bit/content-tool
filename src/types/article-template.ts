import { ComponentType } from './index';
import { ArticleSize, StructureToggles, ToneOfVoice, PointOfView, Formality } from './generation-options';

/**
 * Article Template - Structural blueprint for article outline generation
 *
 * Templates provide a predefined section structure that guides the LLM
 * while allowing it to generate localized, research-informed headings.
 */
export interface ArticleTemplate {
  /** Unique template identifier */
  id: string;

  /** Display name */
  name: string;

  /** Brief description of template purpose */
  description: string;

  /** Lucide icon name for UI display */
  icon: string;

  /** Template category for organization */
  category: 'affiliate' | 'editorial' | 'guide' | 'custom';

  /** Default article size configuration */
  articleSize: ArticleSize;

  /** Default structure toggles */
  structure: Partial<StructureToggles>;

  /** Suggested tone for this template type */
  suggestedTone?: ToneOfVoice;

  /** Suggested point of view */
  suggestedPointOfView?: PointOfView;

  /** Suggested formality level */
  suggestedFormality?: Formality;

  /** The section structure blueprint */
  outlineSkeleton: TemplateSection[];

  /** Additional system prompt for section writing (dense affiliate style, etc.) */
  additionalSystemPrompt?: string;

  /** Whether this is a built-in system template */
  isBuiltIn?: boolean;
}

/**
 * Template Section - Blueprint for a single section in the outline
 *
 * The LLM uses this to generate actual headings that are:
 * - Translated to the target language
 * - Informed by keyword research
 * - Adapted to the specific topic
 */
export interface TemplateSection {
  /** Unique section identifier within template */
  id: string;

  /** Section type identifier (e.g., "introduction", "methodology", "main_ranking") */
  sectionType: string;

  /** Guidance for LLM on what heading to generate */
  headingGuidance: string;

  /** Heading level (H2 or H3) */
  level: 2 | 3;

  /** Component type for this section */
  componentType: ComponentType;

  /** What this section should cover (used to generate description) */
  purpose: string;

  /** Target word count for this section */
  suggestedWordCount: number;

  /** Whether this section can be repeated (e.g., individual reviews) */
  isRepeatable?: boolean;

  /** Number of times to repeat if isRepeatable is true */
  repeatCount?: number;

  /** Nested subsections (H3 under H2) */
  subsections?: TemplateSection[];
}

/**
 * Summary info for template listing (lighter weight for API responses)
 */
export interface ArticleTemplateSummary {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'affiliate' | 'editorial' | 'guide' | 'custom';
  targetWordCount: number;
  sectionCount: number;
  isBuiltIn?: boolean;
}

/**
 * Calculate total target word count for a template
 */
export function calculateTemplateWordCount(template: ArticleTemplate): number {
  let total = 0;

  function countSection(section: TemplateSection): number {
    let sectionTotal = section.suggestedWordCount;

    if (section.isRepeatable && section.repeatCount) {
      sectionTotal *= section.repeatCount;
    }

    if (section.subsections) {
      for (const subsection of section.subsections) {
        sectionTotal += countSection(subsection);
      }
    }

    return sectionTotal;
  }

  for (const section of template.outlineSkeleton) {
    total += countSection(section);
  }

  return total;
}

/**
 * Count total sections in a template (including subsections and repeats)
 */
export function countTemplateSections(template: ArticleTemplate): number {
  let count = 0;

  function countSection(section: TemplateSection): number {
    let sectionCount = section.isRepeatable && section.repeatCount ? section.repeatCount : 1;

    if (section.subsections) {
      for (const subsection of section.subsections) {
        sectionCount += countSection(subsection);
      }
    }

    return sectionCount;
  }

  for (const section of template.outlineSkeleton) {
    count += countSection(section);
  }

  return count;
}
