import { createChildLogger } from '../../utils/logger';
import {
  projectStorage,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
} from './project.storage';

const logger = createChildLogger('ProjectService');

export class ProjectService {
  createProject(input: CreateProjectInput): Project {
    // Validate unique name
    const existing = projectStorage.getProjectByName(input.name);
    if (existing) {
      throw new Error(`A project with name "${input.name}" already exists`);
    }

    // Validate non-empty name
    if (!input.name.trim()) {
      throw new Error('Project name cannot be empty');
    }

    return projectStorage.createProject(input);
  }

  getProject(projectId: string): Project | null {
    return projectStorage.getProjectById(projectId);
  }

  listProjects(): Project[] {
    return projectStorage.listProjects();
  }

  updateProject(projectId: string, updates: UpdateProjectInput): Project | null {
    // If updating name, check for uniqueness
    if (updates.name) {
      const existing = projectStorage.getProjectByName(updates.name);
      if (existing && existing.projectId !== projectId) {
        throw new Error(`A project with name "${updates.name}" already exists`);
      }

      // Validate non-empty name
      if (!updates.name.trim()) {
        throw new Error('Project name cannot be empty');
      }
    }

    return projectStorage.updateProject(projectId, updates);
  }

  deleteProject(projectId: string): boolean {
    // Check if project has articles
    const articleCount = projectStorage.getArticleCountByProjectId(projectId);
    if (articleCount > 0) {
      throw new Error(`Cannot delete project with ${articleCount} article(s). Remove or reassign articles first.`);
    }

    return projectStorage.deleteProject(projectId);
  }

  getArticleCount(projectId: string): number {
    return projectStorage.getArticleCountByProjectId(projectId);
  }
}

export const projectService = new ProjectService();
