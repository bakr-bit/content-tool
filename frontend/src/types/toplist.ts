// Column definition for toplist templates
export interface ColumnDefinition {
  id: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'rating' | 'list' | 'badge';
  brandAttribute: string;
  width?: string;
  format?: string;
}

// Toplist template
export interface ToplistTemplate {
  templateId: string;
  name: string;
  description?: string;
  columns: ColumnDefinition[];
  createdAt: string;
  updatedAt?: string;
}

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

// Brand in the global library
export interface Brand {
  brandId: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  websiteUrl?: string;
  attributes: BrandAttributes;
  createdAt: string;
  updatedAt?: string;
}

// Toplist entry (brand in a specific toplist)
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

// Toplist
export interface Toplist {
  toplistId: string;
  articleId?: string;
  name: string;
  templateId?: string;
  columns: ColumnDefinition[];
  position: number;
  markdownOutput?: string;
  createdAt: string;
  updatedAt?: string;
  entries?: ToplistEntry[];
}

// Heading level for toplist in article
export type ToplistHeadingLevel = 'h2' | 'h3';

// Article toplist (used in form state)
export interface ArticleToplist extends Toplist {
  entries: ToplistEntry[];
  includeInArticle?: boolean;
  heading?: string;                    // Custom heading for the toplist section
  headingLevel?: ToplistHeadingLevel;  // H2 or H3
}

// List responses
export interface ListBrandsResult {
  brands: Brand[];
  total: number;
}

export interface ListToplistsResult {
  toplists: Toplist[];
  count: number;
}

export interface ListTemplatesResult {
  templates: ToplistTemplate[];
  count: number;
}

// Create/Update request types
export interface CreateBrandRequest {
  name: string;
  slug?: string;
  logoUrl?: string;
  websiteUrl?: string;
  attributes?: BrandAttributes;
}

export interface UpdateBrandRequest {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  attributes?: BrandAttributes;
}

export interface CreateToplistRequest {
  articleId?: string;
  name: string;
  templateId?: string;
  columns: ColumnDefinition[];
  position?: number;
  markdownOutput?: string;
}

export interface UpdateToplistRequest {
  articleId?: string | null;
  name?: string;
  templateId?: string | null;
  columns?: ColumnDefinition[];
  position?: number;
  markdownOutput?: string | null;
}

export interface CreateEntryRequest {
  brandId: string;
  rank: number;
  attributeOverrides?: BrandAttributes;
}

export interface UpdateEntryRequest {
  rank?: number;
  attributeOverrides?: BrandAttributes;
}

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
