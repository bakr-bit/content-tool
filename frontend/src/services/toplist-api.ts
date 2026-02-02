import type { ApiResponse } from '@/types/article';
import type {
  ToplistTemplate,
  Brand,
  Toplist,
  ToplistEntry,
  ListBrandsResult,
  ListToplistsResult,
  ListTemplatesResult,
  CreateBrandRequest,
  UpdateBrandRequest,
  CreateToplistRequest,
  UpdateToplistRequest,
  CreateEntryRequest,
  UpdateEntryRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from '@/types/toplist';

const API_BASE = '/api/v1/toplist';

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

// ===== Templates =====

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

// ===== Brands =====

export async function getBrands(options?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<ListBrandsResult>> {
  const params = new URLSearchParams();
  if (options?.search) params.append('search', options.search);
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));

  const queryString = params.toString();
  const endpoint = queryString ? `/brands?${queryString}` : '/brands';
  return fetchApi<ListBrandsResult>(endpoint);
}

export async function getBrand(id: string): Promise<ApiResponse<Brand>> {
  return fetchApi<Brand>(`/brands/${id}`);
}

export async function createBrand(data: CreateBrandRequest): Promise<ApiResponse<Brand>> {
  return fetchApi<Brand>('/brands', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBrand(id: string, data: UpdateBrandRequest): Promise<ApiResponse<Brand>> {
  return fetchApi<Brand>(`/brands/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteBrand(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/brands/${id}`, {
    method: 'DELETE',
  });
}

export async function searchBrands(query: string, limit = 10): Promise<Brand[]> {
  const result = await getBrands({ search: query, limit });
  return result.success && result.data ? result.data.brands : [];
}

// ===== Toplists =====

export async function getToplists(articleId?: string): Promise<ApiResponse<ListToplistsResult>> {
  const endpoint = articleId ? `?articleId=${articleId}` : '';
  return fetchApi<ListToplistsResult>(endpoint);
}

export async function getToplist(id: string): Promise<ApiResponse<Toplist>> {
  return fetchApi<Toplist>(`/${id}`);
}

export async function createToplist(data: CreateToplistRequest): Promise<ApiResponse<Toplist>> {
  return fetchApi<Toplist>('', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateToplist(id: string, data: UpdateToplistRequest): Promise<ApiResponse<Toplist>> {
  return fetchApi<Toplist>(`/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteToplist(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/${id}`, {
    method: 'DELETE',
  });
}

export async function generateToplistMarkdown(id: string): Promise<ApiResponse<{ markdown: string }>> {
  return fetchApi<{ markdown: string }>(`/${id}/generate-markdown`, {
    method: 'POST',
  });
}

// ===== Library Operations =====

export async function getLibraryToplists(): Promise<ApiResponse<ListToplistsResult>> {
  return fetchApi<ListToplistsResult>('/library');
}

export async function saveToLibrary(toplistId: string, name?: string): Promise<ApiResponse<Toplist>> {
  return fetchApi<Toplist>(`/${toplistId}/save-to-library`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function loadFromLibrary(
  libraryToplistId: string,
  options?: { articleId?: string; position?: number }
): Promise<ApiResponse<Toplist>> {
  return fetchApi<Toplist>(`/library/${libraryToplistId}/load`, {
    method: 'POST',
    body: JSON.stringify(options || {}),
  });
}

// ===== Toplist Entries =====

export async function addEntry(toplistId: string, data: CreateEntryRequest): Promise<ApiResponse<ToplistEntry>> {
  return fetchApi<ToplistEntry>(`/${toplistId}/entries`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateEntry(toplistId: string, entryId: string, data: UpdateEntryRequest): Promise<ApiResponse<ToplistEntry>> {
  return fetchApi<ToplistEntry>(`/${toplistId}/entries/${entryId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteEntry(toplistId: string, entryId: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/${toplistId}/entries/${entryId}`, {
    method: 'DELETE',
  });
}

export async function reorderEntries(toplistId: string, entryIds: string[]): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/${toplistId}/entries/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ entryIds }),
  });
}
