// Column definition for toplist display
export interface ColumnDefinition {
  id: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'rating' | 'list' | 'badge';
  brandAttribute: string;
  width?: string;
  format?: string;
}

// ============================================================================
// Brand types (from external Toplist API)
// ============================================================================

export interface Brand {
  brandId: string;
  name: string;
  website?: string | null;
  description?: string | null;
  defaultLogo?: string | null;
  defaultBonus?: string | null;
  defaultAffiliateUrl?: string | null;
  defaultRating?: number | null;
  terms?: string | null;
  license?: string | null;
  pros?: string[] | null;
  cons?: string[] | null;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Toplist types (from external Toplist API)
// ============================================================================

export interface Toplist {
  id: string;
  siteKey: string;
  slug: string;
  title?: string | null;
  pages?: string[] | null;
  itemCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Resolved Toplist (public endpoint response with brand data merged)
// ============================================================================

export interface ResolvedToplistItem {
  brandId: string;
  name: string;
  logo?: string | null;
  affiliateUrl?: string | null;
  reviewUrl?: string | null;
  bonus?: string | null;
  rating?: number | null;
  cta?: string | null;
  terms?: string | null;
  license?: string | null;
  description?: string | null;
  pros?: string[] | null;
  cons?: string[] | null;
}

export interface ResolvedToplist {
  siteKey: string;
  slug: string;
  title?: string | null;
  updatedAt: string;
  items: ResolvedToplistItem[];
}

// ============================================================================
// List responses
// ============================================================================

export interface ListToplistsResult {
  toplists: Toplist[];
  count: number;
}

// ============================================================================
// Article toplist types (used internally for article rendering)
// ============================================================================

// Brand attributes (extensible)
export interface BrandAttributes {
  license?: string;
  welcomeOffer?: string;
  wageringRequirement?: number | string;
  withdrawalTime?: string;
  paymentMethods?: string[];
  highlights?: string[];
  bestFor?: string;
  overallScore?: number;
  oddsQuality?: string;
  markets?: string[];
  liveStreaming?: boolean;
  cashOut?: boolean;
  [key: string]: unknown;
}

// Toplist entry for articles
export interface ToplistEntry {
  entryId: string;
  toplistId: string;
  brandId: string;
  rank: number;
  attributeOverrides?: BrandAttributes;
  createdAt: string;
  updatedAt?: string;
  brand?: Brand;
}

// Heading level for toplist in article
export type ToplistHeadingLevel = 'h2' | 'h3';

// Article toplist type
export interface ArticleToplist {
  toplistId: string;
  articleId?: string;
  name: string;
  templateId?: string;
  columns: ColumnDefinition[];
  position: number;
  markdownOutput?: string;
  createdAt: string;
  updatedAt?: string;
  entries: ToplistEntry[];
  includeInArticle?: boolean;
  heading?: string;
  headingLevel?: ToplistHeadingLevel;
}
