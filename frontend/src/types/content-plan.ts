export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'skipped';

export interface ContentPlanPage {
  pageId: string;
  projectId: string;
  url?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  pageType?: string;
  icon?: string;
  level?: number;
  navI?: string;
  navII?: string;
  navIII?: string;
  description?: string;
  notes?: string;
  position: number;
  parentPageId?: string;
  generationStatus: GenerationStatus;
  articleId?: string;
  outlineId?: string;
  templateId?: string;
  tone?: string;
  pointOfView?: string;
  formality?: string;
  customTonePrompt?: string;
  articleSizePreset?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ContentPlanStats {
  total: number;
  pending: number;
  generating: number;
  completed: number;
  failed: number;
  skipped: number;
}

export interface BatchStatus {
  running: boolean;
  currentIndex: number;
  total: number;
  stats: ContentPlanStats;
}

export interface ImportPageInput {
  url?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  pageType?: string;
  icon?: string;
  level?: number;
  navI?: string;
  navII?: string;
  navIII?: string;
  description?: string;
  notes?: string;
}

export const GENERATION_STATUS_NAMES: Record<GenerationStatus, string> = {
  pending: 'Pending',
  generating: 'Generating',
  completed: 'Completed',
  failed: 'Failed',
  skipped: 'Skipped',
};
