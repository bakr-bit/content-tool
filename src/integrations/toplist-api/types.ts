/**
 * Types for the external Toplist API integration.
 *
 * The Toplist API manages brands and toplists across multiple sites.
 * In the content tool, each Project maps to a Site (using projectId as siteKey).
 */

// ============================================================================
// Site Types (maps to Project)
// ============================================================================

export interface Site {
  siteKey: string;
  domain: string;
  name: string;
  serps?: Array<{ keyword: string; geo: string }> | null;
  toplistCount?: number;
  createdAt?: string;
}

export interface CreateSiteInput {
  domain: string;
  name: string;
  serps?: Array<{ keyword: string; geo: string }>;
}

export interface UpdateSiteInput {
  name?: string;
  serps?: Array<{ keyword: string; geo: string }> | null;
}

// ============================================================================
// Brand Types (global across all sites)
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

export interface CreateBrandInput {
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

export interface UpdateBrandInput {
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
// Toplist Types
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

export interface CreateToplistInput {
  slug: string;
  title?: string;
}

export interface UpdateToplistInput {
  title?: string;
  pages?: string[];
}

// ============================================================================
// Toplist Item Types
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
// API Response Types
// ============================================================================

export interface ToplistApiError {
  error: string;
  details?: unknown;
  missingBrands?: string[];
  usageCount?: number;
}

export interface UpdateItemsResponse {
  success: boolean;
  itemCount: number;
  updatedAt: string;
}

export interface DeleteSiteResponse {
  success: boolean;
  deletedToplistCount: number;
}
