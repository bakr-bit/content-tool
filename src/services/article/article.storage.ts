import Database from 'better-sqlite3';
import { getDatabase } from '../cache/sqlite-client';
import { Article, GeneratedSection, ArticleMetadata } from '../../types';
import { createChildLogger } from '../../utils/logger';
import { env } from '../../config/env';

const logger = createChildLogger('ArticleStorage');

export type ArticleStatus = 'draft' | 'published' | 'archived';

export interface ArticleRow {
  article_id: string;
  outline_id: string;
  keyword: string;
  title: string;
  content: string;
  sections: string;
  metadata: string;
  status: ArticleStatus;
  created_at: string;
  updated_at: string | null;
}

export interface ArticleWithStatus extends Article {
  status: ArticleStatus;
  updatedAt?: string;
}

export interface ListArticlesOptions {
  keyword?: string;
  status?: ArticleStatus;
  sortBy?: 'created_at' | 'updated_at' | 'title' | 'keyword';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ListArticlesResult {
  articles: ArticleWithStatus[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function rowToArticle(row: ArticleRow): ArticleWithStatus {
  return {
    articleId: row.article_id,
    outlineId: row.outline_id,
    keyword: row.keyword,
    title: row.title,
    content: row.content,
    sections: JSON.parse(row.sections) as GeneratedSection[],
    metadata: JSON.parse(row.metadata) as ArticleMetadata,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export class ArticleStorage {
  private db: Database.Database;

  constructor() {
    this.db = getDatabase(env.CACHE_DB_PATH);
  }

  saveArticle(article: Article, status: ArticleStatus = 'draft'): ArticleWithStatus {
    const now = new Date().toISOString();

    try {
      // Check if article exists
      const existing = this.db.prepare(
        'SELECT article_id FROM articles WHERE article_id = ?'
      ).get(article.articleId) as { article_id: string } | undefined;

      if (existing) {
        // Update existing article
        this.db.prepare(`
          UPDATE articles SET
            outline_id = ?,
            keyword = ?,
            title = ?,
            content = ?,
            sections = ?,
            metadata = ?,
            status = ?,
            updated_at = ?
          WHERE article_id = ?
        `).run(
          article.outlineId,
          article.keyword,
          article.title,
          article.content,
          JSON.stringify(article.sections),
          JSON.stringify(article.metadata),
          status,
          now,
          article.articleId
        );

        logger.info({ articleId: article.articleId }, 'Article updated in database');
      } else {
        // Insert new article
        this.db.prepare(`
          INSERT INTO articles (
            article_id, outline_id, keyword, title, content,
            sections, metadata, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          article.articleId,
          article.outlineId,
          article.keyword,
          article.title,
          article.content,
          JSON.stringify(article.sections),
          JSON.stringify(article.metadata),
          status,
          article.createdAt,
          null
        );

        logger.info({ articleId: article.articleId }, 'Article saved to database');
      }

      return {
        ...article,
        status,
        updatedAt: existing ? now : undefined,
      };
    } catch (error) {
      logger.error({ error, articleId: article.articleId }, 'Error saving article');
      throw error;
    }
  }

  getArticleById(articleId: string): ArticleWithStatus | null {
    try {
      const row = this.db.prepare(
        'SELECT * FROM articles WHERE article_id = ?'
      ).get(articleId) as ArticleRow | undefined;

      if (!row) {
        return null;
      }

      return rowToArticle(row);
    } catch (error) {
      logger.error({ error, articleId }, 'Error fetching article');
      throw error;
    }
  }

  listArticles(options: ListArticlesOptions = {}): ListArticlesResult {
    const {
      keyword,
      status,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = options;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (keyword) {
      conditions.push('keyword LIKE ?');
      params.push(`%${keyword}%`);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const validSortColumns = ['created_at', 'updated_at', 'title', 'keyword'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

    try {
      // Get total count
      const countResult = this.db.prepare(
        `SELECT COUNT(*) as count FROM articles ${whereClause}`
      ).get(...params) as { count: number };

      const total = countResult.count;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;

      // Get paginated results
      const rows = this.db.prepare(
        `SELECT * FROM articles ${whereClause}
         ORDER BY ${sortColumn} ${sortDir}
         LIMIT ? OFFSET ?`
      ).all(...params, limit, offset) as ArticleRow[];

      const articles = rows.map(rowToArticle);

      return {
        articles,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error({ error, options }, 'Error listing articles');
      throw error;
    }
  }

  deleteArticle(articleId: string): boolean {
    try {
      const result = this.db.prepare(
        'DELETE FROM articles WHERE article_id = ?'
      ).run(articleId);

      if (result.changes > 0) {
        logger.info({ articleId }, 'Article deleted from database');
        return true;
      }

      return false;
    } catch (error) {
      logger.error({ error, articleId }, 'Error deleting article');
      throw error;
    }
  }

  updateArticleStatus(articleId: string, status: ArticleStatus): boolean {
    const now = new Date().toISOString();

    try {
      const result = this.db.prepare(
        'UPDATE articles SET status = ?, updated_at = ? WHERE article_id = ?'
      ).run(status, now, articleId);

      if (result.changes > 0) {
        logger.info({ articleId, status }, 'Article status updated');
        return true;
      }

      return false;
    } catch (error) {
      logger.error({ error, articleId, status }, 'Error updating article status');
      throw error;
    }
  }
}

export const articleStorage = new ArticleStorage();
