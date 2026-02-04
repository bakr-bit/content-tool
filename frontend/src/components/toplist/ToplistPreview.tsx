import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { ArticleToplist, ColumnDefinition, ToplistEntry } from '@/types/toplist';

interface ToplistPreviewProps {
  toplist: ArticleToplist;
  compact?: boolean;
}

export function ToplistPreview({ toplist, compact = false }: ToplistPreviewProps) {
  const { columns, entries } = toplist;

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No brands added yet
      </div>
    );
  }

  const displayColumns = compact ? columns.slice(0, 4) : columns;
  const displayEntries = compact ? entries.slice(0, 3) : entries;

  const getCellValue = (entry: ToplistEntry, column: ColumnDefinition) => {
    const brand = entry.brand;
    const overrides = entry.attributeOverrides || {};

    // Handle special _rank attribute
    if (column.brandAttribute === '_rank') {
      return entry.rank;
    }

    // Handle name attribute
    if (column.brandAttribute === 'name') {
      return brand?.name || '-';
    }

    // Check overrides first, then fall back to brand fields
    const key = column.brandAttribute;
    if (overrides[key] !== undefined) {
      return overrides[key];
    }

    // Map column attributes to Brand fields
    if (brand) {
      switch (key) {
        case 'bonus': return brand.defaultBonus;
        case 'rating': return brand.defaultRating;
        case 'logo': return brand.defaultLogo;
        case 'affiliateUrl': return brand.defaultAffiliateUrl;
        case 'terms': return brand.terms;
        case 'license': return brand.license;
        case 'pros': return brand.pros;
        case 'cons': return brand.cons;
        case 'website': return brand.website;
        case 'description': return brand.description;
      }
    }

    return '-';
  };

  const formatValue = (value: unknown, type: ColumnDefinition['type']) => {
    if (value === '-' || value === undefined || value === null) {
      return <span className="text-muted-foreground">-</span>;
    }

    switch (type) {
      case 'list':
        if (Array.isArray(value)) {
          if (compact) {
            return value.slice(0, 2).join(', ') + (value.length > 2 ? '...' : '');
          }
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((item, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {String(item)}
                </Badge>
              ))}
            </div>
          );
        }
        return String(value);

      case 'rating':
        const num = typeof value === 'number' ? value : parseFloat(String(value));
        if (isNaN(num)) return String(value);
        return (
          <div className="flex items-center gap-1">
            <span className="font-semibold">{num.toFixed(1)}</span>
            <span className="text-muted-foreground">/10</span>
          </div>
        );

      case 'badge':
        return value ? (
          <Badge variant="default" className="bg-green-600">✓</Badge>
        ) : (
          <Badge variant="secondary">✗</Badge>
        );

      case 'currency':
        return typeof value === 'number' ? `$${value.toLocaleString()}` : String(value);

      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value);

      default:
        return String(value);
    }
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${compact ? 'text-sm' : ''}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {displayColumns.map((column) => (
              <TableHead key={column.id} className={compact ? 'py-2 px-3' : ''}>
                {column.label}
              </TableHead>
            ))}
            {compact && columns.length > 4 && (
              <TableHead className="py-2 px-3 text-muted-foreground">
                +{columns.length - 4}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayEntries.map((entry) => (
            <TableRow key={entry.entryId}>
              {displayColumns.map((column) => (
                <TableCell key={column.id} className={compact ? 'py-2 px-3' : ''}>
                  {formatValue(getCellValue(entry, column), column.type)}
                </TableCell>
              ))}
              {compact && columns.length > 4 && (
                <TableCell className="py-2 px-3 text-muted-foreground">...</TableCell>
              )}
            </TableRow>
          ))}
          {compact && entries.length > 3 && (
            <TableRow>
              <TableCell
                colSpan={displayColumns.length + (columns.length > 4 ? 1 : 0)}
                className="py-2 px-3 text-center text-muted-foreground"
              >
                +{entries.length - 3} more brands
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
