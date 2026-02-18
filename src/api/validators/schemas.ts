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

// Toplist schemas for article generation (defined here to be used in generationOptionsSchema)
const columnDefinitionSchemaForGeneration = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'number', 'currency', 'rating', 'list', 'badge']),
  brandAttribute: z.string().min(1),
  width: z.string().optional(),
  format: z.string().optional(),
});

const brandAttributesSchemaForGeneration = z.record(z.unknown());

const toplistBrandSchemaForGeneration = z.object({
  brandId: z.string(),
  name: z.string(),
  slug: z.string().optional(),
  logoUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  attributes: brandAttributesSchemaForGeneration.default({}),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

const toplistEntryDataSchemaForGeneration = z.object({
  entryId: z.string(),
  toplistId: z.string().optional(),
  brandId: z.string(),
  rank: z.number(),
  attributeOverrides: brandAttributesSchemaForGeneration.optional(),
  brand: toplistBrandSchemaForGeneration.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const articleToplistSchemaForGeneration = z.object({
  toplistId: z.string(),
  name: z.string(),
  templateId: z.string().optional(),
  columns: z.array(columnDefinitionSchemaForGeneration),
  entries: z.array(toplistEntryDataSchemaForGeneration),
  position: z.number().optional(),
  includeInArticle: z.boolean().optional(),
  heading: z.string().optional(),
  headingLevel: z.enum(['h2', 'h3']).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

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

  // Toplists to include in the generated article
  toplists: z.array(articleToplistSchemaForGeneration).optional(),
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

export const articleUpdateRequestSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
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

// Project schemas
export const projectCreateSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().max(500).optional(),
  geo: z.string().max(50).optional(),
  language: z.string().max(50).optional(),
  authors: z.array(z.string().max(100)).max(20).optional(),
  defaultToplistIds: z.array(z.string()).max(10).optional(),
  tone: toneSchema,
  pointOfView: pointOfViewSchema,
  formality: formalitySchema,
  customTonePrompt: z.string().max(1000).optional(),
});

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  geo: z.string().max(50).optional().nullable(),
  language: z.string().max(50).optional().nullable(),
  authors: z.array(z.string().max(100)).max(20).optional().nullable(),
  defaultToplistIds: z.array(z.string()).max(10).optional().nullable(),
  tone: toneSchema.nullable(),
  pointOfView: pointOfViewSchema.nullable(),
  formality: formalitySchema.nullable(),
  customTonePrompt: z.string().max(1000).optional().nullable(),
});

// Toplist schemas for CRUD operations
const columnDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'number', 'currency', 'rating', 'list', 'badge']),
  brandAttribute: z.string().min(1),
  width: z.string().optional(),
  format: z.string().optional(),
});

const brandAttributesSchema = z.record(z.unknown());

// Template schemas
export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  description: z.string().max(500).optional(),
  columns: z.array(columnDefinitionSchema).min(1, 'At least one column is required'),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  columns: z.array(columnDefinitionSchema).min(1).optional(),
});

// Brand schemas
export const createBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required').max(100),
  slug: z.string().max(100).optional(),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  attributes: brandAttributesSchema.optional(),
});

export const updateBrandSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().max(100).optional(),
  logoUrl: z.string().url().optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  attributes: brandAttributesSchema.optional(),
});

// Toplist schemas
export const createToplistSchema = z.object({
  articleId: z.string().uuid().optional(),
  name: z.string().min(1, 'Toplist name is required').max(100),
  templateId: z.string().optional(),
  columns: z.array(columnDefinitionSchema).min(1, 'At least one column is required'),
  position: z.number().int().min(0).optional(),
  markdownOutput: z.string().optional(),
});

export const updateToplistSchema = z.object({
  articleId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(100).optional(),
  templateId: z.string().optional().nullable(),
  columns: z.array(columnDefinitionSchema).min(1).optional(),
  position: z.number().int().min(0).optional(),
  markdownOutput: z.string().optional().nullable(),
});

// Entry schemas
export const createEntrySchema = z.object({
  brandId: z.string().uuid('Invalid brand ID'),
  rank: z.number().int().min(1),
  attributeOverrides: brandAttributesSchema.optional(),
});

export const updateEntrySchema = z.object({
  rank: z.number().int().min(1).optional(),
  attributeOverrides: brandAttributesSchema.optional(),
});

export const reorderEntriesSchema = z.object({
  entryIds: z.array(z.string().uuid()).min(1),
});

// Content Plan schemas
export const contentPlanImportSchema = z.object({
  pages: z.array(z.object({
    url: z.string().max(500).optional(),
    metaTitle: z.string().max(500).optional(),
    metaDescription: z.string().max(1000).optional(),
    keywords: z.string().max(1000).optional(),
    pageType: z.string().max(100).optional(),
    icon: z.string().max(100).optional(),
    level: z.number().int().min(0).max(10).optional(),
    navI: z.string().max(200).optional(),
    navII: z.string().max(200).optional(),
    navIII: z.string().max(200).optional(),
    description: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
  })).min(1, 'At least one page is required').max(500),
});

export const contentPlanGenerateSchema = z.object({
  pageIds: z.array(z.string().uuid()).optional(),
  options: generationOptionsSchema,
});

export const contentPlanPageUpdateSchema = z.object({
  keywords: z.string().max(1000).optional(),
  generationStatus: z.enum(['pending', 'skipped']).optional(),
});

// Type exports
export type ContentPlanImportBody = z.infer<typeof contentPlanImportSchema>;
export type ContentPlanGenerateBody = z.infer<typeof contentPlanGenerateSchema>;
export type ContentPlanPageUpdateBody = z.infer<typeof contentPlanPageUpdateSchema>;
export type ResearchRequestBody = z.infer<typeof researchRequestSchema>;
export type OutlineGenerateRequestBody = z.infer<typeof outlineGenerateRequestSchema>;
export type OutlineUpdateRequestBody = z.infer<typeof outlineUpdateRequestSchema>;
export type ArticleGenerateRequestBody = z.infer<typeof articleGenerateRequestSchema>;
export type ArticleUpdateRequestBody = z.infer<typeof articleUpdateRequestSchema>;
export type FullWorkflowRequestBody = z.infer<typeof fullWorkflowRequestSchema>;
export type CreateAuthorBody = z.infer<typeof createAuthorSchema>;
export type UpdateAuthorBody = z.infer<typeof updateAuthorSchema>;
export type ProjectCreateBody = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateBody = z.infer<typeof projectUpdateSchema>;
export type CreateTemplateBody = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateBody = z.infer<typeof updateTemplateSchema>;
export type CreateBrandBody = z.infer<typeof createBrandSchema>;
export type UpdateBrandBody = z.infer<typeof updateBrandSchema>;
export type CreateToplistBody = z.infer<typeof createToplistSchema>;
export type UpdateToplistBody = z.infer<typeof updateToplistSchema>;
export type CreateEntryBody = z.infer<typeof createEntrySchema>;
export type UpdateEntryBody = z.infer<typeof updateEntrySchema>;
export type ReorderEntriesBody = z.infer<typeof reorderEntriesSchema>;
