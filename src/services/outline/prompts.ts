import { ResearchResult, PeopleAlsoAskItem, ScrapedPage, DeepResearchResult, GapAnalysisResult } from '../../types';
import {
  GenerationOptions,
  GenerationOptionsInput,
  ArticleSize,
  LANGUAGE_NAMES,
  ARTICLE_SIZE_CONFIG,
  INTRO_CONCLUSION_LENGTHS,
  Language,
} from '../../types/generation-options';
import { getAuthorById } from '../author';
import { mergeWithDefaults } from '../../config/defaults';
import { templateService } from '../template';

// Current year for outline examples and guidance
const CURRENT_YEAR = new Date().getFullYear();

function resolveOptions(options?: GenerationOptionsInput): GenerationOptions {
  // If author profile is specified, use it as base
  if (options?.authorProfileId) {
    const profile = getAuthorById(options.authorProfileId);
    if (profile) {
      return mergeWithDefaults({
        language: profile.language,
        targetCountry: profile.targetCountry,
        tone: profile.tone,
        pointOfView: profile.pointOfView,
        formality: profile.formality,
        customTonePrompt: profile.customTonePrompt,
        formatting: profile.formatting,
        headingCase: profile.headingCase,
        ...options, // Allow overrides
      });
    }
  }
  return mergeWithDefaults(options);
}

function getToneDescription(tone: string, customPrompt?: string): string {
  const toneDescriptions: Record<string, string> = {
    'seo-optimized': 'SEO-optimized with strategic keyword placement, scannable content, and clear answers to search intent',
    'professional': 'professional and authoritative with data-backed insights',
    'friendly': 'friendly and conversational, like talking to a knowledgeable friend',
    'formal': 'formal and academic with precise language',
    'casual': 'casual and relaxed with everyday language',
    'humorous': 'humorous and entertaining while still informative',
    'excited': 'excited and enthusiastic with energetic language',
    'authoritative': 'authoritative and expert-level with confident assertions',
    'empathetic': 'empathetic and understanding, connecting with reader emotions',
    'custom': customPrompt || 'natural and engaging',
  };
  return toneDescriptions[tone] || toneDescriptions['seo-optimized'];
}

function getPOVDescription(pov: string, site?: string): string {
  const povDescriptions: Record<string, string> = {
    'automatic': 'Use the most appropriate point of view for the content',
    'first-person-singular': `Write in first person singular (I, me, my). Use phrases like "When I do this, I typically..." or "In my experience..." Share personal insights as an individual expert.`,
    'first-person-plural': site
      ? `Write in first person plural as "${site}". Use phrases like "We at ${site} recommend..." or "Our team at ${site} has found..." Speak with brand authority.`
      : `Write in first person plural (we, us, our). Use phrases like "We typically recommend..." or "Our approach is..." Speak as a team or organization.`,
    'second-person': `Write in second person, directly addressing the reader. Use phrases like "When you do this, you'll want to..." or "You should consider..." Make the reader the focus.`,
    'third-person': `Write in third person (he, she, they, it). Maintain an objective, journalistic perspective. Use phrases like "Users typically..." or "Research shows..."`,
  };
  return povDescriptions[pov] || povDescriptions['automatic'];
}

function getHeadingCaseInstruction(headingCase: string, isEnglish: boolean): string {
  const instructions: Record<string, string> = {
    'title-case': 'Use Title Case for All Headings (Capitalize Major Words)',
    'sentence-case': 'Use sentence case for headings (only capitalize first word and proper nouns)',
    'all-caps': 'USE ALL CAPS FOR HEADINGS',
  };

  // For non-English, default to sentence case (this is the standard in most languages)
  if (!isEnglish && headingCase === 'title-case') {
    return instructions['sentence-case'] + ' - NOTE: Title case is NOT standard for this language';
  }

  return instructions[headingCase] || (isEnglish ? instructions['title-case'] : instructions['sentence-case']);
}

function buildArticleSizeInstructions(articleSize: ArticleSize): string {
  const preset = articleSize.preset || 'medium';
  const config = ARTICLE_SIZE_CONFIG[preset];

  // Determine heading count
  let headingInstruction: string;
  if (articleSize.headingCount) {
    headingInstruction = `Exactly ${articleSize.headingCount} main sections (H2 headings)`;
  } else {
    const minH = articleSize.minHeadings ?? config.minHeadings;
    const maxH = articleSize.maxHeadings ?? config.maxHeadings;
    headingInstruction = minH === maxH
      ? `Exactly ${minH} main sections (H2 headings)`
      : `${minH}-${maxH} main sections (H2 headings)`;
  }

  // Determine subsections
  const subsections = articleSize.subsectionsPerSection ?? config.subsectionsPerSection;
  const subsectionInstruction = subsections === 0
    ? 'No subsections (H3) - keep structure flat'
    : `${subsections} subsection(s) (H3) per main section where appropriate`;

  // Determine word counts
  const targetWords = articleSize.targetWordCount ?? config.targetWords;
  const wordsPerSection = articleSize.wordsPerSection ?? config.wordsPerSection;
  const minWords = articleSize.minWordsPerSection ?? Math.round(wordsPerSection * 0.7);
  const maxWords = articleSize.maxWordsPerSection ?? Math.round(wordsPerSection * 1.3);

  // Introduction/conclusion lengths
  const introLength = INTRO_CONCLUSION_LENGTHS[articleSize.introductionLength || 'standard'];
  const conclusionLength = INTRO_CONCLUSION_LENGTHS[articleSize.conclusionLength || 'standard'];

  return `ARTICLE LENGTH REQUIREMENTS:
- ${headingInstruction}
- ${subsectionInstruction}
- Total target word count: ~${targetWords} words
- Each main section: ${minWords}-${maxWords} words (target: ${wordsPerSection})
- Introduction: ~${introLength} words
- Conclusion: ~${conclusionLength} words`;
}

export function buildOutlineSystemPrompt(options?: GenerationOptionsInput): string {
  const resolved = resolveOptions(options);
  const language = LANGUAGE_NAMES[resolved.language] || 'English (US)';
  const isEnglish = resolved.language.startsWith('en');

  // Check if a template is specified
  const template = options?.templateId ? templateService.getTemplate(options.templateId) : undefined;

  // Use template article size if template is specified, otherwise use provided/default
  const effectiveArticleSize = template ? template.articleSize : resolved.articleSize;
  const articleSizeInstructions = buildArticleSizeInstructions(effectiveArticleSize);

  // Calculate toplist entry count for template guidance
  const includedToplists = options?.toplists?.filter(t => t.includeInArticle) || [];
  const primaryToplistEntryCount = includedToplists.length > 0
    ? includedToplists.reduce((max, t) => Math.max(max, t.entries.length), 0)
    : undefined;

  // Get author's site for POV description when using first-person-plural
  let authorSite: string | undefined;
  if (options?.authorProfileId) {
    const profile = getAuthorById(options.authorProfileId);
    authorSite = profile?.site;
  }

  // Build template guidance section if template is specified
  const templateGuidance = template
    ? templateService.buildTemplatePromptSection(template, resolved.language, {
        toplistEntryCount: primaryToplistEntryCount,
        hasToplist: includedToplists.length > 0,
      })
    : '';

  return `You are an expert SEO content strategist who writes like a native ${language} speaker. Create article outlines that sound natural and local.

OUTLINE GENERATION PROCESS (follow these steps mentally before writing):
1. INTENT ANALYSIS: What problem does the searcher want solved? What triggered this search?
2. STRUCTURE DECISION: What format best serves this intent? (listicle for comparisons, how-to for processes, guide for education, comparison for decisions)
3. SECTION PLANNING: What unique question does each section answer? No two sections should answer the same question.
4. COMPONENT MATCHING: What format best presents each section's content? (table for data, steps for processes, prose for explanation)

OUTPUT FORMAT REQUIREMENT:
Your response must be valid JSON only. Begin with { and end with }. No markdown code blocks, no explanatory text.

LANGUAGE: Write the outline in ${language}. All headings and descriptions must sound like they were written by someone FROM this market.

${articleSizeInstructions}

TONE: ${getToneDescription(resolved.tone, resolved.customTonePrompt)}

POINT OF VIEW: ${getPOVDescription(resolved.pointOfView, authorSite)}

FORMALITY: ${resolved.formality === 'formal' ? 'Use formal language and complete sentences' : resolved.formality === 'informal' ? 'Use informal, conversational language' : 'Match formality to the topic'}

HEADING STYLE: ${getHeadingCaseInstruction(resolved.headingCase, isEnglish)}
${!isEnglish ? `IMPORTANT: For ${language}, do NOT use English-style Title Case. Use sentence case (capitalize only the first word and proper nouns).` : ''}
${templateGuidance ? templateGuidance : `
MANDATORY ARTICLE STRUCTURE - Follow this exact order:

1. INTRODUCTION (Required, always FIRST)
   - id: "introduction"
   - Create an engaging heading that hooks the reader (NOT literally "Introduction")
   - Must preview the article's value and what the reader will learn
   - This MUST be the first section in your output
${resolved.structure.keyTakeaways ? `
2. KEY TAKEAWAYS (second position)
   - id: "key-takeaways"
   - 3-5 bullet points summarizing the main points
   - Place immediately after the introduction` : ''}

3. MAIN BODY SECTIONS
   - Generate sections that are MUTUALLY EXCLUSIVE (no overlapping topics)
   - Each section must answer a DIFFERENT question about the topic:
     * What is it? (definition/explanation)
     * How does it work? (process/mechanism)
     * Why does it matter? (benefits/importance)
     * How do you do it? (steps/guide)
     * What are the options? (comparison/alternatives)
     * What should you avoid? (mistakes/pitfalls)
   - Do NOT create multiple sections that essentially answer the same question from different angles
   - Ensure clear, distinct boundaries between sections
${resolved.structure.faqs ? `
4. FAQ (second to last position)
   - id: "faq"
   - 4-6 common questions with brief answers
   - Place near the end, before the conclusion` : ''}

5. CONCLUSION (Required, always LAST)
   - id: "conclusion"
   - Create a meaningful heading (NOT literally "Conclusion")
   - Summarize key points and provide next steps or call to action
   - This MUST be the final section in your output

${resolved.structure.tableOfContents ? '- Structure the outline to support a table of contents' : ''}
`}

CONTENT STRUCTURE GUIDELINES:
- Create outlines that are logical, comprehensive, and SEO-optimized
- Include an introduction section

HEADING HIERARCHY (MANDATORY):
- All main sections MUST have level: 2 (renders as H2/##)
- All subsections MUST have level: 3 (renders as H3/###)
- NEVER use level: 1 (that's reserved for the article title)
- NEVER skip levels (e.g., no H2 directly to H4)
- Hierarchy must be: H1 (title) → H2 (main sections) → H3 (subsections) → H4 (sub-subsections if needed)

NO REDUNDANCY RULES - CRITICAL:
- EVERY section and subsection MUST cover a UNIQUE topic - ZERO OVERLAP allowed
- NEVER create two sections/subsections that cover the same concept

REDUNDANT PATTERNS TO AVOID (these are the SAME topic - pick ONE):
✗ "Popular licenses" + "Licenses explained" + "Understanding licenses"
✗ "Registration process" + "How to register" + "Creating an account"
✗ "Payment methods" + "How to deposit" + "Banking options"
✗ "Bonus types" + "Understanding bonuses" + "Available bonuses"
✗ "Safety tips" + "Staying safe" + "Security measures"

HOW TO STRUCTURE SUBSECTIONS CORRECTLY:
BAD (same topic repeated):
  - "Popular licenses to look for"
  - "Licenses you can trust" ← SAME AS ABOVE!

GOOD (distinct aspects of topic):
  - "EU/EES licenses (tax-free)"
  - "Non-EU licenses (may require declaration)"

BAD (same topic repeated):
  - "Registration on international casinos"
  - "The registration process" ← SAME AS ABOVE!

GOOD (distinct steps):
  - "Creating your account"
  - "KYC verification requirements"

VALIDATION CHECK - Before finalizing, verify:
1. Can any two sections be merged? If yes → merge them
2. Do any two headings answer the same user question? If yes → keep only one
3. Would writing both sections require saying the same facts? If yes → combine them
- Each section's description should clearly state what UNIQUE content it will contain

- Each section should have a clear purpose and description
- Set suggestedWordCount for each section based on the length requirements above
- Include relevant keywords naturally throughout the outline
- Consider user intent and what information readers are seeking
- Plan for varied content types: some sections should note "include comparison table" or "include step-by-step list" in their description
- Avoid planning sections that would result in walls of text

COMPONENT TYPES - Assign the most appropriate component type to each section:
Available types:
- "prose" - Default paragraph content (introduction, conclusion, general explanations)
- "toplist" - Main ranking table with columns: #, Name, License, Welcome Offer, Wagering, Withdrawal Time, Payment Methods, Highlights, Best For, Score
- "mini_review" - Individual item review with structured fields: License, Welcome Offer, Payments, Games, Best For + explanatory paragraphs
- "category_ranking" - Smaller focused table (3-5 items) for specific categories like "Fastest Withdrawals" or "Best for Crypto"
- "payment_table" - Payment methods comparison table with deposit/withdrawal times, limits, fees
- "comparison" - Two-column A vs B comparison (e.g., "Offshore vs Regulated")
- "faq" - Q&A format for common questions and objection-killers
- "methodology" - Evaluation criteria explanation with weighted percentages + disclosure
- "legal_rg" - Legal status, player protections, risks, help resources (responsible gambling)
- "safety_checklist" - Green flags vs red flags comparison table
- "player_profiles" - Profile-based recommendations table (bonus hunters, high rollers, etc.)
- "decision_flow" - Step-by-step numbered guide (how-to, getting started)
- "glossary" - Terms with definitions
- "sources" - Authoritative references and citations

COMPONENT ASSIGNMENT GUIDE:
- Introduction/Conclusion sections → "prose"
- "Top 10 casinos" / main ranking sections → "toplist"
- Individual casino/product reviews → "mini_review"
- "Best for [specific category]" sections → "category_ranking"
- Payment/banking sections → "payment_table"
- "X vs Y" comparison sections → "comparison"
- FAQ sections → "faq"
- "How we rank" / methodology sections → "methodology"
- Legal/compliance sections → "legal_rg"
- Safety/trust sections → "safety_checklist"
- "Find the right X for you" sections → "player_profiles"
- Step-by-step guides → "decision_flow"
- Glossary/terminology sections → "glossary"
- References/sources sections → "sources"

CRITICAL OUTPUT FORMAT:
- Your entire response must be valid JSON
- First character must be {
- Last character must be }
- Do NOT wrap in \`\`\`json\`\`\` code blocks
- Do NOT include any text before or after the JSON
- Do NOT start with "Here is...", "Sure!", or any introductory text

FEW-SHOT EXAMPLES:

EXAMPLE 1 - Listicle Format (keyword: "best online casinos"):
{
  "title": "10 Best Online Casinos for Real Money in ${CURRENT_YEAR}",
  "sections": [
    {"id": "introduction", "heading": "Finding a Trustworthy Online Casino", "level": 2, "description": "Hook with the challenge of finding reliable casinos. Preview what makes our top picks stand out.", "suggestedWordCount": 150, "componentType": "prose"},
    {"id": "top-picks", "heading": "Our Top 10 Picks at a Glance", "level": 2, "description": "Quick comparison table with all 10 casinos showing key metrics.", "suggestedWordCount": 400, "componentType": "toplist"},
    {"id": "review-1", "heading": "1. Casino Alpha – Best Overall", "level": 2, "description": "Detailed review covering license, bonus, games, payments. Why it ranks #1.", "suggestedWordCount": 300, "componentType": "mini_review"},
    {"id": "review-2", "heading": "2. BetMax – Best for Bonuses", "level": 2, "description": "Focus on bonus structure and wagering terms.", "suggestedWordCount": 300, "componentType": "mini_review"},
    {"id": "how-we-rank", "heading": "How We Evaluate Online Casinos", "level": 2, "description": "Methodology with weighted criteria. EEAT signals.", "suggestedWordCount": 250, "componentType": "methodology"},
    {"id": "faq", "heading": "Common Questions About Online Casinos", "level": 2, "description": "5-6 FAQs addressing safety, legality, withdrawals.", "suggestedWordCount": 300, "componentType": "faq"},
    {"id": "conclusion", "heading": "Making Your Choice", "level": 2, "description": "Brief summary with clear next steps.", "suggestedWordCount": 100, "componentType": "prose"}
  ],
  "metadata": {"estimatedWordCount": 2500, "suggestedKeywords": ["online casinos", "real money casinos", "best casino sites"], "targetAudience": "Players looking for safe, reputable online gambling sites", "tone": "authoritative"}
}

EXAMPLE 2 - How-To Format (keyword: "how to verify casino account"):
{
  "title": "How to Verify Your Casino Account: Step-by-Step Guide",
  "sections": [
    {"id": "introduction", "heading": "Why Casinos Require Account Verification", "level": 2, "description": "Explain KYC requirements and why verification matters for withdrawals.", "suggestedWordCount": 150, "componentType": "prose"},
    {"id": "step-1", "heading": "Step 1: Gather Your Documents", "level": 2, "description": "List required documents: ID, proof of address, payment method proof.", "suggestedWordCount": 200, "componentType": "decision_flow"},
    {"id": "step-2", "heading": "Step 2: Upload Documents to the Casino", "level": 2, "description": "Where to find upload section, file format requirements, common mistakes.", "suggestedWordCount": 200, "componentType": "decision_flow"},
    {"id": "step-3", "heading": "Step 3: Wait for Approval", "level": 2, "description": "Typical timeframes, what to do if rejected, how to contact support.", "suggestedWordCount": 200, "componentType": "decision_flow"},
    {"id": "common-issues", "heading": "Troubleshooting Verification Problems", "level": 2, "description": "Blurry photos, mismatched names, expired documents.", "suggestedWordCount": 200, "componentType": "prose"},
    {"id": "faq", "heading": "Verification FAQ", "level": 2, "description": "How long does it take? Can I withdraw without verification?", "suggestedWordCount": 200, "componentType": "faq"},
    {"id": "conclusion", "heading": "Ready to Play", "level": 2, "description": "Confirmation of what to expect after verification.", "suggestedWordCount": 100, "componentType": "prose"}
  ],
  "metadata": {"estimatedWordCount": 1500, "suggestedKeywords": ["casino verification", "KYC casino", "verify gambling account"], "targetAudience": "New casino players who need to complete account verification", "tone": "helpful"}
}

Output format - raw JSON:
{
  "title": "Suggested article title",
  "sections": [
    {
      "id": "section-1",
      "heading": "Section heading",
      "level": 2,
      "description": "Brief description of what this section should cover",
      "suggestedWordCount": 350,
      "componentType": "prose",
      "toplistId": "optional - only include if this section should render a provided toplist",
      "subsections": [
        {
          "id": "section-1-1",
          "heading": "Subsection heading",
          "level": 3,
          "description": "Brief description",
          "suggestedWordCount": 150,
          "componentType": "prose"
        }
      ]
    }
  ],
  "metadata": {
    "estimatedWordCount": 2000,
    "suggestedKeywords": ["keyword1", "keyword2"],
    "targetAudience": "Description of target audience",
    "tone": "recommended tone"
  }
}`;
}

/**
 * Build deep research context for outline generation
 */
function buildDeepResearchContext(
  deepResearch?: DeepResearchResult,
  gapAnalysis?: GapAnalysisResult
): string {
  if (!deepResearch && !gapAnalysis) {
    return '';
  }

  let context = '\n## Deep Research Insights:\n';

  // Add verified facts
  if (deepResearch && deepResearch.facts.length > 0) {
    context += '\n### Verified Facts (include these in relevant sections):\n';
    for (const fact of deepResearch.facts.slice(0, 10)) {
      context += `- ${fact.fact} [Sources: ${fact.sourceIds.join(', ')}]\n`;
    }
  }

  // Add gap analysis
  if (gapAnalysis && gapAnalysis.gaps.length > 0) {
    context += '\n### Content Gaps to Address (topics competitors miss):\n';
    for (const gap of gapAnalysis.gaps.filter(g => g.importance === 'high').slice(0, 5)) {
      context += `- **${gap.topic}**: ${gap.description}\n  Suggested approach: ${gap.suggestedAngle}\n`;
    }
  }

  // Add unique angles
  if (gapAnalysis && gapAnalysis.uniqueAngles.length > 0) {
    context += '\n### Unique Angles to Explore:\n';
    for (const angle of gapAnalysis.uniqueAngles.slice(0, 5)) {
      context += `- ${angle}\n`;
    }
  }

  // Add competitor weaknesses
  if (gapAnalysis && gapAnalysis.competitorWeaknesses.length > 0) {
    context += '\n### Competitor Weaknesses to Capitalize On:\n';
    for (const weakness of gapAnalysis.competitorWeaknesses.slice(0, 3)) {
      context += `- ${weakness}\n`;
    }
  }

  return context;
}

export function buildOutlineUserPrompt(
  research: ResearchResult,
  options?: GenerationOptionsInput,
  deepResearch?: DeepResearchResult,
  gapAnalysis?: GapAnalysisResult
): string {
  const resolved = resolveOptions(options);
  const userTitle = options?.title?.trim();
  const includeKeywords = options?.includeKeywords || [];

  const topContent = research.scrapedContent
    .slice(0, 5)
    .map((page, i) => {
      const truncatedContent = page.content.slice(0, 2000);
      return `[Source ${i + 1}: ${page.title || page.url}]\n${truncatedContent}`;
    })
    .join('\n\n---\n\n');

  const serpTitles = research.serpResults
    .map((r, i) => `${i + 1}. ${r.title}`)
    .join('\n');

  const paaQuestions = research.peopleAlsoAsk
    ? research.peopleAlsoAsk.map((q) => `- ${q.question}`).join('\n')
    : 'None available';

  // Build deep research context if available
  const deepResearchContext = buildDeepResearchContext(deepResearch, gapAnalysis);

  let prompt = `Create a comprehensive article outline for the keyword: "${research.keyword}"

Target GEO: ${research.geo.toUpperCase()}
Target Language: ${LANGUAGE_NAMES[resolved.language] || 'English (US)'}`;

  // Add title-driven instructions if user provided a title
  if (userTitle) {
    prompt += `

## USER-PROVIDED TITLE (MANDATORY CONSTRAINT):
"${userTitle}"

CRITICAL: The user's title is the ABSOLUTE FOUNDATION for your outline structure. Follow these rules strictly:

1. **Title Format Detection**: Analyze the title to determine its implied format and structure the ENTIRE outline accordingly:
   - Listicle format (e.g., "10 Best...", "7 Ways to...", "5 Reasons...") → Create exactly that number of main list items as H2 sections
   - How-to/Guide format (e.g., "How to...", "Guide to...", "steg för steg", "step by step") → Create sequential step-by-step H2 sections (Step 1, Step 2, etc. or descriptive steps)
   - Comparison format (e.g., "X vs Y", "Comparing...") → Structure H2 sections around the comparison elements
   - Question format (e.g., "What is...", "Why does...") → Structure H2 sections to directly answer the question
   - Review format (e.g., "Review of...", "Is X worth it?") → Use review-style H2 sections (features, pros/cons, verdict)

2. **Title Alignment - THIS IS PARAMOUNT**:
   - The outline MUST directly fulfill what the title promises
   - If the title is a "how-to" or "step by step" guide, the main H2 sections MUST be the actual steps
   - If the title says "10 Coffee Machines", you MUST have 10 distinct coffee machine H2 sections
   - If the title says "Complete Guide", the outline must be comprehensive with clear progression
   - The title's promise = the outline's structure. No exceptions.

PRIORITY HIERARCHY:
1. The User-Provided Title is the ABSOLUTE FOUNDATION - your outline structure MUST match what the title promises
2. Competitor research is SUPPLEMENTARY ONLY - use it to fill content gaps within the title-driven structure, never to override it`;
  }

  prompt += `

## COMPETITOR RESEARCH (${userTitle ? 'SUPPLEMENTARY REFERENCE' : 'PRIMARY REFERENCE'}):

### Top Ranking Content:
${topContent}

### Current SERP Titles:
${serpTitles}

### People Also Ask Questions:
${paaQuestions}
${deepResearchContext}`;

  // Add include keywords if provided
  if (includeKeywords.length > 0) {
    prompt += `

## KEYWORDS TO INCLUDE:
The following keywords should be naturally incorporated into relevant sections:
${includeKeywords.map(kw => `- ${kw}`).join('\n')}`;
  }

  // Add toplist information if provided
  const toplists = options?.toplists?.filter(t => t.includeInArticle);
  if (toplists && toplists.length > 0) {
    prompt += `

## TOPLISTS TO INCLUDE (MANDATORY):
The user has provided ${toplists.length} toplist(s) that MUST be included in the article. Create a section for EACH toplist with the exact toplistId.

Available toplists:
${toplists.map(t => `- toplistId: "${t.toplistId}" | Name: "${t.name}" | Entries: ${t.entries.length} brands (${t.entries.map(e => e.brand?.name || 'Brand #' + e.rank).join(', ')})`).join('\n')}

CRITICAL RULES for toplist sections:
1. Create a dedicated section for EACH toplist above
2. Set the section's "toplistId" field to the exact toplistId shown above
3. Set "componentType" to "toplist" for these sections
4. The toplist will be rendered as a comparison table - the section description should explain what the table shows
5. Do NOT describe the brands in the section description - the table data comes from the toplist
6. Place toplist sections prominently (after introduction, before individual reviews)
7. Use "Top ${toplists[0]?.entries.length || 'X'}" not "Top 10" in the heading - match the actual number of brands
8. ONLY write individual reviews for brands that are in the toplist - do NOT invent additional brands
9. The number of individual review sections MUST match the number of toplist entries (${toplists[0]?.entries.length || 'varies'})

Example section with toplist (${toplists[0]?.entries.length || 2} brands):
{"id": "top-picks", "heading": "Top ${toplists[0]?.entries.length || 2} Casino's Zonder Cruks (${CURRENT_YEAR})", "level": 2, "description": "Our comparison of the best options based on extensive testing.", "suggestedWordCount": 100, "componentType": "toplist", "toplistId": "${toplists[0]?.toplistId || 'example-id'}"}`;
  }

  if (resolved.customTonePrompt) {
    prompt += `\n## Custom Style Instructions:\n${resolved.customTonePrompt}\n`;
  }

  prompt += `

## FINAL INSTRUCTIONS:
${userTitle
  ? `1. Your outline structure MUST follow the format implied by the user's title "${userTitle}" - this is non-negotiable
2. For "how-to" or "step by step" titles: Create clear, sequential step H2 sections that guide the reader through the process
3. Use competitor research ONLY for content ideas within your title-driven structure - competitors do NOT dictate your structure
4. If the title specifies a number (e.g., "10 Best..."), you MUST have exactly that many main H2 sections
5. The generated title in your JSON output MUST be exactly: "${userTitle}"
6. The title defines the structure; competitor research only informs the content within that structure`
  : 'Analyze the competitor content and create a detailed article outline that would rank well for this keyword.'}
${deepResearchContext ? '\nAddress the content gaps identified above and incorporate verified facts where relevant.\n' : ''}
IMPORTANT: Output raw JSON only. No preamble, no explanation, no code blocks. Start directly with { and end with }`;

  return prompt;
}

export function buildSectionRegeneratePrompt(
  sectionHeading: string,
  sectionDescription: string,
  feedback: string
): string {
  return `Regenerate the following section based on the feedback provided:

Section Heading: ${sectionHeading}
Current Description: ${sectionDescription}

Feedback: ${feedback}

Provide an updated section with:
{
  "heading": "Updated heading if needed",
  "description": "Updated description",
  "suggestedWordCount": number
}`;
}
