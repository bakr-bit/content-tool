import { useState } from 'react';
import type { ContentPlanPage, ContentPlanStats } from '@/types/content-plan';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContentPlanStatusBar } from './ContentPlanStatusBar';
import { BatchSettingsDialog } from './BatchSettingsDialog';
import {
  Play,
  MoreHorizontal,
  Trash2,
  SkipForward,
  RotateCcw,
  ExternalLink,
  Square,
  Loader2,
  Zap,
  ListTree,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ContentPlanTableProps {
  pages: ContentPlanPage[];
  stats: ContentPlanStats;
  batchRunning: boolean;
  projectGeo?: string;
  projectLanguage?: string;
  onGenerateSingle: (pageId: string) => Promise<void>;
  onGenerateBatch: (pageIds?: string[], options?: Record<string, unknown>) => Promise<void>;
  onCancelBatch: () => Promise<void>;
  onUpdatePage: (pageId: string, data: { keywords?: string; generationStatus?: 'pending' | 'skipped' }) => Promise<void>;
  onDeletePage: (pageId: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  onPageClick?: (page: ContentPlanPage) => void;
}

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  generating: 'default',
  completed: 'secondary',
  failed: 'destructive',
  skipped: 'outline',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-zinc-400',
  generating: 'text-blue-400',
  completed: 'text-green-400',
  failed: 'text-red-400',
  skipped: 'text-zinc-500',
};

export function ContentPlanTable({
  pages,
  stats,
  batchRunning,
  projectGeo,
  projectLanguage,
  onGenerateSingle,
  onGenerateBatch,
  onCancelBatch,
  onUpdatePage,
  onDeletePage,
  onClearAll,
  onPageClick,
}: ContentPlanTableProps) {
  const [batchSettingsOpen, setBatchSettingsOpen] = useState(false);
  const [generatingPageId, setGeneratingPageId] = useState<string | null>(null);

  const pendingCount = stats.pending + stats.failed;

  const handleGenerateSingle = async (pageId: string) => {
    setGeneratingPageId(pageId);
    try {
      await onGenerateSingle(pageId);
    } finally {
      setGeneratingPageId(null);
    }
  };

  const handleBatchGenerate = async (options: Record<string, unknown>) => {
    await onGenerateBatch(undefined, options);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <ContentPlanStatusBar stats={stats} running={batchRunning} />
        <div className="flex items-center gap-2">
          {batchRunning ? (
            <Button variant="destructive" size="sm" onClick={onCancelBatch}>
              <Square className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                onClick={() => setBatchSettingsOpen(true)}
                disabled={pendingCount === 0}
              >
                <Zap className="h-4 w-4 mr-2" />
                Generate All ({pendingCount})
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onClearAll} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Pages
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border max-h-[50vh] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead>URL / Title</TableHead>
              <TableHead>Keywords</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[60px]">Level</TableHead>
              <TableHead className="w-[70px]">Outline</TableHead>
              <TableHead className="w-[80px]">Article</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.map((page) => (
              <TableRow
                key={page.pageId}
                className={`${page.generationStatus === 'skipped' ? 'opacity-50' : ''} ${onPageClick ? 'cursor-pointer hover:bg-zinc-800/50' : ''}`}
                onClick={() => onPageClick?.(page)}
              >
                <TableCell>
                  <Badge
                    variant={STATUS_BADGE_VARIANT[page.generationStatus]}
                    className={`text-xs ${STATUS_COLORS[page.generationStatus]}`}
                  >
                    {page.generationStatus === 'generating' && (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    )}
                    {page.generationStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    {page.url && (
                      <div className="font-mono text-xs text-zinc-500 truncate max-w-[300px]">
                        {page.url}
                      </div>
                    )}
                    <div className="text-sm truncate max-w-[300px]">
                      {page.metaTitle || '-'}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-zinc-400 max-w-[200px] truncate">
                  {page.keywords || '-'}
                </TableCell>
                <TableCell>
                  {page.pageType && (
                    <Badge variant="outline" className="text-xs">
                      {page.pageType}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center text-zinc-400">{page.level ?? '-'}</TableCell>
                <TableCell>
                  {page.outlineId && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <ListTree className="h-3 w-3" />
                    </Badge>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {page.articleId && (
                    <Link to={`/article/${page.articleId}`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                  {page.errorMessage && (
                    <span className="text-xs text-red-400" title={page.errorMessage}>
                      Error
                    </span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {(page.generationStatus === 'pending' || page.generationStatus === 'failed') && (
                        <DropdownMenuItem
                          onClick={() => handleGenerateSingle(page.pageId)}
                          disabled={generatingPageId === page.pageId || batchRunning}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Generate
                        </DropdownMenuItem>
                      )}
                      {page.generationStatus !== 'skipped' && page.generationStatus !== 'generating' && (
                        <DropdownMenuItem
                          onClick={() => onUpdatePage(page.pageId, { generationStatus: 'skipped' })}
                        >
                          <SkipForward className="h-4 w-4 mr-2" />
                          Skip
                        </DropdownMenuItem>
                      )}
                      {(page.generationStatus === 'skipped' || page.generationStatus === 'failed') && (
                        <DropdownMenuItem
                          onClick={() => onUpdatePage(page.pageId, { generationStatus: 'pending' })}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset to Pending
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => onDeletePage(page.pageId)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Batch Settings Dialog */}
      <BatchSettingsDialog
        open={batchSettingsOpen}
        onOpenChange={setBatchSettingsOpen}
        onGenerate={handleBatchGenerate}
        pageCount={pendingCount}
        projectGeo={projectGeo}
        projectLanguage={projectLanguage}
      />
    </div>
  );
}
