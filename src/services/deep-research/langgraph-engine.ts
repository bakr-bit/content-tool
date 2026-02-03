import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { firecrawlClient } from '../../integrations/firecrawl';
import { ContextProcessor } from './context-processor';
import { SEARCH_CONFIG, MODEL_CONFIG, getDepthConfig } from '../../config/deep-research';
import { VerifiedSource, ExtractedFact, DeepResearchResult } from '../../types';
import { DeepResearchDepth } from '../../types/generation-options';
import { createChildLogger } from '../../utils/logger';

const logger = createChildLogger('LangGraphEngine');

// Search phases for internal tracking
type SearchPhase =
  | 'understanding'
  | 'planning'
  | 'searching'
  | 'analyzing'
  | 'synthesizing'
  | 'extracting'
  | 'complete'
  | 'error';

type ErrorType = 'search' | 'scrape' | 'llm' | 'unknown';

interface Source {
  url: string;
  title: string;
  content?: string;
  quality?: number;
  summary?: string;
}

// LangGraph state using Annotation with reducers
const SearchStateAnnotation = Annotation.Root({
  // Input fields
  query: Annotation<string>({
    reducer: (_, y) => y ?? '',
    default: () => ''
  }),

  // Process fields
  understanding: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined
  }),
  searchQueries: Annotation<string[] | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined
  }),
  currentSearchIndex: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0
  }),

  // Results fields
  sources: Annotation<Source[]>({
    reducer: (existing: Source[], update: Source[] | undefined) => {
      if (!update) return existing;
      const sourceMap = new Map<string, Source>();
      [...existing, ...update].forEach(source => {
        sourceMap.set(source.url, source);
      });
      return Array.from(sourceMap.values());
    },
    default: () => []
  }),
  processedSources: Annotation<Source[] | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined
  }),
  finalAnswer: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined
  }),
  extractedFacts: Annotation<ExtractedFact[] | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined
  }),
  followUpQuestions: Annotation<string[] | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined
  }),

  // Answer tracking
  subQueries: Annotation<Array<{
    question: string;
    searchQuery: string;
    answered: boolean;
    answer?: string;
    confidence: number;
    sources: string[];
  }> | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined
  }),
  searchAttempt: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0
  }),

  // Control fields
  phase: Annotation<SearchPhase>({
    reducer: (x, y) => y ?? x,
    default: () => 'understanding' as SearchPhase
  }),
  error: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined
  }),
  errorType: Annotation<ErrorType | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined
  }),
  maxRetries: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => SEARCH_CONFIG.MAX_RETRIES
  }),
  retryCount: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0
  })
});

type SearchState = typeof SearchStateAnnotation.State;

export class LangGraphSearchEngine {
  private contextProcessor: ContextProcessor;
  private graph: ReturnType<typeof this.buildGraph>;
  private llm: ChatOpenAI;
  private depth: DeepResearchDepth;

  constructor(depth: DeepResearchDepth = 'standard') {
    this.contextProcessor = new ContextProcessor();
    this.depth = depth;

    this.llm = new ChatOpenAI({
      modelName: MODEL_CONFIG.FAST_MODEL,
      temperature: MODEL_CONFIG.TEMPERATURE,
    });

    this.graph = this.buildGraph();
  }

  private buildGraph() {
    const depthConfig = getDepthConfig(this.depth);
    const analyzeQuery = this.analyzeQuery.bind(this);
    const extractSubQueries = this.extractSubQueries.bind(this);
    const scoreContent = this.scoreContent.bind(this);
    const summarizeContent = this.summarizeContent.bind(this);
    const generateAnswer = this.generateAnswer.bind(this);
    const extractFacts = this.extractFacts.bind(this);
    const generateFollowUpQuestions = this.generateFollowUpQuestions.bind(this);
    const contextProcessor = this.contextProcessor;

    const workflow = new StateGraph(SearchStateAnnotation)
      // Understanding node
      .addNode('understand', async (state: SearchState): Promise<Partial<SearchState>> => {
        logger.debug({ query: state.query }, 'Understanding query');

        try {
          const understanding = await analyzeQuery(state.query);
          return {
            understanding,
            phase: 'planning' as SearchPhase
          };
        } catch (error) {
          logger.error({ error }, 'Failed to understand query');
          return {
            error: error instanceof Error ? error.message : 'Failed to understand query',
            errorType: 'llm' as ErrorType,
            phase: 'error' as SearchPhase
          };
        }
      })

      // Planning node
      .addNode('plan', async (state: SearchState): Promise<Partial<SearchState>> => {
        logger.debug('Planning search strategy');

        try {
          let subQueries = state.subQueries;
          if (!subQueries) {
            const extracted = await extractSubQueries(state.query);
            subQueries = extracted.map(sq => ({
              question: sq.question,
              searchQuery: sq.searchQuery,
              answered: false,
              confidence: 0,
              sources: []
            }));
          }

          const unansweredQueries = subQueries.filter(
            sq => !sq.answered || sq.confidence < SEARCH_CONFIG.MIN_ANSWER_CONFIDENCE
          );

          if (unansweredQueries.length === 0) {
            return {
              subQueries,
              phase: 'analyzing' as SearchPhase
            };
          }

          const searchQueries = unansweredQueries
            .map(sq => sq.searchQuery)
            .slice(0, depthConfig.searchQueries);

          return {
            searchQueries,
            subQueries,
            currentSearchIndex: 0,
            phase: 'searching' as SearchPhase
          };
        } catch (error) {
          logger.error({ error }, 'Failed to plan search');
          return {
            error: error instanceof Error ? error.message : 'Failed to plan search',
            errorType: 'llm' as ErrorType,
            phase: 'error' as SearchPhase
          };
        }
      })

      // Search node - uses Firecrawl Search API
      .addNode('search', async (state: SearchState): Promise<Partial<SearchState>> => {
        const searchQueries = state.searchQueries || [];
        const currentIndex = state.currentSearchIndex || 0;

        if (currentIndex >= searchQueries.length) {
          return { phase: 'analyzing' as SearchPhase };
        }

        const searchQuery = searchQueries[currentIndex];
        logger.debug({ searchQuery, index: currentIndex + 1, total: searchQueries.length }, 'Searching via Firecrawl');

        try {
          // Use Firecrawl's Search API to search and scrape in one call
          const scrapedPages = await firecrawlClient.search(searchQuery, {
            limit: 5,
            scrapeOptions: {
              formats: ['markdown'],
              onlyMainContent: true,
            },
          });

          const newSources: Source[] = scrapedPages.map(page => ({
            url: page.url,
            title: page.title || page.url,
            content: page.content,
            quality: 0
          }));

          // Score and summarize sources
          for (const source of newSources) {
            source.quality = scoreContent(source.content || '', state.query);

            if (source.content && source.content.length > SEARCH_CONFIG.MIN_CONTENT_LENGTH) {
              const summary = await summarizeContent(source.content, searchQuery);
              if (summary) {
                source.summary = summary;
              }
            }
          }

          logger.debug({ sourceCount: newSources.length }, 'Search returned sources');

          return {
            sources: newSources,
            currentSearchIndex: currentIndex + 1
          };
        } catch (error) {
          logger.warn({ searchQuery, error }, 'Firecrawl search failed, continuing');
          return {
            currentSearchIndex: currentIndex + 1,
            errorType: 'search' as ErrorType
          };
        }
      })

      // Analyzing node
      .addNode('analyze', async (state: SearchState): Promise<Partial<SearchState>> => {
        logger.debug({ sourceCount: state.sources?.length }, 'Analyzing sources');

        const allSources = state.sources || [];

        if (allSources.length === 0) {
          return {
            phase: 'synthesizing' as SearchPhase,
            processedSources: []
          };
        }

        try {
          const processedSources = await contextProcessor.processSources(
            state.query,
            allSources.map((s, i) => ({
              id: i + 1,
              url: s.url,
              title: s.title,
              summary: s.summary || '',
              quality: s.quality || 0,
              content: s.content
            })),
            state.searchQueries || []
          );

          return {
            sources: allSources,
            processedSources: processedSources.map(ps => ({
              url: ps.url,
              title: ps.title,
              content: ps.content,
              quality: ps.quality,
              summary: ps.summary
            })),
            phase: 'synthesizing' as SearchPhase
          };
        } catch (error) {
          logger.warn({ error }, 'Context processing failed, using raw sources');
          return {
            processedSources: allSources,
            phase: 'synthesizing' as SearchPhase
          };
        }
      })

      // Synthesizing node
      .addNode('synthesize', async (state: SearchState): Promise<Partial<SearchState>> => {
        logger.debug('Synthesizing answer');

        try {
          const sourcesToUse = state.processedSources || state.sources || [];
          const answer = await generateAnswer(state.query, sourcesToUse);

          return {
            finalAnswer: answer,
            phase: 'extracting' as SearchPhase
          };
        } catch (error) {
          logger.error({ error }, 'Failed to generate answer');
          return {
            error: error instanceof Error ? error.message : 'Failed to generate answer',
            errorType: 'llm' as ErrorType,
            phase: 'error' as SearchPhase
          };
        }
      })

      // Fact extraction node
      .addNode('extract', async (state: SearchState): Promise<Partial<SearchState>> => {
        logger.debug('Extracting facts');

        try {
          const sourcesToUse = state.processedSources || state.sources || [];
          const facts = await extractFacts(state.query, sourcesToUse, state.finalAnswer || '');
          const followUpQuestions = await generateFollowUpQuestions(state.query, state.finalAnswer || '');

          return {
            extractedFacts: facts,
            followUpQuestions,
            phase: 'complete' as SearchPhase
          };
        } catch (error) {
          logger.warn({ error }, 'Fact extraction failed');
          return {
            extractedFacts: [],
            followUpQuestions: [],
            phase: 'complete' as SearchPhase
          };
        }
      })

      // Error handling node
      .addNode('handleError', async (state: SearchState): Promise<Partial<SearchState>> => {
        logger.warn({ error: state.error, errorType: state.errorType }, 'Handling error');

        if ((state.retryCount || 0) < (state.maxRetries || SEARCH_CONFIG.MAX_RETRIES)) {
          const retryPhase = state.errorType === 'search' ? 'searching' : 'understanding';
          return {
            retryCount: (state.retryCount || 0) + 1,
            phase: retryPhase as SearchPhase,
            error: undefined,
            errorType: undefined
          };
        }

        return {
          phase: 'complete' as SearchPhase
        };
      })

      // Complete node
      .addNode('complete', async (state: SearchState): Promise<Partial<SearchState>> => {
        logger.info({ sourceCount: state.sources?.length }, 'Search complete');
        return { phase: 'complete' as SearchPhase };
      });

    // Add edges
    workflow
      .addEdge(START, 'understand')
      .addConditionalEdges(
        'understand',
        (state: SearchState) => state.phase === 'error' ? 'handleError' : 'plan',
        { handleError: 'handleError', plan: 'plan' }
      )
      .addConditionalEdges(
        'plan',
        (state: SearchState) => state.phase === 'error' ? 'handleError' : 'search',
        { handleError: 'handleError', search: 'search' }
      )
      .addConditionalEdges(
        'search',
        (state: SearchState) => {
          if (state.phase === 'error') return 'handleError';
          if ((state.currentSearchIndex || 0) < (state.searchQueries?.length || 0)) {
            return 'search';
          }
          return 'analyze';
        },
        { handleError: 'handleError', search: 'search', analyze: 'analyze' }
      )
      .addConditionalEdges(
        'analyze',
        (state: SearchState) => state.phase === 'error' ? 'handleError' : 'synthesize',
        { handleError: 'handleError', synthesize: 'synthesize' }
      )
      .addConditionalEdges(
        'synthesize',
        (state: SearchState) => state.phase === 'error' ? 'handleError' : 'extract',
        { handleError: 'handleError', extract: 'extract' }
      )
      .addConditionalEdges(
        'extract',
        () => 'complete',
        { complete: 'complete' }
      )
      .addConditionalEdges(
        'handleError',
        (state: SearchState) => state.phase === 'error' ? 'complete' : 'understand',
        { complete: 'complete', understand: 'understand' }
      )
      .addEdge('complete', END);

    return workflow.compile();
  }

  /**
   * Execute deep research on a query
   */
  async research(query: string): Promise<DeepResearchResult> {
    logger.info({ query }, 'Starting deep research');

    try {
      const initialState: SearchState = {
        query,
        sources: [],
        phase: 'understanding',
        currentSearchIndex: 0,
        maxRetries: SEARCH_CONFIG.MAX_RETRIES,
        retryCount: 0,
        searchAttempt: 0,
        understanding: undefined,
        searchQueries: undefined,
        processedSources: undefined,
        finalAnswer: undefined,
        extractedFacts: undefined,
        followUpQuestions: undefined,
        error: undefined,
        errorType: undefined,
        subQueries: undefined
      };

      const result = await this.graph.invoke(initialState, {
        recursionLimit: 35
      });

      // Convert internal sources to VerifiedSource format
      const verifiedSources: VerifiedSource[] = (result.sources || []).map((s: Source, i: number) => ({
        id: i + 1,
        url: s.url,
        title: s.title,
        summary: s.summary || '',
        quality: s.quality || 0,
        content: s.content
      }));

      return {
        query,
        answer: result.finalAnswer || 'No answer could be generated.',
        sources: verifiedSources,
        facts: result.extractedFacts || [],
        followUpQuestions: result.followUpQuestions || []
      };
    } catch (error) {
      logger.error({ query, error }, 'Deep research failed');
      throw error;
    }
  }

  // Helper methods

  private getCurrentDateContext(): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return `Today's date is ${dateStr}.`;
  }

  private async analyzeQuery(query: string): Promise<string> {
    const messages = [
      new SystemMessage(`${this.getCurrentDateContext()}

Analyze this search query and explain what information is being sought.
Keep it concise - 1-2 sentences about what the user wants to learn.`),
      new HumanMessage(`Query: "${query}"`)
    ];

    const response = await this.llm.invoke(messages);
    return response.content.toString();
  }

  private async extractSubQueries(query: string): Promise<Array<{ question: string; searchQuery: string }>> {
    const messages = [
      new SystemMessage(`Extract the individual factual questions from this query. Each question should be something that can be definitively answered.

Example:
"Who founded Anthropic and when" →
[
  {"question": "Who founded Anthropic?", "searchQuery": "Anthropic founders"},
  {"question": "When was Anthropic founded?", "searchQuery": "Anthropic founded date year"}
]

RESPONSE FORMAT: Your entire response must begin with [ and end with ]. No markdown, no explanation.`),
      new HumanMessage(`Query: "${query}"`)
    ];

    try {
      const response = await this.llm.invoke(messages);
      const content = response.content.toString()
        .replace(/```json\s*/g, '')
        .replace(/```\s*$/g, '')
        .trim();
      return JSON.parse(content);
    } catch {
      return [{ question: query, searchQuery: query }];
    }
  }

  private scoreContent(content: string, query: string): number {
    const queryWords = query.toLowerCase().split(' ');
    const contentLower = content.toLowerCase();

    let score = 0;
    for (const word of queryWords) {
      if (contentLower.includes(word)) score += 0.2;
    }

    return Math.min(score, 1);
  }

  private async summarizeContent(content: string, query: string): Promise<string> {
    try {
      const messages = [
        new SystemMessage(`${this.getCurrentDateContext()}

Extract ONE key finding from this content that's SPECIFICALLY relevant to the search query.
Return just ONE sentence with a specific finding. Include numbers, dates, or specific details when available.
Keep it under 100 characters.`),
        new HumanMessage(`Query: "${query}"\n\nContent: ${content.slice(0, 2000)}`)
      ];

      const response = await this.llm.invoke(messages);
      return response.content.toString().trim();
    } catch {
      return '';
    }
  }

  private async generateAnswer(query: string, sources: Source[]): Promise<string> {
    const sourcesText = sources
      .map((s, i) => {
        if (!s.content) return `[${i + 1}] ${s.title}\n[No content available]`;
        return `[${i + 1}] ${s.title}\n${s.content.slice(0, 3000)}`;
      })
      .join('\n\n');

    const messages = [
      new SystemMessage(`${this.getCurrentDateContext()}

Answer the user's question based on the provided sources.
Provide a clear, comprehensive answer with citations [1], [2], etc.
Use markdown formatting for better readability.`),
      new HumanMessage(`Question: "${query}"\n\nBased on these sources:\n${sourcesText}`)
    ];

    const response = await this.llm.invoke(messages);
    return response.content.toString();
  }

  private async extractFacts(query: string, sources: Source[], answer: string): Promise<ExtractedFact[]> {
    const messages = [
      new SystemMessage(`Extract specific facts from the answer and sources that can be cited.

For each fact, identify:
1. The fact itself (a specific statement, statistic, quote, or definition)
2. Which source(s) it came from (by number)
3. The type: statistic, quote, definition, or claim

Example format:
[
  {"fact": "The fact statement", "sourceIds": [1, 2], "type": "statistic"}
]

RESPONSE FORMAT: Your entire response must begin with [ and end with ]. No markdown, no explanation.`),
      new HumanMessage(`Query: "${query}"

Answer: ${answer}

Sources: ${sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.summary || s.content?.slice(0, 500) || ''}`).join('\n')}`)
    ];

    try {
      const response = await this.llm.invoke(messages);
      const content = response.content.toString()
        .replace(/```json\s*/g, '')
        .replace(/```\s*$/g, '')
        .trim();
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private async generateFollowUpQuestions(query: string, answer: string): Promise<string[]> {
    try {
      const messages = [
        new SystemMessage(`Based on this search query and answer, generate 3 relevant follow-up questions.

Return only the questions, one per line, no numbering or bullets.
Each question should explore a different aspect or dig deeper.`),
        new HumanMessage(`Query: "${query}"\n\nAnswer: ${answer.slice(0, 1000)}`)
      ];

      const response = await this.llm.invoke(messages);
      return response.content.toString()
        .split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 0 && q.length < 100)
        .slice(0, 3);
    } catch {
      return [];
    }
  }
}
