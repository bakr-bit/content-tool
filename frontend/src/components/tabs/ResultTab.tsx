import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Copy, Download, Check, Eye, Code } from 'lucide-react';
import type { Article } from '@/types/article';

interface ResultTabProps {
  article: Article | null;
}

export function ResultTab({ article }: ResultTabProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');

  if (!article) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center text-muted-foreground">
          <p className="text-lg mb-2">No article generated yet</p>
          <p className="text-sm">
            Configure your settings and click "Generate Article" to create content.
          </p>
        </div>
      </div>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(article.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([article.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.title.replace(/\s+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b min-w-0">
        <div>
          <h2 className="text-lg font-semibold">{article.title}</h2>
          <p className="text-sm text-muted-foreground">
            {article.metadata.wordCount.toLocaleString()} words &middot;{' '}
            {article.metadata.readingTimeMinutes} min read
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 mr-2">
            <Button
              variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('preview')}
              className="h-8 px-2"
            >
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            <Button
              variant={viewMode === 'raw' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('raw')}
              className="h-8 px-2"
            >
              <Code className="h-4 w-4 mr-1" />
              Raw
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-w-0">
        <div className="p-6 overflow-hidden">
          {viewMode === 'raw' ? (
            <div className="whitespace-pre-wrap font-mono text-sm bg-muted/30 p-4 rounded-lg break-words">
              {article.content}
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert break-words overflow-hidden">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-0 text-foreground">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-6 text-foreground border-b pb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4 text-foreground">{children}</h3>,
                  h4: ({ children }) => <h4 className="text-base font-medium mb-2 mt-3 text-foreground">{children}</h4>,
                  p: ({ children }) => <p className="mb-4 text-foreground/90 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1 text-foreground/90">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1 text-foreground/90">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/50 pl-4 italic my-4 text-muted-foreground">{children}</blockquote>,
                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  a: ({ href, children }) => <a href={href} className="text-primary hover:underline">{children}</a>,
                  table: ({ children }) => <div className="overflow-x-auto my-4"><table className="min-w-full border-collapse border border-border">{children}</table></div>,
                  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
                  th: ({ children }) => <th className="border border-border px-4 py-2 text-left font-semibold">{children}</th>,
                  td: ({ children }) => <td className="border border-border px-4 py-2">{children}</td>,
                  hr: () => <hr className="my-6 border-border" />,
                  code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                  pre: ({ children }) => <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4">{children}</pre>,
                }}
              >
                {article.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Stats */}
      <div className="border-t p-4 bg-muted/30">
        <div className="flex gap-6 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{article.sections.length}</strong> sections
          </span>
          <span>
            <strong className="text-foreground">{article.metadata.generationStats.totalLLMCalls}</strong> API calls
          </span>
          <span>
            Generated in{' '}
            <strong className="text-foreground">
              {(article.metadata.generationStats.generationTimeMs / 1000).toFixed(1)}s
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
