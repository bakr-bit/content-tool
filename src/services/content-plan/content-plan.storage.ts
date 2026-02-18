import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { getDatabase } from '../cache/sqlite-client';
import { createChildLogger } from '../../utils/logger';
import { env } from '../../config/env';

const logger = createChildLogger('ContentPlanStorage');

export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'skipped';

export interface ContentPlanPageRow {
  page_id: string;
  project_id: string;
  url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string | null;
  page_type: string | null;
  icon: string | null;
  level: number | null;
  nav_i: string | null;
  nav_ii: string | null;
  nav_iii: string | null;
  description: string | null;
  notes: string | null;
  position: number;
  parent_page_id: string | null;
  generation_status: GenerationStatus;
  article_id: string | null;
  outline_id: string | null;
  template_id: string | null;
  tone: string | null;
  point_of_view: string | null;
  formality: string | null;
  custom_tone_prompt: string | null;
  article_size_preset: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string | null;
}

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

export interface ContentPlanStats {
  total: number;
  pending: number;
  generating: number;
  completed: number;
  failed: number;
  skipped: number;
}

function rowToPage(row: ContentPlanPageRow): ContentPlanPage {
  return {
    pageId: row.page_id,
    projectId: row.project_id,
    url: row.url ?? undefined,
    metaTitle: row.meta_title ?? undefined,
    metaDescription: row.meta_description ?? undefined,
    keywords: row.keywords ?? undefined,
    pageType: row.page_type ?? undefined,
    icon: row.icon ?? undefined,
    level: row.level ?? undefined,
    navI: row.nav_i ?? undefined,
    navII: row.nav_ii ?? undefined,
    navIII: row.nav_iii ?? undefined,
    description: row.description ?? undefined,
    notes: row.notes ?? undefined,
    position: row.position,
    parentPageId: row.parent_page_id ?? undefined,
    generationStatus: row.generation_status,
    articleId: row.article_id ?? undefined,
    outlineId: row.outline_id ?? undefined,
    templateId: row.template_id ?? undefined,
    tone: row.tone ?? undefined,
    pointOfView: row.point_of_view ?? undefined,
    formality: row.formality ?? undefined,
    customTonePrompt: row.custom_tone_prompt ?? undefined,
    articleSizePreset: row.article_size_preset ?? undefined,
    errorMessage: row.error_message ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export class ContentPlanStorage {
  private db: Database.Database;

  constructor() {
    this.db = getDatabase(env.CACHE_DB_PATH);
  }

  importPages(projectId: string, pages: ImportPageInput[]): ContentPlanPage[] {
    const now = new Date().toISOString();
    const results: ContentPlanPage[] = [];

    const stmt = this.db.prepare(`
      INSERT INTO content_plan_pages (
        page_id, project_id, url, meta_title, meta_description, keywords,
        page_type, icon, level, nav_i, nav_ii, nav_iii, description, notes,
        position, generation_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `);

    this.db.transaction(() => {
      pages.forEach((page, index) => {
        const pageId = uuidv4();
        stmt.run(
          pageId,
          projectId,
          page.url ?? null,
          page.metaTitle ?? null,
          page.metaDescription ?? null,
          page.keywords ?? null,
          page.pageType ?? null,
          page.icon ?? null,
          page.level ?? null,
          page.navI ?? null,
          page.navII ?? null,
          page.navIII ?? null,
          page.description ?? null,
          page.notes ?? null,
          index,
          now
        );

        results.push({
          pageId,
          projectId,
          url: page.url,
          metaTitle: page.metaTitle,
          metaDescription: page.metaDescription,
          keywords: page.keywords,
          pageType: page.pageType,
          icon: page.icon,
          level: page.level,
          navI: page.navI,
          navII: page.navII,
          navIII: page.navIII,
          description: page.description,
          notes: page.notes,
          position: index,
          generationStatus: 'pending',
          createdAt: now,
        });
      });
    })();

    logger.info({ projectId, count: results.length }, 'Imported content plan pages');
    return results;
  }

  getPagesByProject(projectId: string): ContentPlanPage[] {
    try {
      const rows = this.db.prepare(
        'SELECT * FROM content_plan_pages WHERE project_id = ? ORDER BY position ASC'
      ).all(projectId) as ContentPlanPageRow[];

      return rows.map(rowToPage);
    } catch (error) {
      logger.error({ error, projectId }, 'Error fetching content plan pages');
      throw error;
    }
  }

  getPage(pageId: string): ContentPlanPage | null {
    try {
      const row = this.db.prepare(
        'SELECT * FROM content_plan_pages WHERE page_id = ?'
      ).get(pageId) as ContentPlanPageRow | undefined;

      return row ? rowToPage(row) : null;
    } catch (error) {
      logger.error({ error, pageId }, 'Error fetching content plan page');
      throw error;
    }
  }

  updatePageStatus(
    pageId: string,
    status: GenerationStatus,
    articleId?: string,
    errorMessage?: string
  ): ContentPlanPage | null {
    const now = new Date().toISOString();

    try {
      this.db.prepare(`
        UPDATE content_plan_pages
        SET generation_status = ?, article_id = ?, error_message = ?, updated_at = ?
        WHERE page_id = ?
      `).run(status, articleId ?? null, errorMessage ?? null, now, pageId);

      return this.getPage(pageId);
    } catch (error) {
      logger.error({ error, pageId }, 'Error updating page status');
      throw error;
    }
  }

  updatePage(
    pageId: string,
    updates: {
      keywords?: string;
      generationStatus?: GenerationStatus;
      templateId?: string | null;
      tone?: string | null;
      pointOfView?: string | null;
      formality?: string | null;
      customTonePrompt?: string | null;
      articleSizePreset?: string | null;
    }
  ): ContentPlanPage | null {
    const now = new Date().toISOString();
    const existing = this.getPage(pageId);
    if (!existing) return null;

    const fields: string[] = ['updated_at = ?'];
    const values: (string | null)[] = [now];

    if (updates.keywords !== undefined) {
      fields.push('keywords = ?');
      values.push(updates.keywords ?? null);
    }
    if (updates.generationStatus !== undefined) {
      fields.push('generation_status = ?');
      values.push(updates.generationStatus);
    }
    if (updates.templateId !== undefined) {
      fields.push('template_id = ?');
      values.push(updates.templateId);
    }
    if (updates.tone !== undefined) {
      fields.push('tone = ?');
      values.push(updates.tone);
    }
    if (updates.pointOfView !== undefined) {
      fields.push('point_of_view = ?');
      values.push(updates.pointOfView);
    }
    if (updates.formality !== undefined) {
      fields.push('formality = ?');
      values.push(updates.formality);
    }
    if (updates.customTonePrompt !== undefined) {
      fields.push('custom_tone_prompt = ?');
      values.push(updates.customTonePrompt);
    }
    if (updates.articleSizePreset !== undefined) {
      fields.push('article_size_preset = ?');
      values.push(updates.articleSizePreset);
    }

    values.push(pageId);

    try {
      this.db.prepare(`
        UPDATE content_plan_pages
        SET ${fields.join(', ')}
        WHERE page_id = ?
      `).run(...values);

      return this.getPage(pageId);
    } catch (error) {
      logger.error({ error, pageId }, 'Error updating page');
      throw error;
    }
  }

  deletePagesByProject(projectId: string): number {
    try {
      const result = this.db.prepare(
        'DELETE FROM content_plan_pages WHERE project_id = ?'
      ).run(projectId);

      logger.info({ projectId, deleted: result.changes }, 'Deleted content plan pages');
      return result.changes;
    } catch (error) {
      logger.error({ error, projectId }, 'Error deleting content plan pages');
      throw error;
    }
  }

  deletePage(pageId: string): boolean {
    try {
      const result = this.db.prepare(
        'DELETE FROM content_plan_pages WHERE page_id = ?'
      ).run(pageId);

      return result.changes > 0;
    } catch (error) {
      logger.error({ error, pageId }, 'Error deleting content plan page');
      throw error;
    }
  }

  updatePageOutline(pageId: string, outlineId: string): ContentPlanPage | null {
    const now = new Date().toISOString();

    try {
      this.db.prepare(`
        UPDATE content_plan_pages
        SET outline_id = ?, updated_at = ?
        WHERE page_id = ?
      `).run(outlineId, now, pageId);

      return this.getPage(pageId);
    } catch (error) {
      logger.error({ error, pageId }, 'Error updating page outline');
      throw error;
    }
  }

  getStats(projectId: string): ContentPlanStats {
    try {
      const rows = this.db.prepare(`
        SELECT generation_status, COUNT(*) as count
        FROM content_plan_pages
        WHERE project_id = ?
        GROUP BY generation_status
      `).all(projectId) as Array<{ generation_status: GenerationStatus; count: number }>;

      const stats: ContentPlanStats = {
        total: 0,
        pending: 0,
        generating: 0,
        completed: 0,
        failed: 0,
        skipped: 0,
      };

      for (const row of rows) {
        stats[row.generation_status] = row.count;
        stats.total += row.count;
      }

      return stats;
    } catch (error) {
      logger.error({ error, projectId }, 'Error fetching content plan stats');
      throw error;
    }
  }
}

export const contentPlanStorage = new ContentPlanStorage();
