import axios, { AxiosInstance } from 'axios';
import pLimit from 'p-limit';
import { env } from '../../config/env';
import { FIRECRAWL_BASE_URL, DEFAULT_SCRAPE_OPTIONS, CONCURRENCY_LIMITS } from '../../config/constants';
import { ScrapedPage } from '../../types';
import { ExternalServiceError } from '../../utils/errors';
import { withRetry } from '../../utils/retry';
import { createChildLogger } from '../../utils/logger';
import { cacheService } from '../../services/cache';
import { vectorStoreService } from '../../services/vector-store';

const logger = createChildLogger('FirecrawlClient');

interface FirecrawlScrapeResponse {
  success: boolean;
  data: {
    markdown?: string;
    content?: string;
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      sourceURL?: string;
    };
  };
}

interface ScrapeOptions {
  onlyMainContent?: boolean;
  formats?: readonly string[];
}

interface SearchOptions {
  limit?: number;
  scrapeOptions?: ScrapeOptions;
  location?: string;
  tbs?: string; // Time-based filter e.g. 'qdr:d' for past day
}

interface FirecrawlSearchResult {
  url: string;
  title: string;
  description?: string;
  markdown?: string;
  content?: string;
}

interface FirecrawlSearchResponse {
  success: boolean;
  data: FirecrawlSearchResult[];
}

export class FirecrawlClient {
  private client: AxiosInstance;
  private limiter: ReturnType<typeof pLimit>;

  constructor() {
    this.client = axios.create({
      baseURL: FIRECRAWL_BASE_URL,
      headers: {
        Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });
    this.limiter = pLimit(CONCURRENCY_LIMITS.SCRAPING);
  }

  async scrapeUrl(url: string, options: ScrapeOptions = DEFAULT_SCRAPE_OPTIONS): Promise<ScrapedPage> {
    // Check cache first
    const cached = cacheService.getPage(url);
    if (cached) {
      logger.info({ url, wordCount: cached.wordCount }, 'Returning cached page');
      return {
        url: cached.url,
        title: cached.title,
        content: cached.content,
        wordCount: cached.wordCount,
        scrapedAt: new Date(cached.scrapedAt).toISOString(),
      };
    }

    logger.debug({ url }, 'Scraping URL');

    try {
      const response = await withRetry(
        () =>
          this.client.post<FirecrawlScrapeResponse>('/scrape', {
            url,
            ...options,
          }),
        `Firecrawl scrape ${url}`
      );

      if (!response.data.success) {
        throw new ExternalServiceError('Firecrawl', `Failed to scrape ${url}`);
      }

      const content = response.data.data.markdown || response.data.data.content || '';
      const wordCount = content.split(/\s+/).filter(Boolean).length;

      logger.debug({ url, wordCount }, 'URL scraped successfully');

      const scrapedPage: ScrapedPage = {
        url,
        title: response.data.data.metadata?.title,
        content,
        wordCount,
        scrapedAt: new Date().toISOString(),
      };

      // Cache the result
      cacheService.setPage(url, scrapedPage);

      // Async index for vector search (fire and forget)
      if (vectorStoreService.isEnabled()) {
        vectorStoreService.indexPageContent(scrapedPage).catch(err =>
          logger.warn({ url, error: err instanceof Error ? err.message : 'Unknown error' }, 'Failed to index page for vector search')
        );
      }

      return scrapedPage;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        logger.error({ url, error: message, status: error.response?.status }, 'Firecrawl API error');
        throw new ExternalServiceError('Firecrawl', message);
      }
      throw error;
    }
  }

  async scrapeUrls(urls: string[], options: ScrapeOptions = DEFAULT_SCRAPE_OPTIONS): Promise<ScrapedPage[]> {
    logger.info({ urlCount: urls.length }, 'Starting batch scrape');

    // Check cache for all URLs first
    const cachedPages = cacheService.getPages(urls);
    const uncachedUrls = urls.filter((url) => {
      // Normalize URL to match cache key
      try {
        const parsed = new URL(url);
        parsed.hostname = parsed.hostname.toLowerCase();
        let normalized = parsed.toString();
        if (normalized.endsWith('/')) {
          normalized = normalized.slice(0, -1);
        }
        return !cachedPages.has(normalized);
      } catch {
        return !cachedPages.has(url.toLowerCase());
      }
    });

    logger.info(
      { cached: cachedPages.size, toScrape: uncachedUrls.length },
      'Cache check completed for batch'
    );

    // Convert cached entries to ScrapedPage format
    const scrapedPages: ScrapedPage[] = Array.from(cachedPages.values()).map((entry) => ({
      url: entry.url,
      title: entry.title,
      content: entry.content,
      wordCount: entry.wordCount,
      scrapedAt: new Date(entry.scrapedAt).toISOString(),
    }));

    // Only fetch uncached URLs
    if (uncachedUrls.length > 0) {
      const results = await Promise.allSettled(
        uncachedUrls.map((url) =>
          this.limiter(() => this.scrapeUrl(url, options))
        )
      );

      const failures: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          scrapedPages.push(result.value);
        } else {
          failures.push(uncachedUrls[index]);
          logger.warn({ url: uncachedUrls[index], error: result.reason }, 'Failed to scrape URL');
        }
      });

      if (failures.length > 0) {
        logger.info({ failureCount: failures.length }, 'Some URLs failed to scrape');
      }
    }

    logger.info(
      { successCount: scrapedPages.length, fromCache: cachedPages.size, freshlyScraped: scrapedPages.length - cachedPages.size },
      'Batch scrape completed'
    );

    return scrapedPages;
  }

  /**
   * Search the web and optionally scrape results
   * Uses Firecrawl's Search API (v2)
   */
  async search(query: string, options: SearchOptions = {}): Promise<ScrapedPage[]> {
    logger.info({ query, limit: options.limit }, 'Performing Firecrawl search');

    try {
      // Search API is on v1 - using /search endpoint
      const response = await withRetry(
        () =>
          this.client.post<FirecrawlSearchResponse>('/search', {
            query,
            limit: options.limit || 5,
            scrapeOptions: options.scrapeOptions || {
              formats: ['markdown'],
              onlyMainContent: true,
            },
            ...(options.location && { location: options.location }),
            ...(options.tbs && { tbs: options.tbs }),
          }),
        `Firecrawl search: ${query}`
      );

      if (!response.data.success) {
        throw new ExternalServiceError('Firecrawl', `Search failed for: ${query}`);
      }

      const results = response.data.data || [];
      logger.info({ query, resultCount: results.length }, 'Firecrawl search completed');

      // Convert to ScrapedPage format
      return results.map((result) => {
        const content = result.markdown || result.content || result.description || '';
        return {
          url: result.url,
          title: result.title,
          content,
          wordCount: content.split(/\s+/).filter(Boolean).length,
          scrapedAt: new Date().toISOString(),
        };
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        logger.error({ query, error: message, status: error.response?.status }, 'Firecrawl search error');
        throw new ExternalServiceError('Firecrawl', message);
      }
      throw error;
    }
  }
}

export const firecrawlClient = new FirecrawlClient();
