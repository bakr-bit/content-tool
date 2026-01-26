// Export generation options types
export * from './generation-options';

// Search and Research Types
export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface PeopleAlsoAskItem {
  question: string;
  snippet?: string;
  link?: string;
}

export interface ScrapedPage {
  url: string;
  title?: string;
  content: string;
  wordCount: number;
  scrapedAt: string;
}

export interface ResearchResult {
  researchId: string;
  keyword: string;
  geo: string;
  serpResults: SearchResult[];
  scrapedContent: ScrapedPage[];
  peopleAlsoAsk?: PeopleAlsoAskItem[];
  createdAt: string;
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

// Outline Types
export interface OutlineSection {
  id: string;
  heading: string;
  level: number;
  description: string;
  suggestedWordCount?: number;
  componentType?: ComponentType;  // Component type for specialized formatting
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

// Project Types
export interface Project {
  projectId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectWithCount extends Project {
  articleCount: number;
}

// Workflow Types
export type WorkflowStatus = 'pending' | 'researching' | 'outlining' | 'writing' | 'editing' | 'completed' | 'failed';

export interface WorkflowState {
  workflowId: string;
  status: WorkflowStatus;
  keyword: string;
  geo: string;
  research?: ResearchResult;
  deepResearch?: DeepResearchResult;
  gapAnalysis?: GapAnalysisResult;
  outline?: Outline;
  article?: Article;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

// User Preferences for Generation
export interface GenerationPreferences {
  tone?: 'professional' | 'casual' | 'academic' | 'conversational';
  formality?: 'formal' | 'informal' | 'neutral';
  targetWordCount?: number;
  includeStats?: boolean;
  includeFAQ?: boolean;
}

// LLM Types
export type LLMProvider = 'openai' | 'gemini';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// API Request/Response Types
export interface ResearchRequest {
  keyword: string;
  geo?: string;
}

export interface OutlineGenerateRequest {
  researchId: string;
  preferences?: GenerationPreferences;
}

export interface OutlineUpdateRequest {
  sections?: OutlineSection[];
  metadata?: Partial<OutlineMetadata>;
}

export interface ArticleGenerateRequest {
  outlineId: string;
  preferences?: GenerationPreferences;
}

export interface FullWorkflowRequest {
  keyword: string;
  geo?: string;
  preferences?: GenerationPreferences;
}

// Deep Research Types
export interface VerifiedSource {
  id: number;
  url: string;
  title: string;
  summary: string;
  quality: number; // 0-1 score
  content?: string;
}

export interface ExtractedFact {
  fact: string;
  sourceIds: number[];
  type: 'statistic' | 'quote' | 'definition' | 'claim';
}

export interface DeepResearchResult {
  query: string;
  answer: string;
  sources: VerifiedSource[];
  facts: ExtractedFact[];
  followUpQuestions: string[];
}

export interface ContentGap {
  topic: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
  suggestedAngle: string;
}

export interface GapAnalysisResult {
  gaps: ContentGap[];
  uniqueAngles: string[];
  competitorWeaknesses: string[];
}

export interface SectionResearchContext {
  facts: ExtractedFact[];
  sources: VerifiedSource[];
  statistics: string[];
  quotes: string[];
}

export interface DeepResearchState {
  topicResearch?: DeepResearchResult;
  gapAnalysis?: GapAnalysisResult;
  sectionResearch: Map<string, SectionResearchContext>;
  allSources: VerifiedSource[];
}
