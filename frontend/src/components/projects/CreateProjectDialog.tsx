import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Loader2, ChevronDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createProject } from '@/services/api';
import { getTemplates } from '@/services/toplist-api';
import type { ToplistTemplate } from '@/types/toplist';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: () => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onProjectCreated,
}: CreateProjectDialogProps) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [geo, setGeo] = useState('');
  const [language, setLanguage] = useState('');
  const [authorInput, setAuthorInput] = useState('');
  const [authors, setAuthors] = useState<string[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<ToplistTemplate[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      getTemplates().then((result) => {
        if (result.success && result.data) {
          setTemplates(result.data.templates);
        }
      });
    }
  }, [open]);

  const handleAddAuthor = () => {
    const trimmed = authorInput.trim();
    if (trimmed && !authors.includes(trimmed)) {
      setAuthors([...authors, trimmed]);
      setAuthorInput('');
    }
  };

  const handleRemoveAuthor = (author: string) => {
    setAuthors(authors.filter((a) => a !== author));
  };

  const handleAuthorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAuthor();
    }
  };

  const toggleTemplate = (templateId: string) => {
    if (selectedTemplateIds.includes(templateId)) {
      setSelectedTemplateIds(selectedTemplateIds.filter((id) => id !== templateId));
    } else {
      setSelectedTemplateIds([...selectedTemplateIds, templateId]);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        geo: geo.trim() || undefined,
        language: language.trim() || undefined,
        authors: authors.length > 0 ? authors : undefined,
        defaultToplistIds: selectedTemplateIds.length > 0 ? selectedTemplateIds : undefined,
      });

      if (result.success && result.data) {
        resetForm();
        onOpenChange(false);
        onProjectCreated?.();
        navigate(`/projects/${result.data.projectId}`);
      } else {
        setError(result.error?.message || 'Failed to create project');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setGeo('');
    setLanguage('');
    setAuthorInput('');
    setAuthors([]);
    setSelectedTemplateIds([]);
    setShowAdvanced(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a project to organize your articles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Name *</Label>
            <Input
              id="project-name"
              placeholder="e.g., Tech Blog"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              placeholder="Optional description for this project"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isCreating}
              rows={3}
            />
          </div>

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                Additional Settings
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-geo">GEO</Label>
                  <Input
                    id="project-geo"
                    placeholder="e.g., US, UK, DE"
                    value={geo}
                    onChange={(e) => setGeo(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-language">Language</Label>
                  <Input
                    id="project-language"
                    placeholder="e.g., English, German"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Authors</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add author name"
                    value={authorInput}
                    onChange={(e) => setAuthorInput(e.target.value)}
                    onKeyDown={handleAuthorKeyDown}
                    disabled={isCreating}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddAuthor}
                    disabled={isCreating || !authorInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                {authors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {authors.map((author) => (
                      <Badge key={author} variant="secondary" className="gap-1">
                        {author}
                        <button
                          type="button"
                          onClick={() => handleRemoveAuthor(author)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Default Toplist Templates</Label>
                <p className="text-xs text-muted-foreground">
                  Select templates to use by default when creating toplists in this project
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {templates.map((template) => (
                    <Badge
                      key={template.templateId}
                      variant={selectedTemplateIds.includes(template.templateId) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleTemplate(template.templateId)}
                    >
                      {template.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
