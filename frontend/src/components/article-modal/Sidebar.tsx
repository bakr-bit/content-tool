import {
  FileText,
  List,
  Palette,
  BookOpen,
  LayoutList,
  Brain,
  FileOutput,
  Table2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type TabId = 'details' | 'outline' | 'content' | 'knowledge' | 'formatting' | 'structure' | 'toplist' | 'result';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const TABS: Tab[] = [
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'toplist', label: 'Toplist', icon: Table2 },
  { id: 'structure', label: 'Structure', icon: LayoutList },
  { id: 'outline', label: 'Outline', icon: List },
  { id: 'content', label: 'Content', icon: Palette },
  { id: 'knowledge', label: 'Knowledge', icon: Brain },
  { id: 'formatting', label: 'Formatting', icon: BookOpen },
  { id: 'result', label: 'Result', icon: FileOutput },
];

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hasResult?: boolean;
}

export function Sidebar({ activeTab, onTabChange, hasResult }: SidebarProps) {
  return (
    <div className="w-16 border-r bg-muted/30 flex flex-col py-4">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isDisabled = tab.id === 'result' && !hasResult;
        const isActive = activeTab === tab.id;

        return (
          <Tooltip key={tab.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => !isDisabled && onTabChange(tab.id)}
                disabled={isDisabled}
                className={cn(
                  'flex items-center justify-center w-full h-12 transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary border-r-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  isDisabled && 'opacity-40 cursor-not-allowed'
                )}
              >
                <Icon className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{tab.label}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
