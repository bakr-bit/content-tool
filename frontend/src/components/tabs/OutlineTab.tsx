import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  Pencil,
  List,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { researchAndGenerateOutline, getComponents } from '@/services/api';
import type { UseArticleFormReturn } from '@/hooks/useArticleForm';
import {
  LANGUAGE_NAMES,
  COMPONENT_TYPE_NAMES,
  type Outline,
  type OutlineSection,
  type Language,
  type ComponentType,
  type ComponentInfo,
} from '@/types/article';

// Translations for structure section titles
const SECTION_TRANSLATIONS: Record<string, Record<string, string>> = {
  'en-US': { keyTakeaways: 'Key Takeaways', toc: 'Table of Contents', faqs: 'Frequently Asked Questions', conclusion: 'Conclusion' },
  'en-GB': { keyTakeaways: 'Key Takeaways', toc: 'Table of Contents', faqs: 'Frequently Asked Questions', conclusion: 'Conclusion' },
  'en-AU': { keyTakeaways: 'Key Takeaways', toc: 'Table of Contents', faqs: 'Frequently Asked Questions', conclusion: 'Conclusion' },
  'es-ES': { keyTakeaways: 'Puntos Clave', toc: 'Tabla de Contenidos', faqs: 'Preguntas Frecuentes', conclusion: 'Conclusión' },
  'es-MX': { keyTakeaways: 'Puntos Clave', toc: 'Tabla de Contenidos', faqs: 'Preguntas Frecuentes', conclusion: 'Conclusión' },
  'fr-FR': { keyTakeaways: 'Points Clés', toc: 'Table des Matières', faqs: 'Questions Fréquentes', conclusion: 'Conclusion' },
  'fr-CA': { keyTakeaways: 'Points Clés', toc: 'Table des Matières', faqs: 'Questions Fréquentes', conclusion: 'Conclusion' },
  'de-DE': { keyTakeaways: 'Wichtigste Erkenntnisse', toc: 'Inhaltsverzeichnis', faqs: 'Häufig Gestellte Fragen', conclusion: 'Fazit' },
  'de-AT': { keyTakeaways: 'Wichtigste Erkenntnisse', toc: 'Inhaltsverzeichnis', faqs: 'Häufig Gestellte Fragen', conclusion: 'Fazit' },
  'it-IT': { keyTakeaways: 'Punti Chiave', toc: 'Indice', faqs: 'Domande Frequenti', conclusion: 'Conclusione' },
  'pt-BR': { keyTakeaways: 'Principais Conclusões', toc: 'Índice', faqs: 'Perguntas Frequentes', conclusion: 'Conclusão' },
  'pt-PT': { keyTakeaways: 'Principais Conclusões', toc: 'Índice', faqs: 'Perguntas Frequentes', conclusion: 'Conclusão' },
  'nl-NL': { keyTakeaways: 'Belangrijkste Punten', toc: 'Inhoudsopgave', faqs: 'Veelgestelde Vragen', conclusion: 'Conclusie' },
  'sv-SE': { keyTakeaways: 'Viktiga Punkter', toc: 'Innehållsförteckning', faqs: 'Vanliga Frågor', conclusion: 'Slutsats' },
  'no-NO': { keyTakeaways: 'Viktige Punkter', toc: 'Innholdsfortegnelse', faqs: 'Ofte Stilte Spørsmål', conclusion: 'Konklusjon' },
  'da-DK': { keyTakeaways: 'Vigtigste Punkter', toc: 'Indholdsfortegnelse', faqs: 'Ofte Stillede Spørgsmål', conclusion: 'Konklusion' },
  'fi-FI': { keyTakeaways: 'Tärkeimmät Havainnot', toc: 'Sisällysluettelo', faqs: 'Usein Kysytyt Kysymykset', conclusion: 'Johtopäätös' },
  'pl-PL': { keyTakeaways: 'Kluczowe Wnioski', toc: 'Spis Treści', faqs: 'Często Zadawane Pytania', conclusion: 'Podsumowanie' },
  'ru-RU': { keyTakeaways: 'Ключевые Выводы', toc: 'Содержание', faqs: 'Часто Задаваемые Вопросы', conclusion: 'Заключение' },
  'ja-JP': { keyTakeaways: '重要ポイント', toc: '目次', faqs: 'よくある質問', conclusion: 'まとめ' },
  'zh-CN': { keyTakeaways: '要点总结', toc: '目录', faqs: '常见问题', conclusion: '结论' },
  'zh-TW': { keyTakeaways: '重點摘要', toc: '目錄', faqs: '常見問題', conclusion: '結論' },
  'ko-KR': { keyTakeaways: '핵심 요약', toc: '목차', faqs: '자주 묻는 질문', conclusion: '결론' },
  'ar-SA': { keyTakeaways: 'النقاط الرئيسية', toc: 'جدول المحتويات', faqs: 'الأسئلة الشائعة', conclusion: 'الخلاصة' },
  'hi-IN': { keyTakeaways: 'मुख्य बिंदु', toc: 'विषय सूची', faqs: 'अक्सर पूछे जाने वाले प्रश्न', conclusion: 'निष्कर्ष' },
  'tr-TR': { keyTakeaways: 'Önemli Noktalar', toc: 'İçindekiler', faqs: 'Sıkça Sorulan Sorular', conclusion: 'Sonuç' },
};

function getSectionTitle(language: Language, section: 'keyTakeaways' | 'toc' | 'faqs' | 'conclusion'): string {
  return SECTION_TRANSLATIONS[language]?.[section] || SECTION_TRANSLATIONS['en-US'][section];
}

interface OutlineTabProps {
  form: UseArticleFormReturn;
}

type GenerationStatus = 'idle' | 'researching' | 'generating' | 'complete' | 'error';
type ViewMode = 'preview' | 'edit' | 'structured';

// Section Card Component for structured view
interface SectionCardProps {
  section: OutlineSection;
  components: ComponentInfo[];
  onUpdate: (updates: Partial<OutlineSection>) => void;
  onDelete: () => void;
  onAddSubsection: () => void;
  depth?: number;
}

function SectionCard({ section, components, onUpdate, onDelete, onAddSubsection, depth = 0 }: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasSubsections = section.subsections && section.subsections.length > 0;

  return (
    <div className={`border rounded-lg bg-card ${depth > 0 ? 'ml-6 border-muted' : ''}`}>
      <div className="p-3 space-y-3">
        {/* Header row */}
        <div className="flex items-start gap-2">
          <div className="flex items-center gap-1 pt-1">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            {hasSubsections && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-0.5 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}
          </div>

          <div className="flex-1 space-y-2">
            {/* Heading input */}
            <Input
              value={section.heading}
              onChange={(e) => onUpdate({ heading: e.target.value })}
              className="font-medium"
              placeholder="Section heading"
            />

            {/* Component type and level row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={section.componentType || 'prose'}
                onValueChange={(value) => onUpdate({ componentType: value as ComponentType })}
              >
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Component type" />
                </SelectTrigger>
                <SelectContent>
                  {components.map((comp) => (
                    <SelectItem key={comp.id} value={comp.id} className="text-xs">
                      <div className="flex flex-col">
                        <span>{comp.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Badge variant="outline" className="text-xs">
                H{section.level}
              </Badge>

              {section.suggestedWordCount && (
                <Badge variant="secondary" className="text-xs">
                  ~{section.suggestedWordCount} words
                </Badge>
              )}

              {section.componentType && section.componentType !== 'prose' && (
                <Badge className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                  {COMPONENT_TYPE_NAMES[section.componentType]}
                </Badge>
              )}
            </div>

            {/* Description */}
            <Textarea
              value={section.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Section description (guides the AI writer)"
              className="text-xs min-h-[60px] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddSubsection}
              className="h-7 w-7 p-0"
              title="Add subsection"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              title="Delete section"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Subsections */}
      {isExpanded && hasSubsections && (
        <div className="border-t px-3 py-2 space-y-2 bg-muted/30">
          {section.subsections!.map((sub, idx) => (
            <SectionCard
              key={sub.id || idx}
              section={sub}
              components={components}
              depth={depth + 1}
              onUpdate={(updates) => {
                const newSubsections = [...(section.subsections || [])];
                newSubsections[idx] = { ...newSubsections[idx], ...updates };
                onUpdate({ subsections: newSubsections });
              }}
              onDelete={() => {
                const newSubsections = section.subsections!.filter((_, i) => i !== idx);
                onUpdate({ subsections: newSubsections });
              }}
              onAddSubsection={() => {
                const newSubsections = [...(section.subsections || [])];
                newSubsections.splice(idx + 1, 0, {
                  id: `${section.id}-sub-${Date.now()}`,
                  heading: 'New subsection',
                  level: (sub.level || section.level) + 1,
                  description: '',
                  componentType: 'prose',
                });
                onUpdate({ subsections: newSubsections });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OutlineTab({ form }: OutlineTabProps) {
  const [status, setStatus] = useState<GenerationStatus>(() =>
    form.formState.outline ? 'complete' : 'idle'
  );
  const [statusMessage, setStatusMessage] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  // Initialize with fallback components so dropdown works immediately
  const [components, setComponents] = useState<ComponentInfo[]>(() =>
    Object.entries(COMPONENT_TYPE_NAMES).map(([id, name]) => ({
      id: id as ComponentType,
      name,
      description: '',
      useCase: '',
    }))
  );

  // Use form state for persistence across tab changes
  const outlineText = form.formState.outlineText;
  const setOutlineText = form.setOutlineText;
  const outline = form.formState.outline;

  const { focusKeyword, targetCountry, language, articleTitle, articleSize, includeKeywords, structure } = form.formState;

  const canGenerate = focusKeyword.trim().length > 0;

  // Create an empty outline if switching to structured mode without one
  const ensureOutlineExists = useCallback(() => {
    if (!outline) {
      const emptyOutline = {
        outlineId: `outline-${Date.now()}`,
        researchId: '',
        keyword: focusKeyword || 'New Article',
        title: articleTitle || focusKeyword || 'New Article',
        sections: [],
        metadata: {
          estimatedWordCount: 0,
          suggestedKeywords: [],
        },
        createdAt: new Date().toISOString(),
      };
      form.setOutline(emptyOutline);
      return emptyOutline;
    }
    return outline;
  }, [outline, focusKeyword, articleTitle, form]);

  // Fetch available components on mount
  useEffect(() => {
    async function fetchComponents() {
      // Fallback components in case API is unavailable
      const fallbackComponents: ComponentInfo[] = Object.entries(COMPONENT_TYPE_NAMES).map(([id, name]) => ({
        id: id as ComponentType,
        name,
        description: '',
        useCase: '',
      }));

      try {
        const result = await getComponents();
        if (result.success && result.data) {
          setComponents(result.data.components);
        } else {
          // API returned error, use fallback
          setComponents(fallbackComponents);
        }
      } catch (error) {
        console.error('Failed to fetch components:', error);
        setComponents(fallbackComponents);
      }
    }
    fetchComponents();
  }, []);

  const handleGenerateOutline = async () => {
    if (!canGenerate) return;

    setStatus('researching');
    setStatusMessage('Researching competitors and top-ranking content...');

    try {
      const result = await researchAndGenerateOutline(
        focusKeyword,
        targetCountry,
        {
          title: articleTitle || undefined,
          language: language,
          articleSize: articleSize,
          includeKeywords: includeKeywords.length > 0 ? includeKeywords : undefined,
          structure: structure,
        }
      );

      setStatus('generating');
      setStatusMessage('Analyzing content and generating outline...');

      // Convert outline to markdown text and store in form state
      const outlineMd = outlineToMarkdown(result.outline, structure, language, articleTitle);
      setOutlineText(outlineMd);
      form.setOutline(result.outline);

      setStatus('complete');
      setStatusMessage(`Generated from ${result.research.scrapedContent.length} competitor articles`);
      setViewMode('preview');
    } catch (error) {
      console.error('Outline generation failed:', error);
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to generate outline');
    }
  };

  // Update a section in the outline
  const updateSection = (sectionIndex: number, updates: Partial<OutlineSection>) => {
    if (!outline) return;

    const newSections = [...outline.sections];
    newSections[sectionIndex] = { ...newSections[sectionIndex], ...updates };

    const newOutline = { ...outline, sections: newSections };
    form.setOutline(newOutline);

    // Also update markdown text
    const outlineMd = outlineToMarkdown(newOutline, structure, language, articleTitle);
    setOutlineText(outlineMd);
  };

  // Delete a section from the outline
  const deleteSection = (sectionIndex: number) => {
    if (!outline) return;

    const newSections = outline.sections.filter((_, i) => i !== sectionIndex);
    const newOutline = { ...outline, sections: newSections };
    form.setOutline(newOutline);

    const outlineMd = outlineToMarkdown(newOutline, structure, language, articleTitle);
    setOutlineText(outlineMd);
  };

  // Add a new section
  const addSection = (afterIndex?: number) => {
    if (!outline) return;

    const newSection: OutlineSection = {
      id: `section-${Date.now()}`,
      heading: 'New section',
      level: 2,
      description: '',
      componentType: 'prose',
      suggestedWordCount: 300,
    };

    const newSections = [...outline.sections];
    if (afterIndex !== undefined) {
      newSections.splice(afterIndex + 1, 0, newSection);
    } else {
      newSections.push(newSection);
    }

    const newOutline = { ...outline, sections: newSections };
    form.setOutline(newOutline);

    const outlineMd = outlineToMarkdown(newOutline, structure, language, articleTitle);
    setOutlineText(outlineMd);
  };

  // Add a subsection to a section
  const addSubsection = (sectionIndex: number) => {
    if (!outline) return;

    const section = outline.sections[sectionIndex];
    const newSubsection: OutlineSection = {
      id: `${section.id}-sub-${Date.now()}`,
      heading: 'New subsection',
      level: 3,
      description: '',
      componentType: 'prose',
      suggestedWordCount: 150,
    };

    const newSubsections = [...(section.subsections || []), newSubsection];
    updateSection(sectionIndex, { subsections: newSubsections });
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'researching':
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const isGenerating = status === 'researching' || status === 'generating';

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Article Outline</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Generate an outline based on competitor research, or write your own.
          {articleTitle && (
            <span className="block mt-1">
              Title: <strong>"{articleTitle}"</strong> will influence the structure.
            </span>
          )}
        </p>
      </div>

      {/* Generation Context */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Keyword:</span>
          <span className="font-medium">{focusKeyword || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Language:</span>
          <span className="font-medium">{LANGUAGE_NAMES[language]}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Target Country:</span>
          <span className="font-medium">{targetCountry.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Article Size:</span>
          <span className="font-medium capitalize">{articleSize.preset}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sections:</span>
          <span className="font-medium">
            {[
              structure.keyTakeaways && 'Key Takeaways',
              structure.tableOfContents && 'TOC',
              structure.conclusion && 'Conclusion',
              structure.faqs && 'FAQs',
            ].filter(Boolean).join(', ') || 'Standard'}
          </span>
        </div>
        {includeKeywords.length > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Include Keywords:</span>
            <span className="font-medium">{includeKeywords.length} keywords</span>
          </div>
        )}
      </div>

      {/* Generate Button & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          {statusMessage && (
            <span className={`text-sm ${status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
              {statusMessage}
            </span>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleGenerateOutline}
          disabled={isGenerating || !canGenerate}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {status === 'researching' ? 'Researching...' : 'Generating...'}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Outline
            </>
          )}
        </Button>
      </div>

      {/* Outline Editor/Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Outline</Label>
          <div className="flex gap-1">
              <Button
                variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('preview')}
                className="h-7 px-2"
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Preview
              </Button>
              <Button
                variant={viewMode === 'structured' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => {
                  ensureOutlineExists();
                  setViewMode('structured');
                }}
                className="h-7 px-2"
              >
                <List className="h-3.5 w-3.5 mr-1" />
                Structured
              </Button>
              <Button
                variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('edit')}
                className="h-7 px-2"
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Markdown
              </Button>
            </div>
        </div>

        {viewMode === 'structured' && outline ? (
          <div className="min-h-[350px] space-y-3">
            {/* Add section button at top */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addSection()}
                className="h-7"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Section
              </Button>
            </div>

            {/* Section cards */}
            {outline.sections.map((section, idx) => (
              <SectionCard
                key={section.id || idx}
                section={section}
                components={components}
                onUpdate={(updates) => updateSection(idx, updates)}
                onDelete={() => deleteSection(idx)}
                onAddSubsection={() => addSubsection(idx)}
              />
            ))}

            {outline.sections.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No sections yet. Click "Add Section" to get started.</p>
              </div>
            )}
          </div>
        ) : viewMode === 'edit' || !outlineText ? (
          <Textarea
            placeholder={`The outline will be generated based on:
• Keyword: "${focusKeyword || 'your focus keyword'}"
• Top-ranking competitor articles
• Your specified article length (${articleSize.preset})
${articleTitle ? `• Title structure: "${articleTitle}"` : ''}

Click "Generate Outline" to research competitors and create an optimized structure, or write your own outline using markdown:

## Section 1
- Point 1
- Point 2

## Section 2
...`}
            value={outlineText}
            onChange={(e) => setOutlineText(e.target.value)}
            className="min-h-[350px] font-mono text-sm"
          />
        ) : (
          <div className="min-h-[350px] rounded-md border bg-background p-4 overflow-auto prose prose-sm prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-xl font-bold mb-4 mt-0 text-foreground">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-4 text-foreground">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-medium mb-1 mt-3 text-muted-foreground">{children}</h3>,
                h4: ({ children }) => <h4 className="text-sm font-medium mb-1 mt-2 text-muted-foreground">{children}</h4>,
                p: ({ children }) => <p className="mb-2 text-muted-foreground">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-2 text-muted-foreground">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 text-muted-foreground">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
              }}
            >
              {outlineText}
            </ReactMarkdown>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {viewMode === 'structured' ? (
          <>Use the structured editor to set component types for each section. Component types control how the AI formats the content (tables, FAQs, reviews, etc.).</>
        ) : (
          <>Use ## for main sections (H2) and ### for subsections (H3). Switch to "Structured" view to set component types.</>
        )}
      </p>
    </div>
  );
}

// Helper: Convert Outline object to markdown
function outlineToMarkdown(
  outline: Outline,
  structure?: { keyTakeaways?: boolean; tableOfContents?: boolean; conclusion?: boolean; faqs?: boolean },
  language: Language = 'en-US',
  userTitle?: string
): string {
  const lines: string[] = [];

  // Title - use outline.title, fall back to user-provided title, then keyword
  const title = outline.title || userTitle || outline.keyword;
  lines.push(`# ${title}`);
  lines.push('');

  // Key Takeaways (if enabled)
  if (structure?.keyTakeaways) {
    lines.push(`## ${getSectionTitle(language, 'keyTakeaways')}`);
    lines.push('');
  }

  // Table of Contents (if enabled)
  if (structure?.tableOfContents) {
    lines.push(`## ${getSectionTitle(language, 'toc')}`);
    lines.push('');
  }

  // Main Sections
  for (const section of outline.sections) {
    // level corresponds to HTML heading level: level 2 = ## (H2), level 3 = ### (H3)
    const headingPrefix = '#'.repeat(section.level);
    const componentTag = section.componentType && section.componentType !== 'prose'
      ? ` [${COMPONENT_TYPE_NAMES[section.componentType]}]`
      : '';
    lines.push(`${headingPrefix} ${section.heading}${componentTag}`);

    if (section.subsections && section.subsections.length > 0) {
      for (const sub of section.subsections) {
        // Subsections are one level deeper than their parent
        const subPrefix = '#'.repeat(sub.level || section.level + 1);
        const subComponentTag = sub.componentType && sub.componentType !== 'prose'
          ? ` [${COMPONENT_TYPE_NAMES[sub.componentType]}]`
          : '';
        lines.push(`${subPrefix} ${sub.heading}${subComponentTag}`);
      }
    }

    lines.push('');
  }

  // FAQs (if enabled)
  if (structure?.faqs) {
    lines.push(`## ${getSectionTitle(language, 'faqs')}`);
    lines.push('');
  }

  // Conclusion (if enabled)
  if (structure?.conclusion) {
    lines.push(`## ${getSectionTitle(language, 'conclusion')}`);
    lines.push('');
  }

  return lines.join('\n');
}
