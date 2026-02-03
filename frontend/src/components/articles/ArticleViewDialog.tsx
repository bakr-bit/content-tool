import { useState, useEffect } from 'react';
import type { ArticleWithStatus } from '@/types/article';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, FileText, Clock, Hash, Pencil, X, Loader2, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MDEditor from '@uiw/react-md-editor';
import { updateArticle } from '@/services/api';

interface ArticleViewDialogProps {
  article: ArticleWithStatus | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (updatedArticle: ArticleWithStatus) => void;
}

export function ArticleViewDialog({ article, open, onOpenChange, onUpdate }: ArticleViewDialogProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (article) {
      setEditedContent(article.content);
    }
  }, [article]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setColorMode(isDark ? 'dark' : 'light');
  }, [open]);

  if (!article) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(isEditing ? editedContent : article.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedContent(article.content);
      setSaveError(null);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (editedContent === article.content) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await updateArticle(article.articleId, { content: editedContent });

      if (result.success && result.data) {
        onUpdate?.(result.data);
        setIsEditing(false);
      } else {
        setSaveError(result.error?.message || 'Failed to save article');
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save article');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open && isEditing) {
      setEditedContent(article.content);
      setIsEditing(false);
      setSaveError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 flex flex-col">
        <DialogTitle className="sr-only">{article.title}</DialogTitle>

        {/* Editor Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{article.title}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" />
                {article.keyword}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {article.metadata.wordCount.toLocaleString()} words
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {article.metadata.readingTimeMinutes} min read
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditToggle}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditToggle}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Error message */}
        {saveError && (
          <div className="px-6 py-2 bg-destructive/10 border-b border-destructive/20 text-destructive text-sm">
            {saveError}
          </div>
        )}

        {/* Editor Content */}
        {isEditing ? (
          <div className="flex-1 overflow-hidden" data-color-mode={colorMode}>
            <MDEditor
              value={editedContent}
              onChange={(value) => setEditedContent(value || '')}
              height="100%"
              preview="live"
              hideToolbar={false}
            />
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <article className="max-w-3xl mx-auto pl-16 pr-8 py-8">
              <div className="prose prose-neutral dark:prose-invert prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-7 prose-li:leading-7 max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="relative">
                        <span className="absolute -left-12 top-1 text-[10px] px-1.5 py-0.5 font-mono font-medium bg-white text-gray-700 border border-gray-200 rounded">H1</span>
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="relative">
                        <span className="absolute -left-12 top-1 text-[10px] px-1.5 py-0.5 font-mono font-medium bg-white text-gray-700 border border-gray-200 rounded">H2</span>
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="relative">
                        <span className="absolute -left-12 top-0.5 text-[10px] px-1.5 py-0.5 font-mono font-medium bg-white text-gray-700 border border-gray-200 rounded">H3</span>
                        {children}
                      </h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="relative">
                        <span className="absolute -left-12 top-0.5 text-[10px] px-1.5 py-0.5 font-mono font-medium bg-white text-gray-700 border border-gray-200 rounded">H4</span>
                        {children}
                      </h4>
                    ),
                    h5: ({ children }) => (
                      <h5 className="relative">
                        <span className="absolute -left-12 top-0 text-[10px] px-1.5 py-0.5 font-mono font-medium bg-white text-gray-700 border border-gray-200 rounded">H5</span>
                        {children}
                      </h5>
                    ),
                    h6: ({ children }) => (
                      <h6 className="relative">
                        <span className="absolute -left-12 top-0 text-[10px] px-1.5 py-0.5 font-mono font-medium bg-white text-gray-700 border border-gray-200 rounded">H6</span>
                        {children}
                      </h6>
                    ),
                  }}
                >
                  {article.content}
                </ReactMarkdown>
              </div>
            </article>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
