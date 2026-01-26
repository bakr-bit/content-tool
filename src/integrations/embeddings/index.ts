import { env } from '../../config/env';
import { IEmbeddingProvider } from './embedding.interface';
import { GeminiEmbeddingProvider } from './gemini-embedding.provider';

export { IEmbeddingProvider, EmbeddingResult, BatchEmbeddingResult } from './embedding.interface';
export { GeminiEmbeddingProvider } from './gemini-embedding.provider';

let embeddingProvider: IEmbeddingProvider | null = null;

export function getEmbeddingProvider(): IEmbeddingProvider | null {
  if (!env.EMBEDDING_ENABLED) {
    return null;
  }

  if (!embeddingProvider) {
    embeddingProvider = new GeminiEmbeddingProvider();
  }

  return embeddingProvider;
}

export function isEmbeddingEnabled(): boolean {
  return env.EMBEDDING_ENABLED && !!env.GEMINI_API_KEY;
}
