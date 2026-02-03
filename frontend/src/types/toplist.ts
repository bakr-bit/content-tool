// Column definition for toplist templates
export interface ColumnDefinition {
  id: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'rating' | 'list' | 'badge';
  brandAttribute: string;
  width?: string;
  format?: string;
}

// Toplist template (kept local)
export interface ToplistTemplate {
  templateId: string;
  name: string;
  description?: string;
  columns: ColumnDefinition[];
  createdAt: string;
  updatedAt?: string;
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

export interface CreateBrandRequest {
  brandId: string;
  name: string;
  website?: string;
  description?: string;
  defaultLogo?: string;
  defaultBonus?: string;
  defaultAffiliateUrl?: string;
  defaultRating?: number;
  terms?: string;
  license?: string;
  pros?: string[];
  cons?: string[];
}

export interface UpdateBrandRequest {
  name?: string;
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

export interface CreateToplistRequest {
  slug: string;
  title?: string;
}

export interface UpdateToplistRequest {
  title?: string;
  pages?: string[];
}

// ============================================================================
// Toplist Item types
// ============================================================================

export interface ToplistItem {
  brandId: string;
  brandName?: string;
  brandLogo?: string | null;
  bonus?: string | null;
  affiliateUrl?: string | null;
  reviewUrl?: string | null;
  rating?: number | null;
  cta?: string | null;
  logoOverride?: string | null;
  termsOverride?: string | null;
  licenseOverride?: string | null;
  prosOverride?: string[] | null;
  consOverride?: string[] | null;
}

export interface ToplistItemInput {
  brandId: string;
  bonus?: string | null;
  affiliateUrl?: string | null;
  reviewUrl?: string | null;
  rating?: number | null;
  cta?: string | null;
  logoOverride?: string | null;
  termsOverride?: string | null;
  licenseOverride?: string | null;
  prosOverride?: string[] | null;
  consOverride?: string[] | null;
}

export interface ToplistWithItems extends Toplist {
  items: ToplistItem[];
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

export interface ListBrandsResult {
  brands: Brand[];
  count: number;
}

export interface ListToplistsResult {
  toplists: Toplist[];
  count: number;
}

export interface ListTemplatesResult {
  templates: ToplistTemplate[];
  count: number;
}

// ============================================================================
// Template request types (kept local)
// ============================================================================

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  columns: ColumnDefinition[];
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  columns?: ColumnDefinition[];
}

// ============================================================================
// Legacy types (kept for backwards compatibility with existing code)
// ============================================================================

// Brand attributes (extensible) - legacy format
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

// Legacy toplist entry type
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

// Legacy article toplist type
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

// Heading level for toplist in article
export type ToplistHeadingLevel = 'h2' | 'h3';

// Legacy request types
export interface CreateEntryRequest {
  brandId: string;
  rank: number;
  attributeOverrides?: BrandAttributes;
}

export interface UpdateEntryRequest {
  rank?: number;
  attributeOverrides?: BrandAttributes;
}

// ============================================================================
// Constants
// ============================================================================

// Column type display names
export const COLUMN_TYPE_NAMES: Record<ColumnDefinition['type'], string> = {
  text: 'Text',
  number: 'Number',
  currency: 'Currency',
  rating: 'Rating',
  list: 'List',
  badge: 'Badge',
};

// Common brand attributes for quick selection
export const COMMON_BRAND_ATTRIBUTES = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'license', label: 'License', type: 'text' },
  { key: 'welcomeOffer', label: 'Welcome Offer', type: 'text' },
  { key: 'wageringRequirement', label: 'Wagering Requirement', type: 'text' },
  { key: 'withdrawalTime', label: 'Withdrawal Time', type: 'text' },
  { key: 'paymentMethods', label: 'Payment Methods', type: 'list' },
  { key: 'highlights', label: 'Highlights', type: 'list' },
  { key: 'bestFor', label: 'Best For', type: 'text' },
  { key: 'overallScore', label: 'Overall Score', type: 'rating' },
  { key: 'oddsQuality', label: 'Odds Quality', type: 'text' },
  { key: 'markets', label: 'Markets', type: 'list' },
  { key: 'liveStreaming', label: 'Live Streaming', type: 'badge' },
  { key: 'cashOut', label: 'Cash Out', type: 'badge' },
] as const;
