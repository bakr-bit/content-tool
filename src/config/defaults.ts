import {
  GenerationOptions,
  GenerationOptionsInput,
  FormattingToggles,
  StructureToggles,
  ArticleSize,
  DeepResearchOptions,
} from '../types/generation-options';

export const DEFAULT_FORMATTING: FormattingToggles = {
  bold: true,
  italics: true,
  tables: true,
  quotes: true,
  lists: true,
};

export const DEFAULT_STRUCTURE: StructureToggles = {
  keyTakeaways: false,
  conclusion: true,
  faqs: false,
  tableOfContents: false,
};

export const DEFAULT_ARTICLE_SIZE: ArticleSize = {
  preset: 'medium',
  targetWordCount: 2000,
};

export const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
  // Content settings
  language: 'en-US',
  targetCountry: 'us',

  // Voice settings
  tone: 'seo-optimized',
  pointOfView: 'second-person',
  formality: 'informal',

  // Formatting
  formatting: DEFAULT_FORMATTING,
  headingCase: 'title-case',

  // Structure
  structure: DEFAULT_STRUCTURE,

  // Size
  articleSize: DEFAULT_ARTICLE_SIZE,
};

export function mergeWithDefaults(options?: GenerationOptionsInput): GenerationOptions {
  if (!options) {
    return { ...DEFAULT_GENERATION_OPTIONS };
  }

  // Handle deep research options separately - only include if fully specified
  let deepResearch: DeepResearchOptions | undefined = undefined;
  if (options.deepResearch?.enabled !== undefined) {
    deepResearch = {
      enabled: options.deepResearch.enabled,
      depth: options.deepResearch.depth || 'standard',
      topicLevelResearch: options.deepResearch.topicLevelResearch ?? true,
      sectionLevelResearch: options.deepResearch.sectionLevelResearch ?? true,
      includeCitations: options.deepResearch.includeCitations ?? true,
      researchSource: options.deepResearch.researchSource || 'internet',
    };
  }

  const { deepResearch: _, ...restOptions } = options;

  return {
    ...DEFAULT_GENERATION_OPTIONS,
    ...restOptions,
    formatting: {
      ...DEFAULT_FORMATTING,
      ...options.formatting,
    },
    structure: {
      ...DEFAULT_STRUCTURE,
      ...options.structure,
    },
    articleSize: {
      ...DEFAULT_ARTICLE_SIZE,
      ...options.articleSize,
    } as ArticleSize,
    ...(deepResearch && { deepResearch }),
  };
}
