import { DeepResearchOptions, DeepResearchDepth } from '../types/generation-options';

// Search Engine Configuration
export const SEARCH_CONFIG = {
  // Search Settings
  MAX_SEARCH_QUERIES: 4,        // Maximum number of search queries to generate
  MAX_SOURCES_PER_SEARCH: 6,    // Maximum sources to return per search query
  MAX_SOURCES_TO_SCRAPE: 6,     // Maximum sources to scrape for additional content

  // Content Processing
  MIN_CONTENT_LENGTH: 100,      // Minimum content length to consider valid
  SUMMARY_CHAR_LIMIT: 100,      // Character limit for source summaries
  CONTEXT_PREVIEW_LENGTH: 500,  // Preview length for previous context
  ANSWER_CHECK_PREVIEW: 2500,   // Content preview length for answer checking
  MAX_SOURCES_TO_CHECK: 10,     // Maximum sources to check for answers

  // Retry Logic
  MAX_RETRIES: 2,               // Maximum retry attempts for failed operations
  MAX_SEARCH_ATTEMPTS: 3,       // Maximum attempts to find answers via search
  MIN_ANSWER_CONFIDENCE: 0.3,   // Minimum confidence (0-1) that a question was answered

  // Timeouts
  SCRAPE_TIMEOUT: 15000,        // Timeout for scraping operations (ms)

  // Performance
  PARALLEL_SUMMARY_GENERATION: true, // Generate summaries in parallel
} as const;

// Model Configuration
export const MODEL_CONFIG = {
  FAST_MODEL: 'gpt-4o-mini',    // Fast model for quick operations
  QUALITY_MODEL: 'gpt-4o',      // High-quality model for final synthesis
  TEMPERATURE: 0,               // Model temperature (0 = deterministic)
} as const;

// Context Processor Configuration
export const CONTEXT_PROCESSOR_CONFIG = {
  MAX_TOTAL_CHARS: 100000,
  MIN_CHARS_PER_SOURCE: 2000,
  MAX_CHARS_PER_SOURCE: 15000,
  CONTEXT_WINDOW_SIZE: 500,     // chars around keyword matches
} as const;

// Depth Presets - control how many searches per research phase
export const DEPTH_PRESETS: Record<DeepResearchDepth, {
  searchQueries: number;
  sourcesPerSearch: number;
  maxRetries: number;
}> = {
  shallow: {
    searchQueries: 1,
    sourcesPerSearch: 4,
    maxRetries: 1,
  },
  standard: {
    searchQueries: 3,
    sourcesPerSearch: 6,
    maxRetries: 2,
  },
  deep: {
    searchQueries: 5,
    sourcesPerSearch: 8,
    maxRetries: 3,
  },
};

// Section Research Configuration
export const SECTION_RESEARCH_CONFIG = {
  PARALLEL_BATCH_SIZE: 3,       // How many sections to research in parallel
  MAX_FACTS_PER_SECTION: 5,     // Maximum facts to include per section
  MAX_SOURCES_PER_SECTION: 3,   // Maximum sources per section
} as const;

// Default Deep Research Options (OFF by default)
export const DEFAULT_DEEP_RESEARCH_OPTIONS: DeepResearchOptions = {
  enabled: false,
  depth: 'standard',
  topicLevelResearch: true,
  sectionLevelResearch: true,
  includeCitations: true,
  researchSource: 'internet',
};

// Merge user options with defaults
export function mergeDeepResearchOptions(
  options?: Partial<DeepResearchOptions>
): DeepResearchOptions {
  if (!options) {
    return DEFAULT_DEEP_RESEARCH_OPTIONS;
  }

  const merged = {
    ...DEFAULT_DEEP_RESEARCH_OPTIONS,
    ...options,
  };

  // Section-level research requires topic-level research to run first
  // (section research builds on topic research results)
  if (merged.sectionLevelResearch && !merged.topicLevelResearch) {
    merged.topicLevelResearch = true;
  }

  return merged;
}

// Get depth preset configuration
export function getDepthConfig(depth: DeepResearchDepth) {
  return DEPTH_PRESETS[depth] || DEPTH_PRESETS.standard;
}
