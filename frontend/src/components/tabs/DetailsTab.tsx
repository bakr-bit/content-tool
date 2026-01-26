import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { COUNTRY_NAMES, LANGUAGE_NAMES, type TargetCountry, type Language } from '@/types/article';
import type { UseArticleFormReturn } from '@/hooks/useArticleForm';
import { Flag } from '@/components/ui/flag';
import { generateKeywords, getProjects } from '@/services/api';
import type { ProjectWithCount } from '@/types/project';

interface DetailsTabProps {
  form: UseArticleFormReturn;
}

export function DetailsTab({ form }: DetailsTabProps) {
  const [newKeyword, setNewKeyword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [projects, setProjects] = useState<ProjectWithCount[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const result = await getProjects();
        if (result.success && result.data) {
          setProjects(result.data.projects);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setProjectsLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !form.formState.includeKeywords.includes(newKeyword.trim())) {
      form.addKeyword(newKeyword.trim());
      setNewKeyword('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleGenerateKeywords = async () => {
    if (!form.formState.focusKeyword.trim()) return;

    setIsGenerating(true);
    try {
      const result = await generateKeywords({
        focusKeyword: form.formState.focusKeyword,
        title: form.formState.articleTitle || undefined,
        language: form.formState.language,
        targetCountry: form.formState.targetCountry,
      });

      if (result.success && result.data?.keywords) {
        // Add keywords that aren't already in the list
        const existingKeywords = new Set(form.formState.includeKeywords);
        const newKeywords = result.data.keywords.filter(k => !existingKeywords.has(k));
        form.setIncludeKeywords([...form.formState.includeKeywords, ...newKeywords]);
      }
    } catch (error) {
      console.error('Failed to generate keywords:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Article Details</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Define the main focus and target keywords for your article.
        </p>
      </div>

      {/* Focus Keyword */}
      <div className="space-y-2">
        <Label htmlFor="focusKeyword">Focus Keyword *</Label>
        <Input
          id="focusKeyword"
          placeholder="e.g., best running shoes 2024"
          value={form.formState.focusKeyword}
          onChange={(e) => form.setFocusKeyword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          The main keyword you want this article to rank for.
        </p>
      </div>

      {/* Language & Target Country */}
      <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <Label>Target Country</Label>
          <Select
            value={form.formState.targetCountry}
            onValueChange={(value) => form.setTargetCountry(value as TargetCountry)}
          >
            <SelectTrigger>
              <span className="flex items-center gap-2">
                <Flag country={form.formState.targetCountry} size="sm" />
                {COUNTRY_NAMES[form.formState.targetCountry]}
              </span>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(COUNTRY_NAMES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    <Flag country={value} size="sm" />
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Article Title */}
      <div className="space-y-2">
        <Label htmlFor="articleTitle">Article Title</Label>
        <Input
          id="articleTitle"
          placeholder="Leave empty to auto-generate"
          value={form.formState.articleTitle}
          onChange={(e) => form.setArticleTitle(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Optional. If left empty, the AI will generate an optimized title.
        </p>
      </div>

      {/* Project */}
      <div className="space-y-2">
        <Label>Project</Label>
        <Select
          value={form.formState.projectId || 'none'}
          onValueChange={(value) => form.setProjectId(value === 'none' ? '' : value)}
          disabled={projectsLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={projectsLoading ? 'Loading...' : 'Select a project'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Project</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.projectId} value={project.projectId}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Optional. Assign this article to a project.
        </p>
      </div>

      {/* Include Keywords */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Include Keywords</Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleGenerateKeywords}
            disabled={isGenerating || !form.formState.focusKeyword.trim()}
          >
            {isGenerating ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-3 w-3" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Keywords'}
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add a keyword"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button onClick={handleAddKeyword} variant="secondary">
            Add
          </Button>
        </div>
        {form.formState.includeKeywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {form.formState.includeKeywords.map((keyword, index) => (
              <Badge key={index} variant="secondary" className="pr-1">
                {keyword}
                <button
                  onClick={() => form.removeKeyword(index)}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Additional keywords to naturally include in the article content.
        </p>
      </div>
    </div>
  );
}
