import { v4 as uuidv4 } from 'uuid';
import { serperClient } from '../../integrations/serper';
import { firecrawlClient } from '../../integrations/firecrawl';
import { ResearchResult, SearchResult, ScrapedPage, PeopleAlsoAskItem } from '../../types';
import { createChildLogger } from '../../utils/logger';
import { SEARCH_DEFAULTS } from '../../config/constants';

const logger = createChildLogger('ResearchService');

// In-memory storage for research results
const researchStore = new Map<string, ResearchResult>();

export interface ConductResearchOptions {
  keyword: string;
  geo?: string;
  numResults?: number;
}

export class ResearchService {
  async conductResearch(options: ConductResearchOptions): Promise<ResearchResult> {
    const { keyword, geo = SEARCH_DEFAULTS.DEFAULT_GEO, numResults = SEARCH_DEFAULTS.NUM_RESULTS } = options;

    logger.info({ keyword, geo }, 'Starting research');

    // Step 1: Perform SERPER search
    const searchResults = await serperClient.search({ keyword, geo, numResults });

    logger.info({ resultCount: searchResults.results.length }, 'Search completed');

    // Step 2: Extract URLs from organic results
    const urls = searchResults.results.map((r) => r.link);

    // Step 3: Batch scrape URLs with Firecrawl
    const scrapedContent = await firecrawlClient.scrapeUrls(urls);

    logger.info({ scrapedCount: scrapedContent.length }, 'Scraping completed');

    // Step 4: Compile research result
    const researchResult: ResearchResult = {
      researchId: uuidv4(),
      keyword,
      geo,
      serpResults: searchResults.results,
      scrapedContent,
      peopleAlsoAsk: searchResults.peopleAlsoAsk,
      createdAt: new Date().toISOString(),
    };

    // Store the result
    researchStore.set(researchResult.researchId, researchResult);

    logger.info({ researchId: researchResult.researchId }, 'Research completed');

    return researchResult;
  }

  getResearch(researchId: string): ResearchResult | undefined {
    return researchStore.get(researchId);
  }

  getAllResearch(): ResearchResult[] {
    return Array.from(researchStore.values());
  }
}

export const researchService = new ResearchService();
