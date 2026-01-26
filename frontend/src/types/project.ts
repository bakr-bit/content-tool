export interface Project {
  projectId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectWithCount extends Project {
  articleCount: number;
}
