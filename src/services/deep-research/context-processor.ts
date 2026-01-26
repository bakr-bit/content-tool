import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { VerifiedSource } from '../../types';
import { CONTEXT_PROCESSOR_CONFIG, MODEL_CONFIG } from '../../config/deep-research';
import { createChildLogger } from '../../utils/logger';

const logger = createChildLogger('ContextProcessor');

interface ProcessedSource extends VerifiedSource {
  relevanceScore: number;
  extractedSections: string[];
  keywords: string[];
  summarized?: boolean;
}

export class ContextProcessor {
  private llm: ChatOpenAI;
  private readonly MAX_TOTAL_CHARS = CONTEXT_PROCESSOR_CONFIG.MAX_TOTAL_CHARS;
  private readonly MIN_CHARS_PER_SOURCE = CONTEXT_PROCESSOR_CONFIG.MIN_CHARS_PER_SOURCE;
  private readonly MAX_CHARS_PER_SOURCE = CONTEXT_PROCESSOR_CONFIG.MAX_CHARS_PER_SOURCE;
  private readonly CONTEXT_WINDOW_SIZE = CONTEXT_PROCESSOR_CONFIG.CONTEXT_WINDOW_SIZE;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: MODEL_CONFIG.FAST_MODEL,
      temperature: MODEL_CONFIG.TEMPERATURE,
    });
  }

  /**
   * Process sources for optimal context selection
   */
  async processSources(
    query: string,
    sources: VerifiedSource[],
    searchQueries: string[]
  ): Promise<ProcessedSource[]> {
    logger.debug({ sourceCount: sources.length }, 'Processing sources');

    // Determine summary length based on number of sources
    const summaryLength = this.calculateSummaryLength(sources.length);

    // Process sources with LLM summarization
    const processedSources = await Promise.all(
      sources.map(source => this.summarizeSource(source, query, searchQueries, summaryLength))
    );

    // Filter out failed sources and sort by relevance
    const validSources = processedSources
      .filter(s => s.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    logger.debug({ validCount: validSources.length }, 'Sources processed');
    return validSources;
  }

  /**
   * Extract keywords from query and search queries
   */
  private extractKeywords(query: string, searchQueries: string[]): string[] {
    const allText = [query, ...searchQueries].join(' ').toLowerCase();

    // Remove common words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'what', 'when',
      'where', 'how', 'why', 'who'
    ]);

    // Extract words, filter stopwords, and get unique keywords
    const words = allText
      .split(/\W+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // Also extract quoted phrases
    const quotedPhrases = allText.match(/"([^"]+)"/g)?.map(p => p.replace(/"/g, '')) || [];

    return [...new Set([...words, ...quotedPhrases])];
  }

  /**
   * Process a single source to extract relevant sections and calculate relevance
   */
  private async processSource(
    source: VerifiedSource,
    keywords: string[]
  ): Promise<ProcessedSource> {
    if (!source.content) {
      return {
        ...source,
        relevanceScore: 0,
        extractedSections: [],
        keywords: []
      };
    }

    const content = source.content.toLowerCase();
    const foundKeywords: string[] = [];
    const keywordPositions: { keyword: string; position: number }[] = [];

    // Find all keyword occurrences
    for (const keyword of keywords) {
      let position = content.indexOf(keyword);
      while (position !== -1) {
        keywordPositions.push({ keyword, position });
        if (!foundKeywords.includes(keyword)) {
          foundKeywords.push(keyword);
        }
        position = content.indexOf(keyword, position + 1);
      }
    }

    // Calculate relevance score
    const relevanceScore = this.calculateRelevanceScore(
      foundKeywords.length,
      keywordPositions.length,
      keywords.length,
      source.content.length
    );

    // Extract relevant sections around keywords
    const extractedSections = this.extractRelevantSections(
      source.content,
      keywordPositions
    );

    return {
      ...source,
      relevanceScore,
      extractedSections,
      keywords: foundKeywords
    };
  }

  /**
   * Calculate relevance score based on keyword matches
   */
  private calculateRelevanceScore(
    uniqueKeywordsFound: number,
    totalKeywordMatches: number,
    totalKeywords: number,
    contentLength: number
  ): number {
    // Coverage: what percentage of query keywords were found
    const coverage = totalKeywords > 0 ? uniqueKeywordsFound / totalKeywords : 0;

    // Density: keyword matches per 1000 characters
    const density = (totalKeywordMatches / contentLength) * 1000;

    // Normalize density (cap at 10 matches per 1000 chars)
    const normalizedDensity = Math.min(density / 10, 1);

    // Combined score (coverage is more important)
    return (coverage * 0.7) + (normalizedDensity * 0.3);
  }

  /**
   * Extract relevant sections around keyword matches
   */
  private extractRelevantSections(
    content: string,
    keywordPositions: { keyword: string; position: number }[]
  ): string[] {
    if (keywordPositions.length === 0) {
      // No keywords found, return beginning of content
      return [content.slice(0, this.MIN_CHARS_PER_SOURCE)];
    }

    // Sort positions
    keywordPositions.sort((a, b) => a.position - b.position);

    // Merge overlapping windows
    const windows: { start: number; end: number }[] = [];

    for (const { position } of keywordPositions) {
      const start = Math.max(0, position - this.CONTEXT_WINDOW_SIZE);
      const end = Math.min(content.length, position + this.CONTEXT_WINDOW_SIZE);

      // Check if this window overlaps with the last one
      if (windows.length > 0 && start <= windows[windows.length - 1].end) {
        // Extend the last window
        windows[windows.length - 1].end = end;
      } else {
        // Add new window
        windows.push({ start, end });
      }
    }

    // Extract sections, ensuring we capture sentence boundaries
    const sections: string[] = [];

    for (const window of windows) {
      // Extend to sentence boundaries
      let start = window.start;
      let end = window.end;

      // Find previous sentence boundary
      const prevPeriod = content.lastIndexOf('.', start);
      const prevNewline = content.lastIndexOf('\n', start);
      start = Math.max(prevPeriod + 1, prevNewline + 1, 0);

      // Find next sentence boundary
      const nextPeriod = content.indexOf('.', end);
      const nextNewline = content.indexOf('\n', end);
      if (nextPeriod !== -1 || nextNewline !== -1) {
        end = Math.min(
          nextPeriod !== -1 ? nextPeriod + 1 : content.length,
          nextNewline !== -1 ? nextNewline : content.length
        );
      }

      const section = content.slice(start, end).trim();
      if (section) {
        sections.push(section);
      }
    }

    return sections;
  }

  /**
   * Calculate optimal summary length based on source count
   */
  private calculateSummaryLength(sourceCount: number): number {
    if (sourceCount <= 5) return 4000;
    if (sourceCount <= 10) return 3000;
    if (sourceCount <= 20) return 2000;
    if (sourceCount <= 30) return 1500;
    return 1000;
  }

  /**
   * Summarize a single source using LLM
   */
  private async summarizeSource(
    source: VerifiedSource,
    query: string,
    searchQueries: string[],
    targetLength: number
  ): Promise<ProcessedSource> {
    // If no content, return empty source
    if (!source.content || source.content.length < 100) {
      return {
        ...source,
        relevanceScore: 0,
        extractedSections: [],
        keywords: [],
        summarized: false
      };
    }

    try {
      const messages = [
        new SystemMessage(`You are a research assistant helping to extract the most relevant information from a webpage.

User's question: "${query}"
Related search queries: ${searchQueries.join(', ')}

Source title: ${source.title}
Source URL: ${source.url}

Instructions:
1. Extract ONLY the information that directly relates to the user's question and search queries
2. Focus on specific facts, data, quotes, and concrete details
3. Preserve important numbers, dates, names, and technical details
4. Maintain the original meaning and context
5. If the content has little relevance to the query, just note that briefly
6. Target length: approximately ${targetLength} characters

Provide a focused summary that would help answer the user's question:`),
        new HumanMessage(`Content to analyze:
${source.content.slice(0, 15000)} ${source.content.length > 15000 ? '\n[... content truncated]' : ''}`)
      ];

      const response = await this.llm.invoke(messages);
      const summary = response.content.toString().trim();

      // Calculate a simple relevance score based on the summary
      const relevanceScore = this.calculateRelevanceFromSummary(summary, query, searchQueries);

      return {
        ...source,
        content: summary,
        relevanceScore,
        extractedSections: [summary],
        keywords: this.extractKeywords(query, searchQueries),
        summarized: true
      };
    } catch (error) {
      logger.warn({ url: source.url, error }, 'Failed to summarize source');

      // Fallback to keyword extraction method
      const keywords = this.extractKeywords(query, searchQueries);
      return this.processSource(source, keywords);
    }
  }

  /**
   * Calculate relevance score from summary
   */
  private calculateRelevanceFromSummary(
    summary: string,
    query: string,
    searchQueries: string[]
  ): number {
    // Simple heuristic: longer summaries with more specific content are more relevant
    const summaryLength = summary.length;

    // Check if summary indicates low relevance
    const lowRelevancePhrases = [
      'not directly related',
      'no specific information',
      "doesn't mention",
      'no relevant content',
      'unrelated to'
    ];

    const summaryLower = summary.toLowerCase();
    const hasLowRelevance = lowRelevancePhrases.some(phrase =>
      summaryLower.includes(phrase)
    );

    if (hasLowRelevance) {
      return 0.1; // Very low relevance
    }

    // Check for high relevance indicators
    const highRelevanceIndicators = [
      'specifically mentions',
      'directly addresses',
      'provides detailed',
      'explains how',
      'data shows',
      'research indicates'
    ];

    const hasHighRelevance = highRelevanceIndicators.some(phrase =>
      summaryLower.includes(phrase)
    );

    // Calculate score
    let score = Math.min(summaryLength / 2000, 1.0); // Base score from length

    if (hasHighRelevance) {
      score = Math.min(score + 0.3, 1.0);
    }

    // Check keyword density in summary
    const keywords = this.extractKeywords(query, searchQueries);
    const keywordMatches = keywords.filter(keyword =>
      summaryLower.includes(keyword.toLowerCase())
    ).length;

    const keywordScore = keywords.length > 0
      ? keywordMatches / keywords.length
      : 0.5;

    // Combined score
    return (score * 0.6) + (keywordScore * 0.4);
  }
}

export const contextProcessor = new ContextProcessor();
