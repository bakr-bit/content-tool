import type { ApiResponse } from '@/types/article';
import type {
  ToplistTemplate,
  Brand,
  Toplist,
  ToplistWithItems,
  ToplistItemInput,
  ResolvedToplist,
  ListBrandsResult,
  ListToplistsResult,
  ListTemplatesResult,
  CreateBrandRequest,
  UpdateBrandRequest,
  CreateToplistRequest,
  UpdateToplistRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from '@/types/toplist';

const API_BASE = `${import.meta.env.VITE_API_URL || 'https://beneath-intervention-starsmerchant-diverse.trycloudflare.com/api/v1'}/toplist`;

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        message: data.error?.message || 'An error occurred',
        code: response.status,
      },
    };
  }

  return data;
}

// ===== Templates (local) =====

export async function getTemplates(): Promise<ApiResponse<ListTemplatesResult>> {
  return fetchApi<ListTemplatesResult>('/templates');
}

export async function getTemplate(id: string): Promise<ApiResponse<ToplistTemplate>> {
  return fetchApi<ToplistTemplate>(`/templates/${id}`);
}

export async function createTemplate(data: CreateTemplateRequest): Promise<ApiResponse<ToplistTemplate>> {
  return fetchApi<ToplistTemplate>('/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTemplate(id: string, data: UpdateTemplateRequest): Promise<ApiResponse<ToplistTemplate>> {
  return fetchApi<ToplistTemplate>(`/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTemplate(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/templates/${id}`, {
    method: 'DELETE',
  });
}

// ===== Brands (proxied to external Toplist API) =====

export async function getBrands(): Promise<ApiResponse<ListBrandsResult>> {
  return fetchApi<ListBrandsResult>('/brands');
}

export async function getBrand(brandId: string): Promise<ApiResponse<Brand>> {
  return fetchApi<Brand>(`/brands/${brandId}`);
}

export async function createBrand(data: CreateBrandRequest): Promise<ApiResponse<Brand>> {
  return fetchApi<Brand>('/brands', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBrand(brandId: string, data: UpdateBrandRequest): Promise<ApiResponse<Brand>> {
  return fetchApi<Brand>(`/brands/${brandId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteBrand(brandId: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/brands/${brandId}`, {
    method: 'DELETE',
  });
}

export async function searchBrands(query: string, limit = 10): Promise<Brand[]> {
  const result = await getBrands();
  if (!result.success || !result.data) return [];

  // Client-side filtering since the external API doesn't support search
  const searchLower = query.toLowerCase();
  return result.data.brands
    .filter(b => b.name.toLowerCase().includes(searchLower))
    .slice(0, limit);
}

// ===== Toplists (proxied to external Toplist API) =====

/**
 * List all toplists for a site (project).
 * @param siteKey The site key (projectId)
 */
export async function getToplists(siteKey: string): Promise<ApiResponse<ListToplistsResult>> {
  return fetchApi<ListToplistsResult>(`/sites/${siteKey}/toplists`);
}

/**
 * Get a toplist by slug (resolved with brand data).
 * @param siteKey The site key (projectId)
 * @param slug The toplist slug
 */
export async function getToplist(siteKey: string, slug: string): Promise<ApiResponse<ResolvedToplist>> {
  return fetchApi<ResolvedToplist>(`/sites/${siteKey}/toplists/${slug}`);
}

/**
 * Create a new toplist.
 * @param siteKey The site key (projectId)
 * @param data The toplist data (slug, title)
 */
export async function createToplist(siteKey: string, data: CreateToplistRequest): Promise<ApiResponse<Toplist>> {
  return fetchApi<Toplist>(`/sites/${siteKey}/toplists`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a toplist.
 * @param siteKey The site key (projectId)
 * @param slug The toplist slug
 * @param data The update data
 */
export async function updateToplist(siteKey: string, slug: string, data: UpdateToplistRequest): Promise<ApiResponse<Toplist>> {
  return fetchApi<Toplist>(`/sites/${siteKey}/toplists/${slug}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a toplist.
 * @param siteKey The site key (projectId)
 * @param slug The toplist slug
 */
export async function deleteToplist(siteKey: string, slug: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/sites/${siteKey}/toplists/${slug}`, {
    method: 'DELETE',
  });
}

// ===== Toplist Items =====

/**
 * Get toplist items (raw data for editor).
 * @param siteKey The site key (projectId)
 * @param slug The toplist slug
 */
export async function getToplistItems(siteKey: string, slug: string): Promise<ApiResponse<ToplistWithItems>> {
  return fetchApi<ToplistWithItems>(`/sites/${siteKey}/toplists/${slug}/items`);
}

/**
 * Update toplist items (replace all).
 * @param siteKey The site key (projectId)
 * @param slug The toplist slug
 * @param items The new items array
 */
export async function updateToplistItems(
  siteKey: string,
  slug: string,
  items: ToplistItemInput[]
): Promise<ApiResponse<{ success: boolean; itemCount: number; updatedAt: string }>> {
  return fetchApi<{ success: boolean; itemCount: number; updatedAt: string }>(
    `/sites/${siteKey}/toplists/${slug}/items`,
    {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }
  );
}

// ===== Legacy/Stub Functions (for backwards compatibility) =====

/**
 * @deprecated Use getToplists(siteKey) instead
 */
export async function getLibraryToplists(): Promise<ApiResponse<ListToplistsResult>> {
  // Return empty result - library is now per-project
  return {
    success: true,
    data: { toplists: [], count: 0 },
  };
}

/**
 * @deprecated No longer supported - toplists are managed in the Toplist API
 */
export async function saveToLibrary(_toplistId: string, _name?: string): Promise<ApiResponse<Toplist>> {
  return {
    success: false,
    error: { message: 'saveToLibrary is deprecated. Toplists are now managed in the Toplist API.', code: 501 },
  };
}

/**
 * @deprecated No longer supported - use getToplist(siteKey, slug) instead
 */
export async function loadFromLibrary(
  _libraryToplistId: string,
  _options?: { articleId?: string; position?: number }
): Promise<ApiResponse<Toplist>> {
  return {
    success: false,
    error: { message: 'loadFromLibrary is deprecated. Use getToplist(siteKey, slug) instead.', code: 501 },
  };
}
