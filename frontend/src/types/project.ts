export interface Project {
  projectId: string;
  name: string;
  description?: string;
  geo?: string;
  language?: string;
  authors?: string[];
  defaultToplistIds?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectWithCount extends Project {
  articleCount: number;
}
