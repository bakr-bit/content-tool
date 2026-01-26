import type { ColumnDef } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { ArticleWithStatus, ListArticlesQuery } from '@/types/article';
import { ARTICLE_STATUS_NAMES } from '@/types/article';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArticleRowActions } from './ArticleRowActions';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ArticlesDataTableProps {
  articles: ArticleWithStatus[];
  loading: boolean;
  sortBy?: ListArticlesQuery['sortBy'];
  sortOrder?: ListArticlesQuery['sortOrder'];
  onSort: (sortBy: ListArticlesQuery['sortBy'], sortOrder: ListArticlesQuery['sortOrder']) => void;
  onDelete: (articleId: string) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'published':
      return 'default';
    case 'archived':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function ArticlesDataTable({
  articles,
  loading,
  sortBy,
  sortOrder,
  onSort,
  onDelete,
}: ArticlesDataTableProps) {
  const handleSortClick = (column: ListArticlesQuery['sortBy']) => {
    if (sortBy === column) {
      onSort(column, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(column, 'desc');
    }
  };

  const columns: ColumnDef<ArticleWithStatus>[] = [
    {
      accessorKey: 'title',
      header: () => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => handleSortClick('title')}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="max-w-[300px]">
          <span className="font-medium" title={row.getValue('title')}>
            {truncateText(row.getValue('title'), 50)}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'keyword',
      header: () => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => handleSortClick('keyword')}
        >
          Keyword
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.getValue('keyword')}
        </span>
      ),
    },
    {
      accessorKey: 'metadata.wordCount',
      header: 'Words',
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.metadata.wordCount.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge variant={getStatusVariant(status)}>
            {ARTICLE_STATUS_NAMES[status as keyof typeof ARTICLE_STATUS_NAMES] || status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: () => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => handleSortClick('created_at')}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => formatDate(row.getValue('createdAt')),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <ArticleRowActions
          article={row.original}
          onDelete={() => onDelete(row.original.articleId)}
        />
      ),
    },
  ];

  const table = useReactTable({
    data: articles,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center"
              >
                No articles found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
