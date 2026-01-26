import axios, { AxiosInstance } from 'axios';
import { env } from '../../config/env';
import { SERPER_BASE_URL, SEARCH_DEFAULTS } from '../../config/constants';
import { SearchResult, PeopleAlsoAskItem } from '../../types';
import { ExternalServiceError } from '../../utils/errors';
import { withRetry } from '../../utils/retry';
import { createChildLogger } from '../../utils/logger';
import { cacheService } from '../../services/cache';

const logger = createChildLogger('SerperClient');

interface SerperSearchResponse {
  organic: Array<{
    title: string;
    link: string;
    snippet: string;
    position: number;
  }>;
  peopleAlsoAsk?: Array<{
    question: string;
    snippet?: string;
    link?: string;
  }>;
  searchParameters: {
    q: string;
    gl: string;
    num: number;
  };
}

interface SearchOptions {
  keyword: string;
  geo?: string;
  numResults?: number;
}

export class SerperClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: SERPER_BASE_URL,
      headers: {
        'X-API-KEY': env.SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async search(options: SearchOptions): Promise<{
    results: SearchResult[];
    peopleAlsoAsk?: PeopleAlsoAskItem[];
  }> {
    const { keyword, geo = SEARCH_DEFAULTS.DEFAULT_GEO, numResults = SEARCH_DEFAULTS.NUM_RESULTS } = options;

    // Check cache first
    const cached = cacheService.getSerpResults(keyword, geo);
    if (cached) {
      logger.info({ keyword, geo, resultCount: cached.results.length }, 'Returning cached SERP results');
      return {
        results: cached.results,
        peopleAlsoAsk: cached.peopleAlsoAsk,
      };
    }

    logger.info({ keyword, geo, numResults }, 'Performing SERPER search');

    try {
      const response = await withRetry(
        () =>
          this.client.post<SerperSearchResponse>('/search', {
            q: keyword,
            gl: geo,
            num: numResults,
          }),
        'SERPER search'
      );

      const { organic, peopleAlsoAsk } = response.data;

      const results: SearchResult[] = organic.map((item) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        position: item.position,
      }));

      const paaItems: PeopleAlsoAskItem[] | undefined = peopleAlsoAsk?.map((item) => ({
        question: item.question,
        snippet: item.snippet,
        link: item.link,
      }));

      logger.info({ resultCount: results.length, hasPAA: !!paaItems }, 'SERPER search completed');

      // Cache the results
      cacheService.setSerpResults(keyword, geo, { results, peopleAlsoAsk: paaItems });

      return {
        results,
        peopleAlsoAsk: paaItems,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        logger.error({ error: message, status: error.response?.status }, 'SERPER API error');
        throw new ExternalServiceError('SERPER', message);
      }
      throw error;
    }
  }
}

export const serperClient = new SerperClient();
