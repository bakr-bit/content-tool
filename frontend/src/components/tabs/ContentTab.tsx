import { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AuthorSelect, AuthorModal } from '@/components/author';
import {
  LANGUAGE_NAMES,
  COUNTRY_NAMES,
  TONE_NAMES,
  POV_NAMES,
  FORMALITY_NAMES,
  type Language,
  type TargetCountry,
  type ToneOfVoice,
  type PointOfView,
  type Formality,
  type AuthorProfile,
} from '@/types/article';
import type { UseArticleFormReturn } from '@/hooks/useArticleForm';

interface ContentTabProps {
  form: UseArticleFormReturn;
}

export function ContentTab({ form }: ContentTabProps) {
  const [authorModalOpen, setAuthorModalOpen] = useState(false);
  const [authorSelectKey, setAuthorSelectKey] = useState(0);

  const handleAuthorSelect = useCallback((author: AuthorProfile | undefined) => {
    if (author) {
      // Apply author settings to form
      form.setLanguage(author.language);
      form.setTargetCountry(author.targetCountry);
      form.setTone(author.tone);
      form.setPointOfView(author.pointOfView);
      form.setFormality(author.formality);
      form.setCustomTonePrompt(author.customTonePrompt || '');
    }
  }, [form]);

  const handleAuthorChange = useCallback(() => {
    // Force refresh of author select when authors change
    setAuthorSelectKey((k) => k + 1);
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Content Settings</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Configure language, tone, and writing style preferences.
        </p>
      </div>

      {/* Author Selection */}
      <AuthorSelect
        key={authorSelectKey}
        value={form.formState.selectedAuthorId}
        onChange={(id) => form.setSelectedAuthorId(id)}
        onManageClick={() => setAuthorModalOpen(true)}
        onAuthorSelect={handleAuthorSelect}
      />

      <div className="border-t pt-6">
        <p className="text-xs text-muted-foreground mb-4">
          {form.formState.selectedAuthorId
            ? 'Settings below are from the selected author. You can override them if needed.'
            : 'Configure voice settings manually or select an author above.'}
        </p>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <Label>Language</Label>
        <Select
          value={form.formState.language}
          onValueChange={(value) => form.setLanguage(value as Language)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LANGUAGE_NAMES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Target Country */}
      <div className="space-y-2">
        <Label>Target Country</Label>
        <Select
          value={form.formState.targetCountry}
          onValueChange={(value) => form.setTargetCountry(value as TargetCountry)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(COUNTRY_NAMES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Helps tailor content to regional preferences and SEO.
        </p>
      </div>

      {/* Tone of Voice */}
      <div className="space-y-2">
        <Label>Tone of Voice</Label>
        <Select
          value={form.formState.tone}
          onValueChange={(value) => form.setTone(value as ToneOfVoice)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TONE_NAMES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom Tone Prompt (shown when tone is custom) */}
      {form.formState.tone === 'custom' && (
        <div className="space-y-2">
          <Label>Custom Tone Instructions</Label>
          <Textarea
            placeholder="Describe the specific tone and style you want..."
            value={form.formState.customTonePrompt || ''}
            onChange={(e) => form.setCustomTonePrompt(e.target.value)}
            rows={3}
          />
        </div>
      )}

      {/* Point of View */}
      <div className="space-y-2">
        <Label>Point of View</Label>
        <Select
          value={form.formState.pointOfView}
          onValueChange={(value) => form.setPointOfView(value as PointOfView)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(POV_NAMES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Formality */}
      <div className="space-y-2">
        <Label>Formality</Label>
        <Select
          value={form.formState.formality}
          onValueChange={(value) => form.setFormality(value as Formality)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(FORMALITY_NAMES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Author Modal */}
      <AuthorModal
        open={authorModalOpen}
        onOpenChange={setAuthorModalOpen}
        onAuthorChange={handleAuthorChange}
      />
    </div>
  );
}
