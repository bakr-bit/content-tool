import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ArticleStatus } from '@/types/article';
import { ARTICLE_STATUS_NAMES } from '@/types/article';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ArticleToolbarProps {
  onSearch: (keyword: string) => void;
  onStatusFilter: (status: string | undefined) => void;
  currentStatus?: ArticleStatus;
}

export function ArticleToolbar({
  onSearch,
  onStatusFilter,
  currentStatus,
}: ArticleToolbarProps) {
  const [searchValue, setSearchValue] = useState('');

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onSearch(value);
  };

  const handleClearSearch = () => {
    setSearchValue('');
    onSearch('');
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex flex-1 items-center gap-2 w-full sm:max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by keyword..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={currentStatus || 'all'}
          onValueChange={(value) => onStatusFilter(value === 'all' ? undefined : value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(ARTICLE_STATUS_NAMES) as ArticleStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {ARTICLE_STATUS_NAMES[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
