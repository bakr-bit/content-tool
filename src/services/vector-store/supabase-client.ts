import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env';
import { VectorStoreError } from '../../utils/errors';
import { createChildLogger } from '../../utils/logger';
import { ContentType, StoredDocument, SearchResult } from './types';

const logger = createChildLogger('SupabaseClient');

const TABLE_NAME = 'content_embeddings';

interface ContentEmbeddingRow {
  id: string;
  content_type: ContentType;
  content_hash: string;
  source_url: string | null;
  source_title: string | null;
  chunk_index: number | null;
  total_chunks: number | null;
  content: string;
  embedding: string; // pgvector stores as string
  metadata: Record<string, unknown> | null;
  created_at: string;
  expires_at: string | null;
}

interface SimilaritySearchRow extends ContentEmbeddingRow {
  similarity: number;
}

export class SupabaseVectorClient {
  private client: SupabaseClient | null = null;

  constructor() {
    if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
      this.client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
      logger.info('Supabase client initialized');
    } else {
      logger.warn('Supabase credentials not configured - vector store disabled');
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async upsert(doc: {
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
  }): Promise<string> {
    if (!this.client) {
      throw new VectorStoreError('upsert', 'Supabase not configured');
    }

    try {
      const { data, error } = await this.client
        .from(TABLE_NAME)
        .upsert({
          content_type: doc.contentType,
          content_hash: doc.contentHash,
          source_url: doc.sourceUrl || null,
          source_title: doc.sourceTitle || null,
          chunk_index: doc.chunkIndex ?? null,
          total_chunks: doc.totalChunks ?? null,
          content: doc.content,
          embedding: `[${doc.embedding.join(',')}]`,
          metadata: doc.metadata || {},
          expires_at: doc.expiresAt?.toISOString() || null,
        }, {
          onConflict: 'content_hash,content_type',
        })
        .select('id')
        .single();

      if (error) {
        throw new VectorStoreError('upsert', error.message);
      }

      return data.id;
    } catch (error) {
      if (error instanceof VectorStoreError) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new VectorStoreError('upsert', message);
    }
  }

  async upsertBatch(docs: Array<{
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
  }>): Promise<string[]> {
    if (!this.client) {
      throw new VectorStoreError('upsertBatch', 'Supabase not configured');
    }

    if (docs.length === 0) {
      return [];
    }

    try {
      const rows = docs.map(doc => ({
        content_type: doc.contentType,
        content_hash: doc.contentHash,
        source_url: doc.sourceUrl || null,
        source_title: doc.sourceTitle || null,
        chunk_index: doc.chunkIndex ?? null,
        total_chunks: doc.totalChunks ?? null,
        content: doc.content,
        embedding: `[${doc.embedding.join(',')}]`,
        metadata: doc.metadata || {},
        expires_at: doc.expiresAt?.toISOString() || null,
      }));

      const { data, error } = await this.client
        .from(TABLE_NAME)
        .upsert(rows, {
          onConflict: 'content_hash,content_type',
        })
        .select('id');

      if (error) {
        throw new VectorStoreError('upsertBatch', error.message);
      }

      return data.map(row => row.id);
    } catch (error) {
      if (error instanceof VectorStoreError) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new VectorStoreError('upsertBatch', message);
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
    if (!this.client) {
      throw new VectorStoreError('search', 'Supabase not configured');
    }

    const {
      limit = 10,
      contentTypes,
      similarityThreshold = 0.5,
      sourceUrl,
    } = options;

    try {
      // Use the match_content_embeddings function for vector similarity search
      const { data, error } = await this.client.rpc('match_content_embeddings', {
        query_embedding: `[${embedding.join(',')}]`,
        match_threshold: similarityThreshold,
        match_count: limit,
        filter_content_types: contentTypes || null,
        filter_source_url: sourceUrl || null,
      });

      if (error) {
        throw new VectorStoreError('search', error.message);
      }

      return (data as SimilaritySearchRow[]).map(row => ({
        id: row.id,
        content: row.content,
        contentType: row.content_type,
        sourceUrl: row.source_url || undefined,
        sourceTitle: row.source_title || undefined,
        similarity: row.similarity,
        metadata: row.metadata || undefined,
      }));
    } catch (error) {
      if (error instanceof VectorStoreError) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new VectorStoreError('search', message);
    }
  }

  async exists(contentHash: string, contentType: ContentType): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const { count, error } = await this.client
        .from(TABLE_NAME)
        .select('id', { count: 'exact', head: true })
        .eq('content_hash', contentHash)
        .eq('content_type', contentType);

      if (error) {
        logger.warn({ error: error.message }, 'Error checking existence');
        return false;
      }

      return (count || 0) > 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn({ error: message }, 'Error checking existence');
      return false;
    }
  }

  async deleteBySource(sourceUrl: string): Promise<number> {
    if (!this.client) {
      throw new VectorStoreError('delete', 'Supabase not configured');
    }

    try {
      const { data, error } = await this.client
        .from(TABLE_NAME)
        .delete()
        .eq('source_url', sourceUrl)
        .select('id');

      if (error) {
        throw new VectorStoreError('delete', error.message);
      }

      return data.length;
    } catch (error) {
      if (error instanceof VectorStoreError) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new VectorStoreError('delete', message);
    }
  }

  async cleanupExpired(): Promise<number> {
    if (!this.client) {
      return 0;
    }

    try {
      const { data, error } = await this.client
        .from(TABLE_NAME)
        .delete()
        .lt('expires_at', new Date().toISOString())
        .not('expires_at', 'is', null)
        .select('id');

      if (error) {
        logger.warn({ error: error.message }, 'Error cleaning up expired documents');
        return 0;
      }

      const count = data.length;
      if (count > 0) {
        logger.info({ deletedCount: count }, 'Cleaned up expired documents');
      }

      return count;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn({ error: message }, 'Error cleaning up expired documents');
      return 0;
    }
  }
}

export const supabaseVectorClient = new SupabaseVectorClient();
