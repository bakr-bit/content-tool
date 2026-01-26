export interface EmbeddingResult {
  embedding: number[];
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
}

export interface IEmbeddingProvider {
  readonly providerName: string;
  readonly dimensions: number;

  embed(text: string): Promise<EmbeddingResult>;
  embedBatch(texts: string[]): Promise<BatchEmbeddingResult>;
}
