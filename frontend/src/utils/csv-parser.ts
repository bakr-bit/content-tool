import type { ImportPageInput } from '@/types/content-plan';

/**
 * Parse a CSV line respecting quoted fields (handles commas inside quotes).
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Expected CSV columns from site-architect:
 * URL, Meta Title, Meta Description, Target Keywords, Page Type, Icon, Level, Nav I, Nav II, Nav III, Description, Notes
 */
const EXPECTED_HEADERS = [
  'url', 'meta title', 'meta description', 'target keywords', 'page type',
  'icon', 'level', 'nav i', 'nav ii', 'nav iii', 'description', 'notes',
];

/**
 * Parse a site-architect CSV string into ImportPageInput array.
 * Handles both with-header and headerless CSVs by detecting the header row.
 */
export function parseSiteArchitectCsv(csvText: string): ImportPageInput[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Check if first line is a header
  const firstFields = parseCsvLine(lines[0]);
  const normalized = firstFields.map((f) => f.toLowerCase().trim());
  const isHeader = normalized.some(
    (h) => EXPECTED_HEADERS.includes(h) || h === 'target keywords' || h === 'meta title'
  );

  const dataLines = isHeader ? lines.slice(1) : lines;

  // Build column mapping from header
  let colMap: Record<string, number> = {};
  if (isHeader) {
    normalized.forEach((h, i) => {
      colMap[h] = i;
    });
  } else {
    // Assume standard order
    EXPECTED_HEADERS.forEach((h, i) => {
      colMap[h] = i;
    });
  }

  const getField = (fields: string[], key: string): string | undefined => {
    const idx = colMap[key];
    if (idx === undefined || idx >= fields.length) return undefined;
    const val = fields[idx].trim();
    return val || undefined;
  };

  return dataLines.map((line) => {
    const fields = parseCsvLine(line);
    const levelStr = getField(fields, 'level');

    return {
      url: getField(fields, 'url'),
      metaTitle: getField(fields, 'meta title'),
      metaDescription: getField(fields, 'meta description'),
      keywords: getField(fields, 'target keywords'),
      pageType: getField(fields, 'page type'),
      icon: getField(fields, 'icon'),
      level: levelStr ? parseInt(levelStr, 10) : undefined,
      navI: getField(fields, 'nav i'),
      navII: getField(fields, 'nav ii'),
      navIII: getField(fields, 'nav iii'),
      description: getField(fields, 'description'),
      notes: getField(fields, 'notes'),
    };
  });
}
