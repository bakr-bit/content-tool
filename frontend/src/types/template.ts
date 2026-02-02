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
