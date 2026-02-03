import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { getDatabase } from '../cache/sqlite-client';
import { createChildLogger } from '../../utils/logger';
import { env } from '../../config/env';

const logger = createChildLogger('ProjectStorage');

export interface ProjectRow {
  project_id: string;
  name: string;
  description: string | null;
  geo: string | null;
  language: string | null;
  authors: string | null; // JSON array
  default_toplist_ids: string | null; // JSON array
  created_at: string;
  updated_at: string | null;
}

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

export interface CreateProjectInput {
  name: string;
  description?: string;
  geo?: string;
  language?: string;
  authors?: string[];
  defaultToplistIds?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  geo?: string;
  language?: string;
  authors?: string[];
  defaultToplistIds?: string[];
}

function rowToProject(row: ProjectRow): Project {
  return {
    projectId: row.project_id,
    name: row.name,
    description: row.description ?? undefined,
    geo: row.geo ?? undefined,
    language: row.language ?? undefined,
    authors: row.authors ? JSON.parse(row.authors) : undefined,
    defaultToplistIds: row.default_toplist_ids ? JSON.parse(row.default_toplist_ids) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export class ProjectStorage {
  private db: Database.Database;

  constructor() {
    this.db = getDatabase(env.CACHE_DB_PATH);
  }

  createProject(input: CreateProjectInput): Project {
    const now = new Date().toISOString();
    const projectId = uuidv4();

    try {
      this.db.prepare(`
        INSERT INTO projects (project_id, name, description, geo, language, authors, default_toplist_ids, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId,
        input.name,
        input.description ?? null,
        input.geo ?? null,
        input.language ?? null,
        input.authors ? JSON.stringify(input.authors) : null,
        input.defaultToplistIds ? JSON.stringify(input.defaultToplistIds) : null,
        now,
        null
      );

      logger.info({ projectId, name: input.name }, 'Project created');

      return {
        projectId,
        name: input.name,
        description: input.description,
        geo: input.geo,
        language: input.language,
        authors: input.authors,
        defaultToplistIds: input.defaultToplistIds,
        createdAt: now,
      };
    } catch (error) {
      logger.error({ error, name: input.name }, 'Error creating project');
      throw error;
    }
  }

  getProjectById(projectId: string): Project | null {
    try {
      const row = this.db.prepare(
        'SELECT * FROM projects WHERE project_id = ?'
      ).get(projectId) as ProjectRow | undefined;

      if (!row) {
        return null;
      }

      return rowToProject(row);
    } catch (error) {
      logger.error({ error, projectId }, 'Error fetching project');
      throw error;
    }
  }

  getProjectByName(name: string): Project | null {
    try {
      const row = this.db.prepare(
        'SELECT * FROM projects WHERE name = ?'
      ).get(name) as ProjectRow | undefined;

      if (!row) {
        return null;
      }

      return rowToProject(row);
    } catch (error) {
      logger.error({ error, name }, 'Error fetching project by name');
      throw error;
    }
  }

  listProjects(): Project[] {
    try {
      const rows = this.db.prepare(
        'SELECT * FROM projects ORDER BY created_at DESC'
      ).all() as ProjectRow[];

      return rows.map(rowToProject);
    } catch (error) {
      logger.error({ error }, 'Error listing projects');
      throw error;
    }
  }

  updateProject(projectId: string, updates: UpdateProjectInput): Project | null {
    const now = new Date().toISOString();

    try {
      const existing = this.getProjectById(projectId);
      if (!existing) {
        return null;
      }

      const name = updates.name ?? existing.name;
      const description = updates.description !== undefined ? updates.description : existing.description;
      const geo = updates.geo !== undefined ? updates.geo : existing.geo;
      const language = updates.language !== undefined ? updates.language : existing.language;
      const authors = updates.authors !== undefined ? updates.authors : existing.authors;
      const defaultToplistIds = updates.defaultToplistIds !== undefined ? updates.defaultToplistIds : existing.defaultToplistIds;

      this.db.prepare(`
        UPDATE projects SET
          name = ?,
          description = ?,
          geo = ?,
          language = ?,
          authors = ?,
          default_toplist_ids = ?,
          updated_at = ?
        WHERE project_id = ?
      `).run(
        name,
        description ?? null,
        geo ?? null,
        language ?? null,
        authors ? JSON.stringify(authors) : null,
        defaultToplistIds ? JSON.stringify(defaultToplistIds) : null,
        now,
        projectId
      );

      logger.info({ projectId }, 'Project updated');

      return {
        projectId,
        name,
        description: description ?? undefined,
        geo: geo ?? undefined,
        language: language ?? undefined,
        authors: authors ?? undefined,
        defaultToplistIds: defaultToplistIds ?? undefined,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
    } catch (error) {
      logger.error({ error, projectId }, 'Error updating project');
      throw error;
    }
  }

  deleteProject(projectId: string): boolean {
    try {
      const result = this.db.prepare(
        'DELETE FROM projects WHERE project_id = ?'
      ).run(projectId);

      if (result.changes > 0) {
        logger.info({ projectId }, 'Project deleted');
        return true;
      }

      return false;
    } catch (error) {
      logger.error({ error, projectId }, 'Error deleting project');
      throw error;
    }
  }

  getArticleCountByProjectId(projectId: string): number {
    try {
      const result = this.db.prepare(
        'SELECT COUNT(*) as count FROM articles WHERE project_id = ?'
      ).get(projectId) as { count: number };

      return result.count;
    } catch (error) {
      logger.error({ error, projectId }, 'Error counting articles for project');
      throw error;
    }
  }
}

export const projectStorage = new ProjectStorage();
