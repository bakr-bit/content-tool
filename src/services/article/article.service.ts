import { v4 as uuidv4 } from 'uuid';
import { outlineService } from '../outline';
import { researchService } from '../research';
import { sectionWriter } from './section-writer';
import { articleEditor } from './article-editor';
import { Article, GeneratedSection, ArticleMetadata, SectionResearchContext, VerifiedSource } from '../../types';
import { GenerationOptionsInput } from '../../types/generation-options';
import { NotFoundError } from '../../utils/errors';
import { createChildLogger } from '../../utils/logger';
import { ARTICLE_DEFAULTS } from '../../config/constants';
import { articleStorage, ArticleWithStatus, ListArticlesOptions, ListArticlesResult, ArticleStatus } from './article.storage';

interface ArticleSaveOptions {
  site?: string;
  projectId?: string;
}

const logger = createChildLogger('ArticleService');

// In-memory storage for quick access during generation
const articleStore = new Map<string, Article>();

interface ArticleGenerateOptions {
  outlineId: string;
  options?: GenerationOptionsInput;
  sectionResearch?: Map<string, SectionResearchContext>;
  allSources?: VerifiedSource[];
}

interface ArticleUpdateInput {
  title?: string;
  content?: string;
}

export class ArticleService {
  async generateArticle(input: ArticleGenerateOptions): Promise<Article> {
    const { outlineId, options, sectionResearch, allSources } = input;
    const startTime = Date.now();

    logger.info({ outlineId, hasDeepResearch: !!sectionResearch || !!allSources }, 'Starting article generation');

    // Fetch outline
    const outline = outlineService.getOutline(outlineId);
    if (!outline) {
      throw new NotFoundError('Outline');
    }

    // Fetch research for context
    const research = researchService.getResearch(outline.researchId);
    const researchContext = research
      ? this.buildResearchContext(research.scrapedContent)
      : '';

    // Step 1: Generate all sections (with optional deep research context)
    logger.info('Writing sections...');
    const sections = await sectionWriter.writeSections(
      outline.sections,
      outline,
      researchContext,
      options,
      sectionResearch,
      allSources
    );

    // Step 2: Editorial pass (with optional sources for citation)
    logger.info('Running editorial pass...');
    const editedContent = await articleEditor.editArticle(
      sections,
      outline,
      options,
      allSources
    );

    // Calculate metadata
    const wordCount = editedContent.split(/\s+/).filter(Boolean).length;
    const readingTimeMinutes = Math.ceil(wordCount / ARTICLE_DEFAULTS.READING_TIME_WPM);
    const generationTimeMs = Date.now() - startTime;

    const metadata: ArticleMetadata = {
      wordCount,
      readingTimeMinutes,
      generationStats: {
        sectionsGenerated: sections.length,
        totalLLMCalls: sections.length + 1, // sections + editor
        generationTimeMs,
      },
    };

    const article: Article = {
      articleId: uuidv4(),
      outlineId,
      keyword: outline.keyword,
      title: outline.title,
      content: editedContent,
      sections,
      metadata,
      site: options?.site,
      createdAt: new Date().toISOString(),
    };

    // Store the article in memory for quick access
    articleStore.set(article.articleId, article);

    // Persist to database with site and projectId
    articleStorage.saveArticle(article, 'draft', options?.site, options?.projectId);

    logger.info(
      {
        articleId: article.articleId,
        wordCount,
        generationTimeMs,
        hasSourcesSection: !!allSources && allSources.length > 0
      },
      'Article generation completed'
    );

    return article;
  }

  getArticle(articleId: string): Article | undefined {
    // Check memory first
    const inMemory = articleStore.get(articleId);
    if (inMemory) {
      return inMemory;
    }

    // Fall back to database
    const fromDb = articleStorage.getArticleById(articleId);
    if (fromDb) {
      // Cache in memory
      articleStore.set(articleId, fromDb);
      return fromDb;
    }

    return undefined;
  }

  getAllArticles(): Article[] {
    // Return from database for persistence
    const result = articleStorage.listArticles({ limit: 1000 });
    return result.articles;
  }

  listArticles(options: ListArticlesOptions): ListArticlesResult {
    return articleStorage.listArticles(options);
  }

  deleteArticle(articleId: string): boolean {
    // Remove from memory
    articleStore.delete(articleId);

    // Remove from database
    return articleStorage.deleteArticle(articleId);
  }

  updateArticleStatus(articleId: string, status: ArticleStatus): boolean {
    return articleStorage.updateArticleStatus(articleId, status);
  }

  updateArticle(articleId: string, updates: ArticleUpdateInput): ArticleWithStatus | null {
    logger.info({ articleId, hasTitle: !!updates.title, hasContent: !!updates.content }, 'Updating article');

    // Fetch existing article from database
    const existing = articleStorage.getArticleById(articleId);
    if (!existing) {
      return null;
    }

    // Apply updates
    const updatedArticle: Article = {
      ...existing,
      title: updates.title ?? existing.title,
      content: updates.content ?? existing.content,
    };

    // Recalculate metadata if content changed
    if (updates.content) {
      const wordCount = updates.content.split(/\s+/).filter(Boolean).length;
      const readingTimeMinutes = Math.ceil(wordCount / ARTICLE_DEFAULTS.READING_TIME_WPM);
      updatedArticle.metadata = {
        ...existing.metadata,
        wordCount,
        readingTimeMinutes,
      };
    }

    // Save to database (preserves existing status)
    const saved = articleStorage.saveArticle(updatedArticle, existing.status);

    // Update in-memory cache
    articleStore.set(articleId, saved);

    logger.info({ articleId, wordCount: saved.metadata.wordCount }, 'Article updated successfully');

    return saved;
  }

  private buildResearchContext(scrapedContent: { content: string; title?: string }[]): string {
    return scrapedContent
      .slice(0, 3)
      .map((page) => {
        const truncated = page.content.slice(0, 1500);
        return `[${page.title || 'Source'}]\n${truncated}`;
      })
      .join('\n\n---\n\n');
  }
}

export const articleService = new ArticleService();
