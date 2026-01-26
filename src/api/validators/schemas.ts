import { z } from 'zod';

// Language and Country validators (required versions for strict validation)
const languageSchemaRequired = z.enum([
  'en-US', 'en-GB', 'en-AU',
  'es-ES', 'es-MX',
  'fr-FR', 'fr-CA',
  'de-DE', 'de-AT',
  'it-IT',
  'pt-BR', 'pt-PT',
  'nl-NL',
  'sv-SE',
  'no-NO',
  'da-DK',
  'fi-FI',
  'pl-PL',
  'ru-RU',
  'ja-JP',
  'zh-CN', 'zh-TW',
  'ko-KR',
  'ar-SA',
  'hi-IN',
  'tr-TR',
]);

const targetCountrySchemaRequired = z.enum([
  'us', 'gb', 'au', 'ca',
  'de', 'at', 'ch',
  'fr', 'be',
  'es', 'mx',
  'it',
  'nl',
  'se', 'no', 'dk', 'fi',
  'pl',
  'ru',
  'jp',
  'cn', 'tw',
  'kr',
  'sa', 'ae',
  'in',
  'br',
  'tr',
]);

const toneSchemaRequired = z.enum([
  'seo-optimized',
  'professional',
  'friendly',
  'formal',
  'casual',
  'humorous',
  'excited',
  'authoritative',
  'empathetic',
  'custom',
]);

const pointOfViewSchemaRequired = z.enum([
  'automatic',
  'first-person-singular',
  'first-person-plural',
  'second-person',
  'third-person',
]);

const formalitySchemaRequired = z.enum([
  'automatic',
  'formal',
  'informal',
]);

const headingCaseSchemaRequired = z.enum([
  'title-case',
  'sentence-case',
  'all-caps',
]);

// Language and Country validators (optional versions)
const languageSchema = z.enum([
  'en-US', 'en-GB', 'en-AU',
  'es-ES', 'es-MX',
  'fr-FR', 'fr-CA',
  'de-DE', 'de-AT',
  'it-IT',
  'pt-BR', 'pt-PT',
  'nl-NL',
  'sv-SE',
  'no-NO',
  'da-DK',
  'fi-FI',
  'pl-PL',
  'ru-RU',
  'ja-JP',
  'zh-CN', 'zh-TW',
  'ko-KR',
  'ar-SA',
  'hi-IN',
  'tr-TR',
]).optional();

const targetCountrySchema = z.enum([
  'us', 'gb', 'au', 'ca',
  'de', 'at', 'ch',
  'fr', 'be',
  'es', 'mx',
  'it',
  'nl',
  'se', 'no', 'dk', 'fi',
  'pl',
  'ru',
  'jp',
  'cn', 'tw',
  'kr',
  'sa', 'ae',
  'in',
  'br',
  'tr',
]).optional();

// Tone and Voice validators
const toneSchema = z.enum([
  'seo-optimized',
  'professional',
  'friendly',
  'formal',
  'casual',
  'humorous',
  'excited',
  'authoritative',
  'empathetic',
  'custom',
]).optional();

const pointOfViewSchema = z.enum([
  'automatic',
  'first-person-singular',
  'first-person-plural',
  'second-person',
  'third-person',
]).optional();

const formalitySchema = z.enum([
  'automatic',
  'formal',
  'informal',
]).optional();

// Formatting toggles
const formattingTogglesSchema = z.object({
  bold: z.boolean().optional(),
  italics: z.boolean().optional(),
  tables: z.boolean().optional(),
  quotes: z.boolean().optional(),
  lists: z.boolean().optional(),
}).optional();

// Heading case
const headingCaseSchema = z.enum([
  'title-case',
  'sentence-case',
  'all-caps',
]).optional();

// Structure toggles
const structureTogglesSchema = z.object({
  keyTakeaways: z.boolean().optional(),
  conclusion: z.boolean().optional(),
  faqs: z.boolean().optional(),
  tableOfContents: z.boolean().optional(),
}).optional();

// Article size
const articleSizePresetSchema = z.enum([
  'shorter',
  'short',
  'medium',
  'long',
  'longer',
  'custom',
]).optional();

const articleSizeSchema = z.object({
  preset: articleSizePresetSchema,
  targetWordCount: z.number().min(100).max(20000).optional(),

  // Header controls
  headingCount: z.number().min(1).max(48).optional(),
  minHeadings: z.number().min(1).max(48).optional(),
  maxHeadings: z.number().min(1).max(48).optional(),
  subsectionsPerSection: z.number().min(0).max(5).optional(),

  // Section length controls
  wordsPerSection: z.number().min(50).max(2000).optional(),
  minWordsPerSection: z.number().min(50).max(1000).optional(),
  maxWordsPerSection: z.number().min(100).max(2000).optional(),

  // Introduction/Conclusion lengths
  introductionLength: z.enum(['brief', 'standard', 'detailed']).optional(),
  conclusionLength: z.enum(['brief', 'standard', 'detailed']).optional(),
}).optional();

// Call to Action
const callToActionSchema = z.object({
  enabled: z.boolean(),
  heading: z.string().optional(),
  text: z.string().optional(),
  url: z.string().url().optional(),
  buttonText: z.string().optional(),
}).optional();

// Deep Research Options
const deepResearchDepthSchema = z.enum(['shallow', 'standard', 'deep']).optional();

const deepResearchOptionsSchema = z.object({
  enabled: z.boolean().optional(),
  depth: deepResearchDepthSchema,
  topicLevelResearch: z.boolean().optional(),
  sectionLevelResearch: z.boolean().optional(),
  includeCitations: z.boolean().optional(),
}).optional();

// Complete Generation Options schema
export const generationOptionsSchema = z.object({
  // Content settings
  language: languageSchema,
  targetCountry: targetCountrySchema,

  // Voice settings
  tone: toneSchema,
  pointOfView: pointOfViewSchema,
  formality: formalitySchema,
  customTonePrompt: z.string().max(1000).optional(),

  // Formatting
  formatting: formattingTogglesSchema,
  headingCase: headingCaseSchema,

  // Structure
  structure: structureTogglesSchema,

  // Size
  articleSize: articleSizeSchema,

  // CTA
  callToAction: callToActionSchema,

  // Deep Research (opt-in)
  deepResearch: deepResearchOptionsSchema,

  // Author profile (overrides individual settings)
  authorProfileId: z.string().optional(),

  // User-provided title to guide outline structure
  title: z.string().max(500).optional(),

  // Additional keywords to include in the outline
  includeKeywords: z.array(z.string().max(100)).max(20).optional(),
}).optional();

// Legacy preferences schema (for backward compatibility)
export const generationPreferencesSchema = z.object({
  tone: z.enum(['professional', 'casual', 'academic', 'conversational']).optional(),
  formality: z.enum(['formal', 'informal', 'neutral']).optional(),
  targetWordCount: z.number().min(500).max(10000).optional(),
  includeStats: z.boolean().optional(),
  includeFAQ: z.boolean().optional(),
}).optional();

// Request schemas
export const researchRequestSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required').max(200),
  geo: z.string().length(2).optional().default('us'),
});

export const outlineGenerateRequestSchema = z.object({
  researchId: z.string().uuid('Invalid research ID'),
  options: generationOptionsSchema,
  // Legacy support
  preferences: generationPreferencesSchema,
});

// Component type for predefined section formats
export const componentTypeSchema = z.enum([
  'prose',
  'toplist',
  'mini_review',
  'category_ranking',
  'payment_table',
  'comparison',
  'faq',
  'methodology',
  'legal_rg',
  'safety_checklist',
  'player_profiles',
  'decision_flow',
  'glossary',
  'sources',
]);

export const outlineSectionSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    heading: z.string().min(1),
    level: z.number().min(1).max(6),
    description: z.string(),
    suggestedWordCount: z.number().optional(),
    componentType: componentTypeSchema.optional(),
    subsections: z.array(outlineSectionSchema).optional(),
  })
);

export const outlineUpdateRequestSchema = z.object({
  sections: z.array(outlineSectionSchema).optional(),
  metadata: z.object({
    estimatedWordCount: z.number().optional(),
    suggestedKeywords: z.array(z.string()).optional(),
    targetAudience: z.string().optional(),
    tone: z.string().optional(),
  }).optional(),
});

export const articleGenerateRequestSchema = z.object({
  outlineId: z.string().uuid('Invalid outline ID'),
  options: generationOptionsSchema,
  // Legacy support
  preferences: generationPreferencesSchema,
});

export const fullWorkflowRequestSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required').max(200),
  geo: z.string().length(2).optional().default('us'),
  outlineId: z.string().uuid().optional(),  // Use existing outline if provided
  options: generationOptionsSchema,
  // Legacy support
  preferences: generationPreferencesSchema,
});

// Author schemas
const formattingTogglesSchemaFull = z.object({
  bold: z.boolean(),
  italics: z.boolean(),
  tables: z.boolean(),
  quotes: z.boolean(),
  lists: z.boolean(),
}).optional();

export const createAuthorSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  description: z.string().max(500).optional(),
  site: z.string().max(100).optional(),
  language: languageSchemaRequired,
  targetCountry: targetCountrySchemaRequired,
  tone: toneSchemaRequired,
  pointOfView: pointOfViewSchemaRequired,
  formality: formalitySchemaRequired,
  customTonePrompt: z.string().max(1000).optional(),
  formatting: formattingTogglesSchemaFull,
  headingCase: headingCaseSchemaRequired.optional(),
});

export const updateAuthorSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  site: z.string().max(100).optional(),
  language: languageSchemaRequired.optional(),
  targetCountry: targetCountrySchemaRequired.optional(),
  tone: toneSchemaRequired.optional(),
  pointOfView: pointOfViewSchemaRequired.optional(),
  formality: formalitySchemaRequired.optional(),
  customTonePrompt: z.string().max(1000).optional(),
  formatting: formattingTogglesSchemaFull,
  headingCase: headingCaseSchemaRequired.optional(),
});

// Type exports
export type ResearchRequestBody = z.infer<typeof researchRequestSchema>;
export type OutlineGenerateRequestBody = z.infer<typeof outlineGenerateRequestSchema>;
export type OutlineUpdateRequestBody = z.infer<typeof outlineUpdateRequestSchema>;
export type ArticleGenerateRequestBody = z.infer<typeof articleGenerateRequestSchema>;
export type FullWorkflowRequestBody = z.infer<typeof fullWorkflowRequestSchema>;
export type CreateAuthorBody = z.infer<typeof createAuthorSchema>;
export type UpdateAuthorBody = z.infer<typeof updateAuthorSchema>;
