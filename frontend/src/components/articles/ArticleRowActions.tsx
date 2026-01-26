import { useState } from 'react';
import type { ArticleWithStatus } from '@/types/article';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MoreHorizontal, Eye, Copy, Trash2, Check, FileText, Clock, Hash } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ArticleRowActionsProps {
  article: ArticleWithStatus;
  onDelete: () => void;
}

export function ArticleRowActions({ article, onDelete }: ArticleRowActionsProps) {
  const [viewOpen, setViewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(article.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDelete = () => {
    onDelete();
    setDeleteConfirm(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setViewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Markdown
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteConfirm(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Dialog - Editor Style */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="ml-4"
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
          </div>

          {/* Editor Content */}
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
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Article</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{article.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
