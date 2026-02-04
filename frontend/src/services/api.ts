import type {
  ApiResponse,
  WorkflowState,
  FullWorkflowRequest,
  Outline,
  ArticleSize,
  ComponentInfo,
  AuthorProfile,
  ListArticlesQuery,
  ListArticlesResult,
} from '@/types/article';
import type { ProjectWithCount } from '@/types/project';
import type { ArticleTemplate } from '@/types/template';

const API_BASE = import.meta.env.VITE_API_URL || 'https://beneath-intervention-starsmerchant-diverse.trycloudflare.com/api/v1';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options?.headers,
    },
    ...options,
  });

  // Handle 401 - redirect to login
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/login';
    return {
      success: false,
      error: {
        message: 'Session expired',
        code: 401,
      },
    };
  }

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

// Workflow endpoints
export async function startFullWorkflow(
  request: FullWorkflowRequest
): Promise<ApiResponse<WorkflowState>> {
  return fetchApi<WorkflowState>('/workflow/full-generation', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function getWorkflow(id: string): Promise<ApiResponse<WorkflowState>> {
  return fetchApi<WorkflowState>(`/workflow/${id}`);
}

// Research endpoints
export interface ResearchResult {
  researchId: string;
  keyword: string;
  geo: string;
  serpResults: Array<{
    title: string;
    link: string;
    snippet: string;
    position: number;
  }>;
  scrapedContent: Array<{
    url: string;
    title?: string;
    content: string;
    wordCount: number;
  }>;
  peopleAlsoAsk?: Array<{
    question: string;
    snippet?: string;
  }>;
}

export async function startResearch(
  keyword: string,
  geo?: string
): Promise<ApiResponse<ResearchResult>> {
  return fetchApi<ResearchResult>('/research', {
    method: 'POST',
    body: JSON.stringify({ keyword, geo }),
  });
}

export async function getResearch(id: string): Promise<ApiResponse<ResearchResult>> {
  return fetchApi<ResearchResult>(`/research/${id}`);
}

// Outline endpoints
export interface OutlineGenerateOptions {
  title?: string;
  language?: string;
  articleSize?: ArticleSize;
  includeKeywords?: string[];
  structure?: {
    keyTakeaways?: boolean;
    tableOfContents?: boolean;
    conclusion?: boolean;
    faqs?: boolean;
  };
  templateId?: string;
  toplists?: import('@/types/toplist').ArticleToplist[];
}

export async function generateOutline(
  researchId: string,
  options?: OutlineGenerateOptions
): Promise<ApiResponse<Outline>> {
  return fetchApi<Outline>('/outline/generate', {
    method: 'POST',
    body: JSON.stringify({ researchId, options }),
  });
}

export async function getOutline(id: string): Promise<ApiResponse<Outline>> {
  return fetchApi<Outline>(`/outline/${id}`);
}

export async function updateOutline(
  id: string,
  updates: Partial<Outline>
): Promise<ApiResponse<Outline>> {
  return fetchApi<Outline>(`/outline/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// Combined: Research + Generate Outline
export async function researchAndGenerateOutline(
  keyword: string,
  geo: string,
  options?: OutlineGenerateOptions
): Promise<{ research: ResearchResult; outline: Outline }> {
  // Step 1: Conduct research
  const researchResult = await startResearch(keyword, geo);

  if (!researchResult.success || !researchResult.data) {
    throw new Error(researchResult.error?.message || 'Research failed');
  }

  // Step 2: Generate outline from research
  const outlineResult = await generateOutline(researchResult.data.researchId, options);

  if (!outlineResult.success || !outlineResult.data) {
    throw new Error(outlineResult.error?.message || 'Outline generation failed');
  }

  return {
    research: researchResult.data,
    outline: outlineResult.data,
  };
}

// Keywords endpoints
export interface GenerateKeywordsRequest {
  focusKeyword: string;
  title?: string;
  language: string;
  targetCountry: string;
}

export async function generateKeywords(
  request: GenerateKeywordsRequest
): Promise<ApiResponse<{ keywords: string[] }>> {
  return fetchApi<{ keywords: string[] }>('/keywords/generate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// Poll workflow status until completion
export async function pollWorkflowUntilComplete(
  workflowId: string,
  onStatusChange?: (status: WorkflowState) => void,
  intervalMs = 2000
): Promise<WorkflowState> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      const result = await getWorkflow(workflowId);

      if (!result.success || !result.data) {
        reject(new Error(result.error?.message || 'Failed to get workflow status'));
        return;
      }

      const workflow = result.data;
      onStatusChange?.(workflow);

      if (workflow.status === 'completed') {
        resolve(workflow);
        return;
      }

      if (workflow.status === 'failed') {
        reject(new Error(workflow.error || 'Workflow failed'));
        return;
      }

      setTimeout(poll, intervalMs);
    };

    poll();
  });
}

// Components endpoints
export async function getComponents(): Promise<ApiResponse<{ components: ComponentInfo[]; count: number }>> {
  return fetchApi<{ components: ComponentInfo[]; count: number }>('/components');
}

// Authors endpoints
export interface CreateAuthorRequest {
  firstName: string;
  lastName: string;
  description?: string;
  site?: string;
  language: string;
  targetCountry: string;
  tone: string;
  pointOfView: string;
  formality: string;
  customTonePrompt?: string;
  formatting?: {
    bold?: boolean;
    italics?: boolean;
    tables?: boolean;
    quotes?: boolean;
    lists?: boolean;
  };
  headingCase?: string;
}

export interface UpdateAuthorRequest {
  firstName?: string;
  lastName?: string;
  description?: string;
  site?: string;
  language?: string;
  targetCountry?: string;
  tone?: string;
  pointOfView?: string;
  formality?: string;
  customTonePrompt?: string;
  formatting?: {
    bold?: boolean;
    italics?: boolean;
    tables?: boolean;
    quotes?: boolean;
    lists?: boolean;
  };
  headingCase?: string;
}

export async function getAuthors(): Promise<ApiResponse<{ authors: AuthorProfile[]; count: number }>> {
  return fetchApi<{ authors: AuthorProfile[]; count: number }>('/authors');
}

export async function getAuthor(id: string): Promise<ApiResponse<AuthorProfile>> {
  return fetchApi<AuthorProfile>(`/authors/${id}`);
}

export async function createAuthor(data: CreateAuthorRequest): Promise<ApiResponse<AuthorProfile>> {
  return fetchApi<AuthorProfile>('/authors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAuthor(id: string, data: UpdateAuthorRequest): Promise<ApiResponse<AuthorProfile>> {
  return fetchApi<AuthorProfile>(`/authors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAuthor(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/authors/${id}`, {
    method: 'DELETE',
  });
}

export async function duplicateAuthor(id: string): Promise<ApiResponse<AuthorProfile>> {
  return fetchApi<AuthorProfile>(`/authors/${id}/duplicate`, {
    method: 'POST',
  });
}

// Article endpoints
export async function getArticles(query: ListArticlesQuery = {}): Promise<ListArticlesResult> {
  const params = new URLSearchParams();

  if (query.keyword) params.append('keyword', query.keyword);
  if (query.status) params.append('status', query.status);
  if (query.projectId !== undefined) params.append('projectId', query.projectId);
  if (query.sortBy) params.append('sortBy', query.sortBy);
  if (query.sortOrder) params.append('sortOrder', query.sortOrder);
  if (query.page) params.append('page', String(query.page));
  if (query.limit) params.append('limit', String(query.limit));

  const queryString = params.toString();
  const endpoint = queryString ? `/article?${queryString}` : '/article';

  const result = await fetchApi<ListArticlesResult>(endpoint);

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to fetch articles');
  }

  return result.data;
}

export async function deleteArticle(id: string): Promise<void> {
  const result = await fetchApi<{ message: string }>(`/article/${id}`, {
    method: 'DELETE',
  });

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to delete article');
  }
}

export async function updateArticle(
  id: string,
  data: { title?: string; content?: string }
): Promise<ApiResponse<import('@/types/article').ArticleWithStatus>> {
  return fetchApi<import('@/types/article').ArticleWithStatus>(`/article/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Project endpoints
export interface ProjectsResponse {
  projects: ProjectWithCount[];
  count: number;
}

export async function getProjects(): Promise<ApiResponse<ProjectsResponse>> {
  return fetchApi<ProjectsResponse>('/project');
}

export async function createProject(data: {
  name: string;
  description?: string;
  geo?: string;
  language?: string;
  authors?: string[];
  defaultToplistIds?: string[];
}): Promise<ApiResponse<ProjectWithCount>> {
  return fetchApi<ProjectWithCount>('/project', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getProject(id: string): Promise<ApiResponse<ProjectWithCount>> {
  return fetchApi<ProjectWithCount>(`/project/${id}`);
}

export async function updateProject(
  id: string,
  data: {
    name?: string;
    description?: string;
    geo?: string | null;
    language?: string | null;
    authors?: string[] | null;
    defaultToplistIds?: string[] | null;
  }
): Promise<ApiResponse<ProjectWithCount>> {
  return fetchApi<ProjectWithCount>(`/project/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/project/${id}`, {
    method: 'DELETE',
  });
}

// Template endpoints
export interface TemplatesResponse {
  templates: ArticleTemplate[];
  count: number;
}

export async function getTemplates(): Promise<ApiResponse<TemplatesResponse>> {
  return fetchApi<TemplatesResponse>('/templates');
}
