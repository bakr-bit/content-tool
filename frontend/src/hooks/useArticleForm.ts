import { useState, useCallback } from 'react';
import type {
  ArticleFormState,
  Language,
  TargetCountry,
  ToneOfVoice,
  PointOfView,
  Formality,
  FormattingToggles,
  StructureToggles,
  ArticleSize,
  DeepResearchOptions,
  OutlineSection,
  FullWorkflowRequest,
  OutputFormat,
} from '@/types/article';
import type { ArticleToplist } from '@/types/toplist';
import type { ArticleTemplate } from '@/types/template';

// Mapping from language to default target country
const LANGUAGE_TO_COUNTRY: Record<Language, TargetCountry> = {
  'en-US': 'us',
  'en-GB': 'gb',
  'en-AU': 'au',
  'es-ES': 'es',
  'es-MX': 'mx',
  'fr-FR': 'fr',
  'fr-CA': 'ca',
  'de-DE': 'de',
  'de-AT': 'at',
  'it-IT': 'it',
  'pt-BR': 'br',
  'pt-PT': 'br',  // Portugal maps to Brazil (closest available)
  'nl-NL': 'nl',
  'sv-SE': 'se',
  'no-NO': 'no',
  'da-DK': 'dk',
  'fi-FI': 'fi',
  'pl-PL': 'pl',
  'ru-RU': 'ru',
  'ja-JP': 'jp',
  'zh-CN': 'cn',
  'zh-TW': 'tw',
  'ko-KR': 'kr',
  'ar-SA': 'sa',
  'hi-IN': 'in',
  'tr-TR': 'tr',
};

const DEFAULT_FORM_STATE: ArticleFormState = {
  // Details Tab
  focusKeyword: '',
  articleTitle: '',
  projectId: '',
  includeKeywords: [],
  selectedTemplateId: undefined,
  selectedTemplate: undefined,

  // Content Tab
  selectedAuthorId: undefined,
  language: 'en-US',
  targetCountry: 'us',
  tone: 'seo-optimized',
  pointOfView: 'second-person',
  formality: 'informal',
  customTonePrompt: '',

  // Formatting Tab
  formatting: {
    bold: true,
    italics: true,
    tables: true,
    quotes: true,
    lists: true,
  },

  // Advanced Settings
  outputFormat: 'markdown',

  // Structure Tab
  structure: {
    keyTakeaways: false,
    conclusion: true,
    faqs: false,
    tableOfContents: false,
  },
  articleSize: {
    preset: 'medium',
    targetWordCount: 2000,
  },

  // Outline Tab
  outline: undefined,
  customOutline: undefined,
  outlineText: '',

  // Knowledge Tab
  deepResearch: {
    enabled: false,
    depth: 'standard',
    topicLevelResearch: true,
    sectionLevelResearch: true,
    includeCitations: true,
    researchSource: 'internet',
  },

  // Toplist Tab
  toplists: [],
};

export function useArticleForm() {
  const [formState, setFormState] = useState<ArticleFormState>(DEFAULT_FORM_STATE);

  // Details Tab
  const setFocusKeyword = useCallback((keyword: string) => {
    setFormState((prev) => ({ ...prev, focusKeyword: keyword }));
  }, []);

  const setArticleTitle = useCallback((title: string) => {
    setFormState((prev) => ({ ...prev, articleTitle: title }));
  }, []);

  const setProjectId = useCallback((projectId: string) => {
    setFormState((prev) => ({ ...prev, projectId }));
  }, []);

  const setIncludeKeywords = useCallback((keywords: string[]) => {
    setFormState((prev) => ({ ...prev, includeKeywords: keywords }));
  }, []);

  const addKeyword = useCallback((keyword: string) => {
    setFormState((prev) => ({
      ...prev,
      includeKeywords: [...prev.includeKeywords, keyword],
    }));
  }, []);

  const removeKeyword = useCallback((index: number) => {
    setFormState((prev) => ({
      ...prev,
      includeKeywords: prev.includeKeywords.filter((_, i) => i !== index),
    }));
  }, []);

  const setSelectedTemplateId = useCallback((selectedTemplateId: string | undefined) => {
    setFormState((prev) => ({ ...prev, selectedTemplateId }));
  }, []);

  /**
   * Apply template settings to the form.
   * Called when a template is selected to lock in template-defined values.
   */
  const applyTemplate = useCallback((template: ArticleTemplate | undefined) => {
    if (!template) {
      // When clearing template, reset to defaults
      setFormState((prev) => ({
        ...prev,
        selectedTemplateId: undefined,
        selectedTemplate: undefined,
        articleSize: DEFAULT_FORM_STATE.articleSize,
        structure: DEFAULT_FORM_STATE.structure,
        tone: DEFAULT_FORM_STATE.tone,
        pointOfView: DEFAULT_FORM_STATE.pointOfView,
        formality: DEFAULT_FORM_STATE.formality,
      }));
      return;
    }

    setFormState((prev) => ({
      ...prev,
      selectedTemplateId: template.id,
      selectedTemplate: template,
      // Apply template's article size if defined
      articleSize: template.articleSize
        ? { ...prev.articleSize, ...template.articleSize }
        : prev.articleSize,
      // Apply template's structure toggles if defined
      structure: template.structure
        ? { ...prev.structure, ...template.structure }
        : prev.structure,
      // Apply suggested content settings (these are suggestions, not locks)
      tone: template.suggestedTone || prev.tone,
      pointOfView: template.suggestedPointOfView || prev.pointOfView,
      formality: template.suggestedFormality || prev.formality,
    }));
  }, []);

  // Content Tab
  const setSelectedAuthorId = useCallback((selectedAuthorId: string | undefined) => {
    setFormState((prev) => ({ ...prev, selectedAuthorId }));
  }, []);

  const setLanguage = useCallback((language: Language) => {
    setFormState((prev) => ({
      ...prev,
      language,
      targetCountry: LANGUAGE_TO_COUNTRY[language] || prev.targetCountry,
    }));
  }, []);

  const setTargetCountry = useCallback((targetCountry: TargetCountry) => {
    setFormState((prev) => ({ ...prev, targetCountry }));
  }, []);

  const setTone = useCallback((tone: ToneOfVoice) => {
    setFormState((prev) => ({ ...prev, tone }));
  }, []);

  const setPointOfView = useCallback((pointOfView: PointOfView) => {
    setFormState((prev) => ({ ...prev, pointOfView }));
  }, []);

  const setFormality = useCallback((formality: Formality) => {
    setFormState((prev) => ({ ...prev, formality }));
  }, []);

  const setCustomTonePrompt = useCallback((customTonePrompt: string) => {
    setFormState((prev) => ({ ...prev, customTonePrompt }));
  }, []);

  // Formatting Tab
  const setFormatting = useCallback((formatting: Partial<FormattingToggles>) => {
    setFormState((prev) => ({
      ...prev,
      formatting: { ...prev.formatting, ...formatting },
    }));
  }, []);

  const toggleFormatting = useCallback((key: keyof FormattingToggles) => {
    setFormState((prev) => ({
      ...prev,
      formatting: { ...prev.formatting, [key]: !prev.formatting[key] },
    }));
  }, []);

  // Advanced Settings
  const setOutputFormat = useCallback((outputFormat: OutputFormat) => {
    setFormState((prev) => ({ ...prev, outputFormat }));
  }, []);

  // Structure Tab
  const setStructure = useCallback((structure: Partial<StructureToggles>) => {
    setFormState((prev) => ({
      ...prev,
      structure: { ...prev.structure, ...structure },
    }));
  }, []);

  const toggleStructure = useCallback((key: keyof StructureToggles) => {
    setFormState((prev) => ({
      ...prev,
      structure: { ...prev.structure, [key]: !prev.structure[key] },
    }));
  }, []);

  const setArticleSize = useCallback((articleSize: Partial<ArticleSize>) => {
    setFormState((prev) => ({
      ...prev,
      articleSize: { ...prev.articleSize, ...articleSize },
    }));
  }, []);

  // Outline Tab
  const setCustomOutline = useCallback((customOutline: OutlineSection[] | undefined) => {
    setFormState((prev) => ({ ...prev, customOutline }));
  }, []);

  const setOutlineText = useCallback((outlineText: string) => {
    setFormState((prev) => ({ ...prev, outlineText }));
  }, []);

  const setOutline = useCallback((outline: typeof DEFAULT_FORM_STATE.outline) => {
    setFormState((prev) => ({ ...prev, outline }));
  }, []);

  // Knowledge Tab
  const setDeepResearch = useCallback((deepResearch: Partial<DeepResearchOptions>) => {
    setFormState((prev) => ({
      ...prev,
      deepResearch: { ...prev.deepResearch, ...deepResearch },
    }));
  }, []);

  const toggleDeepResearch = useCallback((key: keyof Omit<DeepResearchOptions, 'enabled' | 'depth'>) => {
    setFormState((prev) => ({
      ...prev,
      deepResearch: { ...prev.deepResearch, [key]: !prev.deepResearch[key] },
    }));
  }, []);

  // Toplist Tab
  const setToplists = useCallback((toplists: ArticleToplist[]) => {
    setFormState((prev) => ({ ...prev, toplists }));
  }, []);

  const addToplist = useCallback((toplist: ArticleToplist) => {
    setFormState((prev) => ({
      ...prev,
      toplists: [...(prev.toplists || []), { ...toplist, position: (prev.toplists || []).length }],
    }));
  }, []);

  const updateToplist = useCallback((toplist: ArticleToplist) => {
    setFormState((prev) => ({
      ...prev,
      toplists: (prev.toplists || []).map((t) =>
        t.toplistId === toplist.toplistId ? toplist : t
      ),
    }));
  }, []);

  const removeToplist = useCallback((toplistId: string) => {
    setFormState((prev) => ({
      ...prev,
      toplists: (prev.toplists || [])
        .filter((t) => t.toplistId !== toplistId)
        .map((t, i) => ({ ...t, position: i })),
    }));
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setFormState(DEFAULT_FORM_STATE);
  }, []);

  // Build API request from form state
  const buildRequest = useCallback((): FullWorkflowRequest => {
    // Filter toplists that are marked for inclusion
    const includedToplists = (formState.toplists || []).filter((t) => t.includeInArticle);

    return {
      keyword: formState.focusKeyword,
      geo: formState.targetCountry,
      outlineId: formState.outline?.outlineId,  // Use existing outline if available
      options: {
        language: formState.language,
        targetCountry: formState.targetCountry,
        tone: formState.tone,
        pointOfView: formState.pointOfView,
        formality: formState.formality,
        customTonePrompt: formState.customTonePrompt || undefined,
        formatting: formState.formatting,
        outputFormat: formState.outputFormat !== 'markdown' ? formState.outputFormat : undefined,
        structure: formState.structure,
        articleSize: formState.articleSize,
        deepResearch: formState.deepResearch.enabled ? formState.deepResearch : undefined,
        title: formState.articleTitle || undefined,
        includeKeywords: formState.includeKeywords.length > 0 ? formState.includeKeywords : undefined,
        projectId: formState.projectId || undefined,
        toplists: includedToplists.length > 0 ? includedToplists : undefined,
        templateId: formState.selectedTemplateId || undefined,
      },
    };
  }, [formState]);

  return {
    formState,
    setFormState,

    // Details
    setFocusKeyword,
    setArticleTitle,
    setProjectId,
    setIncludeKeywords,
    addKeyword,
    removeKeyword,
    setSelectedTemplateId,
    applyTemplate,

    // Content
    setSelectedAuthorId,
    setLanguage,
    setTargetCountry,
    setTone,
    setPointOfView,
    setFormality,
    setCustomTonePrompt,

    // Formatting
    setFormatting,
    toggleFormatting,

    // Advanced Settings
    setOutputFormat,

    // Structure
    setStructure,
    toggleStructure,
    setArticleSize,

    // Outline
    setCustomOutline,
    setOutlineText,
    setOutline,

    // Knowledge
    setDeepResearch,
    toggleDeepResearch,

    // Toplist
    setToplists,
    addToplist,
    updateToplist,
    removeToplist,

    // Actions
    resetForm,
    buildRequest,
  };
}

export type UseArticleFormReturn = ReturnType<typeof useArticleForm>;
