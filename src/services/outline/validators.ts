import { OutlineSection } from '../../types';
import { createChildLogger } from '../../utils/logger';

const logger = createChildLogger('OutlineValidators');

export interface ValidationWarning {
  type: 'reordered' | 'overlap' | 'missing';
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  sections: OutlineSection[];
  warnings: ValidationWarning[];
  reordered: boolean;
}

// Pattern matching for introduction sections (multiple languages)
const INTRO_PATTERNS = [
  /^introduction$/i,
  /^what is/i,
  /^overview$/i,
  /^understanding/i,
  /^about/i,
  /^getting started/i,
  // Swedish
  /^vad är/i,
  /^introduktion$/i,
  /^översikt$/i,
  /^om /i,
  // German
  /^einführung$/i,
  /^was ist/i,
  /^überblick$/i,
  // French
  /^qu'est-ce que/i,
  /^introduction$/i,
  /^aperçu$/i,
  // Spanish
  /^qué es/i,
  /^introducción$/i,
  /^resumen$/i,
];

// Pattern matching for conclusion sections (multiple languages)
const CONCLUSION_PATTERNS = [
  /^conclusion$/i,
  /^summary$/i,
  /^final thoughts$/i,
  /^wrapping up$/i,
  /^in summary$/i,
  /^closing/i,
  // Swedish
  /^sammanfattning$/i,
  /^slutsats$/i,
  /^avslutning$/i,
  /^slutord$/i,
  // German
  /^fazit$/i,
  /^zusammenfassung$/i,
  /^schlussfolgerung$/i,
  // French
  /^conclusion$/i,
  /^résumé$/i,
  /^en résumé$/i,
  // Spanish
  /^conclusión$/i,
  /^resumen final$/i,
];

// Key takeaways patterns (should be near the top after intro)
const KEY_TAKEAWAYS_PATTERNS = [
  /^key takeaways$/i,
  /^main points$/i,
  /^highlights$/i,
  /^tldr$/i,
  /^tl;dr$/i,
  // Swedish
  /^viktiga punkter$/i,
  /^huvudpunkter$/i,
  /^sammanfattade punkter$/i,
  // German
  /^wichtige punkte$/i,
  /^kernpunkte$/i,
  // French
  /^points clés$/i,
  /^à retenir$/i,
  // Spanish
  /^puntos clave$/i,
];

// FAQ patterns (should be near the end before conclusion)
const FAQ_PATTERNS = [
  /^faq$/i,
  /^frequently asked/i,
  /^common questions/i,
  /^q&a$/i,
  // Swedish
  /^vanliga frågor$/i,
  /^frågor och svar$/i,
  // German
  /^häufige fragen$/i,
  /^fragen und antworten$/i,
  // French
  /^questions fréquentes$/i,
  /^foire aux questions$/i,
  // Spanish
  /^preguntas frecuentes$/i,
];

function matchesPatterns(heading: string, patterns: RegExp[]): boolean {
  const normalizedHeading = heading.trim();
  return patterns.some(pattern => pattern.test(normalizedHeading));
}

function isIntroSection(section: OutlineSection): boolean {
  return section.id === 'introduction' || matchesPatterns(section.heading, INTRO_PATTERNS);
}

function isConclusionSection(section: OutlineSection): boolean {
  return section.id === 'conclusion' || matchesPatterns(section.heading, CONCLUSION_PATTERNS);
}

function isKeyTakeawaysSection(section: OutlineSection): boolean {
  return section.id === 'key-takeaways' || matchesPatterns(section.heading, KEY_TAKEAWAYS_PATTERNS);
}

function isFaqSection(section: OutlineSection): boolean {
  return section.id === 'faq' || matchesPatterns(section.heading, FAQ_PATTERNS);
}

/**
 * Reorder sections to ensure proper structure:
 * 1. Introduction first
 * 2. Key Takeaways second (if present)
 * 3. Main body sections
 * 4. FAQ second to last (if present)
 * 5. Conclusion last
 */
export function reorderSections(sections: OutlineSection[]): { sections: OutlineSection[]; reordered: boolean } {
  if (sections.length === 0) {
    return { sections: [], reordered: false };
  }

  let intro: OutlineSection | null = null;
  let keyTakeaways: OutlineSection | null = null;
  let conclusion: OutlineSection | null = null;
  let faq: OutlineSection | null = null;
  const bodyParts: OutlineSection[] = [];

  // Categorize sections
  for (const section of sections) {
    if (isIntroSection(section) && !intro) {
      intro = section;
    } else if (isConclusionSection(section) && !conclusion) {
      conclusion = section;
    } else if (isKeyTakeawaysSection(section) && !keyTakeaways) {
      keyTakeaways = section;
    } else if (isFaqSection(section) && !faq) {
      faq = section;
    } else {
      bodyParts.push(section);
    }
  }

  // Reconstruct in proper order
  const reordered: OutlineSection[] = [];

  if (intro) {
    reordered.push(intro);
  }

  if (keyTakeaways) {
    reordered.push(keyTakeaways);
  }

  reordered.push(...bodyParts);

  if (faq) {
    reordered.push(faq);
  }

  if (conclusion) {
    reordered.push(conclusion);
  }

  // Check if reordering occurred
  const wasReordered = !arraysEqual(
    sections.map(s => s.id || s.heading),
    reordered.map(s => s.id || s.heading)
  );

  return { sections: reordered, reordered: wasReordered };
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
}

/**
 * Calculate Jaccard similarity between two sets of words
 */
function jaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(tokenize(text1));
  const words2 = new Set(tokenize(text2));

  if (words1.size === 0 && words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Tokenize text into lowercase words, removing common stop words
 */
function tokenize(text: string): string[] {
  const stopWords = new Set([
    // English
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under',
    'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
    'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just',
    'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
    'how', 'why', 'when', 'where', 'your', 'you', 'their', 'our', 'its',
    // Swedish
    'och', 'att', 'det', 'i', 'en', 'på', 'är', 'av', 'för', 'med', 'som',
    'den', 'till', 'de', 'ett', 'om', 'var', 'har', 'vi', 'kan', 'du',
    'din', 'dina', 'detta', 'dessa', 'här', 'där', 'eller', 'men', 'så',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

export interface OverlapWarning {
  section1: { id: string; heading: string };
  section2: { id: string; heading: string };
  similarity: number;
}

/**
 * Detect sections with significant content overlap
 */
export function detectOverlaps(sections: OutlineSection[], threshold = 0.4): OverlapWarning[] {
  const overlaps: OverlapWarning[] = [];

  // Skip special sections in overlap detection
  const contentSections = sections.filter(
    s => !isIntroSection(s) && !isConclusionSection(s) && !isKeyTakeawaysSection(s) && !isFaqSection(s)
  );

  for (let i = 0; i < contentSections.length; i++) {
    for (let j = i + 1; j < contentSections.length; j++) {
      const section1 = contentSections[i];
      const section2 = contentSections[j];

      // Combine heading and description for comparison
      const text1 = `${section1.heading} ${section1.description || ''}`;
      const text2 = `${section2.heading} ${section2.description || ''}`;

      const similarity = jaccardSimilarity(text1, text2);

      if (similarity >= threshold) {
        overlaps.push({
          section1: { id: section1.id, heading: section1.heading },
          section2: { id: section2.id, heading: section2.heading },
          similarity: Math.round(similarity * 100) / 100,
        });
      }
    }
  }

  return overlaps;
}

/**
 * Main validation function that orchestrates all validations
 */
export function validateOutline(sections: OutlineSection[]): ValidationResult {
  const warnings: ValidationWarning[] = [];

  // Step 1: Reorder sections
  const { sections: reorderedSections, reordered } = reorderSections(sections);

  if (reordered) {
    warnings.push({
      type: 'reordered',
      message: 'Sections were reordered to ensure proper structure (intro first, conclusion last)',
    });
    logger.info('Outline sections were reordered for proper structure');
  }

  // Step 2: Detect overlaps
  const overlaps = detectOverlaps(reorderedSections);

  for (const overlap of overlaps) {
    warnings.push({
      type: 'overlap',
      message: `Potential content overlap detected between "${overlap.section1.heading}" and "${overlap.section2.heading}" (${Math.round(overlap.similarity * 100)}% similarity)`,
      details: {
        section1Id: overlap.section1.id,
        section1Heading: overlap.section1.heading,
        section2Id: overlap.section2.id,
        section2Heading: overlap.section2.heading,
        similarity: overlap.similarity,
      },
    });
  }

  if (overlaps.length > 0) {
    logger.warn({ overlaps }, 'Content overlaps detected in outline');
  }

  // Step 3: Check for missing required sections
  const hasIntro = reorderedSections.some(s => isIntroSection(s));
  const hasConclusion = reorderedSections.some(s => isConclusionSection(s));

  if (!hasIntro) {
    warnings.push({
      type: 'missing',
      message: 'No introduction section detected. Consider adding one at the beginning.',
    });
  }

  if (!hasConclusion) {
    warnings.push({
      type: 'missing',
      message: 'No conclusion section detected. Consider adding one at the end.',
    });
  }

  return {
    sections: reorderedSections,
    warnings,
    reordered,
  };
}
