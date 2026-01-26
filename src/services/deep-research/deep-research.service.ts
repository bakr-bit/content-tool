import pLimit from 'p-limit';
import { LangGraphSearchEngine } from './langgraph-engine';
import { GapAnalyzer } from './gap-analyzer';
import {
  DeepResearchResult,
  GapAnalysisResult,
  SectionResearchContext,
  VerifiedSource,
  ExtractedFact,
  Outline,
  OutlineSection,
  ScrapedPage,
  DeepResearchState
} from '../../types';
import { DeepResearchOptions } from '../../types/generation-options';
import {
  mergeDeepResearchOptions,
  SECTION_RESEARCH_CONFIG,
  getDepthConfig
} from '../../config/deep-research';
import { createChildLogger } from '../../utils/logger';
import { vectorStoreService, SearchResult } from '../vector-store';
import { knowledgeBaseService } from '../knowledge-base';

const logger = createChildLogger('DeepResearchService');

export class DeepResearchService {
  private gapAnalyzer: GapAnalyzer;

  constructor() {
    this.gapAnalyzer = new GapAnalyzer();
  }

  /**
   * Perform deep research on the main topic
   */
  async researchTopic(
    keyword: string,
    competitorContent: ScrapedPage[],
    options?: Partial<DeepResearchOptions>
  ): Promise<{
    research: DeepResearchResult;
    gaps: GapAnalysisResult;
  }> {
    const resolvedOptions = mergeDeepResearchOptions(options);

    if (!resolvedOptions.enabled || !resolvedOptions.topicLevelResearch) {
      logger.debug('Topic-level deep research disabled');
      return {
        research: {
          query: keyword,
          answer: '',
          sources: [],
          facts: [],
          followUpQuestions: []
        },
        gaps: {
          gaps: [],
          uniqueAngles: [],
          competitorWeaknesses: []
        }
      };
    }

    logger.info({ keyword, depth: resolvedOptions.depth }, 'Starting topic-level deep research');

    // Create search engine with configured depth
    const searchEngine = new LangGraphSearchEngine(resolvedOptions.depth);

    // Run deep research and gap analysis in parallel
    const [research, gaps] = await Promise.all([
      searchEngine.research(keyword),
      this.gapAnalyzer.analyzeGaps(keyword, competitorContent)
    ]);

    logger.info(
      {
        sourceCount: research.sources.length,
        factCount: research.facts.length,
        gapCount: gaps.gaps.length
      },
      'Topic-level research complete'
    );

    // Index research results for future RAG retrieval (async, non-blocking)
    this.indexResearchResults(keyword, research).catch(err =>
      logger.warn({ error: err instanceof Error ? err.message : 'Unknown error' }, 'Failed to index research results')
    );

    return { research, gaps };
  }

  /**
   * Index research results (facts and answer) into the vector store
   */
  private async indexResearchResults(keyword: string, research: DeepResearchResult): Promise<void> {
    if (!vectorStoreService.isEnabled()) {
      return;
    }

    const indexPromises: Promise<unknown>[] = [];

    // Index extracted facts
    if (research.facts.length > 0) {
      logger.debug({ factCount: research.facts.length }, 'Indexing research facts');
      indexPromises.push(
        vectorStoreService.indexFacts(research.facts)
      );
    }

    // Index research answer for future similar queries
    if (research.answer && research.answer.length > 50) {
      logger.debug({ queryLength: keyword.length }, 'Indexing research answer');
      indexPromises.push(
        vectorStoreService.indexResearchAnswer(
          keyword,
          research.answer,
          research.sources[0]?.url // Primary source URL
        )
      );
    }

    await Promise.all(indexPromises);
    logger.info({ keyword, factsIndexed: research.facts.length }, 'Research results indexed for RAG');
  }

  /**
   * Perform research for each section of the outline
   */
  async researchSections(
    outline: Outline,
    topicResearch: DeepResearchResult,
    options?: Partial<DeepResearchOptions>
  ): Promise<Map<string, SectionResearchContext>> {
    const resolvedOptions = mergeDeepResearchOptions(options);

    if (!resolvedOptions.enabled || !resolvedOptions.sectionLevelResearch) {
      logger.debug('Section-level deep research disabled');
      return new Map();
    }

    logger.info({ sectionCount: outline.sections.length }, 'Starting section-level research');

    // Flatten sections including subsections
    const allSections = this.flattenSections(outline.sections);

    // Create a limiter for parallel processing
    const limit = pLimit(SECTION_RESEARCH_CONFIG.PARALLEL_BATCH_SIZE);
    const depthConfig = getDepthConfig(resolvedOptions.depth);

    // Research each section in parallel batches
    const sectionResearchPromises = allSections.map(section =>
      limit(async () => {
        const context = await this.researchSection(
          section,
          outline.keyword,
          topicResearch,
          resolvedOptions.depth
        );
        return { sectionId: section.id, context };
      })
    );

    const results = await Promise.all(sectionResearchPromises);

    // Build the result map
    const sectionResearch = new Map<string, SectionResearchContext>();
    for (const { sectionId, context } of results) {
      sectionResearch.set(sectionId, context);
    }

    logger.info({ sectionsResearched: sectionResearch.size }, 'Section-level research complete');

    return sectionResearch;
  }

  /**
   * Research a single section
   */
  private async researchSection(
    section: OutlineSection,
    keyword: string,
    topicResearch: DeepResearchResult,
    depth: DeepResearchOptions['depth']
  ): Promise<SectionResearchContext> {
    logger.debug({ sectionId: section.id, heading: section.heading }, 'Researching section');

    try {
      // Create a targeted query for this section
      const sectionQuery = `${keyword} ${section.heading} ${section.description || ''}`.trim();

      // Query knowledge base for curated facts (high priority)
      const knowledgeBaseResults = await this.getKnowledgeBaseResults(sectionQuery);

      // Try semantic search for relevant cached content
      const semanticResults = await this.getSemanticResults(sectionQuery);

      // Use a shallower depth for section research to save time
      const sectionDepth = depth === 'deep' ? 'standard' : 'shallow';
      const searchEngine = new LangGraphSearchEngine(sectionDepth);

      const sectionResearch = await searchEngine.research(sectionQuery);

      // Combine with relevant facts from topic research (use semantic or keyword fallback)
      const relevantTopicFacts = await this.findRelevantFactsSemantic(
        topicResearch.facts,
        section.heading,
        section.description || ''
      );

      // Extract statistics and quotes
      const statistics = this.extractStatistics(sectionResearch.facts);
      const quotes = this.extractQuotes(sectionResearch.facts);

      // Convert knowledge base results to facts and sources
      const { facts: kbFacts, sources: kbSources } = this.convertKnowledgeBaseResults(knowledgeBaseResults);

      // Convert semantic search results to facts and sources (with citations)
      const { facts: semanticFacts, sources: semanticSources } = this.convertSemanticResults(semanticResults);

      // Combine sources, prioritizing knowledge base and section-specific ones
      const combinedSources = this.combineSources(
        [...kbSources, ...semanticSources, ...sectionResearch.sources],
        topicResearch.sources,
        SECTION_RESEARCH_CONFIG.MAX_SOURCES_PER_SECTION
      );

      // Combine facts from multiple sources (knowledge base first for quality)
      const combinedFacts = [
        ...kbFacts.slice(0, 3), // Knowledge base facts (curated, high quality)
        ...sectionResearch.facts.slice(0, SECTION_RESEARCH_CONFIG.MAX_FACTS_PER_SECTION),
        ...relevantTopicFacts.slice(0, 2),
        ...semanticFacts.slice(0, 2)
      ];

      // Log contributions
      if (knowledgeBaseResults.length > 0) {
        logger.debug(
          { sectionId: section.id, kbResultCount: knowledgeBaseResults.length },
          'Knowledge base returned results'
        );
      }
      if (semanticResults.length > 0) {
        logger.debug(
          { sectionId: section.id, semanticResultCount: semanticResults.length },
          'Semantic search returned results'
        );
      }

      return {
        facts: combinedFacts,
        sources: combinedSources,
        statistics,
        quotes
      };
    } catch (error) {
      logger.warn({ sectionId: section.id, error }, 'Section research failed');
      return {
        facts: [],
        sources: [],
        statistics: [],
        quotes: []
      };
    }
  }

  /**
   * Flatten outline sections including subsections
   */
  private flattenSections(sections: OutlineSection[]): OutlineSection[] {
    const flattened: OutlineSection[] = [];

    for (const section of sections) {
      flattened.push(section);
      if (section.subsections && section.subsections.length > 0) {
        flattened.push(...this.flattenSections(section.subsections));
      }
    }

    return flattened;
  }

  /**
   * Find facts relevant to a specific section (keyword-based fallback)
   */
  private findRelevantFacts(
    facts: ExtractedFact[],
    heading: string,
    description: string
  ): ExtractedFact[] {
    const searchTerms = `${heading} ${description}`.toLowerCase().split(/\W+/);

    return facts.filter(fact => {
      const factLower = fact.fact.toLowerCase();
      return searchTerms.some(term => term.length > 3 && factLower.includes(term));
    });
  }

  /**
   * Find facts relevant to a specific section using semantic search with keyword fallback
   */
  private async findRelevantFactsSemantic(
    facts: ExtractedFact[],
    heading: string,
    description: string
  ): Promise<ExtractedFact[]> {
    // Try semantic search first if enabled
    if (vectorStoreService.isEnabled()) {
      try {
        const query = `${heading} ${description}`.trim();
        const semanticResults = await vectorStoreService.search(query, {
          contentTypes: ['fact'],
          limit: 5,
          similarityThreshold: 0.6
        });

        if (semanticResults.length > 0) {
          // Convert semantic results to ExtractedFact format
          return semanticResults.map(result => ({
            fact: result.content,
            type: (result.metadata?.factType as ExtractedFact['type']) || 'claim',
            sourceIds: [] // Semantic results don't have source IDs mapped yet
          }));
        }
      } catch (error) {
        logger.debug({ error }, 'Semantic fact search failed, using keyword fallback');
      }
    }

    // Fall back to keyword matching
    return this.findRelevantFacts(facts, heading, description);
  }

  /**
   * Get semantic search results for a query
   */
  private async getSemanticResults(query: string): Promise<SearchResult[]> {
    if (!vectorStoreService.isEnabled()) {
      return [];
    }

    try {
      return await vectorStoreService.search(query, {
        limit: 10,
        contentTypes: ['page_chunk', 'fact'],
        similarityThreshold: 0.6
      });
    } catch (error) {
      logger.debug({ error }, 'Semantic search failed');
      return [];
    }
  }

  /**
   * Get knowledge base results for a query (curated content with citations)
   */
  private async getKnowledgeBaseResults(query: string): Promise<SearchResult[]> {
    try {
      return await knowledgeBaseService.search(query, { limit: 5 });
    } catch (error) {
      logger.debug({ error }, 'Knowledge base search failed');
      return [];
    }
  }

  /**
   * Convert knowledge base results to facts and sources
   */
  private convertKnowledgeBaseResults(results: SearchResult[]): {
    facts: ExtractedFact[];
    sources: VerifiedSource[];
  } {
    const facts: ExtractedFact[] = [];
    const sourcesMap = new Map<string, VerifiedSource>();

    for (const result of results) {
      // Add as a fact with high confidence (curated content)
      facts.push({
        fact: result.content,
        type: 'claim',
        sourceIds: [] // Will be linked when sources are finalized
      });

      // Add source with citation
      if (result.sourceUrl && !sourcesMap.has(result.sourceUrl)) {
        sourcesMap.set(result.sourceUrl, {
          id: 0, // Will be reassigned later
          url: result.sourceUrl,
          title: result.sourceTitle || (result.metadata?.entityName as string) || 'Knowledge Base',
          summary: `${result.metadata?.country || ''} ${result.metadata?.field || ''}`.trim(),
          quality: 0.9, // High quality since it's curated
        });
      }
    }

    return {
      facts,
      sources: Array.from(sourcesMap.values())
    };
  }

  /**
   * Convert semantic search results to facts and sources (with citations)
   */
  private convertSemanticResults(results: SearchResult[]): {
    facts: ExtractedFact[];
    sources: VerifiedSource[];
  } {
    const facts: ExtractedFact[] = [];
    const sourcesMap = new Map<string, VerifiedSource>();

    const filtered = results.filter(r => r.contentType === 'page_chunk' || r.contentType === 'fact');

    for (const result of filtered) {
      // Add as a fact
      facts.push({
        fact: result.content.slice(0, 500), // Truncate long chunks
        type: result.contentType === 'fact'
          ? ((result.metadata?.factType as ExtractedFact['type']) || 'claim')
          : 'claim',
        sourceIds: [] // Will be linked when sources are finalized
      });

      // Add source with citation if URL is available
      if (result.sourceUrl && !sourcesMap.has(result.sourceUrl)) {
        sourcesMap.set(result.sourceUrl, {
          id: 0, // Will be reassigned later
          url: result.sourceUrl,
          title: result.sourceTitle || 'Cached Source',
          summary: result.content.slice(0, 100),
          quality: 0.7, // Medium quality for cached semantic results
        });
      }
    }

    return {
      facts,
      sources: Array.from(sourcesMap.values())
    };
  }

  /**
   * Extract statistics from facts
   */
  private extractStatistics(facts: ExtractedFact[]): string[] {
    return facts
      .filter(f => f.type === 'statistic')
      .map(f => f.fact);
  }

  /**
   * Extract quotes from facts
   */
  private extractQuotes(facts: ExtractedFact[]): string[] {
    return facts
      .filter(f => f.type === 'quote')
      .map(f => f.fact);
  }

  /**
   * Combine sources from section and topic research
   */
  private combineSources(
    sectionSources: VerifiedSource[],
    topicSources: VerifiedSource[],
    maxSources: number
  ): VerifiedSource[] {
    // Deduplicate by URL
    const sourceMap = new Map<string, VerifiedSource>();

    // Add section sources first (higher priority)
    for (const source of sectionSources) {
      sourceMap.set(source.url, source);
    }

    // Add topic sources
    for (const source of topicSources) {
      if (!sourceMap.has(source.url)) {
        sourceMap.set(source.url, source);
      }
    }

    // Sort by quality and take top N
    return Array.from(sourceMap.values())
      .sort((a, b) => (b.quality || 0) - (a.quality || 0))
      .slice(0, maxSources);
  }

  /**
   * Build complete deep research state from all components
   */
  buildResearchState(
    topicResearch: DeepResearchResult,
    gapAnalysis: GapAnalysisResult,
    sectionResearch: Map<string, SectionResearchContext>
  ): DeepResearchState {
    // Collect all unique sources
    const allSourcesMap = new Map<string, VerifiedSource>();

    // Add topic sources
    for (const source of topicResearch.sources) {
      allSourcesMap.set(source.url, source);
    }

    // Add section sources
    for (const context of sectionResearch.values()) {
      for (const source of context.sources) {
        if (!allSourcesMap.has(source.url)) {
          allSourcesMap.set(source.url, source);
        }
      }
    }

    // Reassign IDs to all sources
    const allSources = Array.from(allSourcesMap.values()).map((source, index) => ({
      ...source,
      id: index + 1
    }));

    return {
      topicResearch,
      gapAnalysis,
      sectionResearch,
      allSources
    };
  }
}

export const deepResearchService = new DeepResearchService();
