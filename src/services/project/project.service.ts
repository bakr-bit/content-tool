import { createChildLogger } from '../../utils/logger';
import {
  projectStorage,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
} from './project.storage';
import { toplistApiClient } from '../../integrations/toplist-api';

const logger = createChildLogger('ProjectService');

export class ProjectService {
  async createProject(input: CreateProjectInput): Promise<Project> {
    // Validate unique name
    const existing = projectStorage.getProjectByName(input.name);
    if (existing) {
      throw new Error(`A project with name "${input.name}" already exists`);
    }

    // Validate non-empty name
    if (!input.name.trim()) {
      throw new Error('Project name cannot be empty');
    }

    const project = projectStorage.createProject(input);

    // Sync with Toplist API: Create corresponding site
    if (toplistApiClient.isEnabled()) {
      try {
        await toplistApiClient.createSite({
          domain: `${project.projectId}.internal`,
          name: project.name,
        });
        logger.info({ projectId: project.projectId }, 'Site created in Toplist API');
      } catch (error) {
        // Log error but don't fail project creation
        logger.warn(
          { projectId: project.projectId, error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to create site in Toplist API'
        );
      }
    }

    return project;
  }

  getProject(projectId: string): Project | null {
    return projectStorage.getProjectById(projectId);
  }

  listProjects(): Project[] {
    return projectStorage.listProjects();
  }

  async updateProject(projectId: string, updates: UpdateProjectInput): Promise<Project | null> {
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

    const project = projectStorage.updateProject(projectId, updates);

    // Sync with Toplist API: Update site name if changed
    if (project && updates.name && toplistApiClient.isEnabled()) {
      try {
        await toplistApiClient.updateSite(projectId, { name: updates.name });
        logger.info({ projectId }, 'Site updated in Toplist API');
      } catch (error) {
        // Log error but don't fail project update
        logger.warn(
          { projectId, error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to update site in Toplist API'
        );
      }
    }

    return project;
  }

  async deleteProject(projectId: string): Promise<boolean> {
    // Check if project has articles
    const articleCount = projectStorage.getArticleCountByProjectId(projectId);
    if (articleCount > 0) {
      throw new Error(`Cannot delete project with ${articleCount} article(s). Remove or reassign articles first.`);
    }

    // Sync with Toplist API: Delete site before deleting project
    if (toplistApiClient.isEnabled()) {
      try {
        await toplistApiClient.deleteSite(projectId);
        logger.info({ projectId }, 'Site deleted from Toplist API');
      } catch (error) {
        // Log error but don't fail project deletion
        logger.warn(
          { projectId, error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to delete site from Toplist API'
        );
      }
    }

    return projectStorage.deleteProject(projectId);
  }

  getArticleCount(projectId: string): number {
    return projectStorage.getArticleCountByProjectId(projectId);
  }
}

export const projectService = new ProjectService();
