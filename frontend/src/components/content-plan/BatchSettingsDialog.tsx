import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  TONE_NAMES,
  POV_NAMES,
  FORMALITY_NAMES,
  ARTICLE_SIZE_NAMES,
} from '@/types/article';
import type { ToneOfVoice, PointOfView, Formality, ArticleSizePreset } from '@/types/article';
import type { ArticleTemplate } from '@/types/template';
import { getTemplates } from '@/services/api';

interface BatchSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (options: Record<string, unknown>) => Promise<void>;
  pageCount: number;
  projectGeo?: string;
  projectLanguage?: string;
}

const NONE_VALUE = '__none__';

export function BatchSettingsDialog({
  open,
  onOpenChange,
  onGenerate,
  pageCount,
  projectGeo,
  projectLanguage,
}: BatchSettingsDialogProps) {
  const [tone, setTone] = useState<ToneOfVoice | ''>('');
  const [pov, setPov] = useState<PointOfView | ''>('');
  const [formality, setFormality] = useState<Formality | ''>('');
  const [sizePreset, setSizePreset] = useState<ArticleSizePreset | ''>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [templates, setTemplates] = useState<ArticleTemplate[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open) {
      getTemplates().then((result) => {
        if (result.success && result.data) {
          setTemplates(result.data.templates);
        }
      });
    }
  }, [open]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const options: Record<string, unknown> = {};
      if (tone) options.tone = tone;
      if (pov) options.pointOfView = pov;
      if (formality) options.formality = formality;
      if (sizePreset) options.articleSize = { preset: sizePreset };
      if (templateId) options.templateId = templateId;
      if (projectGeo) options.targetCountry = projectGeo;
      if (projectLanguage) options.language = projectLanguage;
      await onGenerate(options);
      onOpenChange(false);
    } catch {
      // Error handled by parent
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Batch Generation Settings</DialogTitle>
          <DialogDescription>
            Configure generation options for {pageCount} pages. Leave fields empty to use project defaults. Pages with their own settings will use those instead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {(projectGeo || projectLanguage) && (
            <div className="text-sm text-zinc-400 bg-zinc-800/50 p-3 rounded-lg">
              Using project defaults: {projectGeo && `GEO: ${projectGeo}`}{projectGeo && projectLanguage && ', '}{projectLanguage && `Language: ${projectLanguage}`}
            </div>
          )}

          {/* Template */}
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={templateId || NONE_VALUE} onValueChange={(v) => setTemplateId(v === NONE_VALUE ? '' : v)}>
              <SelectTrigger>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone || NONE_VALUE} onValueChange={(v) => setTone(v === NONE_VALUE ? '' : v as ToneOfVoice)}>
                <SelectTrigger>
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Default</SelectItem>
                  {Object.entries(TONE_NAMES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Point of View</Label>
              <Select value={pov || NONE_VALUE} onValueChange={(v) => setPov(v === NONE_VALUE ? '' : v as PointOfView)}>
                <SelectTrigger>
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Default</SelectItem>
                  {Object.entries(POV_NAMES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Formality</Label>
              <Select value={formality || NONE_VALUE} onValueChange={(v) => setFormality(v === NONE_VALUE ? '' : v as Formality)}>
                <SelectTrigger>
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Default</SelectItem>
                  {Object.entries(FORMALITY_NAMES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Article Size</Label>
              <Select value={sizePreset || NONE_VALUE} onValueChange={(v) => setSizePreset(v === NONE_VALUE ? '' : v as ArticleSizePreset)}>
                <SelectTrigger>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate {pageCount} Articles
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
