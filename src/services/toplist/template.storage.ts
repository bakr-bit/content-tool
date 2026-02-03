import Database from 'better-sqlite3';
import { getDatabase } from '../cache/sqlite-client';
import { createChildLogger } from '../../utils/logger';
import { env } from '../../config/env';

const logger = createChildLogger('TemplateStorage');

export interface ColumnDefinition {
  id: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'rating' | 'list' | 'badge';
  brandAttribute: string;
  width?: string;
  format?: string;
}

export interface ToplistTemplate {
  templateId: string;
  name: string;
  description?: string;
  columns: ColumnDefinition[];
  createdAt: string;
  updatedAt?: string;
}

interface TemplateRow {
  template_id: string;
  name: string;
  description: string | null;
  columns: string;
  created_at: string;
  updated_at: string | null;
}

function rowToTemplate(row: TemplateRow): ToplistTemplate {
  return {
    templateId: row.template_id,
    name: row.name,
    description: row.description ?? undefined,
    columns: JSON.parse(row.columns) as ColumnDefinition[],
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export class TemplateStorage {
  private db: Database.Database;

  constructor() {
    this.db = getDatabase(env.CACHE_DB_PATH);
  }

  list(): ToplistTemplate[] {
    try {
      const rows = this.db.prepare('SELECT * FROM toplist_templates ORDER BY name ASC').all() as TemplateRow[];
      return rows.map(rowToTemplate);
    } catch (error) {
      logger.error({ error }, 'Error listing templates');
      throw error;
    }
  }

  getById(templateId: string): ToplistTemplate | null {
    try {
      const row = this.db.prepare('SELECT * FROM toplist_templates WHERE template_id = ?').get(templateId) as TemplateRow | undefined;
      return row ? rowToTemplate(row) : null;
    } catch (error) {
      logger.error({ error, templateId }, 'Error fetching template');
      throw error;
    }
  }

  create(template: Omit<ToplistTemplate, 'createdAt' | 'updatedAt'>): ToplistTemplate {
    const now = new Date().toISOString();

    try {
      this.db.prepare(`
        INSERT INTO toplist_templates (template_id, name, description, columns, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        template.templateId,
        template.name,
        template.description ?? null,
        JSON.stringify(template.columns),
        now
      );

      logger.info({ templateId: template.templateId }, 'Template created');

      return {
        ...template,
        createdAt: now,
      };
    } catch (error) {
      logger.error({ error, templateId: template.templateId }, 'Error creating template');
      throw error;
    }
  }

  update(templateId: string, updates: Partial<Omit<ToplistTemplate, 'templateId' | 'createdAt' | 'updatedAt'>>): ToplistTemplate | null {
    const now = new Date().toISOString();
    const existing = this.getById(templateId);

    if (!existing) {
      return null;
    }

    try {
      this.db.prepare(`
        UPDATE toplist_templates
        SET name = ?, description = ?, columns = ?, updated_at = ?
        WHERE template_id = ?
      `).run(
        updates.name ?? existing.name,
        updates.description ?? existing.description ?? null,
        updates.columns ? JSON.stringify(updates.columns) : JSON.stringify(existing.columns),
        now,
        templateId
      );

      logger.info({ templateId }, 'Template updated');

      return {
        ...existing,
        ...updates,
        updatedAt: now,
      };
    } catch (error) {
      logger.error({ error, templateId }, 'Error updating template');
      throw error;
    }
  }

  delete(templateId: string): boolean {
    try {
      const result = this.db.prepare('DELETE FROM toplist_templates WHERE template_id = ?').run(templateId);
      if (result.changes > 0) {
        logger.info({ templateId }, 'Template deleted');
        return true;
      }
      return false;
    } catch (error) {
      logger.error({ error, templateId }, 'Error deleting template');
      throw error;
    }
  }
}

export const templateStorage = new TemplateStorage();
