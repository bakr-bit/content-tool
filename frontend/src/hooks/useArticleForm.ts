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
} from '@/types/article';

const DEFAULT_FORM_STATE: ArticleFormState = {
  // Details Tab
  focusKeyword: '',
  articleTitle: '',
  includeKeywords: [],

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

  // Content Tab
  const setSelectedAuthorId = useCallback((selectedAuthorId: string | undefined) => {
    setFormState((prev) => ({ ...prev, selectedAuthorId }));
  }, []);

  const setLanguage = useCallback((language: Language) => {
    setFormState((prev) => ({ ...prev, language }));
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

  // Reset form
  const resetForm = useCallback(() => {
    setFormState(DEFAULT_FORM_STATE);
  }, []);

  // Build API request from form state
  const buildRequest = useCallback((): FullWorkflowRequest => {
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
        structure: formState.structure,
        articleSize: formState.articleSize,
        deepResearch: formState.deepResearch.enabled ? formState.deepResearch : undefined,
        title: formState.articleTitle || undefined,
        includeKeywords: formState.includeKeywords.length > 0 ? formState.includeKeywords : undefined,
      },
    };
  }, [formState]);

  return {
    formState,
    setFormState,

    // Details
    setFocusKeyword,
    setArticleTitle,
    setIncludeKeywords,
    addKeyword,
    removeKeyword,

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

    // Actions
    resetForm,
    buildRequest,
  };
}

export type UseArticleFormReturn = ReturnType<typeof useArticleForm>;
