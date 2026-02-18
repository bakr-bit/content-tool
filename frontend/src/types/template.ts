import type {
  ArticleSize,
  StructureToggles,
  ToneOfVoice,
  PointOfView,
  Formality,
} from './article';

/**
 * Section summary for template display
 */
export interface TemplateSectionSummary {
  id: string;
  name: string;
  componentType: string;
  wordCount: number;
  isRepeatable?: boolean;
  repeatCount?: number;
}

/**
 * Article template summary for frontend display
 */
export interface ArticleTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;  // Lucide icon name
  category: 'affiliate' | 'editorial' | 'guide' | 'custom';
  targetWordCount: number;
  sectionCount: number;
  isBuiltIn?: boolean;

  /** Template's article size configuration (locked when template selected) */
  articleSize?: ArticleSize;

  /** Template's structure toggles (locked when template selected) */
  structure?: Partial<StructureToggles>;

  /** Suggested tone for this template type */
  suggestedTone?: ToneOfVoice;

  /** Suggested point of view */
  suggestedPointOfView?: PointOfView;

  /** Suggested formality level */
  suggestedFormality?: Formality;

  /** Summary of sections included in the template */
  sections?: TemplateSectionSummary[];
}

/**
 * Template category display names
 */
export const TEMPLATE_CATEGORY_NAMES: Record<ArticleTemplate['category'], string> = {
  affiliate: 'Affiliate',
  editorial: 'Editorial',
  guide: 'Guide',
  custom: 'Custom',
};
