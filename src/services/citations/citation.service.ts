import { VerifiedSource } from '../../types';
import { createChildLogger } from '../../utils/logger';

const logger = createChildLogger('CitationService');

// Translations for "Sources" header by language code
const SOURCES_TRANSLATIONS: Record<string, string> = {
  'en-US': 'Sources',
  'en-GB': 'Sources',
  'en-AU': 'Sources',
  'es-ES': 'Fuentes',
  'es-MX': 'Fuentes',
  'fr-FR': 'Sources',
  'fr-CA': 'Sources',
  'de-DE': 'Quellen',
  'de-AT': 'Quellen',
  'it-IT': 'Fonti',
  'pt-BR': 'Fontes',
  'pt-PT': 'Fontes',
  'nl-NL': 'Bronnen',
  'sv-SE': 'Källor',
  'no-NO': 'Kilder',
  'da-DK': 'Kilder',
  'fi-FI': 'Lähteet',
  'pl-PL': 'Źródła',
  'ru-RU': 'Источники',
  'ja-JP': '出典',
  'zh-CN': '来源',
  'zh-TW': '來源',
  'ko-KR': '출처',
  'ar-SA': 'المصادر',
  'hi-IN': 'स्रोत',
  'tr-TR': 'Kaynaklar',
};

function getSourcesHeader(language?: string): string {
  if (!language) return 'Sources';
  return SOURCES_TRANSLATIONS[language] || 'Sources';
}

interface CitationReference {
  id: number;
  source: VerifiedSource;
  usedInSections: string[];
}

interface SourcesSection {
  markdown: string;
  sourceCount: number;
}

export class CitationService {
  /**
   * Extract citation references from article content
   * Finds patterns like [1], [2], [3] etc.
   */
  extractCitations(content: string): number[] {
    const citationPattern = /\[(\d+)\]/g;
    const citations: number[] = [];
    let match;

    while ((match = citationPattern.exec(content)) !== null) {
      const id = parseInt(match[1], 10);
      if (!citations.includes(id)) {
        citations.push(id);
      }
    }

    return citations.sort((a, b) => a - b);
  }

  /**
   * Build a mapping of citation IDs to sources
   */
  buildCitationMap(
    content: string,
    sources: VerifiedSource[]
  ): Map<number, CitationReference> {
    const usedCitations = this.extractCitations(content);
    const citationMap = new Map<number, CitationReference>();

    for (const citationId of usedCitations) {
      const source = sources.find(s => s.id === citationId);
      if (source) {
        citationMap.set(citationId, {
          id: citationId,
          source,
          usedInSections: []
        });
      }
    }

    return citationMap;
  }

  /**
   * Generate the Sources section for the end of the article
   */
  generateSourcesSection(
    content: string,
    sources: VerifiedSource[],
    language?: string
  ): SourcesSection {
    const usedCitations = this.extractCitations(content);

    if (usedCitations.length === 0) {
      return {
        markdown: '',
        sourceCount: 0
      };
    }

    // Filter and sort sources by citation ID
    const usedSources = usedCitations
      .map(id => sources.find(s => s.id === id))
      .filter((s): s is VerifiedSource => s !== undefined);

    if (usedSources.length === 0) {
      return {
        markdown: '',
        sourceCount: 0
      };
    }

    logger.debug({ sourceCount: usedSources.length }, 'Generating sources section');

    // Build the sources markdown
    const sourcesList = usedSources
      .map(source => `${source.id}. [${source.title}](${source.url})`)
      .join('\n');

    const sourcesHeader = getSourcesHeader(language);
    const markdown = `\n\n## ${sourcesHeader}\n\n${sourcesList}`;

    return {
      markdown,
      sourceCount: usedSources.length
    };
  }

  /**
   * Renumber citations in content to be sequential
   * Useful when sources have been filtered or reordered
   */
  renumberCitations(
    content: string,
    oldToNewMapping: Map<number, number>
  ): string {
    let result = content;

    // Sort by old ID descending to avoid replacement conflicts
    const sortedMappings = Array.from(oldToNewMapping.entries())
      .sort((a, b) => b[0] - a[0]);

    for (const [oldId, newId] of sortedMappings) {
      // Use a placeholder first to avoid conflicts
      const placeholder = `__CITE_${newId}__`;
      result = result.replace(new RegExp(`\\[${oldId}\\]`, 'g'), placeholder);
    }

    // Replace placeholders with actual citations
    for (const [, newId] of sortedMappings) {
      const placeholder = `__CITE_${newId}__`;
      result = result.replace(new RegExp(placeholder, 'g'), `[${newId}]`);
    }

    return result;
  }

  /**
   * Append sources section to article content
   */
  appendSourcesSection(
    articleContent: string,
    sources: VerifiedSource[],
    language?: string
  ): string {
    const sourcesSection = this.generateSourcesSection(articleContent, sources, language);

    if (sourcesSection.sourceCount === 0) {
      return articleContent;
    }

    // Check if article already has a Sources section (in any supported language)
    const sourcesHeader = getSourcesHeader(language);
    const allSourcesHeaders = Object.values(SOURCES_TRANSLATIONS).join('|');
    const sourcesRegex = new RegExp(`## (${allSourcesHeaders})\\s*\\n`, 'i');
    if (sourcesRegex.test(articleContent)) {
      logger.debug({ header: sourcesHeader }, 'Article already has a Sources section');
      return articleContent;
    }

    return articleContent + sourcesSection.markdown;
  }

  /**
   * Build context string with sources for section writing
   */
  buildSourceContext(sources: VerifiedSource[]): string {
    if (sources.length === 0) {
      return '';
    }

    const sourceList = sources
      .map(source => {
        const summary = source.summary || source.content?.slice(0, 300) || '';
        return `[${source.id}] ${source.title}\n${summary}`;
      })
      .join('\n\n');

    return `## Available Sources (use [1], [2], etc. to cite):\n\n${sourceList}`;
  }

  /**
   * Validate that all citations in content have corresponding sources
   */
  validateCitations(
    content: string,
    sources: VerifiedSource[]
  ): {
    valid: boolean;
    missingCitations: number[];
    unusedSources: number[];
  } {
    const usedCitations = this.extractCitations(content);
    const sourceIds = new Set(sources.map(s => s.id));

    const missingCitations = usedCitations.filter(id => !sourceIds.has(id));
    const unusedSources = sources
      .filter(s => !usedCitations.includes(s.id))
      .map(s => s.id);

    return {
      valid: missingCitations.length === 0,
      missingCitations,
      unusedSources
    };
  }

  /**
   * Clean up citations - remove invalid ones and renumber
   */
  cleanupCitations(
    content: string,
    sources: VerifiedSource[]
  ): {
    content: string;
    sources: VerifiedSource[];
  } {
    const validation = this.validateCitations(content, sources);

    if (validation.valid && validation.unusedSources.length === 0) {
      return { content, sources };
    }

    // Remove invalid citations
    let cleanedContent = content;
    for (const missingId of validation.missingCitations) {
      cleanedContent = cleanedContent.replace(
        new RegExp(`\\[${missingId}\\]`, 'g'),
        ''
      );
    }

    // Get only used sources and renumber them
    const usedCitations = this.extractCitations(cleanedContent);
    const usedSources = usedCitations
      .map(id => sources.find(s => s.id === id))
      .filter((s): s is VerifiedSource => s !== undefined);

    // Create renumbering map
    const renumberMap = new Map<number, number>();
    usedSources.forEach((source, index) => {
      renumberMap.set(source.id, index + 1);
    });

    // Renumber citations in content
    cleanedContent = this.renumberCitations(cleanedContent, renumberMap);

    // Update source IDs
    const renumberedSources = usedSources.map((source, index) => ({
      ...source,
      id: index + 1
    }));

    return {
      content: cleanedContent,
      sources: renumberedSources
    };
  }
}

export const citationService = new CitationService();
