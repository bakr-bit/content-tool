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
  | 'first-person-singular'
  | 'first-person-plural'
  | 'second-person'
  | 'third-person';

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

// Structure
export interface StructureToggles {
  keyTakeaways: boolean;
  conclusion: boolean;
  faqs: boolean;
  tableOfContents: boolean;
}

// Article Size
export type ArticleSizePreset =
  | 'shorter'
  | 'short'
  | 'medium'
  | 'long'
  | 'longer'
  | 'custom';

export interface ArticleSize {
  preset: ArticleSizePreset;
  targetWordCount?: number;
  headingCount?: number;
  minHeadings?: number;
  maxHeadings?: number;
  subsectionsPerSection?: number;
  wordsPerSection?: number;
  minWordsPerSection?: number;
  maxWordsPerSection?: number;
  introductionLength?: 'brief' | 'standard' | 'detailed';
  conclusionLength?: 'brief' | 'standard' | 'detailed';
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
  topicLevelResearch: boolean;
  sectionLevelResearch: boolean;
  includeCitations: boolean;
  researchSource: ResearchSource;
}

// Output Format
export type OutputFormat = 'markdown' | 'html';

// Heading Case
export type HeadingCase = 'title-case' | 'sentence-case' | 'all-caps';

// Author Profile
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
  customTonePrompt?: string;

  // Formatting preferences (optional)
  formatting?: FormattingToggles;
  headingCase?: HeadingCase;

  // Metadata
  isBuiltIn?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Helper to get full display name
export function getAuthorDisplayName(author: AuthorProfile): string {
  return `${author.firstName} ${author.lastName}`;
}

// Component Types for predefined article section formats
export type ComponentType =
  | 'prose'           // Default paragraph content
  | 'toplist'         // Main ranking table with uniform columns
  | 'mini_review'     // Individual item review with consistent structure
  | 'category_ranking'// Smaller table for specific intent
  | 'payment_table'   // Deposit/withdrawal comparison
  | 'comparison'      // Two-column A vs B comparison
  | 'faq'             // Q&A format with objection-killers
  | 'methodology'     // Scoring/evaluation explanation
  | 'legal_rg'        // Jurisdiction, risks, help resources
  | 'safety_checklist'// Green flags vs red flags table
  | 'player_profiles' // Profile-based recommendations table
  | 'decision_flow'   // Step-by-step numbered guide
  | 'glossary'        // Terms with definitions
  | 'sources';        // Authoritative references

export interface ComponentInfo {
  id: ComponentType;
  name: string;
  description: string;
  useCase: string;
}

// Outline Types
export interface OutlineSection {
  id: string;
  heading: string;
  level: number;
  description: string;
  suggestedWordCount?: number;
  componentType?: ComponentType;
  toplistId?: string;             // Reference to a toplist (renders as table, not LLM-generated)
  subsections?: OutlineSection[];
}

export interface OutlineMetadata {
  estimatedWordCount: number;
  suggestedKeywords: string[];
  targetAudience?: string;
  tone?: string;
}

export interface Outline {
  outlineId: string;
  researchId: string;
  keyword: string;
  title: string;
  sections: OutlineSection[];
  metadata: OutlineMetadata;
  createdAt: string;
  updatedAt?: string;
}

// Article Types
export interface GeneratedSection {
  id: string;
  heading: string;
  content: string;
  wordCount: number;
}

export interface ArticleMetadata {
  wordCount: number;
  readingTimeMinutes: number;
  generationStats: {
    sectionsGenerated: number;
    totalLLMCalls: number;
    generationTimeMs: number;
  };
}

export interface Article {
  articleId: string;
  outlineId: string;
  keyword: string;
  title: string;
  content: string;
  sections: GeneratedSection[];
  metadata: ArticleMetadata;
  site?: string;
  projectId?: string;
  createdAt: string;
}

// Article Status for persistence
export type ArticleStatus = 'draft' | 'published' | 'archived';

export interface ArticleWithStatus extends Article {
  status: ArticleStatus;
  projectId?: string;
  updatedAt?: string;
}

export interface ListArticlesResult {
  articles: ArticleWithStatus[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListArticlesQuery {
  keyword?: string;
  status?: ArticleStatus;
  projectId?: string;
  sortBy?: 'created_at' | 'updated_at' | 'title' | 'keyword';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const ARTICLE_STATUS_NAMES: Record<ArticleStatus, string> = {
  'draft': 'Draft',
  'published': 'Published',
  'archived': 'Archived',
};

// Workflow Types
export type WorkflowStatus = 'pending' | 'researching' | 'outlining' | 'writing' | 'editing' | 'completed' | 'failed';

export interface WorkflowState {
  workflowId: string;
  status: WorkflowStatus;
  keyword: string;
  geo: string;
  outline?: Outline;
  article?: Article;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

// Form State for the Article Modal
export interface ArticleFormState {
  // Details Tab
  focusKeyword: string;
  articleTitle: string;
  projectId: string;
  includeKeywords: string[];
  selectedTemplateId?: string;  // Selected article template ID
  selectedTemplate?: import('@/types/template').ArticleTemplate;  // Full template object for UI display

  // Content Tab
  selectedAuthorId?: string;  // Selected author profile ID
  language: Language;
  targetCountry: TargetCountry;
  tone: ToneOfVoice;
  pointOfView: PointOfView;
  formality: Formality;
  customTonePrompt?: string;

  // Formatting Tab
  formatting: FormattingToggles;

  // Advanced Settings
  outputFormat: OutputFormat;

  // Structure Tab
  structure: StructureToggles;
  articleSize: ArticleSize;

  // Outline Tab
  outline?: Outline;
  customOutline?: OutlineSection[];
  outlineText: string;  // Markdown text of the outline (persists as draft)

  // Knowledge Tab
  deepResearch: DeepResearchOptions;

  // Toplist Tab
  toplists?: import('@/types/toplist').ArticleToplist[];
}

// API Request Types
export interface FullWorkflowRequest {
  keyword: string;
  geo?: string;
  outlineId?: string;  // If provided, use existing outline instead of generating new
  options?: {
    language?: Language;
    targetCountry?: TargetCountry;
    tone?: ToneOfVoice;
    pointOfView?: PointOfView;
    formality?: Formality;
    customTonePrompt?: string;
    formatting?: Partial<FormattingToggles>;
    outputFormat?: OutputFormat;
    structure?: Partial<StructureToggles>;
    articleSize?: Partial<ArticleSize>;
    deepResearch?: Partial<DeepResearchOptions>;
    title?: string;
    includeKeywords?: string[];
    site?: string;
    projectId?: string;
    toplists?: import('@/types/toplist').ArticleToplist[];
    templateId?: string;  // Template to guide outline structure
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: number;
  };
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

export const TONE_NAMES: Record<ToneOfVoice, string> = {
  'seo-optimized': 'SEO Optimized',
  'professional': 'Professional',
  'friendly': 'Friendly',
  'formal': 'Formal',
  'casual': 'Casual',
  'humorous': 'Humorous',
  'excited': 'Excited',
  'authoritative': 'Authoritative',
  'empathetic': 'Empathetic',
  'custom': 'Custom',
};

export const POV_NAMES: Record<PointOfView, string> = {
  'automatic': 'Automatic',
  'first-person-singular': 'First Person (I)',
  'first-person-plural': 'First Person (We)',
  'second-person': 'Second Person (You)',
  'third-person': 'Third Person (They)',
};

export const FORMALITY_NAMES: Record<Formality, string> = {
  'automatic': 'Automatic',
  'formal': 'Formal',
  'informal': 'Informal',
};

export const OUTPUT_FORMAT_NAMES: Record<OutputFormat, string> = {
  'markdown': 'Markdown',
  'html': 'HTML',
};

export const ARTICLE_SIZE_NAMES: Record<ArticleSizePreset, string> = {
  'shorter': 'Shorter (~800 words)',
  'short': 'Short (~1,200 words)',
  'medium': 'Medium (~2,000 words)',
  'long': 'Long (~3,000 words)',
  'longer': 'Longer (~4,000 words)',
  'custom': 'Custom',
};

export const DEEP_RESEARCH_DEPTH_NAMES: Record<DeepResearchDepth, string> = {
  'shallow': 'Shallow',
  'standard': 'Standard',
  'deep': 'Deep',
};

export const RESEARCH_SOURCE_NAMES: Record<ResearchSource, string> = {
  'internet': 'Internet Only',
  'knowledge_base': 'Knowledge Base Only',
  'both': 'Both (Internet + KB)',
};

export const COMPONENT_TYPE_NAMES: Record<ComponentType, string> = {
  'prose': 'Standard Prose',
  'toplist': 'Top Comparison Table',
  'mini_review': 'Mini-Review Card',
  'category_ranking': 'Category Mini-Ranking',
  'payment_table': 'Payment Methods Table',
  'comparison': 'Comparison Table',
  'faq': 'FAQ Section',
  'methodology': 'Methodology Block',
  'legal_rg': 'Legal + RG Block',
  'safety_checklist': 'Safety Checklist',
  'player_profiles': 'Player Profiles',
  'decision_flow': 'Decision Flow',
  'glossary': 'Glossary',
  'sources': 'Sources Box',
};
