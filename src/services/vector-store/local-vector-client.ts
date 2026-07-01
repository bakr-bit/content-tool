import crypto from 'crypto';
import Database from 'better-sqlite3';
import { getDatabase } from '../cache/sqlite-client';
import { env } from '../../config/env';
import { VectorStoreError } from '../../utils/errors';
import { createChildLogger } from '../../utils/logger';
import { ContentType, SearchResult } from './types';

const logger = createChildLogger('LocalVectorClient');
const TABLE = 'content_embeddings';

interface Row {
  id: string;
  content_type: ContentType;
  content_hash: string;
  source_url: string | null;
  source_title: string | null;
  chunk_index: number | null;
  total_chunks: number | null;
  content: string;
  embedding: string; // JSON array
  metadata: string | null; // JSON object
  created_at: string;
  expires_at: string | null;
}

interface UpsertDoc {
  contentType: ContentType;
  contentHash: string;
  sourceUrl?: string;
  sourceTitle?: string;
  chunkIndex?: number;
  totalChunks?: number;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Local, on-droplet vector store — a drop-in replacement for the Supabase vector client.
 * Embeddings live in the existing SQLite cache DB; similarity search is a brute-force cosine
 * scan (the embedding cache is small, and deep research is off by default). No external DB.
 */
export class LocalVectorClient {
  private db: Database.Database | null = null;

  private getDb(): Database.Database {
    if (this.db) return this.db;
    const db = getDatabase(env.CACHE_DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS ${TABLE} (
        id TEXT PRIMARY KEY,
        content_type TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        source_url TEXT,
        source_title TEXT,
        chunk_index INTEGER,
        total_chunks INTEGER,
        content TEXT NOT NULL,
        embedding TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL,
        expires_at TEXT,
        UNIQUE (content_hash, content_type)
      );
      CREATE INDEX IF NOT EXISTS idx_ce_type ON ${TABLE}(content_type);
      CREATE INDEX IF NOT EXISTS idx_ce_source ON ${TABLE}(source_url);
      CREATE INDEX IF NOT EXISTS idx_ce_expires ON ${TABLE}(expires_at);
    `);
    this.db = db;
    logger.info('Local SQLite vector store initialized (content_embeddings in cache DB)');
    return db;
  }

  isConfigured(): boolean {
    return true; // always available — it's the local cache DB
  }

  private upsertStmt() {
    return this.getDb().prepare(`
      INSERT INTO ${TABLE}
        (id, content_type, content_hash, source_url, source_title, chunk_index, total_chunks,
         content, embedding, metadata, created_at, expires_at)
      VALUES
        (@id, @content_type, @content_hash, @source_url, @source_title, @chunk_index, @total_chunks,
         @content, @embedding, @metadata, @created_at, @expires_at)
      ON CONFLICT (content_hash, content_type) DO UPDATE SET
        source_url = excluded.source_url,
        source_title = excluded.source_title,
        chunk_index = excluded.chunk_index,
        total_chunks = excluded.total_chunks,
        content = excluded.content,
        embedding = excluded.embedding,
        metadata = excluded.metadata,
        expires_at = excluded.expires_at
      RETURNING id
    `);
  }

  private toParams(doc: UpsertDoc) {
    return {
      id: crypto.randomUUID(),
      content_type: doc.contentType,
      content_hash: doc.contentHash,
      source_url: doc.sourceUrl ?? null,
      source_title: doc.sourceTitle ?? null,
      chunk_index: doc.chunkIndex ?? null,
      total_chunks: doc.totalChunks ?? null,
      content: doc.content,
      embedding: JSON.stringify(doc.embedding),
      metadata: JSON.stringify(doc.metadata ?? {}),
      created_at: new Date().toISOString(),
      expires_at: doc.expiresAt ? doc.expiresAt.toISOString() : null,
    };
  }

  async upsert(doc: UpsertDoc): Promise<string> {
    try {
      const row = this.upsertStmt().get(this.toParams(doc)) as { id: string };
      return row.id;
    } catch (error) {
      throw new VectorStoreError('upsert', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async upsertBatch(docs: UpsertDoc[]): Promise<string[]> {
    if (docs.length === 0) return [];
    try {
      const stmt = this.upsertStmt();
      const tx = this.getDb().transaction((items: UpsertDoc[]) =>
        items.map((d) => (stmt.get(this.toParams(d)) as { id: string }).id)
      );
      return tx(docs);
    } catch (error) {
      throw new VectorStoreError('upsertBatch', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async searchByEmbedding(
    embedding: number[],
    options: {
      limit?: number;
      contentTypes?: ContentType[];
      similarityThreshold?: number;
      sourceUrl?: string;
    } = {}
  ): Promise<SearchResult[]> {
    const { limit = 10, contentTypes, similarityThreshold = 0.5, sourceUrl } = options;
    try {
      const now = new Date().toISOString();
      let sql = `SELECT * FROM ${TABLE} WHERE (expires_at IS NULL OR expires_at > ?)`;
      const args: unknown[] = [now];
      if (sourceUrl) {
        sql += ' AND source_url = ?';
        args.push(sourceUrl);
      }
      const rows = this.getDb().prepare(sql).all(...args) as Row[];
      const typeFilter = contentTypes && contentTypes.length ? new Set(contentTypes) : null;

      return rows
        .filter((r) => !typeFilter || typeFilter.has(r.content_type))
        .map((r) => ({ r, sim: cosineSimilarity(embedding, JSON.parse(r.embedding) as number[]) }))
        .filter((x) => x.sim >= similarityThreshold)
        .sort((a, b) => b.sim - a.sim)
        .slice(0, limit)
        .map(({ r, sim }) => ({
          id: r.id,
          content: r.content,
          contentType: r.content_type,
          sourceUrl: r.source_url || undefined,
          sourceTitle: r.source_title || undefined,
          similarity: sim,
          metadata: r.metadata ? (JSON.parse(r.metadata) as Record<string, unknown>) : undefined,
        }));
    } catch (error) {
      throw new VectorStoreError('search', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async exists(contentHash: string, contentType: ContentType): Promise<boolean> {
    try {
      const row = this.getDb()
        .prepare(`SELECT 1 FROM ${TABLE} WHERE content_hash = ? AND content_type = ? LIMIT 1`)
        .get(contentHash, contentType);
      return !!row;
    } catch (error) {
      logger.warn({ error: error instanceof Error ? error.message : 'unknown' }, 'Error checking existence');
      return false;
    }
  }

  async deleteBySource(sourceUrl: string): Promise<number> {
    try {
      const info = this.getDb().prepare(`DELETE FROM ${TABLE} WHERE source_url = ?`).run(sourceUrl);
      return info.changes;
    } catch (error) {
      throw new VectorStoreError('delete', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async cleanupExpired(): Promise<number> {
    try {
      const info = this.getDb()
        .prepare(`DELETE FROM ${TABLE} WHERE expires_at IS NOT NULL AND expires_at < ?`)
        .run(new Date().toISOString());
      if (info.changes > 0) logger.info({ deletedCount: info.changes }, 'Cleaned up expired documents');
      return info.changes;
    } catch (error) {
      logger.warn({ error: error instanceof Error ? error.message : 'unknown' }, 'Error cleaning up expired documents');
      return 0;
    }
  }
}

export const localVectorClient = new LocalVectorClient();
