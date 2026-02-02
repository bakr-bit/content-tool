import Database from 'better-sqlite3';
import { getDatabase } from '../cache/sqlite-client';
import { createChildLogger } from '../../utils/logger';
import { env } from '../../config/env';
import type { ColumnDefinition } from './template.storage';
import type { Brand, BrandAttributes } from './brand.storage';

const logger = createChildLogger('ToplistStorage');

export interface ToplistEntry {
  entryId: string;
  toplistId: string;
  brandId: string;
  rank: number;
  attributeOverrides?: BrandAttributes;
  createdAt: string;
  updatedAt?: string;
  brand?: Brand;
}

export interface Toplist {
  toplistId: string;
  articleId?: string;
  name: string;
  templateId?: string;
  columns: ColumnDefinition[];
  position: number;
  markdownOutput?: string;
  createdAt: string;
  updatedAt?: string;
  entries?: ToplistEntry[];
}

interface ToplistRow {
  toplist_id: string;
  article_id: string | null;
  name: string;
  template_id: string | null;
  columns: string;
  position: number;
  markdown_output: string | null;
  created_at: string;
  updated_at: string | null;
}

interface EntryRow {
  entry_id: string;
  toplist_id: string;
  brand_id: string;
  rank: number;
  attribute_overrides: string | null;
  created_at: string;
  updated_at: string | null;
}

interface BrandRow {
  brand_id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  website_url: string | null;
  attributes: string;
  created_at: string;
  updated_at: string | null;
}

function rowToToplist(row: ToplistRow): Toplist {
  return {
    toplistId: row.toplist_id,
    articleId: row.article_id ?? undefined,
    name: row.name,
    templateId: row.template_id ?? undefined,
    columns: JSON.parse(row.columns) as ColumnDefinition[],
    position: row.position,
    markdownOutput: row.markdown_output ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

function rowToEntry(row: EntryRow, brand?: Brand): ToplistEntry {
  return {
    entryId: row.entry_id,
    toplistId: row.toplist_id,
    brandId: row.brand_id,
    rank: row.rank,
    attributeOverrides: row.attribute_overrides ? JSON.parse(row.attribute_overrides) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    brand,
  };
}

function rowToBrand(row: BrandRow): Brand {
  return {
    brandId: row.brand_id,
    name: row.name,
    slug: row.slug ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    attributes: JSON.parse(row.attributes) as BrandAttributes,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export class ToplistStorage {
  private db: Database.Database;

  constructor() {
    this.db = getDatabase(env.CACHE_DB_PATH);
  }

  // ===== Toplist CRUD =====

  list(articleId?: string): Toplist[] {
    try {
      let rows: ToplistRow[];
      if (articleId) {
        rows = this.db.prepare('SELECT * FROM toplists WHERE article_id = ? ORDER BY position ASC').all(articleId) as ToplistRow[];
      } else {
        rows = this.db.prepare('SELECT * FROM toplists ORDER BY created_at DESC').all() as ToplistRow[];
      }
      return rows.map(rowToToplist);
    } catch (error) {
      logger.error({ error, articleId }, 'Error listing toplists');
      throw error;
    }
  }

  getById(toplistId: string, includeEntries = false): Toplist | null {
    try {
      const row = this.db.prepare('SELECT * FROM toplists WHERE toplist_id = ?').get(toplistId) as ToplistRow | undefined;
      if (!row) return null;

      const toplist = rowToToplist(row);

      if (includeEntries) {
        toplist.entries = this.getEntriesWithBrands(toplistId);
      }

      return toplist;
    } catch (error) {
      logger.error({ error, toplistId }, 'Error fetching toplist');
      throw error;
    }
  }

  create(toplist: Omit<Toplist, 'createdAt' | 'updatedAt' | 'entries'>): Toplist {
    const now = new Date().toISOString();

    try {
      this.db.prepare(`
        INSERT INTO toplists (toplist_id, article_id, name, template_id, columns, position, markdown_output, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        toplist.toplistId,
        toplist.articleId ?? null,
        toplist.name,
        toplist.templateId ?? null,
        JSON.stringify(toplist.columns),
        toplist.position,
        toplist.markdownOutput ?? null,
        now
      );

      logger.info({ toplistId: toplist.toplistId, name: toplist.name }, 'Toplist created');

      return {
        ...toplist,
        createdAt: now,
      };
    } catch (error) {
      logger.error({ error, toplistId: toplist.toplistId }, 'Error creating toplist');
      throw error;
    }
  }

  update(toplistId: string, updates: Partial<Omit<Toplist, 'toplistId' | 'createdAt' | 'updatedAt' | 'entries'>>): Toplist | null {
    const now = new Date().toISOString();
    const existing = this.getById(toplistId);

    if (!existing) {
      return null;
    }

    try {
      this.db.prepare(`
        UPDATE toplists
        SET article_id = ?, name = ?, template_id = ?, columns = ?, position = ?, markdown_output = ?, updated_at = ?
        WHERE toplist_id = ?
      `).run(
        updates.articleId !== undefined ? (updates.articleId ?? null) : (existing.articleId ?? null),
        updates.name ?? existing.name,
        updates.templateId !== undefined ? (updates.templateId ?? null) : (existing.templateId ?? null),
        updates.columns ? JSON.stringify(updates.columns) : JSON.stringify(existing.columns),
        updates.position ?? existing.position,
        updates.markdownOutput !== undefined ? (updates.markdownOutput ?? null) : (existing.markdownOutput ?? null),
        now,
        toplistId
      );

      logger.info({ toplistId }, 'Toplist updated');

      return {
        ...existing,
        ...updates,
        updatedAt: now,
      };
    } catch (error) {
      logger.error({ error, toplistId }, 'Error updating toplist');
      throw error;
    }
  }

  delete(toplistId: string): boolean {
    try {
      const result = this.db.prepare('DELETE FROM toplists WHERE toplist_id = ?').run(toplistId);
      if (result.changes > 0) {
        logger.info({ toplistId }, 'Toplist deleted');
        return true;
      }
      return false;
    } catch (error) {
      logger.error({ error, toplistId }, 'Error deleting toplist');
      throw error;
    }
  }

  // ===== Toplist Entries CRUD =====

  getEntriesWithBrands(toplistId: string): ToplistEntry[] {
    try {
      const rows = this.db.prepare(`
        SELECT e.*, b.brand_id as b_brand_id, b.name as b_name, b.slug as b_slug,
               b.logo_url as b_logo_url, b.website_url as b_website_url,
               b.attributes as b_attributes, b.created_at as b_created_at, b.updated_at as b_updated_at
        FROM toplist_entries e
        LEFT JOIN brands b ON e.brand_id = b.brand_id
        WHERE e.toplist_id = ?
        ORDER BY e.rank ASC
      `).all(toplistId) as Array<EntryRow & {
        b_brand_id: string;
        b_name: string;
        b_slug: string | null;
        b_logo_url: string | null;
        b_website_url: string | null;
        b_attributes: string;
        b_created_at: string;
        b_updated_at: string | null;
      }>;

      return rows.map((row) => {
        const brand: Brand | undefined = row.b_brand_id
          ? rowToBrand({
              brand_id: row.b_brand_id,
              name: row.b_name,
              slug: row.b_slug,
              logo_url: row.b_logo_url,
              website_url: row.b_website_url,
              attributes: row.b_attributes,
              created_at: row.b_created_at,
              updated_at: row.b_updated_at,
            })
          : undefined;

        return rowToEntry(row, brand);
      });
    } catch (error) {
      logger.error({ error, toplistId }, 'Error fetching entries with brands');
      throw error;
    }
  }

  addEntry(entry: Omit<ToplistEntry, 'createdAt' | 'updatedAt' | 'brand'>): ToplistEntry {
    const now = new Date().toISOString();

    try {
      this.db.prepare(`
        INSERT INTO toplist_entries (entry_id, toplist_id, brand_id, rank, attribute_overrides, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        entry.entryId,
        entry.toplistId,
        entry.brandId,
        entry.rank,
        entry.attributeOverrides ? JSON.stringify(entry.attributeOverrides) : null,
        now
      );

      logger.info({ entryId: entry.entryId, toplistId: entry.toplistId }, 'Entry added to toplist');

      return {
        ...entry,
        createdAt: now,
      };
    } catch (error) {
      logger.error({ error, entryId: entry.entryId }, 'Error adding entry');
      throw error;
    }
  }

  updateEntry(entryId: string, updates: Partial<Pick<ToplistEntry, 'rank' | 'attributeOverrides'>>): ToplistEntry | null {
    const now = new Date().toISOString();

    try {
      const existing = this.db.prepare('SELECT * FROM toplist_entries WHERE entry_id = ?').get(entryId) as EntryRow | undefined;
      if (!existing) return null;

      this.db.prepare(`
        UPDATE toplist_entries
        SET rank = ?, attribute_overrides = ?, updated_at = ?
        WHERE entry_id = ?
      `).run(
        updates.rank ?? existing.rank,
        updates.attributeOverrides ? JSON.stringify(updates.attributeOverrides) : existing.attribute_overrides,
        now,
        entryId
      );

      logger.info({ entryId }, 'Entry updated');

      return rowToEntry({
        ...existing,
        rank: updates.rank ?? existing.rank,
        attribute_overrides: updates.attributeOverrides ? JSON.stringify(updates.attributeOverrides) : existing.attribute_overrides,
        updated_at: now,
      });
    } catch (error) {
      logger.error({ error, entryId }, 'Error updating entry');
      throw error;
    }
  }

  deleteEntry(entryId: string): boolean {
    try {
      const result = this.db.prepare('DELETE FROM toplist_entries WHERE entry_id = ?').run(entryId);
      if (result.changes > 0) {
        logger.info({ entryId }, 'Entry deleted');
        return true;
      }
      return false;
    } catch (error) {
      logger.error({ error, entryId }, 'Error deleting entry');
      throw error;
    }
  }

  reorderEntries(toplistId: string, orderedEntryIds: string[]): boolean {
    try {
      this.db.transaction(() => {
        const stmt = this.db.prepare('UPDATE toplist_entries SET rank = ?, updated_at = ? WHERE entry_id = ? AND toplist_id = ?');
        const now = new Date().toISOString();

        // First, set all ranks to negative values to avoid UNIQUE constraint conflicts
        orderedEntryIds.forEach((entryId, index) => {
          stmt.run(-(index + 1), now, entryId, toplistId);
        });

        // Then, set the correct positive ranks
        orderedEntryIds.forEach((entryId, index) => {
          stmt.run(index + 1, now, entryId, toplistId);
        });
      })();

      logger.info({ toplistId, count: orderedEntryIds.length }, 'Entries reordered');
      return true;
    } catch (error) {
      logger.error({ error, toplistId }, 'Error reordering entries');
      throw error;
    }
  }

  // ===== Library Operations (toplists without article_id) =====

  /**
   * List all library toplists (toplists not bound to an article)
   */
  listLibrary(): Toplist[] {
    try {
      const rows = this.db.prepare(
        'SELECT * FROM toplists WHERE article_id IS NULL ORDER BY name ASC'
      ).all() as ToplistRow[];
      return rows.map(rowToToplist);
    } catch (error) {
      logger.error({ error }, 'Error listing library toplists');
      throw error;
    }
  }

  /**
   * Save a toplist to the library (creates a copy without article_id)
   * @param toplistId - The source toplist to copy
   * @param name - Optional new name for the library copy
   * @returns The new library toplist with all entries copied
   */
  saveToLibrary(toplistId: string, name?: string): Toplist | null {
    const source = this.getById(toplistId, true);
    if (!source) {
      return null;
    }

    try {
      const newToplistId = require('uuid').v4();
      const now = new Date().toISOString();

      // Create the library copy (no article_id)
      this.db.prepare(`
        INSERT INTO toplists (toplist_id, article_id, name, template_id, columns, position, markdown_output, created_at)
        VALUES (?, NULL, ?, ?, ?, 0, ?, ?)
      `).run(
        newToplistId,
        name || `${source.name} (Library)`,
        source.templateId ?? null,
        JSON.stringify(source.columns),
        source.markdownOutput ?? null,
        now
      );

      // Copy all entries
      if (source.entries && source.entries.length > 0) {
        const insertEntry = this.db.prepare(`
          INSERT INTO toplist_entries (entry_id, toplist_id, brand_id, rank, attribute_overrides, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const entry of source.entries) {
          insertEntry.run(
            require('uuid').v4(),
            newToplistId,
            entry.brandId,
            entry.rank,
            entry.attributeOverrides ? JSON.stringify(entry.attributeOverrides) : null,
            now
          );
        }
      }

      logger.info({ sourceId: toplistId, newId: newToplistId }, 'Toplist saved to library');

      return this.getById(newToplistId, true);
    } catch (error) {
      logger.error({ error, toplistId }, 'Error saving toplist to library');
      throw error;
    }
  }

  /**
   * Load a library toplist for use in an article (creates a copy)
   * @param libraryToplistId - The library toplist to load
   * @param articleId - Optional article ID to associate with (can be null for in-memory use)
   * @param position - Position in the article's toplist order
   * @returns The new toplist copy with all entries
   */
  loadFromLibrary(libraryToplistId: string, articleId?: string, position = 0): Toplist | null {
    const source = this.getById(libraryToplistId, true);
    if (!source) {
      return null;
    }

    try {
      const newToplistId = require('uuid').v4();
      const now = new Date().toISOString();

      // Create the copy with optional article_id
      this.db.prepare(`
        INSERT INTO toplists (toplist_id, article_id, name, template_id, columns, position, markdown_output, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newToplistId,
        articleId ?? null,
        source.name,
        source.templateId ?? null,
        JSON.stringify(source.columns),
        position,
        source.markdownOutput ?? null,
        now
      );

      // Copy all entries
      if (source.entries && source.entries.length > 0) {
        const insertEntry = this.db.prepare(`
          INSERT INTO toplist_entries (entry_id, toplist_id, brand_id, rank, attribute_overrides, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const entry of source.entries) {
          insertEntry.run(
            require('uuid').v4(),
            newToplistId,
            entry.brandId,
            entry.rank,
            entry.attributeOverrides ? JSON.stringify(entry.attributeOverrides) : null,
            now
          );
        }
      }

      logger.info({ sourceId: libraryToplistId, newId: newToplistId, articleId }, 'Toplist loaded from library');

      return this.getById(newToplistId, true);
    } catch (error) {
      logger.error({ error, libraryToplistId }, 'Error loading toplist from library');
      throw error;
    }
  }

  // ===== Markdown Generation =====

  generateMarkdown(toplistId: string): string {
    const toplist = this.getById(toplistId, true);
    if (!toplist || !toplist.entries || toplist.entries.length === 0) {
      return '';
    }

    const columns = toplist.columns;
    const entries = toplist.entries;

    // Build header row
    const headerRow = '| ' + columns.map((col) => col.label).join(' | ') + ' |';
    const separatorRow = '| ' + columns.map(() => '---').join(' | ') + ' |';

    // Build data rows
    const dataRows = entries.map((entry) => {
      const brand = entry.brand;
      const overrides = entry.attributeOverrides || {};
      const attrs = { ...brand?.attributes, ...overrides };

      const cells = columns.map((col) => {
        if (col.brandAttribute === '_rank') {
          return String(entry.rank);
        }

        let value: unknown;
        if (col.brandAttribute === 'name') {
          value = brand?.name || '';
        } else {
          value = attrs[col.brandAttribute];
        }

        // Format based on type
        if (value === undefined || value === null) {
          return '-';
        }

        if (col.type === 'list' && Array.isArray(value)) {
          return value.join(', ');
        }

        if (col.type === 'rating' && typeof value === 'number') {
          return `${value}/10`;
        }

        if (col.type === 'badge') {
          return value ? '✓' : '✗';
        }

        return String(value);
      });

      return '| ' + cells.join(' | ') + ' |';
    });

    const markdown = [headerRow, separatorRow, ...dataRows].join('\n');

    // Update the toplist with the generated markdown
    this.update(toplistId, { markdownOutput: markdown });

    return markdown;
  }
}

export const toplistStorage = new ToplistStorage();
