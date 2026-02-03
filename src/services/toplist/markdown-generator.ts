import { translationService } from '../translation';

export interface ToplistColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'rating' | 'list' | 'badge';
  brandAttribute: string;
}

// Local types for markdown generation - compatible with both old and new API formats
export interface BrandAttributes {
  [key: string]: unknown;
}

export interface Brand {
  name: string;
  attributes?: BrandAttributes;
  // New API fields
  defaultLogo?: string | null;
  defaultBonus?: string | null;
  defaultAffiliateUrl?: string | null;
  defaultRating?: number | null;
  terms?: string | null;
  license?: string | null;
  pros?: string[] | null;
  cons?: string[] | null;
}

export interface ToplistEntryData {
  entryId: string;
  brandId: string;
  rank: number;
  attributeOverrides?: BrandAttributes;
  brand?: Brand;
}

export type ToplistHeadingLevel = 'h2' | 'h3';

export interface ToplistData {
  toplistId: string;
  name: string;
  columns: ToplistColumn[];
  entries: ToplistEntryData[];
  includeInArticle?: boolean;
  heading?: string;
  headingLevel?: ToplistHeadingLevel;
}

/**
 * Generates markdown table from toplist data with optional heading
 * @param toplist - The toplist data to generate markdown from
 * @param language - Optional language code for translating column labels (e.g., 'de-DE', 'es-ES')
 */
export function generateToplistMarkdown(toplist: ToplistData, language?: string): string {
  const { columns, entries, heading, headingLevel, name } = toplist;

  if (!entries || entries.length === 0) {
    return '';
  }

  const lines: string[] = [];

  // Add heading if provided
  const headingText = heading || name;
  const headingPrefix = headingLevel === 'h3' ? '###' : '##';
  lines.push(`${headingPrefix} ${headingText}`);
  lines.push('');

  // Add table header - translate labels if language is provided and not English
  const shouldTranslate = language && !language.startsWith('en-');
  const headers = columns.map((col) =>
    shouldTranslate ? translationService.translate(col.label, language) : col.label
  );
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);

  // Add table rows
  for (const entry of entries) {
    const cells = columns.map((col) => formatCellValue(entry, col));
    lines.push(`| ${cells.join(' | ')} |`);
  }

  return lines.join('\n');
}

/**
 * Format a cell value based on column type
 */
function formatCellValue(entry: ToplistEntryData, column: ToplistColumn): string {
  const brand = entry.brand;
  const overrides = entry.attributeOverrides || {};
  const attrs: BrandAttributes = { ...brand?.attributes, ...overrides };

  // Handle special _rank attribute
  if (column.brandAttribute === '_rank') {
    return String(entry.rank);
  }

  // Handle name attribute
  if (column.brandAttribute === 'name') {
    return brand?.name || '-';
  }

  const value = attrs[column.brandAttribute];

  if (value === undefined || value === null) {
    return '-';
  }

  switch (column.type) {
    case 'list':
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return String(value);

    case 'rating':
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(num)) return String(value);
      return `${num.toFixed(1)}/10`;

    case 'badge':
      return value ? '✓' : '✗';

    case 'currency':
      return typeof value === 'number' ? `$${value.toLocaleString()}` : String(value);

    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value);

    default:
      return String(value);
  }
}

/**
 * Insert toplist markdown into article content after the first H2 heading
 * @param articleContent - The article markdown content
 * @param toplists - Array of toplist data to insert
 * @param language - Optional language code for translating column labels
 */
export function insertToplistIntoArticle(
  articleContent: string,
  toplists: ToplistData[],
  language?: string
): string {
  // Filter only toplists marked for inclusion
  const includedToplists = toplists.filter((t) => t.includeInArticle !== false);

  if (includedToplists.length === 0) {
    return articleContent;
  }

  // Generate markdown for all included toplists with translations
  const toplistMarkdown = includedToplists
    .map((toplist) => generateToplistMarkdown(toplist, language))
    .filter((md) => md.length > 0)
    .join('\n\n');

  if (!toplistMarkdown) {
    return articleContent;
  }

  // Find the first H2 heading, then insert BEFORE the second H2 heading
  // This ensures the toplist goes after the intro section but before the next section
  const h2Regex = /^## .+$/gm;
  const h2Matches: { index: number; match: string }[] = [];

  let h2Match;
  while ((h2Match = h2Regex.exec(articleContent)) !== null) {
    h2Matches.push({ index: h2Match.index, match: h2Match[0] });
  }

  if (h2Matches.length >= 2) {
    // Insert just before the second H2 heading
    const insertPosition = h2Matches[1].index;
    return (
      articleContent.slice(0, insertPosition) +
      toplistMarkdown +
      '\n\n' +
      articleContent.slice(insertPosition)
    );
  }

  if (h2Matches.length === 1) {
    // Only one H2, insert after it and its content (before any H3 or at end)
    const firstH2End = h2Matches[0].index + h2Matches[0].match.length;
    const h3Match = articleContent.slice(firstH2End).match(/^### .+$/m);

    if (h3Match && h3Match.index !== undefined) {
      const insertPosition = firstH2End + h3Match.index;
      return (
        articleContent.slice(0, insertPosition) +
        toplistMarkdown +
        '\n\n' +
        articleContent.slice(insertPosition)
      );
    }

    // No H3 found, append after first H2's paragraph (find double newline)
    const afterH2 = articleContent.slice(firstH2End);
    const paragraphEnd = afterH2.match(/\n\n/);
    if (paragraphEnd && paragraphEnd.index !== undefined) {
      const insertPosition = firstH2End + paragraphEnd.index + 2;
      return (
        articleContent.slice(0, insertPosition) +
        toplistMarkdown +
        '\n\n' +
        articleContent.slice(insertPosition)
      );
    }
  }

  // Fallback: insert after the title (first H1 or at the beginning)
  const h1Pattern = /^(# .+?\n\n)/m;
  const h1Match = articleContent.match(h1Pattern);

  if (h1Match && h1Match.index !== undefined) {
    const insertPosition = h1Match.index + h1Match[0].length;
    return (
      articleContent.slice(0, insertPosition) +
      toplistMarkdown +
      '\n\n' +
      articleContent.slice(insertPosition)
    );
  }

  // Last resort: prepend to content
  return toplistMarkdown + '\n\n' + articleContent;
}
