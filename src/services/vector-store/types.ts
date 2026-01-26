export type ContentType = 'page_chunk' | 'fact' | 'research_answer' | 'knowledge_base';

export interface VectorDocument {
  contentType: ContentType;
  contentHash: string;
  sourceUrl?: string;
  sourceTitle?: string;
  chunkIndex?: number;
  totalChunks?: number;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface StoredDocument extends VectorDocument {
  id: string;
  createdAt: Date;
}

export interface SearchOptions {
  limit?: number;
  contentTypes?: ContentType[];
  similarityThreshold?: number;
  sourceUrl?: string;
}

export interface SearchResult {
  id: string;
  content: string;
  contentType: ContentType;
  sourceUrl?: string;
  sourceTitle?: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

export interface TextChunk {
  text: string;
  index: number;
  totalChunks: number;
}
