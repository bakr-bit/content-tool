import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import { IEmbeddingProvider, EmbeddingResult, BatchEmbeddingResult } from './embedding.interface';
import { EmbeddingError } from '../../utils/errors';
import { withRetry } from '../../utils/retry';
import { createChildLogger } from '../../utils/logger';

const logger = createChildLogger('GeminiEmbeddingProvider');

const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSIONS = 768;
const MAX_BATCH_SIZE = 100;

export class GeminiEmbeddingProvider implements IEmbeddingProvider {
  readonly providerName = 'gemini';
  readonly dimensions = EMBEDDING_DIMENSIONS;
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required for Gemini embedding provider');
    }
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  async embed(text: string): Promise<EmbeddingResult> {
    logger.debug({ textLength: text.length }, 'Generating embedding');

    try {
      const model = this.genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

      const result = await withRetry(
        () => model.embedContent(text),
        'Gemini embedding'
      );

      const embedding = result.embedding.values;

      logger.debug({ dimensions: embedding.length }, 'Embedding generated');

      return { embedding };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: message }, 'Gemini embedding error');
      throw new EmbeddingError('gemini', message);
    }
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    if (texts.length === 0) {
      return { embeddings: [] };
    }

    logger.debug({ batchSize: texts.length }, 'Generating batch embeddings');

    try {
      const model = this.genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
      const embeddings: number[][] = [];

      // Process in batches to avoid API limits
      for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
        const batch = texts.slice(i, i + MAX_BATCH_SIZE);

        const batchResults = await withRetry(
          () => model.batchEmbedContents({
            requests: batch.map(text => ({
              content: { role: 'user', parts: [{ text }] },
            })),
          }),
          `Gemini batch embedding (${i}-${i + batch.length})`
        );

        for (const result of batchResults.embeddings) {
          embeddings.push(result.values);
        }
      }

      logger.debug({ totalEmbeddings: embeddings.length }, 'Batch embeddings generated');

      return { embeddings };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: message }, 'Gemini batch embedding error');
      throw new EmbeddingError('gemini', message);
    }
  }
}
