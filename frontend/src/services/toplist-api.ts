import type { ApiResponse } from '@/types/article';
import type {
  ResolvedToplist,
  ListToplistsResult,
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

// ===== Toplists (proxied to external Toplist API) =====

/**
 * List all toplists for a site (project).
 * @param siteKey The site key (projectId-internal)
 */
export async function getToplists(siteKey: string): Promise<ApiResponse<ListToplistsResult>> {
  return fetchApi<ListToplistsResult>(`/sites/${siteKey}/toplists`);
}

/**
 * Get a toplist by slug (resolved with brand data).
 * @param siteKey The site key (projectId-internal)
 * @param slug The toplist slug
 */
export async function getToplist(siteKey: string, slug: string): Promise<ApiResponse<ResolvedToplist>> {
  return fetchApi<ResolvedToplist>(`/sites/${siteKey}/toplists/${slug}`);
}
