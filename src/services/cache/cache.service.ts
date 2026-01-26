import crypto from 'crypto';
import Database from 'better-sqlite3';
import { getDatabase, getDatabaseStats, closeDatabase } from './sqlite-client';
import { createChildLogger } from '../../utils/logger';
import { SearchResult, PeopleAlsoAskItem, ScrapedPage } from '../../types';

const logger = createChildLogger('CacheService');

export interface SerpCacheEntry {
  keyword: string;
  geo: string;
  results: SearchResult[];
  peopleAlsoAsk?: PeopleAlsoAskItem[];
  createdAt: number;
  expiresAt: number;
}

export interface PageCacheEntry {
  url: string;
  title?: string;
  content: string;
  wordCount: number;
  scrapedAt: number;
  expiresAt: number;
}

export interface CacheStats {
  serpEntries: number;
  pageEntries: number;
  dbSize: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slash, lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();
    let normalized = parsed.toString();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return url.toLowerCase();
  }
}

function generateSerpCacheId(keyword: string, geo: string): string {
  const key = `${keyword.toLowerCase().trim()}:${geo.toLowerCase()}`;
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 32);
}

export class CacheService {
  private db: Database.Database | null = null;
  private enabled: boolean;
  private dbPath: string;
  private ttlMs: number;

  constructor(options: { enabled: boolean; dbPath: string; ttlDays: number }) {
    this.enabled = options.enabled;
    this.dbPath = options.dbPath;
    this.ttlMs = options.ttlDays * 24 * 60 * 60 * 1000;

    if (this.enabled) {
      this.initialize();
    } else {
      logger.info('Cache is disabled');
    }
  }

  private initialize(): void {
    this.db = getDatabase(this.dbPath);
    this.clearExpired();
  }

  // ==================== SERP Cache ====================

  getSerpResults(keyword: string, geo: string): SerpCacheEntry | null {
    if (!this.enabled || !this.db) return null;

    const id = generateSerpCacheId(keyword, geo);
    const now = Date.now();

    try {
      const row = this.db.prepare(`
        SELECT keyword, geo, results, created_at, expires_at
        FROM serp_cache
        WHERE id = ? AND expires_at > ?
      `).get(id, now) as { keyword: string; geo: string; results: string; created_at: number; expires_at: number } | undefined;

      if (!row) {
        logger.debug({ keyword, geo }, 'SERP cache MISS');
        return null;
      }

      const parsed = JSON.parse(row.results);
      logger.info({ keyword, geo }, 'SERP cache HIT');

      return {
        keyword: row.keyword,
        geo: row.geo,
        results: parsed.results,
        peopleAlsoAsk: parsed.peopleAlsoAsk,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      };
    } catch (error) {
      logger.error({ error, keyword, geo }, 'Error reading SERP cache');
      return null;
    }
  }

  setSerpResults(keyword: string, geo: string, data: { results: SearchResult[]; peopleAlsoAsk?: PeopleAlsoAskItem[] }): void {
    if (!this.enabled || !this.db) return;

    const id = generateSerpCacheId(keyword, geo);
    const now = Date.now();
    const expiresAt = now + this.ttlMs;

    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO serp_cache (id, keyword, geo, results, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, keyword.toLowerCase().trim(), geo.toLowerCase(), JSON.stringify(data), now, expiresAt);

      logger.debug({ keyword, geo, expiresAt: new Date(expiresAt).toISOString() }, 'SERP results cached');
    } catch (error) {
      logger.error({ error, keyword, geo }, 'Error writing SERP cache');
    }
  }

  // ==================== Page Cache ====================

  getPage(url: string): PageCacheEntry | null {
    if (!this.enabled || !this.db) return null;

    const normalizedUrl = normalizeUrl(url);
    const now = Date.now();

    try {
      const row = this.db.prepare(`
        SELECT url, title, content, word_count, scraped_at, expires_at
        FROM page_cache
        WHERE url = ? AND expires_at > ?
      `).get(normalizedUrl, now) as { url: string; title: string | null; content: string; word_count: number; scraped_at: number; expires_at: number } | undefined;

      if (!row) {
        logger.debug({ url: normalizedUrl }, 'Page cache MISS');
        return null;
      }

      logger.info({ url: normalizedUrl }, 'Page cache HIT');

      return {
        url: row.url,
        title: row.title ?? undefined,
        content: row.content,
        wordCount: row.word_count,
        scrapedAt: row.scraped_at,
        expiresAt: row.expires_at,
      };
    } catch (error) {
      logger.error({ error, url }, 'Error reading page cache');
      return null;
    }
  }

  setPage(url: string, page: ScrapedPage): void {
    if (!this.enabled || !this.db) return;

    const normalizedUrl = normalizeUrl(url);
    const now = Date.now();
    const expiresAt = now + this.ttlMs;

    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO page_cache (url, title, content, word_count, scraped_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(normalizedUrl, page.title ?? null, page.content, page.wordCount, now, expiresAt);

      logger.debug({ url: normalizedUrl, wordCount: page.wordCount }, 'Page cached');
    } catch (error) {
      logger.error({ error, url }, 'Error writing page cache');
    }
  }

  getPages(urls: string[]): Map<string, PageCacheEntry> {
    const result = new Map<string, PageCacheEntry>();
    if (!this.enabled || !this.db) return result;

    for (const url of urls) {
      const cached = this.getPage(url);
      if (cached) {
        result.set(normalizeUrl(url), cached);
      }
    }

    return result;
  }

  // ==================== Maintenance ====================

  clearExpired(): number {
    if (!this.enabled || !this.db) return 0;

    const now = Date.now();

    try {
      const serpResult = this.db.prepare('DELETE FROM serp_cache WHERE expires_at <= ?').run(now);
      const pageResult = this.db.prepare('DELETE FROM page_cache WHERE expires_at <= ?').run(now);

      const totalDeleted = serpResult.changes + pageResult.changes;

      if (totalDeleted > 0) {
        logger.info({ serpDeleted: serpResult.changes, pageDeleted: pageResult.changes }, 'Cleared expired cache entries');
      }

      return totalDeleted;
    } catch (error) {
      logger.error({ error }, 'Error clearing expired cache');
      return 0;
    }
  }

  clearAll(): void {
    if (!this.enabled || !this.db) return;

    try {
      this.db.prepare('DELETE FROM serp_cache').run();
      this.db.prepare('DELETE FROM page_cache').run();
      logger.info('Cleared all cache entries');
    } catch (error) {
      logger.error({ error }, 'Error clearing cache');
    }
  }

  getStats(): CacheStats {
    if (!this.enabled || !this.db) {
      return { serpEntries: 0, pageEntries: 0, dbSize: '0 B' };
    }

    try {
      const stats = getDatabaseStats(this.db);
      return {
        serpEntries: stats.serpEntries,
        pageEntries: stats.pageEntries,
        dbSize: formatBytes(stats.dbSizeBytes),
      };
    } catch (error) {
      logger.error({ error }, 'Error getting cache stats');
      return { serpEntries: 0, pageEntries: 0, dbSize: 'unknown' };
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  close(): void {
    closeDatabase();
    this.db = null;
  }
}
