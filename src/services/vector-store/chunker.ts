import { env } from '../../config/env';
import { TextChunk } from './types';

const DEFAULT_CHUNK_SIZE = env.EMBEDDING_CHUNK_SIZE;
const DEFAULT_CHUNK_OVERLAP = env.EMBEDDING_CHUNK_OVERLAP;

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

/**
 * Split text into overlapping chunks for embedding.
 * Tries to split on sentence boundaries when possible.
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
  } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const cleanedText = text.trim();

  // If text is smaller than chunk size, return as single chunk
  if (cleanedText.length <= chunkSize) {
    return [{
      text: cleanedText,
      index: 0,
      totalChunks: 1,
    }];
  }

  const chunks: TextChunk[] = [];
  let startIndex = 0;

  while (startIndex < cleanedText.length) {
    let endIndex = Math.min(startIndex + chunkSize, cleanedText.length);

    // If we're not at the end, try to break at a sentence boundary
    if (endIndex < cleanedText.length) {
      const searchStart = Math.max(startIndex, endIndex - 100);
      const searchText = cleanedText.slice(searchStart, endIndex);

      // Look for sentence endings
      const sentenceEndMatch = searchText.match(/[.!?]\s+[A-Z]/g);
      if (sentenceEndMatch) {
        const lastMatch = searchText.lastIndexOf(sentenceEndMatch[sentenceEndMatch.length - 1]);
        if (lastMatch !== -1) {
          endIndex = searchStart + lastMatch + 2; // Include the punctuation and space
        }
      } else {
        // Fall back to breaking at a space
        const lastSpace = cleanedText.lastIndexOf(' ', endIndex);
        if (lastSpace > startIndex + chunkSize / 2) {
          endIndex = lastSpace;
        }
      }
    }

    const chunkText = cleanedText.slice(startIndex, endIndex).trim();
    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        index: chunks.length,
        totalChunks: 0, // Will be updated after all chunks are created
      });
    }

    // Move start index, accounting for overlap
    startIndex = endIndex - chunkOverlap;

    // Ensure we make progress
    if (startIndex <= chunks[chunks.length - 1]?.index) {
      startIndex = endIndex;
    }
  }

  // Update totalChunks for all chunks
  const totalChunks = chunks.length;
  for (const chunk of chunks) {
    chunk.totalChunks = totalChunks;
  }

  return chunks;
}

/**
 * Generate a content hash for deduplication
 */
export function generateContentHash(content: string): string {
  // Simple hash function for content deduplication
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
