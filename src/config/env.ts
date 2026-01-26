import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // API Keys
  SERPER_API_KEY: z.string().min(1, 'SERPER_API_KEY is required'),
  FIRECRAWL_API_KEY: z.string().min(1, 'FIRECRAWL_API_KEY is required'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  GEMINI_API_KEY: z.string().optional(),

  // Server
  PORT: z.string().transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // LLM Settings
  DEFAULT_LLM_PROVIDER: z.enum(['openai', 'gemini']).default('openai'),
  OPENAI_MODEL: z.string().default('gpt-5-mini'),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash-lite'),
  LLM_MAX_TOKENS: z.string().transform(Number).default('4096'),
  LLM_TEMPERATURE: z.string().transform(Number).default('0.7'),

  // Search Settings
  SEARCH_NUM_RESULTS: z.string().transform(Number).default('10'),
  DEFAULT_GEO: z.string().default('us'),

  // Content Defaults
  DEFAULT_LANGUAGE: z.string().default('en-US'),
  DEFAULT_TONE: z.string().default('seo-optimized'),
  DEFAULT_ARTICLE_SIZE: z.enum(['shorter', 'short', 'medium', 'long', 'longer']).default('medium'),
  DEFAULT_AUTHOR_PROFILE: z.string().optional(),

  // Concurrency
  SCRAPING_CONCURRENCY: z.string().transform(Number).default('5'),
  LLM_CONCURRENCY: z.string().transform(Number).default('3'),

  // Retry
  MAX_RETRIES: z.string().transform(Number).default('3'),
  RETRY_INITIAL_DELAY_MS: z.string().transform(Number).default('1000'),
  RETRY_MAX_DELAY_MS: z.string().transform(Number).default('10000'),

  // Cache
  CACHE_ENABLED: z.string().transform((val) => val.toLowerCase() === 'true').default('true'),
  CACHE_TTL_DAYS: z.string().transform(Number).default('7'),
  CACHE_DB_PATH: z.string().default('./data/cache.db'),

  // Supabase (Vector Store)
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),

  // Embedding Settings
  EMBEDDING_ENABLED: z.string().transform((val) => val.toLowerCase() === 'true').default('false'),
  EMBEDDING_CHUNK_SIZE: z.string().transform(Number).default('512'),
  EMBEDDING_CHUNK_OVERLAP: z.string().transform(Number).default('50'),
  EMBEDDING_TTL_DAYS: z.string().transform(Number).default('30'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
