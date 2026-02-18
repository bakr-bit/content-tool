import type { ContentPlanStats } from '@/types/content-plan';
import { CheckCircle2, Clock, AlertCircle, Loader2, SkipForward } from 'lucide-react';

interface ContentPlanStatusBarProps {
  stats: ContentPlanStats;
  running?: boolean;
}

export function ContentPlanStatusBar({ stats, running }: ContentPlanStatusBarProps) {
  if (stats.total === 0) return null;

  const progressPercent = stats.total > 0
    ? Math.round(((stats.completed + stats.skipped) / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-sm">
        {stats.completed > 0 && (
          <span className="flex items-center gap-1 text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {stats.completed} completed
          </span>
        )}
        {stats.generating > 0 && (
          <span className="flex items-center gap-1 text-blue-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {stats.generating} generating
          </span>
        )}
        {stats.pending > 0 && (
          <span className="flex items-center gap-1 text-zinc-400">
            <Clock className="h-3.5 w-3.5" />
            {stats.pending} pending
          </span>
        )}
        {stats.failed > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <AlertCircle className="h-3.5 w-3.5" />
            {stats.failed} failed
          </span>
        )}
        {stats.skipped > 0 && (
          <span className="flex items-center gap-1 text-zinc-500">
            <SkipForward className="h-3.5 w-3.5" />
            {stats.skipped} skipped
          </span>
        )}
      </div>

      {/* Progress bar */}
      {running && (
        <div className="w-full bg-zinc-800 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
