import { AuthorProfile } from '../types/generation-options';

// Default formatting toggles
const DEFAULT_FORMATTING = {
  bold: true,
  italics: true,
  tables: true,
  quotes: true,
  lists: true,
};

// Built-in Author Profiles
export const BUILTIN_AUTHOR_PROFILES: Record<string, AuthorProfile> = {
  'seo-expert': {
    id: 'seo-expert',
    firstName: 'SEO',
    lastName: 'Expert',
    description: 'Optimized for search engines with strategic keyword placement and scannable content',
    language: 'en-US',
    targetCountry: 'us',
    tone: 'seo-optimized',
    pointOfView: 'second-person',
    formality: 'informal',
    formatting: DEFAULT_FORMATTING,
    headingCase: 'title-case',
    customTonePrompt: 'Focus on answering search intent directly. Use strategic keyword placement in headings and first paragraphs. Create scannable content with bullet points and short paragraphs.',
    isBuiltIn: true,
  },

  'professional-writer': {
    id: 'professional-writer',
    firstName: 'Professional',
    lastName: 'Writer',
    description: 'Authoritative business content with a polished, professional tone',
    language: 'en-US',
    targetCountry: 'us',
    tone: 'professional',
    pointOfView: 'first-person-plural',
    formality: 'formal',
    formatting: { ...DEFAULT_FORMATTING, quotes: true },
    headingCase: 'title-case',
    customTonePrompt: 'Write with authority and expertise. Use data and examples to support claims. Maintain a polished, business-appropriate tone throughout.',
    isBuiltIn: true,
  },

  'friendly-blogger': {
    id: 'friendly-blogger',
    firstName: 'Friendly',
    lastName: 'Blogger',
    description: 'Conversational and approachable content that connects with readers',
    language: 'en-US',
    targetCountry: 'us',
    tone: 'friendly',
    pointOfView: 'first-person-singular',
    formality: 'informal',
    formatting: DEFAULT_FORMATTING,
    headingCase: 'sentence-case',
    customTonePrompt: 'Write like you\'re talking to a friend. Use conversational language, personal anecdotes, and relatable examples. Be warm and approachable.',
    isBuiltIn: true,
  },

  'academic-researcher': {
    id: 'academic-researcher',
    firstName: 'Academic',
    lastName: 'Researcher',
    description: 'Scholarly content with citations and formal academic style',
    language: 'en-US',
    targetCountry: 'us',
    tone: 'formal',
    pointOfView: 'third-person',
    formality: 'formal',
    formatting: { ...DEFAULT_FORMATTING, italics: true },
    headingCase: 'sentence-case',
    customTonePrompt: 'Write in an academic style with precise language. Reference studies and data. Avoid casual expressions and maintain objectivity.',
    isBuiltIn: true,
  },

  'tech-explainer': {
    id: 'tech-explainer',
    firstName: 'Tech',
    lastName: 'Explainer',
    description: 'Clear technical explanations that make complex topics accessible',
    language: 'en-US',
    targetCountry: 'us',
    tone: 'professional',
    pointOfView: 'second-person',
    formality: 'informal',
    formatting: { ...DEFAULT_FORMATTING, tables: true },
    headingCase: 'title-case',
    customTonePrompt: 'Explain technical concepts clearly without jargon. Use analogies and examples. Break down complex topics into digestible pieces.',
    isBuiltIn: true,
  },

  'sales-copywriter': {
    id: 'sales-copywriter',
    firstName: 'Sales',
    lastName: 'Copywriter',
    description: 'Persuasive content designed to drive conversions and action',
    language: 'en-US',
    targetCountry: 'us',
    tone: 'excited',
    pointOfView: 'second-person',
    formality: 'informal',
    formatting: { ...DEFAULT_FORMATTING, bold: true },
    headingCase: 'title-case',
    customTonePrompt: 'Write persuasively with clear benefits and calls to action. Use power words and create urgency. Focus on what the reader gains.',
    isBuiltIn: true,
  },

  'swedish-seo': {
    id: 'swedish-seo',
    firstName: 'Swedish',
    lastName: 'SEO Writer',
    description: 'SEO-optimized content in Swedish for the Swedish market',
    language: 'sv-SE',
    targetCountry: 'se',
    tone: 'seo-optimized',
    pointOfView: 'second-person',
    formality: 'informal',
    formatting: DEFAULT_FORMATTING,
    headingCase: 'sentence-case',
    customTonePrompt: 'Skriv för svenska läsare med naturligt språk. Använd svenska SEO-principer och anpassa innehållet för den svenska marknaden.',
    isBuiltIn: true,
  },

  'german-professional': {
    id: 'german-professional',
    firstName: 'German',
    lastName: 'Professional',
    description: 'Professional content in German with formal business tone',
    language: 'de-DE',
    targetCountry: 'de',
    tone: 'professional',
    pointOfView: 'first-person-plural',
    formality: 'formal',
    formatting: DEFAULT_FORMATTING,
    headingCase: 'sentence-case',
    customTonePrompt: 'Schreiben Sie professionell und sachlich. Verwenden Sie die Höflichkeitsform (Sie). Halten Sie einen formellen, geschäftsmäßigen Ton.',
    isBuiltIn: true,
  },
};

export function getBuiltInAuthorProfile(id: string): AuthorProfile | undefined {
  return BUILTIN_AUTHOR_PROFILES[id];
}

export function getAllBuiltInAuthorProfiles(): AuthorProfile[] {
  return Object.values(BUILTIN_AUTHOR_PROFILES);
}
