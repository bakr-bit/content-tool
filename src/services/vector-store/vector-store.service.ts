import { env } from '../../config/env';
import { ScrapedPage, ExtractedFact } from '../../types';
import { getEmbeddingProvider, isEmbeddingEnabled } from '../../integrations/embeddings';
import { VectorStoreError } from '../../utils/errors';
import { createChildLogger } from '../../utils/logger';
import { supabaseVectorClient } from './supabase-client';
import { chunkText, generateContentHash } from './chunker';
import {
  ContentType,
  VectorDocument,
  SearchOptions,
  SearchResult,
} from './types';

const logger = createChildLogger('VectorStoreService');

export class VectorStoreService {
  /**
   * Check if the vector store is enabled and configured
   */
  isEnabled(): boolean {
    return isEmbeddingEnabled() && supabaseVectorClient.isConfigured();
  }

  /**
   * Upsert a single document
   */
  async upsert(doc: VectorDocument): Promise<string> {
    if (!this.isEnabled()) {
      throw new VectorStoreError('upsert', 'Vector store not enabled');
    }

    const embeddingProvider = getEmbeddingProvider();
    if (!embeddingProvider) {
      throw new VectorStoreError('upsert', 'Embedding provider not available');
    }

    // Generate embedding if not provided
    let embedding = doc.embedding;
    if (!embedding) {
      const result = await embeddingProvider.embed(doc.content);
      embedding = result.embedding;
    }

    return supabaseVectorClient.upsert({
      ...doc,
      embedding,
    });
  }

  /**
   * Upsert multiple documents
   */
  async upsertBatch(docs: VectorDocument[]): Promise<string[]> {
    if (!this.isEnabled()) {
      throw new VectorStoreError('upsertBatch', 'Vector store not enabled');
    }

    if (docs.length === 0) {
      return [];
    }

    const embeddingProvider = getEmbeddingProvider();
    if (!embeddingProvider) {
      throw new VectorStoreError('upsertBatch', 'Embedding provider not available');
    }

    // Generate embeddings for documents that don't have them
    const docsNeedingEmbeddings = docs.filter(d => !d.embedding);
    const textsToEmbed = docsNeedingEmbeddings.map(d => d.content);

    let embeddings: number[][] = [];
    if (textsToEmbed.length > 0) {
      const result = await embeddingProvider.embedBatch(textsToEmbed);
      embeddings = result.embeddings;
    }

    // Merge embeddings back into documents
    let embeddingIndex = 0;
    const docsWithEmbeddings = docs.map(doc => {
      if (doc.embedding) {
        return doc;
      }
      return {
        ...doc,
        embedding: embeddings[embeddingIndex++],
      };
    });

    return supabaseVectorClient.upsertBatch(
      docsWithEmbeddings.map(d => ({
        ...d,
        embedding: d.embedding!,
      }))
    );
  }

  /**
   * Search for similar documents using a text query
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isEnabled()) {
      return [];
    }

    const embeddingProvider = getEmbeddingProvider();
    if (!embeddingProvider) {
      return [];
    }

    try {
      const { embedding } = await embeddingProvider.embed(query);
      return this.searchByEmbedding(embedding, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn({ error: message }, 'Search failed');
      return [];
    }
  }

  /**
   * Search for similar documents using an embedding vector
   */
  async searchByEmbedding(embedding: number[], options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isEnabled()) {
      return [];
    }

    try {
      return await supabaseVectorClient.searchByEmbedding(embedding, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn({ error: message }, 'Search by embedding failed');
      return [];
    }
  }

  /**
   * Check if a document already exists
   */
  async exists(contentHash: string, contentType: ContentType): Promise<boolean> {
    return supabaseVectorClient.exists(contentHash, contentType);
  }

  /**
   * Delete all documents from a source URL
   */
  async deleteBySource(sourceUrl: string): Promise<number> {
    if (!this.isEnabled()) {
      return 0;
    }

    return supabaseVectorClient.deleteBySource(sourceUrl);
  }

  /**
   * Clean up expired documents
   */
  async cleanupExpired(): Promise<number> {
    return supabaseVectorClient.cleanupExpired();
  }

  /**
   * Index page content by chunking and storing embeddings
   */
  async indexPageContent(page: ScrapedPage): Promise<string[]> {
    if (!this.isEnabled()) {
      logger.debug({ url: page.url }, 'Vector store disabled, skipping page indexing');
      return [];
    }

    logger.info({ url: page.url, title: page.title }, 'Indexing page content');

    try {
      // Chunk the content
      const chunks = chunkText(page.content);

      if (chunks.length === 0) {
        logger.debug({ url: page.url }, 'No content to index');
        return [];
      }

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + env.EMBEDDING_TTL_DAYS);

      // Create documents for each chunk
      const docs: VectorDocument[] = chunks.map(chunk => ({
        contentType: 'page_chunk' as ContentType,
        contentHash: generateContentHash(`${page.url}:${chunk.index}:${chunk.text}`),
        sourceUrl: page.url,
        sourceTitle: page.title,
        chunkIndex: chunk.index,
        totalChunks: chunk.totalChunks,
        content: chunk.text,
        metadata: {
          wordCount: page.wordCount,
          scrapedAt: page.scrapedAt,
        },
        expiresAt,
      }));

      const ids = await this.upsertBatch(docs);

      logger.info(
        { url: page.url, chunkCount: chunks.length, indexedCount: ids.length },
        'Page content indexed'
      );

      return ids;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn({ url: page.url, error: message }, 'Failed to index page content');
      return [];
    }
  }

  /**
   * Index extracted facts
   */
  async indexFacts(
    facts: ExtractedFact[],
    sourceUrl?: string,
    sourceTitle?: string
  ): Promise<string[]> {
    if (!this.isEnabled() || facts.length === 0) {
      return [];
    }

    logger.debug({ factCount: facts.length }, 'Indexing facts');

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + env.EMBEDDING_TTL_DAYS);

      const docs: VectorDocument[] = facts.map(fact => ({
        contentType: 'fact' as ContentType,
        contentHash: generateContentHash(fact.fact),
        sourceUrl: sourceUrl,
        sourceTitle,
        content: fact.fact,
        metadata: {
          factType: fact.type,
          sourceIds: fact.sourceIds,
        },
        expiresAt,
      }));

      return await this.upsertBatch(docs);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn({ error: message }, 'Failed to index facts');
      return [];
    }
  }

  /**
   * Index a research answer for future retrieval
   */
  async indexResearchAnswer(
    query: string,
    answer: string,
    sourceUrl?: string
  ): Promise<string | null> {
    if (!this.isEnabled()) {
      return null;
    }

    logger.debug({ queryLength: query.length }, 'Indexing research answer');

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + env.EMBEDDING_TTL_DAYS);

      const doc: VectorDocument = {
        contentType: 'research_answer',
        contentHash: generateContentHash(`${query}:${answer}`),
        sourceUrl,
        content: `Q: ${query}\n\nA: ${answer}`,
        metadata: {
          query,
        },
        expiresAt,
      };

      return await this.upsert(doc);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn({ error: message }, 'Failed to index research answer');
      return null;
    }
  }
}

export const vectorStoreService = new VectorStoreService();
