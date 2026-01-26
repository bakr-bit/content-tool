import { getDefaultProvider } from '../../integrations/llm';
import { LLMMessage } from '../../types';
import { createChildLogger } from '../../utils/logger';

const logger = createChildLogger('KeywordsService');

interface GenerateKeywordsInput {
  focusKeyword: string;
  title?: string;
  language: string;
  targetCountry: string;
}

interface GeneratedKeywords {
  keywords: string[];
}

export class KeywordsService {
  private llm = getDefaultProvider();

  async generateKeywords(input: GenerateKeywordsInput): Promise<string[]> {
    const { focusKeyword, title, language, targetCountry } = input;

    logger.info({ focusKeyword, language, targetCountry }, 'Generating keywords');

    const systemPrompt = `You are an SEO keyword research expert. Generate related keywords and long-tail variations for content optimization.

OUTPUT FORMAT: Respond with a JSON object containing a "keywords" array of strings.
Example: {"keywords": ["keyword 1", "keyword 2", "keyword 3"]}

RULES:
- Generate 8-12 relevant keywords
- Include a mix of:
  - Related terms and synonyms
  - Long-tail variations (3-5 words)
  - Question-based keywords (how to, what is, etc.)
  - Commercial intent keywords (best, top, review, etc.)
- Keywords should be in ${language}
- Target audience is in ${targetCountry.toUpperCase()}
- All keywords should be relevant to the main topic
- Do NOT include the focus keyword itself in the list`;

    const userPrompt = title
      ? `Generate SEO keywords for an article.

Focus Keyword: "${focusKeyword}"
Article Title: "${title}"
Language: ${language}
Target Country: ${targetCountry.toUpperCase()}

Generate related keywords that would help this article rank better.`
      : `Generate SEO keywords for an article.

Focus Keyword: "${focusKeyword}"
Language: ${language}
Target Country: ${targetCountry.toUpperCase()}

Generate related keywords and long-tail variations.`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const result = await this.llm.completeWithJson<GeneratedKeywords>(messages, {
        maxTokens: 500,
        temperature: 0.7,
      });

      logger.info({ keywordCount: result.keywords?.length || 0 }, 'Keywords generated');

      return result.keywords || [];
    } catch (error) {
      logger.error({ error }, 'Failed to generate keywords');
      throw error;
    }
  }
}

export const keywordsService = new KeywordsService();
