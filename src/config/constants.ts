import { env } from './env';

// API URLs
export const SERPER_BASE_URL = 'https://google.serper.dev';
export const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v1';

// Scrape Options
export const DEFAULT_SCRAPE_OPTIONS = {
  onlyMainContent: true,
  formats: ['markdown'] as const,
};

// Search Defaults (from env)
export const SEARCH_DEFAULTS = {
  NUM_RESULTS: env.SEARCH_NUM_RESULTS,
  DEFAULT_GEO: env.DEFAULT_GEO,
};

// LLM Defaults (from env)
export const LLM_DEFAULTS = {
  OPENAI_MODEL: env.OPENAI_MODEL,
  GEMINI_MODEL: env.GEMINI_MODEL,
  MAX_TOKENS: env.LLM_MAX_TOKENS,
  TEMPERATURE: env.LLM_TEMPERATURE,
};

// Article Defaults
export const ARTICLE_DEFAULTS = {
  MIN_WORDS_PER_SECTION: 150,
  MAX_WORDS_PER_SECTION: 500,
  READING_TIME_WPM: 200,
};

// Retry Config (from env)
export const RETRY_CONFIG = {
  MAX_RETRIES: env.MAX_RETRIES,
  INITIAL_DELAY_MS: env.RETRY_INITIAL_DELAY_MS,
  MAX_DELAY_MS: env.RETRY_MAX_DELAY_MS,
};

// Concurrency Limits (from env)
export const CONCURRENCY_LIMITS = {
  SCRAPING: env.SCRAPING_CONCURRENCY,
  LLM_CALLS: env.LLM_CONCURRENCY,
};

// Content Defaults (from env)
export const CONTENT_DEFAULTS = {
  LANGUAGE: env.DEFAULT_LANGUAGE,
  TONE: env.DEFAULT_TONE,
  ARTICLE_SIZE: env.DEFAULT_ARTICLE_SIZE,
  AUTHOR_PROFILE: env.DEFAULT_AUTHOR_PROFILE,
};

// Cache Config (from env)
export const CACHE_CONFIG = {
  ENABLED: env.CACHE_ENABLED,
  TTL_DAYS: env.CACHE_TTL_DAYS,
  DB_PATH: env.CACHE_DB_PATH,
};
