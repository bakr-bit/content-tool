import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ScrapedPage, ContentGap, GapAnalysisResult } from '../../types';
import { MODEL_CONFIG } from '../../config/deep-research';
import { createChildLogger } from '../../utils/logger';

const logger = createChildLogger('GapAnalyzer');

export class GapAnalyzer {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: MODEL_CONFIG.FAST_MODEL,
      temperature: MODEL_CONFIG.TEMPERATURE,
    });
  }

  /**
   * Analyze competitor content to find gaps and unique angles
   */
  async analyzeGaps(
    keyword: string,
    competitorContent: ScrapedPage[]
  ): Promise<GapAnalysisResult> {
    logger.info({ keyword, competitorCount: competitorContent.length }, 'Analyzing content gaps');

    if (competitorContent.length === 0) {
      return {
        gaps: [],
        uniqueAngles: [],
        competitorWeaknesses: []
      };
    }

    try {
      // Prepare competitor content summaries
      const contentSummaries = competitorContent
        .slice(0, 5) // Analyze top 5 competitors
        .map((page, i) => {
          const truncatedContent = page.content.slice(0, 2000);
          return `[Competitor ${i + 1}: ${page.title || page.url}]\n${truncatedContent}`;
        })
        .join('\n\n---\n\n');

      const messages = [
        new SystemMessage(`You are an expert SEO content strategist analyzing competitor content to find content gaps and opportunities.

Analyze the competitor content for the keyword "${keyword}" and identify:

1. CONTENT GAPS - Topics or questions that competitors DON'T cover well:
   - What information is missing or incomplete?
   - What questions might readers have that aren't answered?
   - What subtopics are overlooked?

2. UNIQUE ANGLES - Fresh perspectives or approaches that could differentiate content:
   - What unique take could make this content stand out?
   - What controversial or unexpected viewpoints could be explored?
   - What expert insights could be added?

3. COMPETITOR WEAKNESSES - What competitors do poorly:
   - Outdated information
   - Shallow coverage
   - Poor organization
   - Missing visuals or examples

Return your analysis as JSON:
{
  "gaps": [
    {
      "topic": "Topic name",
      "description": "Why this is a gap",
      "importance": "high" | "medium" | "low",
      "suggestedAngle": "How to address this gap"
    }
  ],
  "uniqueAngles": ["Angle 1", "Angle 2"],
  "competitorWeaknesses": ["Weakness 1", "Weakness 2"]
}

RESPONSE FORMAT: Your entire response must begin with { and end with }. No markdown, no explanation.`),
        new HumanMessage(`Keyword: "${keyword}"

Competitor Content:
${contentSummaries}`)
      ];

      const response = await this.llm.invoke(messages);
      let content = response.content.toString().trim();

      // Clean up any markdown formatting
      content = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*$/g, '')
        .trim();

      const result = JSON.parse(content);

      // Validate and normalize the result
      const gaps: ContentGap[] = (result.gaps || []).map((gap: Partial<ContentGap>) => ({
        topic: gap.topic || '',
        description: gap.description || '',
        importance: (['high', 'medium', 'low'].includes(gap.importance || '')
          ? gap.importance
          : 'medium') as 'high' | 'medium' | 'low',
        suggestedAngle: gap.suggestedAngle || ''
      }));

      logger.info(
        {
          gapCount: gaps.length,
          angleCount: result.uniqueAngles?.length || 0,
          weaknessCount: result.competitorWeaknesses?.length || 0
        },
        'Gap analysis complete'
      );

      return {
        gaps,
        uniqueAngles: result.uniqueAngles || [],
        competitorWeaknesses: result.competitorWeaknesses || []
      };
    } catch (error) {
      logger.error({ error }, 'Gap analysis failed');
      return {
        gaps: [],
        uniqueAngles: [],
        competitorWeaknesses: []
      };
    }
  }

  /**
   * Generate content recommendations based on gaps
   */
  async generateRecommendations(
    keyword: string,
    gaps: ContentGap[],
    uniqueAngles: string[]
  ): Promise<string[]> {
    if (gaps.length === 0 && uniqueAngles.length === 0) {
      return [];
    }

    try {
      const messages = [
        new SystemMessage(`Based on the identified content gaps and unique angles, provide 5-7 specific content recommendations for an article about "${keyword}".

Each recommendation should be actionable and specific.

RESPONSE FORMAT: Your entire response must begin with [ and end with ]. No markdown, no explanation.`),
        new HumanMessage(`Gaps:
${gaps.map(g => `- ${g.topic}: ${g.description}`).join('\n')}

Unique Angles:
${uniqueAngles.map(a => `- ${a}`).join('\n')}`)
      ];

      const response = await this.llm.invoke(messages);
      let content = response.content.toString().trim();

      content = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*$/g, '')
        .trim();

      return JSON.parse(content);
    } catch (error) {
      logger.warn({ error }, 'Failed to generate recommendations');
      return [];
    }
  }

  /**
   * Identify trending subtopics that should be covered
   */
  async identifyTrendingSubtopics(
    keyword: string,
    competitorContent: ScrapedPage[]
  ): Promise<string[]> {
    if (competitorContent.length === 0) {
      return [];
    }

    try {
      // Extract all headings from competitor content
      const allHeadings: string[] = [];
      for (const page of competitorContent.slice(0, 5)) {
        const headings = page.content.match(/^#+\s+.+$/gm) || [];
        allHeadings.push(...headings.map(h => h.replace(/^#+\s+/, '')));
      }

      if (allHeadings.length === 0) {
        return [];
      }

      const messages = [
        new SystemMessage(`Analyze these headings from competitor articles about "${keyword}" and identify the most important subtopics that appear frequently.

Return the top 5-8 subtopics that should definitely be covered in a comprehensive article.

RESPONSE FORMAT: Your entire response must begin with [ and end with ]. No markdown, no explanation.`),
        new HumanMessage(`Headings from competitors:
${allHeadings.slice(0, 50).join('\n')}`)
      ];

      const response = await this.llm.invoke(messages);
      let content = response.content.toString().trim();

      content = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*$/g, '')
        .trim();

      return JSON.parse(content);
    } catch (error) {
      logger.warn({ error }, 'Failed to identify trending subtopics');
      return [];
    }
  }
}

export const gapAnalyzer = new GapAnalyzer();
