// Language and Localization
export type Language =
  | 'en-US' | 'en-GB' | 'en-AU'
  | 'es-ES' | 'es-MX'
  | 'fr-FR' | 'fr-CA'
  | 'de-DE' | 'de-AT'
  | 'it-IT'
  | 'pt-BR' | 'pt-PT'
  | 'nl-NL'
  | 'sv-SE'
  | 'no-NO'
  | 'da-DK'
  | 'fi-FI'
  | 'pl-PL'
  | 'ru-RU'
  | 'ja-JP'
  | 'zh-CN' | 'zh-TW'
  | 'ko-KR'
  | 'ar-SA'
  | 'hi-IN'
  | 'tr-TR';

export type TargetCountry =
  | 'us' | 'gb' | 'au' | 'ca'
  | 'de' | 'at' | 'ch'
  | 'fr' | 'be'
  | 'es' | 'mx'
  | 'it'
  | 'nl'
  | 'se' | 'no' | 'dk' | 'fi'
  | 'pl'
  | 'ru'
  | 'jp'
  | 'cn' | 'tw'
  | 'kr'
  | 'sa' | 'ae'
  | 'in'
  | 'br'
  | 'tr';

// Tone and Voice
export type ToneOfVoice =
  | 'seo-optimized'
  | 'professional'
  | 'friendly'
  | 'formal'
  | 'casual'
  | 'humorous'
  | 'excited'
  | 'authoritative'
  | 'empathetic'
  | 'custom';

export type PointOfView =
  | 'automatic'
  | 'first-person-singular'   // I
  | 'first-person-plural'     // We
  | 'second-person'           // You
  | 'third-person';           // He/She/They

export type Formality =
  | 'automatic'
  | 'formal'
  | 'informal';

// Formatting
export interface FormattingToggles {
  bold: boolean;
  italics: boolean;
  tables: boolean;
  quotes: boolean;
  lists: boolean;
}

// Partial version for API input
export interface FormattingTogglesInput {
  bold?: boolean;
  italics?: boolean;
  tables?: boolean;
  quotes?: boolean;
  lists?: boolean;
}

export type HeadingCase =
  | 'title-case'
  | 'sentence-case'
  | 'all-caps';

// Structure
export interface StructureToggles {
  keyTakeaways: boolean;      // Top summary box
  conclusion: boolean;
  faqs: boolean;
  tableOfContents: boolean;
}

// Partial version for API input
export interface StructureTogglesInput {
  keyTakeaways?: boolean;
  conclusion?: boolean;
  faqs?: boolean;
  tableOfContents?: boolean;
}

// Article Size
export type ArticleSizePreset =
  | 'shorter'     // 2-3 headings
  | 'short'       // 3-5 headings
  | 'medium'      // 5-7 headings
  | 'long'        // 7-10 headings
  | 'longer'      // 10-12 headings
  | 'custom';

export interface ArticleSize {
  preset: ArticleSizePreset;
  targetWordCount?: number;           // Total article word count target

  // Header controls
  headingCount?: number;              // Exact number of H2 sections (1-48)
  minHeadings?: number;               // Minimum H2 sections
  maxHeadings?: number;               // Maximum H2 sections
  subsectionsPerSection?: number;     // H3s per H2 (0-5)

  // Section length controls
  wordsPerSection?: number;           // Target words per H2 section
  minWordsPerSection?: number;        // Minimum words per section
  maxWordsPerSection?: number;        // Maximum words per section

  // Introduction/Conclusion lengths
  introductionLength?: 'brief' | 'standard' | 'detailed';  // ~100 / ~200 / ~400 words
  conclusionLength?: 'brief' | 'standard' | 'detailed';
}

// Call to Action
export interface CallToAction {
  enabled: boolean;
  heading?: string;            // Custom H3 heading
  text?: string;               // CTA description
  url?: string;                // Link URL
  buttonText?: string;         // Link text
}

// Research Source Options
export type ResearchSource =
  | 'internet'        // SERPER + Firecrawl only
  | 'knowledge_base'  // RAG/Vector store only
  | 'both';           // Internet + Knowledge base

// Deep Research Options
export type DeepResearchDepth = 'shallow' | 'standard' | 'deep';

export interface DeepResearchOptions {
  enabled: boolean;
  depth: DeepResearchDepth;
  topicLevelResearch: boolean;   // Research before outline
  sectionLevelResearch: boolean; // Research per section
  includeCitations: boolean;     // Add [1], [2] and Sources section
  researchSource: ResearchSource; // Where to get research data from
}

// Author Profile (combines all voice/style settings)
export interface AuthorProfile {
  id: string;
  firstName: string;
  lastName: string;
  description?: string;
  site?: string;  // Site/brand this author belongs to

  // Voice settings
  language: Language;
  targetCountry: TargetCountry;
  tone: ToneOfVoice;
  pointOfView: PointOfView;
  formality: Formality;
  customTonePrompt?: string;   // Extra prompt for custom tone

  // Formatting preferences (optional)
  formatting?: FormattingToggles;
  headingCase?: HeadingCase;

  // Metadata
  isBuiltIn?: boolean;  // True for system profiles
  createdAt?: string;
  updatedAt?: string;
}

// Helper to get full display name
export function getAuthorDisplayName(author: AuthorProfile): string {
  return `${author.firstName} ${author.lastName}`;
}

// Complete Generation Options (fully resolved)
export interface GenerationOptions {
  // Content settings
  language: Language;
  targetCountry: TargetCountry;

  // Voice settings
  tone: ToneOfVoice;
  pointOfView: PointOfView;
  formality: Formality;
  customTonePrompt?: string;

  // Formatting
  formatting: FormattingToggles;
  headingCase: HeadingCase;

  // Structure
  structure: StructureToggles;

  // Size
  articleSize: ArticleSize;

  // CTA
  callToAction?: CallToAction;

  // Deep Research (opt-in)
  deepResearch?: DeepResearchOptions;

  // Or use a preset author profile
  authorProfileId?: string;
}

// Input version for API requests (all fields optional, merged with defaults)
export interface GenerationOptionsInput {
  language?: Language;
  targetCountry?: TargetCountry;
  tone?: ToneOfVoice;
  pointOfView?: PointOfView;
  formality?: Formality;
  customTonePrompt?: string;
  formatting?: FormattingTogglesInput;
  headingCase?: HeadingCase;
  structure?: StructureTogglesInput;
  articleSize?: Partial<ArticleSize>;
  callToAction?: CallToAction;
  deepResearch?: Partial<DeepResearchOptions>;
  authorProfileId?: string;
  title?: string;                   // User-provided article title to guide outline structure
  includeKeywords?: string[];       // Additional keywords to include in the outline
}

// Maps for display names
export const LANGUAGE_NAMES: Record<Language, string> = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'en-AU': 'English (Australia)',
  'es-ES': 'Spanish (Spain)',
  'es-MX': 'Spanish (Mexico)',
  'fr-FR': 'French (France)',
  'fr-CA': 'French (Canada)',
  'de-DE': 'German (Germany)',
  'de-AT': 'German (Austria)',
  'it-IT': 'Italian',
  'pt-BR': 'Portuguese (Brazil)',
  'pt-PT': 'Portuguese (Portugal)',
  'nl-NL': 'Dutch',
  'sv-SE': 'Swedish',
  'no-NO': 'Norwegian',
  'da-DK': 'Danish',
  'fi-FI': 'Finnish',
  'pl-PL': 'Polish',
  'ru-RU': 'Russian',
  'ja-JP': 'Japanese',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'ko-KR': 'Korean',
  'ar-SA': 'Arabic',
  'hi-IN': 'Hindi',
  'tr-TR': 'Turkish',
};

export const COUNTRY_NAMES: Record<TargetCountry, string> = {
  'us': 'United States',
  'gb': 'United Kingdom',
  'au': 'Australia',
  'ca': 'Canada',
  'de': 'Germany',
  'at': 'Austria',
  'ch': 'Switzerland',
  'fr': 'France',
  'be': 'Belgium',
  'es': 'Spain',
  'mx': 'Mexico',
  'it': 'Italy',
  'nl': 'Netherlands',
  'se': 'Sweden',
  'no': 'Norway',
  'dk': 'Denmark',
  'fi': 'Finland',
  'pl': 'Poland',
  'ru': 'Russia',
  'jp': 'Japan',
  'cn': 'China',
  'tw': 'Taiwan',
  'kr': 'South Korea',
  'sa': 'Saudi Arabia',
  'ae': 'United Arab Emirates',
  'in': 'India',
  'br': 'Brazil',
  'tr': 'Turkey',
};

export interface ArticleSizeConfig {
  minHeadings: number;
  maxHeadings: number;
  targetWords: number;
  wordsPerSection: number;
  subsectionsPerSection: number;
}

export const ARTICLE_SIZE_CONFIG: Record<ArticleSizePreset, ArticleSizeConfig> = {
  'shorter': { minHeadings: 2, maxHeadings: 3, targetWords: 800, wordsPerSection: 250, subsectionsPerSection: 0 },
  'short': { minHeadings: 3, maxHeadings: 5, targetWords: 1200, wordsPerSection: 300, subsectionsPerSection: 1 },
  'medium': { minHeadings: 5, maxHeadings: 7, targetWords: 2000, wordsPerSection: 350, subsectionsPerSection: 2 },
  'long': { minHeadings: 7, maxHeadings: 10, targetWords: 3000, wordsPerSection: 400, subsectionsPerSection: 2 },
  'longer': { minHeadings: 10, maxHeadings: 12, targetWords: 4000, wordsPerSection: 400, subsectionsPerSection: 3 },
  'custom': { minHeadings: 1, maxHeadings: 48, targetWords: 2000, wordsPerSection: 350, subsectionsPerSection: 2 },
};

export const INTRO_CONCLUSION_LENGTHS = {
  'brief': 100,
  'standard': 200,
  'detailed': 400,
};
