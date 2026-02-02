import { Outline, OutlineSection, GeneratedSection, SectionResearchContext, ComponentType } from '../../types';
import {
  GenerationOptions,
  GenerationOptionsInput,
  LANGUAGE_NAMES,
  FormattingToggles,
  CallToAction,
} from '../../types/generation-options';
import { getAuthorById } from '../author';
import { mergeWithDefaults } from '../../config/defaults';
import { getComponentPrompt } from '../../config/component-prompts';
import { templateService } from '../template';

function resolveOptions(options?: GenerationOptionsInput): GenerationOptions {
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
        ...options,
      });
    }
  }
  return mergeWithDefaults(options);
}

function getToneInstruction(tone: string, customPrompt?: string): string {
  const toneInstructions: Record<string, string> = {
    'seo-optimized': 'Write SEO-optimized content with strategic keyword placement. Create highly scannable content.',
    'professional': 'Write with authority and expertise. Use data and examples to support claims.',
    'friendly': 'Write naturally as if explaining to someone you know. Use relatable examples and conversational flow.',
    'formal': 'Write in a formal, academic style with precise language. Avoid casual expressions.',
    'casual': 'Write in a relaxed, everyday tone. Use simple language and short sentences.',
    'humorous': 'Include subtle humor and wit while remaining informative. Keep it natural and entertaining.',
    'excited': 'Write with enthusiasm and energy. Show genuine interest in the topic.',
    'authoritative': 'Write with confidence and authority. Make definitive statements backed by expertise.',
    'empathetic': 'Connect with the reader\'s challenges. Show understanding and provide supportive guidance.',
    'custom': customPrompt || 'Write naturally and engagingly.',
  };
  return toneInstructions[tone] || toneInstructions['seo-optimized'];
}

// Anti-AI writing guidelines - common patterns to avoid
function getAntiAIWritingRules(language: string, isEnglish: boolean): string {
  const bannedWordsEnglish = 'delve, seamless, vibrant, crucial, landscape (abstract), navigate (metaphorical), leverage, utilize, robust, comprehensive, streamline, cutting-edge, game-changer, synergy, empower, paradigm';

  const bannedWordsByLanguage: Record<string, string> = {
    'Swedish': 'fördjupa sig i, sömlös, livlig, avgörande, landskap (abstrakt), navigera (metaforiskt), utnyttja, robust, omfattande, banbrytande, spelförändrare',
    'German': 'eintauchen, nahtlos, lebendig, entscheidend, Landschaft (abstrakt), navigieren (metaphorisch), nutzen, robust, umfassend, bahnbrechend',
    'Spanish': 'profundizar, sin fisuras, vibrante, crucial, paisaje (abstracto), navegar (metafórico), aprovechar, robusto, integral, revolucionario',
    'French': 'plonger dans, sans couture, vibrant, crucial, paysage (abstrait), naviguer (métaphorique), exploiter, robuste, complet, révolutionnaire',
    'Dutch': 'verdiepen, naadloos, levendig, cruciaal, landschap (abstract), navigeren (metaforisch), benutten, robuust, uitgebreid, baanbrekend',
    'Norwegian': 'fordype seg, sømløs, livlig, avgjørende, landskap (abstrakt), navigere (metaforisk), utnytte, robust, omfattende, banebrytende',
    'Danish': 'fordybe sig, sømløs, livlig, afgørende, landskab (abstrakt), navigere (metaforisk), udnytte, robust, omfattende, banebrydende',
    'Finnish': 'syventyä, saumaton, eloisa, ratkaiseva, maisema (abstrakti), navigoida (metaforisesti), hyödyntää, vankka, kattava, uraauurtava',
  };

  const bannedWords = bannedWordsByLanguage[language] || bannedWordsEnglish;

  return `
ANTI-AI WRITING PATTERNS - CRITICAL:
These patterns make text obviously AI-generated. Avoid them:

BANNED WORDS/PHRASES (in ${language}):
${bannedWords}

PATTERNS TO ELIMINATE:
- Excessive hedging: Remove "it is important to note that," "one might consider," "it's worth mentioning"
- Unnatural synonym cycling: It's OK to repeat words. Don't force synonyms just to avoid repetition
- Abstract nouns: Use concrete words. "The implementation" → "We implemented"
- Filler adjectives: Remove adjectives that add no objective meaning ("truly remarkable," "incredibly useful")
- Over-perfect parallelism: Lists don't need identical grammatical structure every time
- Balanced constructions: Avoid "on one hand... on the other hand" patterns
- Rehearsed transitions: "Moving on," "Furthermore," "Additionally" at every section start
- Restating conclusions: The conclusion should NOT repeat the introduction verbatim

LOCALIZATION - SOUND LOCAL:
- Use region-specific terms for: self-exclusion programs, payment methods, regulatory bodies, legal concepts
- Remove idioms that were translated literally from English
- Follow local spelling and punctuation conventions
- The text must sound like it was written by someone FROM the target market, not translated

${!isEnglish ? `HEADING CAPITALIZATION:
For ${language}, use sentence case for headings (only capitalize first word and proper nouns).
Do NOT use English-style Title Case Where Every Word Is Capitalized.` : ''}

STRUCTURAL PATTERNS TO ELIMINATE:
- Summary wrap-ups: NEVER end a section with a concluding sentence like "By following these steps..." or "This ensures a seamless experience..."
  * END sections on a factual point, not a summary
- "Not only... but also": This is the #1 AI transition pattern. Ban it completely.
- Front-load information: Place the most important fact/answer in the FIRST sentence of every paragraph
- Avoid "In order to": Just use "To" instead
- Ban "It's worth noting that": Delete this phrase entirely

BEFORE/AFTER EXAMPLES - Study these patterns:

TRIPLET STRUCTURE (AI pattern to eliminate):
✗ BAD: "This casino offers fast withdrawals, extensive game selection, and responsive customer support."
✓ GOOD: "Withdrawals process in under 24 hours. The game library runs deep—over 3,000 slots from 40 providers."

HEDGING LANGUAGE (AI pattern to eliminate):
✗ BAD: "It is important to note that one might consider the wagering requirements before claiming any bonus."
✓ GOOD: "Check wagering requirements before claiming. A 35x requirement means a $100 bonus needs $3,500 in bets to unlock."

SUMMARY ENDINGS (AI pattern to eliminate):
✗ BAD: "By following these steps, you can ensure a seamless registration experience and start enjoying your favorite games."
✓ GOOD: "Verification typically takes 24-48 hours. You'll receive an email once your account is active."

VAGUE GENERALIZATIONS (AI pattern to eliminate):
✗ BAD: "The platform offers a wide variety of payment methods to suit different player preferences."
✓ GOOD: "Deposits work via Visa, Mastercard, Skrill, Neteller, and Bitcoin. E-wallet withdrawals hit your account same-day."

SENTENCE-LEVEL:
- Remove adjectives that don't change the sentence's objective meaning
- Read sentences aloud mentally - if you'd stumble reading it, rewrite it
- Follow natural sentence patterns for ${language}, not English grammar
- If ${language} uses passive voice naturally, keep it. Don't force active voice
- Use the word order natural to ${language}`;
}

function getPOVInstruction(pov: string, site?: string): string {
  const povInstructions: Record<string, string> = {
    'automatic': 'Use the most natural point of view for this content.',
    'first-person-singular': `Write in first person singular (I, me, my). Use phrases like "When I do this, I typically..." or "In my experience..." Share personal insights as an individual expert.`,
    'first-person-plural': site
      ? `Write in first person plural as "${site}". Use phrases like "We at ${site} recommend..." or "Our team at ${site} has found..." Speak with brand authority.`
      : `Write in first person plural (we, us, our). Use phrases like "We typically recommend..." or "Our approach is..." Speak as a team or organization.`,
    'second-person': `Write in second person, directly addressing the reader. Use phrases like "When you do this, you'll want to..." or "You should consider..." Make the reader the focus.`,
    'third-person': `Write in third person (he, she, they, it). Maintain an objective, journalistic perspective. Use phrases like "Users typically..." or "Research shows..."`,
  };
  return povInstructions[pov] || povInstructions['automatic'];
}

function getFormattingInstructions(formatting: FormattingToggles): string {
  const instructions: string[] = [];

  if (formatting.bold) {
    instructions.push('Use **bold** to emphasize key terms, statistics, and important takeaways');
  } else {
    instructions.push('Do NOT use bold formatting');
  }

  if (formatting.italics) {
    instructions.push('Use *italics* sparingly for emphasis, foreign words, and titles');
  } else {
    instructions.push('Do NOT use italic formatting');
  }

  if (formatting.lists) {
    instructions.push('ACTIVELY use bullet points and numbered lists to break up text - aim for at least one list per major section. Lists make content scannable and engaging');
  } else {
    instructions.push('Do NOT use bullet points or lists - write in paragraph form only');
  }

  if (formatting.tables) {
    instructions.push('ACTIVELY include markdown tables to compare options, features, pros/cons, or any data that benefits from side-by-side comparison. Tables are highly engaging - use them generously');
  } else {
    instructions.push('Do NOT include tables');
  }

  if (formatting.quotes) {
    instructions.push('Include relevant quotes or callout boxes using > blockquotes for key insights');
  } else {
    instructions.push('Do NOT include blockquotes');
  }

  return instructions.join('\n- ');
}

export function buildSectionWriterSystemPrompt(
  options?: GenerationOptionsInput,
  includeCitations: boolean = false
): string {
  const resolved = resolveOptions(options);
  const language = LANGUAGE_NAMES[resolved.language] || 'English (US)';
  const isEnglish = resolved.language.startsWith('en');

  // Get author's site for POV instruction when using first-person-plural
  let authorSite: string | undefined;
  if (options?.authorProfileId) {
    const profile = getAuthorById(options.authorProfileId);
    authorSite = profile?.site;
  }

  // Get template-specific additional system prompt if available
  const templateAdditionalPrompt = options?.templateId
    ? templateService.getAdditionalSystemPrompt(options.templateId)
    : undefined;

  let citationInstructions = '';
  if (includeCitations) {
    citationInstructions = `
CITATION REQUIREMENTS:
- When citing facts, statistics, or claims from the provided sources, include citations using [1], [2], etc.
- Every statistic or data point MUST have a citation
- Quotes must be attributed with citations
- Use the source numbers provided in the research context
- Aim for 2-4 citations per section where appropriate
- Don't over-cite: common knowledge and general statements don't need citations
`;
  }

  // Build template-specific instructions if available
  const templateInstructions = templateAdditionalPrompt
    ? `\n${templateAdditionalPrompt}\n`
    : '';

  return `You are an expert content writer who writes like a native ${language} speaker. Write individual article sections based on the provided outline.
${templateInstructions}

LANGUAGE: Write in ${language}. The text must sound like it was written by someone FROM this market.

TONE: ${getToneInstruction(resolved.tone, resolved.customTonePrompt)}

POINT OF VIEW: ${getPOVInstruction(resolved.pointOfView, authorSite)}

FORMALITY: ${resolved.formality === 'formal' ? 'Use formal language, complete sentences, and professional vocabulary.' : resolved.formality === 'informal' ? 'Use conversational language, contractions, and accessible vocabulary.' : 'Match the formality to the topic.'}

FORMATTING RULES:
- ${getFormattingInstructions(resolved.formatting)}

${resolved.customTonePrompt ? `CUSTOM STYLE INSTRUCTIONS: ${resolved.customTonePrompt}` : ''}
${citationInstructions}
CONTENT STRUCTURE:
- NEVER write walls of text. Break up content with varied formatting
- Use short paragraphs (2-3 sentences max)
- Include at least ONE of these per section: bullet list, numbered list, or table
- Vary paragraph lengths to create visual rhythm
${getAntiAIWritingRules(language, isEnglish)}

WRITING GUIDELINES:
- Write content that provides genuine value - specific facts, actionable tips, real comparisons
- Include relevant keywords naturally (don't stuff)
- Include concrete examples, numbers, and specifics rather than vague statements
- Ensure content flows logically

HUMAN WRITING STYLE - CRITICAL FOR NATURAL CONTENT:

Sentence and Structure Variation:
- Mix sentence length: 10-20 words on average, with occasional longer sentences
- Use different sentence starters - don't begin consecutive sentences the same way
- Reorder sentence structure occasionally (object-subject-verb variations)
- Vary clause structures - avoid stacking multiple clauses in one sentence
- AVOID TRIPLETS (three items in a row with same structure)
- Vary paragraph length - not all paragraphs should be the same size

Be Concise and Direct:
- Simplify and avoid redundancy - say it once, say it well
- Avoid over-explanation - trust the reader to understand
- Limit internal conclusions within paragraphs
- Limit unnecessary paraphrasing of what was just said
- Avoid inflated verbs (utilize → use, implement → do, leverage → use)

Voice and Language:
- Use ACTIVE VOICE 90% of the time
- Vary voice and tense occasionally for rhythm
- Use LESS academic language - write like you speak
- Prefer everyday, concrete vocabulary over fancy words
- Avoid clichés and overused phrasal verbs
- Inject subtle subjectivity - it's okay to have a perspective

Human Cadence:
- Vary rhythm - some short punchy sentences, some flowing ones
- Ask occasional genuine questions, then answer them immediately
- Use plain connectors: and, but, so, then (not "furthermore", "moreover", "additionally")

Concrete Detail Over Abstraction:
- Use numbers, dates, names, and measurable facts
- Specific examples beat vague generalizations
- "Sales increased 23% in Q3" beats "Sales improved significantly"

POSITIVE DIRECTIVES:
✓ Clarity and brevity
✓ Active voice and direct verbs
✓ Everyday, concrete vocabulary
✓ Straightforward punctuation (periods, commas, question marks, occasional colons)
✓ Varied sentence length with minimal complexity
✓ Logical flow without buzzwords
✓ Concrete detail over abstraction
✓ Human cadence

NEGATIVE DIRECTIVES:
✗ NO em dashes (—)
✗ NO semicolons in casual content
✗ NO "In conclusion," "To summarize," "It's worth noting that"
✗ NO three-part parallel structures repeatedly
✗ NO starting sentences with "This" referring to previous paragraph
✗ NO "Not only... but also" constructions

SECTION ENDINGS - CRITICAL:
- NEVER end a section with a summary sentence
- NEVER end with a forward-looking statement ("In the next section...")
- END on your final factual point or actionable tip

ANTI-REPETITION RULES - CRITICAL:
- NEVER repeat information that was covered in previous sections
- NEVER cover topics that SIBLING SECTIONS will handle (check the sibling list!)
- Each section must contribute NEW, UNIQUE information - zero overlap allowed
- If a concept was explained before, reference it briefly ("As mentioned earlier") but don't re-explain
- Different sections should cover different aspects - NO OVERLAP
- Check the "Points Already Covered" list and DO NOT repeat any of those points
- If you find yourself writing something similar to a previous section, STOP and write something different
- The reader will read all sections - they don't need the same information twice
- If a sibling section will cover "licenses", don't explain licenses in detail - just mention them briefly if needed
- Tables, lists, and examples should be UNIQUE to each section - never repeat the same table/list structure

CRITICAL RULES - NEVER VIOLATE:
1. Output ONLY the section content in Markdown. NO preamble, NO meta-commentary
2. Do NOT start with "Here is...", "Sure!", "Absolutely!", "Let me...", "I'll write..."
3. Do NOT describe your tone or approach within the content
4. Do NOT include the section heading - it will be added separately
5. Start directly with the actual content`;
}

/**
 * Build section research context for enhanced prompts
 */
function buildSectionResearchContext(sectionResearch: SectionResearchContext): string {
  let context = '\n## Section-Specific Research:\n';

  // Add verified sources with IDs for citation
  if (sectionResearch.sources.length > 0) {
    context += '\n### Available Sources (cite using [N] where N is the source number):\n';
    for (const source of sectionResearch.sources) {
      const summary = source.summary || source.content?.slice(0, 300) || '';
      context += `[${source.id}] **${source.title}**\n${summary}\n\n`;
    }
  }

  // Add verified facts
  if (sectionResearch.facts.length > 0) {
    context += '\n### Verified Facts (include with citations):\n';
    for (const fact of sectionResearch.facts) {
      context += `- ${fact.fact} [${fact.sourceIds.join(', ')}]\n`;
    }
  }

  // Add statistics
  if (sectionResearch.statistics.length > 0) {
    context += '\n### Key Statistics:\n';
    for (const stat of sectionResearch.statistics) {
      context += `- ${stat}\n`;
    }
  }

  // Add quotes
  if (sectionResearch.quotes.length > 0) {
    context += '\n### Notable Quotes:\n';
    for (const quote of sectionResearch.quotes) {
      context += `- "${quote}"\n`;
    }
  }

  return context;
}

export function buildSectionWriterUserPrompt(
  section: OutlineSection,
  outline: Outline,
  previousSections: GeneratedSection[],
  researchContext: string,
  options?: GenerationOptionsInput,
  sectionResearch?: SectionResearchContext,
  sourceContext?: string,
  siblingSections?: OutlineSection[]
): string {
  const resolved = resolveOptions(options);

  // Build comprehensive context about what's already been written
  let prevContext: string;
  if (previousSections.length > 0) {
    // List all section headings covered so far
    const coveredHeadings = previousSections.map((s) => `- ${s.heading}`).join('\n');

    // Extract tables that have already been used (to prevent duplicate tables)
    const existingTables = previousSections
      .filter(s => s.content.includes('|'))
      .map(s => {
        const tableMatch = s.content.match(/\|[^\n]+\|[\s\S]*?\n\n/);
        return tableMatch ? `In "${s.heading}": table about ${s.heading.toLowerCase()}` : null;
      })
      .filter(Boolean)
      .join('\n');

    // Extract ALL key topics from each section (more comprehensive)
    const keyTopicsPerSection = previousSections
      .map((s) => {
        // Get first 1500 chars to capture main topics
        const preview = s.content.slice(0, 1500);
        // Extract bullet points if present
        const bullets = preview.match(/^[\-\*]\s+.+$/gm) || [];
        // Extract sentences that define or explain things
        const keySentences = preview.split(/[.!?]+/)
          .filter(sent => sent.trim().length > 30)
          .slice(0, 5)
          .map(sent => sent.trim());

        return `### "${s.heading}" covered:\n${[...bullets.slice(0, 4), ...keySentences.slice(0, 3)].map(p => `- ${p.replace(/^[\-\*]\s+/, '')}`).join('\n')}`;
      })
      .join('\n\n');

    // Only include full content of immediately preceding section (for transitions)
    const immediatePrevSection = previousSections.length > 0
      ? previousSections[previousSections.length - 1]
      : null;

    const immediatePrevContent = immediatePrevSection
      ? `### IMMEDIATELY PRECEDING SECTION (for transition reference):\n**${immediatePrevSection.heading}**\n${immediatePrevSection.content}`
      : '';

    prevContext = `## SECTIONS ALREADY WRITTEN - READ CAREFULLY:
${coveredHeadings}

## TABLES ALREADY USED (DO NOT CREATE SIMILAR TABLES):
${existingTables || 'None yet'}

## TOPICS ALREADY COVERED IN DETAIL (DO NOT REPEAT):
${keyTopicsPerSection}

${immediatePrevContent}

CRITICAL WARNING: If ANY of the above sections already explained a concept, statistic, list, or table - DO NOT explain it again. Reference it if needed ("as discussed above") but provide NEW information only.`;
  } else {
    prevContext = 'This is the first section of the article.';
  }

  const targetWords = section.suggestedWordCount || 200;

  // Build enhanced research context if section research is available
  let enhancedResearchContext = researchContext;
  if (sectionResearch) {
    enhancedResearchContext += buildSectionResearchContext(sectionResearch);
  }

  // Add topic-level source context if provided (when section research is not available)
  if (sourceContext) {
    enhancedResearchContext += '\n\n' + sourceContext;
  }

  // Build sibling sections context to prevent overlap
  let siblingContext = '';
  if (siblingSections && siblingSections.length > 0) {
    // Check which siblings are already written vs upcoming
    const writtenSiblingIds = new Set(previousSections.map(s => s.id));

    const siblingInfo = siblingSections
      .map((s) => {
        const status = writtenSiblingIds.has(s.id) ? '(ALREADY WRITTEN - see above)' : '(WILL BE WRITTEN - do not cover)';
        return `- "${s.heading}" ${status}: ${s.description}`;
      })
      .join('\n');

    siblingContext = `
## SIBLING SECTIONS - STRICT CONTENT BOUNDARIES:
${siblingInfo}

YOUR SECTION "${section.heading}" MUST:
1. ONLY cover topics directly related to "${section.heading}"
2. NOT explain anything that a sibling section covers (even briefly)
3. NOT include tables/lists that duplicate sibling section content
4. If a topic overlaps, ask: "Which section heading BEST matches this topic?" - put it there ONLY

EXAMPLE OF WHAT TO AVOID:
- If sibling covers "Payment Methods" → you must NOT list payment methods
- If sibling covers "Bonuses" → you must NOT explain bonus types
- If sibling covers "Registration" → you must NOT describe registration steps
`;
  }

  // Build component-specific instructions if componentType is set
  let componentInstructions = '';
  if (section.componentType && section.componentType !== 'prose') {
    componentInstructions = `\n${getComponentPrompt(section.componentType, {
      sectionHeading: section.heading,
      sectionDescription: section.description,
      keyword: outline.keyword,
      targetCountry: resolved.targetCountry,
    })}\n`;
  }

  // Build toplist brand context if toplists are provided
  let toplistBrandContext = '';
  if (options?.toplists && options.toplists.length > 0) {
    const includedToplists = options.toplists.filter(t => t.includeInArticle);
    if (includedToplists.length > 0) {
      const brandList = includedToplists.flatMap(toplist =>
        toplist.entries.map(entry => {
          const brand = entry.brand;
          if (!brand) return null;

          // Extract key attributes for the LLM to reference
          const attrs = brand.attributes || {};
          const attrList = [
            attrs.license ? `License: ${attrs.license}` : null,
            attrs.welcomeOffer ? `Welcome Offer: ${attrs.welcomeOffer}` : null,
            attrs.withdrawalTime ? `Withdrawal Time: ${attrs.withdrawalTime}` : null,
            attrs.bestFor ? `Best For: ${attrs.bestFor}` : null,
          ].filter(Boolean).join(', ');

          return `${entry.rank}. **${brand.name}**${attrList ? ` - ${attrList}` : ''}`;
        }).filter(Boolean)
      );

      if (brandList.length > 0) {
        const brandNames = includedToplists.flatMap(t => t.entries.map(e => e.brand?.name)).filter(Boolean);
        toplistBrandContext = `
## BRANDS IN THE TOPLIST - STRICT CONSTRAINT:
${brandList.join('\n')}

ABSOLUTE RULES - VIOLATION WILL RUIN THE ARTICLE:
1. You may ONLY mention these ${brandNames.length} brands: ${brandNames.join(', ')}
2. Do NOT invent, fabricate, or make up any other brand/casino names
3. Do NOT use placeholder names like "[Casino Namn 1]", "Casino X", "Brand A", etc.
4. If a table or comparison needs more entries than we have brands (${brandNames.length}), make the table SMALLER - only include our actual brands
5. Every brand name in your output MUST be one of: ${brandNames.join(', ')}
6. If you cannot write a section without inventing brands, write it as prose about our ${brandNames.length} brands only

EXAMPLE OF WHAT TO AVOID:
❌ BAD: A comparison table with "Lucky Nugget, Instant Casino, Casino X, SuperSlots" - Casino X and SuperSlots don't exist!
✓ GOOD: A comparison table with ONLY "Lucky Nugget, Instant Casino" - these are the only brands we have

The user has specifically chosen ${brandNames.length} brands. Do not add fictional competitors.
`;
      }
    }
  }

  let prompt = `Write the following section for an article about "${outline.keyword}":

## Section to Write:
Heading: ${section.heading}
Description: ${section.description}
Target word count: ${targetWords} words
${section.componentType ? `Component type: ${section.componentType}` : ''}

## Full Article Structure:
${outline.sections.map((s) => `- ${s.heading}${s.componentType ? ` [${s.componentType}]` : ''}`).join('\n')}
${toplistBrandContext}
${prevContext}
${siblingContext}
## Research Context:
${enhancedResearchContext}
${componentInstructions}
IMPORTANT: This section should ONLY cover "${section.heading}". Do NOT repeat information from previous sections OR sibling sections.
${section.componentType && section.componentType !== 'prose' ? `\nFORMAT REQUIREMENT: Follow the ${section.componentType} component format instructions above precisely.` : ''}
Write the content for this section now. Output the section content only, in Markdown format. Do not include the heading.`;

  // Add citation reminder for section-level research
  if (sectionResearch && sectionResearch.sources.length > 0) {
    prompt += '\n\nIMPORTANT: Include citations [1], [2], etc. when referencing facts or statistics from the sources above.';
  }

  // Add citation reminder for topic-level sources
  if (sourceContext) {
    prompt += '\n\nIMPORTANT: Include citations [1], [2], etc. when referencing facts or statistics from the available sources.';
  }

  return prompt;
}

export function buildArticleEditorSystemPrompt(options?: GenerationOptionsInput): string {
  const resolved = resolveOptions(options);
  const language = LANGUAGE_NAMES[resolved.language] || 'English (US)';
  const isEnglish = resolved.language.startsWith('en');

  // Get author's site for POV instruction when using first-person-plural
  let authorSite: string | undefined;
  if (options?.authorProfileId) {
    const profile = getAuthorById(options.authorProfileId);
    authorSite = profile?.site;
  }

  return `You are an expert editor who writes like a native ${language} speaker. Polish this article to sound completely natural and human-written.

YOUR PRIMARY MISSION:
Remove all traces of AI-generated content patterns. The article must read as if written by a skilled native ${language} writer from the target market.

EDITING TASKS:
1. Ensure consistency in tone, style, and voice throughout
2. Make transitions feel natural, not rehearsed
3. Fix awkward phrasing and redundant statements
4. ${resolved.structure.conclusion ? 'Ensure the conclusion adds value (NOT just restating the introduction)' : 'Ensure the article ends naturally'}
5. Maintain SEO optimization without keyword stuffing

CRITICAL - ELIMINATE ALL REPETITION:
6. SCAN THE ENTIRE ARTICLE for repeated information, concepts, or explanations
7. If the same point is made in multiple sections, KEEP IT IN ONE PLACE ONLY (the most appropriate section)
8. Remove any sentence that restates something already said elsewhere
9. Each section must contain UNIQUE information - no overlap allowed
10. Similar phrases or explanations appearing in different sections must be consolidated
11. If removing content leaves a section too short, add NEW relevant information instead
${getAntiAIWritingRules(language, isEnglish)}

TONE: ${getToneInstruction(resolved.tone, resolved.customTonePrompt)}

POINT OF VIEW: ${getPOVInstruction(resolved.pointOfView, authorSite)}

FORMATTING:
- ${getFormattingInstructions(resolved.formatting)}
- Add tables where comparisons would help readers
- Break up any long paragraphs (5+ sentences) into shorter ones
- Ensure varied formatting (not just paragraphs)

${resolved.structure.keyTakeaways ? 'Ensure "Key Takeaways" section exists at the top with 3-5 bullet points.' : ''}
${resolved.structure.faqs ? 'Ensure FAQ section has clear, direct answers (not vague).' : ''}

HUMAN WRITING STYLE - APPLY THROUGHOUT:

Sentence Variation:
- Mix sentence lengths (10-20 words average, occasional longer)
- Vary sentence starters - no consecutive sentences starting the same way
- Avoid triplets (three parallel items repeatedly)
- Vary paragraph lengths

Concise and Direct:
- Cut redundancy - if something is said twice, keep only the best version
- Remove over-explanation and unnecessary paraphrasing
- Replace inflated verbs: utilize→use, implement→do, leverage→use

Voice and Language:
- Enforce ACTIVE VOICE (90%+ of sentences)
- Use everyday vocabulary over academic words
- Remove clichés and overused phrasal verbs

Human Cadence:
- Use plain connectors: and, but, so, then (NOT "furthermore", "moreover", "additionally")
- Occasional genuine questions answered immediately are good
- Vary rhythm throughout

Concrete Over Abstract:
- Prefer numbers, dates, names over vague descriptors
- "23% increase" beats "significant improvement"

PUNCTUATION RULES:
✓ Use: periods, commas, question marks, occasional colons
✗ REMOVE: em dashes (—), excessive semicolons
✗ REMOVE: "In conclusion," "To summarize," "It's worth noting that"

REMOVE/FIX THESE:
- Any meta-commentary about the writing itself
- Self-referential statements about tone
- Filler phrases that add no meaning
- Excessive hedging ("it is important to note," "one might consider")
- Unnatural synonym cycling (it's OK to repeat words!)
- Empty adjectives ("truly remarkable," "incredibly useful")
- Over-perfect parallel structures
- "On one hand / on the other hand" constructions
- Conclusions that restate the introduction
- Translated English idioms that don't work in ${language}
- REPETITIVE CONTENT: Any point, fact, or explanation that appears in multiple sections
- REDUNDANT SECTIONS: Merge or cut sections that cover the same ground
- REPEATED INTRODUCTIONS: Each section introducing the same topic again

CRITICAL OUTPUT RULES:
1. Output ONLY the polished article in Markdown - NO preamble
2. Do NOT start with "Here is...", "Sure!", "Absolutely!"
3. Start directly with the article title (# heading)
4. Include all headings (## for H2, ### for H3)
5. Preserve key information and structure`;
}

export function buildArticleEditorUserPrompt(
  fullArticle: string,
  outline: Outline,
  options?: GenerationOptionsInput
): string {
  const resolved = resolveOptions(options);

  let prompt = `Edit and polish the following article about "${outline.keyword}":

## Target Keywords:
${outline.metadata.suggestedKeywords.join(', ')}

## Target Audience:
${outline.metadata.targetAudience || 'General audience interested in this topic'}

## Article to Edit:
${fullArticle}
`;

  // Add CTA section if configured
  if (resolved.callToAction?.enabled && resolved.callToAction.url) {
    const cta = resolved.callToAction;
    prompt += `

## IMPORTANT - Add Call to Action:
Add an H3 section before the conclusion with the following CTA:
Heading: ${cta.heading || 'Take Action Now'}
Text: ${cta.text || 'Ready to get started?'}
Link: [${cta.buttonText || 'Learn More'}](${cta.url})
`;
  }

  prompt += `

OUTPUT REQUIREMENTS:
- Start DIRECTLY with the article title (# heading) - no preamble
- Do NOT add any introductory text before the article
- Output ONLY the article content in clean Markdown`;

  return prompt;
}
