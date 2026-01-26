import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getAuthors,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  duplicateAuthor,
  type CreateAuthorRequest,
} from '@/services/api';
import {
  getAuthorDisplayName,
  LANGUAGE_NAMES,
  COUNTRY_NAMES,
  TONE_NAMES,
  POV_NAMES,
  FORMALITY_NAMES,
  type AuthorProfile,
  type Language,
  type TargetCountry,
  type ToneOfVoice,
  type PointOfView,
  type Formality,
  type HeadingCase,
} from '@/types/article';

const HEADING_CASE_NAMES: Record<HeadingCase, string> = {
  'title-case': 'Title Case',
  'sentence-case': 'Sentence case',
  'all-caps': 'ALL CAPS',
};

interface AuthorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthorChange?: () => void;
}

type ModalView = 'list' | 'create' | 'edit';

interface AuthorFormData {
  firstName: string;
  lastName: string;
  description: string;
  site: string;
  language: Language;
  targetCountry: TargetCountry;
  tone: ToneOfVoice;
  pointOfView: PointOfView;
  formality: Formality;
  customTonePrompt: string;
  headingCase: HeadingCase;
}

const DEFAULT_FORM_DATA: AuthorFormData = {
  firstName: '',
  lastName: '',
  description: '',
  site: '',
  language: 'en-US',
  targetCountry: 'us',
  tone: 'seo-optimized',
  pointOfView: 'second-person',
  formality: 'informal',
  customTonePrompt: '',
  headingCase: 'title-case',
};

export function AuthorModal({ open, onOpenChange, onAuthorChange }: AuthorModalProps) {
  const [view, setView] = useState<ModalView>('list');
  const [authors, setAuthors] = useState<AuthorProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingAuthor, setEditingAuthor] = useState<AuthorProfile | null>(null);
  const [formData, setFormData] = useState<AuthorFormData>(DEFAULT_FORM_DATA);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadAuthors();
      setView('list');
    }
  }, [open]);

  const loadAuthors = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAuthors();
      if (result.success && result.data) {
        setAuthors(result.data.authors);
      } else {
        setError(result.error?.message || 'Failed to load authors');
      }
    } catch {
      setError('Failed to load authors');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData(DEFAULT_FORM_DATA);
    setEditingAuthor(null);
    setView('create');
  };

  const handleEdit = (author: AuthorProfile) => {
    setEditingAuthor(author);
    setFormData({
      firstName: author.firstName,
      lastName: author.lastName,
      description: author.description || '',
      site: author.site || '',
      language: author.language,
      targetCountry: author.targetCountry,
      tone: author.tone,
      pointOfView: author.pointOfView,
      formality: author.formality,
      customTonePrompt: author.customTonePrompt || '',
      headingCase: author.headingCase || 'title-case',
    });
    setView('edit');
  };

  const handleDuplicate = async (author: AuthorProfile) => {
    setLoading(true);
    try {
      const result = await duplicateAuthor(author.id);
      if (result.success) {
        await loadAuthors();
        onAuthorChange?.();
      } else {
        setError(result.error?.message || 'Failed to duplicate author');
      }
    } catch {
      setError('Failed to duplicate author');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (author: AuthorProfile) => {
    if (!confirm(`Delete "${getAuthorDisplayName(author)}"?`)) return;

    setLoading(true);
    try {
      const result = await deleteAuthor(author.id);
      if (result.success) {
        await loadAuthors();
        onAuthorChange?.();
      } else {
        setError(result.error?.message || 'Failed to delete author');
      }
    } catch {
      setError('Failed to delete author');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    setSaving(true);
    setError(null);

    const requestData: CreateAuthorRequest = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      description: formData.description.trim() || undefined,
      site: formData.site.trim() || undefined,
      language: formData.language,
      targetCountry: formData.targetCountry,
      tone: formData.tone,
      pointOfView: formData.pointOfView,
      formality: formData.formality,
      customTonePrompt: formData.customTonePrompt.trim() || undefined,
      headingCase: formData.headingCase,
    };

    try {
      let result;
      if (editingAuthor) {
        result = await updateAuthor(editingAuthor.id, requestData);
      } else {
        result = await createAuthor(requestData);
      }

      if (result.success) {
        await loadAuthors();
        onAuthorChange?.();
        setView('list');
      } else {
        setError(result.error?.message || 'Failed to save author');
      }
    } catch {
      setError('Failed to save author');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setView('list');
    setError(null);
    setEditingAuthor(null);
  };

  // Separate built-in and custom authors
  const builtInAuthors = authors.filter((a) => a.isBuiltIn);
  const customAuthors = authors.filter((a) => !a.isBuiltIn);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {view === 'list' && 'Manage Authors'}
            {view === 'create' && 'Create Author'}
            {view === 'edit' && 'Edit Author'}
          </DialogTitle>
          <DialogDescription>
            {view === 'list' && 'Create and manage author profiles with custom voice settings.'}
            {view === 'create' && 'Define a new author profile with custom voice and tone settings.'}
            {view === 'edit' && 'Update the author profile settings.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        {view === 'list' && (
          <>
            <div className="flex-1 overflow-y-auto -mx-6 px-6 min-h-0">
              <div className="space-y-4 pb-4">
                {customAuthors.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Custom Authors</h3>
                    {customAuthors.map((author) => (
                      <AuthorListItem
                        key={author.id}
                        author={author}
                        onEdit={() => handleEdit(author)}
                        onDuplicate={() => handleDuplicate(author)}
                        onDelete={() => handleDelete(author)}
                        disabled={loading}
                      />
                    ))}
                  </div>
                )}

                {builtInAuthors.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Built-in Authors</h3>
                    {builtInAuthors.map((author) => (
                      <AuthorListItem
                        key={author.id}
                        author={author}
                        onDuplicate={() => handleDuplicate(author)}
                        isBuiltIn
                        disabled={loading}
                      />
                    ))}
                  </div>
                )}

                {authors.length === 0 && !loading && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No authors yet. Create your first author profile.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleCreate}>Create Author</Button>
            </DialogFooter>
          </>
        )}

        {(view === 'create' || view === 'edit') && (
          <>
            <div className="flex-1 overflow-y-auto -mx-6 px-6 min-h-0">
              <div className="space-y-4 pb-4">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Smith"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this author's style..."
                    rows={2}
                  />
                </div>

                {/* Site */}
                <div className="space-y-2">
                  <Label htmlFor="site">Site</Label>
                  <Input
                    id="site"
                    value={formData.site}
                    onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                    placeholder="e.g., example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    The website or brand this author writes for.
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-4">Voice Settings</h3>

                  {/* Language & Country */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select
                        value={formData.language}
                        onValueChange={(v) => setFormData({ ...formData, language: v as Language })}
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
                    <div className="space-y-2">
                      <Label>Target Country</Label>
                      <Select
                        value={formData.targetCountry}
                        onValueChange={(v) => setFormData({ ...formData, targetCountry: v as TargetCountry })}
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
                    </div>
                  </div>

                  {/* Tone, POV, Formality */}
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <Select
                        value={formData.tone}
                        onValueChange={(v) => setFormData({ ...formData, tone: v as ToneOfVoice })}
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
                    <div className="space-y-2">
                      <Label>Point of View</Label>
                      <Select
                        value={formData.pointOfView}
                        onValueChange={(v) => setFormData({ ...formData, pointOfView: v as PointOfView })}
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
                    <div className="space-y-2">
                      <Label>Formality</Label>
                      <Select
                        value={formData.formality}
                        onValueChange={(v) => setFormData({ ...formData, formality: v as Formality })}
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
                  </div>

                  {/* Heading Case */}
                  <div className="space-y-2 mt-4">
                    <Label>Heading Case</Label>
                    <Select
                      value={formData.headingCase}
                      onValueChange={(v) => setFormData({ ...formData, headingCase: v as HeadingCase })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(HEADING_CASE_NAMES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Prompt */}
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="customPrompt">Custom Prompt</Label>
                    <Textarea
                      id="customPrompt"
                      value={formData.customTonePrompt}
                      onChange={(e) => setFormData({ ...formData, customTonePrompt: e.target.value })}
                      placeholder="Additional writing instructions for this author..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Extra instructions that will be included when generating content with this author.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleBack} disabled={saving}>
                Back
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : view === 'create' ? 'Create Author' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface AuthorListItemProps {
  author: AuthorProfile;
  onEdit?: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
  isBuiltIn?: boolean;
  disabled?: boolean;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function AuthorListItem({
  author,
  onEdit,
  onDuplicate,
  onDelete,
  isBuiltIn,
  disabled,
}: AuthorListItemProps) {
  const initials = getInitials(author.firstName, author.lastName);

  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-start gap-3">
        <Avatar size="default">
          <AvatarFallback className={isBuiltIn ? 'bg-primary/10 text-primary' : 'bg-secondary'}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{getAuthorDisplayName(author)}</span>
            {author.site && (
              <Badge variant="outline" className="text-[10px]">
                {author.site}
              </Badge>
            )}
            {isBuiltIn && (
              <Badge variant="secondary" className="text-[10px]">
                Built-in
              </Badge>
            )}
          </div>
          {author.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">{author.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {LANGUAGE_NAMES[author.language]} / {TONE_NAMES[author.tone]}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isBuiltIn && onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} disabled={disabled}>
              Edit
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDuplicate} disabled={disabled}>
            Duplicate
          </Button>
          {!isBuiltIn && onDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete} disabled={disabled} className="text-destructive hover:text-destructive">
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
