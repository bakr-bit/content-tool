import { getDefaultProvider } from '../../integrations/llm';
import { Outline, GeneratedSection, LLMMessage, VerifiedSource } from '../../types';
import { GenerationOptionsInput } from '../../types/generation-options';
import { createChildLogger } from '../../utils/logger';
import { buildArticleEditorSystemPrompt, buildArticleEditorUserPrompt } from './prompts';
import { citationService } from '../citations';

const logger = createChildLogger('ArticleEditor');

export class ArticleEditor {
  private llm = getDefaultProvider();

  async editArticle(
    sections: GeneratedSection[],
    outline: Outline,
    options?: GenerationOptionsInput,
    sources?: VerifiedSource[]
  ): Promise<string> {
    logger.info({ sectionCount: sections.length }, 'Starting article editing pass');

    // Combine sections into full article
    const fullArticle = this.combineSections(sections, outline, options);

    const systemPrompt = buildArticleEditorSystemPrompt(options);
    const userPrompt = buildArticleEditorUserPrompt(fullArticle, outline, options);

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // Calculate needed tokens based on input size (roughly 2 tokens per word, with buffer)
    // Gemini 2.5 Flash Lite supports up to 65,536 output tokens
    const wordCount = fullArticle.split(/\s+/).length;
    const maxTokens = Math.min(65536, Math.ceil(wordCount * 2) + 4000);
    logger.debug({ wordCount, maxTokens }, 'Editor token calculation');

    const response = await this.llm.complete(messages, { maxTokens });

    let editedContent = response.content.trim();

    // Check for truncation - if editor output is significantly shorter or ends mid-sentence, use raw sections
    const editedWordCount = editedContent.split(/\s+/).length;
    const looksIncomplete = !editedContent.match(/[.!?]\s*$/) && !editedContent.match(/[.!?]\n*$/);
    const significantlyShortened = editedWordCount < wordCount * 0.85;

    if (looksIncomplete || significantlyShortened) {
      logger.warn(
        { editedWordCount, originalWordCount: wordCount, looksIncomplete, significantlyShortened },
        'Editor output appears truncated - falling back to raw sections'
      );
      editedContent = fullArticle;
    }

    // Append sources section if citations are enabled and sources provided
    if (sources && sources.length > 0) {
      // Clean up citations and append sources section
      const { content: cleanedContent, sources: cleanedSources } = citationService.cleanupCitations(
        editedContent,
        sources
      );
      editedContent = citationService.appendSourcesSection(cleanedContent, cleanedSources, options?.language);
      logger.debug({ sourceCount: cleanedSources.length, language: options?.language }, 'Sources section appended');
    }

    logger.info({ editedWordCount: editedContent.split(/\s+/).length, originalWordCount: wordCount }, 'Article editing completed');

    return editedContent;
  }

  private combineSections(sections: GeneratedSection[], outline: Outline, options?: GenerationOptionsInput): string {
    const lines: string[] = [];
    const isHtml = options?.outputFormat === 'html';

    // Add title (use outline.title which comes from user input or LLM)
    lines.push(isHtml ? `<h1>${outline.title}</h1>` : `# ${outline.title}`);
    lines.push('');

    // Find the level for each section from the outline
    const sectionLevels = new Map<string, number>();
    const flattenOutline = (outlineSections: typeof outline.sections, parentLevel = 2) => {
      for (const s of outlineSections) {
        sectionLevels.set(s.id, s.level || parentLevel);
        if (s.subsections) {
          flattenOutline(s.subsections, (s.level || parentLevel) + 1);
        }
      }
    };
    flattenOutline(outline.sections);

    for (const section of sections) {
      const level = sectionLevels.get(section.id) || 2;
      if (isHtml) {
        lines.push(`<h${level}>${section.heading}</h${level}>`);
      } else {
        const headingPrefix = '#'.repeat(level);
        lines.push(`${headingPrefix} ${section.heading}`);
      }
      lines.push('');
      lines.push(section.content);
      lines.push('');
    }

    return lines.join('\n');
  }
}

export const articleEditor = new ArticleEditor();
