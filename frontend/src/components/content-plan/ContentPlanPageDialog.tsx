import { useState, useEffect, useCallback } from 'react';
import type { ContentPlanPage } from '@/types/content-plan';
import type { Outline, OutlineSection } from '@/types/article';
import type { ArticleTemplate } from '@/types/template';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FileText, Play, ListTree, ChevronRight, X, Plus, Settings2 } from 'lucide-react';
import {
  TONE_NAMES,
  POV_NAMES,
  FORMALITY_NAMES,
  ARTICLE_SIZE_NAMES,
} from '@/types/article';
import {
  generateOutlineForPage,
  getContentPlanPage,
  generateSinglePage,
  getOutline,
  updateOutline,
  updateContentPlanPage,
  getTemplates,
} from '@/services/api';

interface ContentPlanPageDialogProps {
  page: ContentPlanPage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

const NONE_VALUE = '__none__';

export function ContentPlanPageDialog({
  page,
  open,
  onOpenChange,
  onUpdated,
}: ContentPlanPageDialogProps) {
  const [currentPage, setCurrentPage] = useState<ContentPlanPage | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [editingSections, setEditingSections] = useState<OutlineSection[] | null>(null);
  const [editingKeywords, setEditingKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [savingKeywords, setSavingKeywords] = useState(false);
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [generatingArticle, setGeneratingArticle] = useState(false);
  const [savingOutline, setSavingOutline] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings state
  const [templateId, setTemplateId] = useState<string>('');
  const [tone, setTone] = useState<string>('');
  const [pointOfView, setPointOfView] = useState<string>('');
  const [formality, setFormality] = useState<string>('');
  const [articleSizePreset, setArticleSizePreset] = useState<string>('');
  const [templates, setTemplates] = useState<ArticleTemplate[]>([]);

  // Load templates on mount
  useEffect(() => {
    getTemplates().then((result) => {
      if (result.success && result.data) {
        setTemplates(result.data.templates);
      }
    });
  }, []);

  // Load outline when page changes
  const loadOutline = useCallback(async (outlineId: string) => {
    try {
      const result = await getOutline(outlineId);
      if (result.success && result.data) {
        setOutline(result.data);
        setEditingSections(result.data.sections);
      }
    } catch {
      // Outline may not exist yet
    }
  }, []);

  useEffect(() => {
    if (open && page) {
      setCurrentPage(page);
      setEditingKeywords(
        page.keywords ? page.keywords.split(',').map((k) => k.trim()).filter(Boolean) : []
      );
      setKeywordInput('');
      setOutline(null);
      setEditingSections(null);
      setError(null);
      // Initialize settings from page
      setTemplateId(page.templateId || '');
      setTone(page.tone || '');
      setPointOfView(page.pointOfView || '');
      setFormality(page.formality || '');
      setArticleSizePreset(page.articleSizePreset || '');
      if (page.outlineId) {
        loadOutline(page.outlineId);
      }
    }
  }, [open, page, loadOutline]);

  const handleGenerateOutline = async () => {
    if (!currentPage) return;
    setGeneratingOutline(true);
    setError(null);
    try {
      const result = await generateOutlineForPage(currentPage.pageId);
      if (result.success && result.data) {
        setCurrentPage(result.data.page);
        await loadOutline(result.data.outlineId);
        onUpdated();
      } else {
        setError(result.error?.message || 'Failed to generate outline');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate outline');
    } finally {
      setGeneratingOutline(false);
    }
  };

  const handleSaveOutline = async () => {
    if (!outline || !editingSections) return;
    setSavingOutline(true);
    setError(null);
    try {
      const result = await updateOutline(outline.outlineId, { sections: editingSections });
      if (result.success && result.data) {
        setOutline(result.data);
        setEditingSections(result.data.sections);
      } else {
        setError(result.error?.message || 'Failed to save outline');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save outline');
    } finally {
      setSavingOutline(false);
    }
  };

  const handleGenerateArticle = async () => {
    if (!currentPage) return;
    setGeneratingArticle(true);
    setError(null);
    try {
      const result = await generateSinglePage(currentPage.pageId);
      if (result.success && result.data) {
        onUpdated();
        onOpenChange(false);
      } else {
        setError(result.error?.message || 'Failed to generate article');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate article');
      // Refresh to show failed state
      if (currentPage) {
        const pageResult = await getContentPlanPage(currentPage.pageId);
        if (pageResult.success && pageResult.data) {
          setCurrentPage(pageResult.data);
        }
      }
      onUpdated();
    } finally {
      setGeneratingArticle(false);
    }
  };

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !editingKeywords.includes(trimmed)) {
      setEditingKeywords([...editingKeywords, trimmed]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setEditingKeywords(editingKeywords.filter((k) => k !== kw));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleSaveKeywords = async () => {
    if (!currentPage) return;
    setSavingKeywords(true);
    setError(null);
    try {
      const keywordsStr = editingKeywords.join(', ');
      const result = await updateContentPlanPage(currentPage.pageId, { keywords: keywordsStr });
      if (result.success && result.data) {
        setCurrentPage(result.data);
        onUpdated();
      } else {
        setError(result.error?.message || 'Failed to save keywords');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save keywords');
    } finally {
      setSavingKeywords(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!currentPage) return;
    setSavingSettings(true);
    setError(null);
    try {
      const result = await updateContentPlanPage(currentPage.pageId, {
        templateId: templateId || null,
        tone: tone || null,
        pointOfView: pointOfView || null,
        formality: formality || null,
        articleSizePreset: articleSizePreset || null,
      });
      if (result.success && result.data) {
        setCurrentPage(result.data);
        onUpdated();
      } else {
        setError(result.error?.message || 'Failed to save settings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const originalKeywords = currentPage?.keywords
    ? currentPage.keywords.split(',').map((k) => k.trim()).filter(Boolean)
    : [];
  const hasKeywordChanges = JSON.stringify(originalKeywords) !== JSON.stringify(editingKeywords);

  const hasSettingsChanges = currentPage && (
    (templateId || '') !== (currentPage.templateId || '') ||
    (tone || '') !== (currentPage.tone || '') ||
    (pointOfView || '') !== (currentPage.pointOfView || '') ||
    (formality || '') !== (currentPage.formality || '') ||
    (articleSizePreset || '') !== (currentPage.articleSizePreset || '')
  );

  const updateSectionHeading = (sectionIndex: number, heading: string) => {
    if (!editingSections) return;
    const updated = [...editingSections];
    updated[sectionIndex] = { ...updated[sectionIndex], heading };
    setEditingSections(updated);
  };

  const updateSectionDescription = (sectionIndex: number, description: string) => {
    if (!editingSections) return;
    const updated = [...editingSections];
    updated[sectionIndex] = { ...updated[sectionIndex], description };
    setEditingSections(updated);
  };

  const updateSubsectionHeading = (sectionIndex: number, subIndex: number, heading: string) => {
    if (!editingSections) return;
    const updated = [...editingSections];
    const subsections = [...(updated[sectionIndex].subsections || [])];
    subsections[subIndex] = { ...subsections[subIndex], heading };
    updated[sectionIndex] = { ...updated[sectionIndex], subsections };
    setEditingSections(updated);
  };

  const hasOutlineChanges = outline && editingSections &&
    JSON.stringify(outline.sections) !== JSON.stringify(editingSections);

  if (!currentPage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">{currentPage.metaTitle || currentPage.url || 'Page'}</DialogTitle>
          <DialogDescription>
            {currentPage.url && (
              <span className="font-mono text-xs">{currentPage.url}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Page Info */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
              {currentPage.pageType && (
                <span>Type: <Badge variant="outline" className="text-xs ml-1">{currentPage.pageType}</Badge></span>
              )}
              {currentPage.level !== undefined && (
                <span>Level: {currentPage.level}</span>
              )}
            </div>
            {currentPage.description && (
              <p className="text-sm text-zinc-400">{currentPage.description}</p>
            )}
            {currentPage.notes && (
              <p className="text-xs text-zinc-500 italic">{currentPage.notes}</p>
            )}
          </div>

          {/* Keywords */}
          <div className="space-y-2 border-t border-zinc-800 pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Keywords</Label>
              {hasKeywordChanges && (
                <Button size="sm" variant="outline" onClick={handleSaveKeywords} disabled={savingKeywords}>
                  {savingKeywords && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Save Keywords
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add keyword..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddKeyword}
                disabled={!keywordInput.trim()}
                className="h-8"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {editingKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {editingKeywords.map((kw, i) => (
                  <Badge key={i} variant={i === 0 ? 'default' : 'secondary'} className="text-xs gap-1">
                    {kw}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="ml-0.5 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {editingKeywords.length === 0 && (
              <p className="text-xs text-zinc-500">No keywords. Add at least one keyword to generate content.</p>
            )}
          </div>

          {/* Generation Settings */}
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Generation Settings
              </h3>
              {hasSettingsChanges && (
                <Button size="sm" variant="outline" onClick={handleSaveSettings} disabled={savingSettings}>
                  {savingSettings && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Save Settings
                </Button>
              )}
            </div>

            {/* Template */}
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Template</Label>
              <Select value={templateId || NONE_VALUE} onValueChange={(v) => setTemplateId(v === NONE_VALUE ? '' : v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="None (default)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None (default)</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Tone</Label>
                <Select value={tone || NONE_VALUE} onValueChange={(v) => setTone(v === NONE_VALUE ? '' : v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Project default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Project default</SelectItem>
                    {Object.entries(TONE_NAMES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Point of View</Label>
                <Select value={pointOfView || NONE_VALUE} onValueChange={(v) => setPointOfView(v === NONE_VALUE ? '' : v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Project default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Project default</SelectItem>
                    {Object.entries(POV_NAMES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Formality</Label>
                <Select value={formality || NONE_VALUE} onValueChange={(v) => setFormality(v === NONE_VALUE ? '' : v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Project default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Project default</SelectItem>
                    {Object.entries(FORMALITY_NAMES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Article Size</Label>
                <Select value={articleSizePreset || NONE_VALUE} onValueChange={(v) => setArticleSizePreset(v === NONE_VALUE ? '' : v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="From page type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>From page type</SelectItem>
                    {Object.entries(ARTICLE_SIZE_NAMES).filter(([k]) => k !== 'custom').map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              Page settings override project and batch defaults.
            </p>
          </div>

          {/* Outline Section */}
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <ListTree className="h-4 w-4" />
                Outline
              </h3>
              <div className="flex items-center gap-2">
                {hasOutlineChanges && (
                  <Button size="sm" variant="outline" onClick={handleSaveOutline} disabled={savingOutline}>
                    {savingOutline && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    Save Changes
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateOutline}
                  disabled={generatingOutline || generatingArticle || (!currentPage.keywords && !currentPage.metaTitle)}
                >
                  {generatingOutline && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  {outline ? 'Regenerate' : 'Generate'} Outline
                </Button>
              </div>
            </div>

            {generatingOutline && (
              <div className="flex items-center justify-center p-8 text-zinc-400">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Researching and generating outline...
              </div>
            )}

            {!generatingOutline && !outline && (
              <div className="p-6 text-center text-zinc-500 border border-dashed border-zinc-700 rounded-lg">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No outline yet. Generate one to review before creating the article.</p>
              </div>
            )}

            {!generatingOutline && editingSections && (
              <div className="space-y-2">
                {editingSections.map((section, i) => (
                  <div key={section.id || i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 w-6">H{section.level}</span>
                      <Input
                        value={section.heading}
                        onChange={(e) => updateSectionHeading(i, e.target.value)}
                        className="h-8 text-sm"
                      />
                      {section.suggestedWordCount && (
                        <span className="text-xs text-zinc-500 whitespace-nowrap">
                          ~{section.suggestedWordCount}w
                        </span>
                      )}
                    </div>
                    <div className="ml-8">
                      <Input
                        value={section.description}
                        onChange={(e) => updateSectionDescription(i, e.target.value)}
                        className="h-7 text-xs text-zinc-400"
                        placeholder="Section description..."
                      />
                    </div>
                    {section.subsections && section.subsections.map((sub, j) => (
                      <div key={sub.id || j} className="flex items-center gap-2 ml-8">
                        <ChevronRight className="h-3 w-3 text-zinc-600" />
                        <span className="text-xs text-zinc-500 w-6">H{sub.level}</span>
                        <Input
                          value={sub.heading}
                          onChange={(e) => updateSubsectionHeading(i, j, e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleGenerateArticle}
            disabled={generatingArticle || generatingOutline || (!currentPage.keywords && !currentPage.metaTitle)}
          >
            {generatingArticle && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Play className="mr-2 h-4 w-4" />
            Generate Article
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
