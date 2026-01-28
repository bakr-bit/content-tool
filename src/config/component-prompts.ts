import { ComponentType } from '../types';

/**
 * Component-specific writing prompts and formatting instructions.
 * Each component type has tailored instructions for affiliate content generation.
 */

export interface ComponentPromptContext {
  sectionHeading: string;
  sectionDescription: string;
  keyword: string;
  targetCountry?: string;
  itemCount?: number;  // For toplists, reviews, etc.
}

interface ComponentDefinition {
  name: string;
  description: string;
  prompt: string;
  useCase: string;
}

const COMPONENT_DEFINITIONS: Record<ComponentType, ComponentDefinition> = {
  prose: {
    name: 'Standard Prose',
    description: 'Default paragraph content for general sections',
    useCase: 'General sections, introduction, conclusion',
    prompt: `Write engaging paragraph content that flows naturally.
- Use short paragraphs (2-3 sentences max)
- Include relevant examples and specifics
- Vary sentence length for natural rhythm
- Break up text with occasional bullet points if it improves readability`,
  },

  toplist: {
    name: 'Top Comparison Table',
    description: 'Main ranking table with uniform columns for hero comparison',
    useCase: 'Hero comparison (above fold), main ranking sections',
    prompt: `BEFORE WRITING THIS TABLE:
1. What makes items #1, #2, #3 rank differently? Identify the key differentiators.
2. What data points matter most for this audience's decision?
3. How will you handle missing data? (Use "See Website" or "Varies" - never guess)

Write a comparison table with these EXACT columns:
| # | Name | License | Welcome Offer | Wagering | Withdrawal Time | Payment Methods | Highlights | Best For | Score |

EXAMPLE (follow this cell content style):
| # | Name | License | Welcome Offer | Wagering | Withdrawal Time | Payment Methods | Highlights | Best For | Score |
|---|------|---------|---------------|----------|-----------------|-----------------|------------|----------|-------|
| 1 | Casino Alpha | MGA | 100% up to $500 + 200 FS | 35x | 24-48h | Visa, Skrill, Bitcoin | Fast payouts, 3000+ games | High rollers | 9.2/10 |
| 2 | BetMax | Curacao | $25 no deposit | 40x | 1-3 days | Mastercard, Neteller, ETH | No deposit bonus | New players | 8.8/10 |
| 3 | SpinRoyal | Gibraltar | 150% up to $300 | 30x | Instant (e-wallets) | PayPal, Trustly, BTC | Low wagering | Bonus hunters | 8.5/10 |

REQUIREMENTS:
- Use markdown table format
- Include 5-10 items (or as specified in the section description)
- Every row MUST have ALL columns filled - no empty cells
- Rank column (#) should be 1, 2, 3, etc.
- Welcome Offer: Include amount/percentage and key terms
- Wagering: Express as Nx (e.g., "35x")
- Withdrawal Time: Be specific (e.g., "24-48h", "Instant for e-wallets")
- Score: Use X/10 format
- Keep cell content concise but informative
- MISSING DATA: If a specific data point is not available in the research, write "See Website" or "Varies" - NEVER guess or fabricate data. Keep the table structure intact with all columns.

After the table, write 1-2 paragraphs explaining the ranking methodology briefly.`,
  },

  mini_review: {
    name: 'Mini-Review Card',
    description: 'Individual item review with consistent structure',
    useCase: 'Casino/product reviews, detailed item breakdowns',
    prompt: `Write a structured mini-review with these EXACT sections:

**License:** [License authority and number if available]
**Welcome Offer:** [Bonus amount + wagering requirements]
**Payments:** [Top 3-4 methods + typical withdrawal time]
**Games:** [Slot count, live tables count, top providers]
**Best For:** [Target audience in 5-10 words]

EXAMPLE (follow this structure exactly):
**License:** Malta Gaming Authority (MGA/B2C/394/2017)
**Welcome Offer:** 100% match up to $500 + 200 free spins (35x wagering)
**Payments:** Visa, Skrill, Bitcoin, Bank Transfer | Withdrawals: 24-48 hours
**Games:** 3,200+ slots, 85 live tables | Providers: NetEnt, Evolution, Pragmatic
**Best For:** Players who prioritize fast withdrawals and live dealer games

Casino Alpha earned the #1 spot for its combination of licensing credibility and payout speed. The MGA license means strict player protection rules apply, including segregated funds and dispute resolution.

The welcome bonus looks generous on paper. The 35x wagering applies to the bonus amount only, not the deposit. Max bet while wagering is $5. You have 30 days to clear the requirement. Live dealer and jackpot games contribute 10% toward wagering.

One drawback: customer support is only available 10am-10pm CET. No 24/7 coverage. The game library leans heavily on slots, with fewer table game variants than some competitors.

Then write 2-3 paragraphs that:
1. Explain WHY this item ranks where it does
2. Cover the bonus terms in detail (wagering scope, max bet during bonus, time limit, excluded games)
3. Mention any standout features or drawbacks

Keep the tone balanced - highlight both strengths and limitations.
- MISSING DATA: If specific information (license number, exact bonus amount, game counts) is not provided in research, write "Contact operator" or "Check website" - do not invent numbers.`,
  },

  category_ranking: {
    name: 'Category Mini-Ranking',
    description: 'Smaller focused table for specific intent',
    useCase: '"Fastest withdrawals", "Best for crypto", niche rankings',
    prompt: `Write a focused comparison table for a specific category.

Table columns (adapt based on the category):
| Name | [Category-Specific Column] | Why It Wins |

REQUIREMENTS:
- Include 3-5 items maximum - keep it scannable
- The middle column should be specific to the category (e.g., "Fastest Method + Time" for withdrawals, "Crypto Options" for crypto casinos)
- "Why It Wins" should be a brief, compelling reason (10-20 words)
- MISSING DATA: Use "N/A" or "Check site" for unavailable data points. Never fabricate specifics.
- After the table, write 1 short paragraph explaining the selection criteria for this specific category`,
  },

  payment_table: {
    name: 'Payment Methods Table',
    description: 'Deposit/withdrawal comparison table',
    useCase: 'Payment/banking sections',
    prompt: `Write a payment methods comparison table with these columns:
| Method | Deposit Time | Withdrawal Time | Min Deposit | Min Withdrawal | Fees | Availability |

EXAMPLE (follow this format):
| Method | Deposit Time | Withdrawal Time | Min Deposit | Min Withdrawal | Fees | Availability |
|--------|--------------|-----------------|-------------|----------------|------|--------------|
| Visa/Mastercard | Instant | 1-3 business days | $10 | $20 | Free | All countries |
| Skrill | Instant | 24 hours | $10 | $20 | Free | Except US, UK |
| Bank Transfer | 1-3 days | 3-5 business days | $20 | $50 | Free | All countries |
| Bitcoin | 10-30 min | 1-24 hours | $20 | $50 | Network fee | All countries |
| Apple Pay | Instant | Not available | $10 | N/A | Free | iOS users only |

REQUIREMENTS:
- Cover the most common methods: Visa/Mastercard, Bank Transfer, e-wallets (Skrill, Neteller), and any region-specific methods
- Include cryptocurrency options if relevant to the topic
- Be specific with times (e.g., "Instant", "1-3 business days")
- Note any fees clearly ("Free", "2.5%", etc.)
- Availability should note any restrictions
- MISSING DATA: If specific limits or fees are unknown, write "Varies" or "Check operator" - do not guess amounts.

After the table, write 2-3 paragraphs covering:
1. Which method is best for deposits vs withdrawals
2. KYC/verification impact on withdrawal times
3. Any tips for faster transactions`,
  },

  comparison: {
    name: 'Comparison Table',
    description: 'Two-column A vs B comparison',
    useCase: '"Offshore vs Regulated", feature comparisons',
    prompt: `BEFORE WRITING THIS COMPARISON:
1. What is the reader trying to decide between these options?
2. What 3 factors would swing the decision either way?
3. Who should choose Option A vs. Option B?

Write a side-by-side comparison table:
| Aspect | [Option A] | [Option B] |

EXAMPLE (Offshore vs Regulated Casinos):
| Aspect | Offshore Casinos | Regulated Casinos |
|--------|------------------|-------------------|
| Licensing | Curacao, Anjouan | MGA, UKGC, Gibraltar |
| Player Protection | Limited recourse | Dispute resolution, fund segregation |
| Bonuses | Higher amounts, creative offers | Lower but clearer terms |
| Game Selection | Crypto games, more slots | Tested RTP, certified providers |
| Withdrawals | Faster (no strict KYC) | Slower first withdrawal (KYC required) |
| Payment Methods | Crypto-friendly | Traditional + limited crypto |
| Tax Reporting | None | May report to authorities |
| Account Restrictions | Fewer limits | Responsible gambling limits |

**Bottom Line: Offshore Casinos**
Choose offshore if you prioritize privacy, crypto payments, and higher bonus amounts. Accept that you have limited recourse if something goes wrong.

**Bottom Line: Regulated Casinos**
Choose regulated if you want guaranteed player protection, verified game fairness, and don't mind slower first withdrawals. Required for players in strict jurisdictions.

REQUIREMENTS:
- Include 6-10 comparison aspects
- Cover: Safety/licensing, bonuses, game selection, payments, support, pros/cons
- Use checkmarks (✓), crosses (✗), or brief text in cells
- Keep cells concise (5-15 words max)
- Be balanced - show genuine pros and cons for both options

After the table:
1. Write a "Bottom Line" paragraph for each option (when to choose it)
2. Give a clear recommendation based on different user priorities`,
  },

  faq: {
    name: 'FAQ Section',
    description: 'Q&A format with objection-killers',
    useCase: 'FAQ section, addressing common concerns',
    prompt: `Write FAQs as objection-killers. Format each as:

**Q: [Question]?**
[Direct answer in 1-3 sentences. Be specific and actionable.]

REQUIREMENTS:
- Include 5-8 questions
- Cover these intent types:
  * Legality/safety concerns ("Is it legal to...?", "Are these sites safe?")
  * Payment/withdrawal questions ("How fast can I withdraw?", "What payment methods...?")
  * Bonus/terms clarifications ("What does wagering requirement mean?", "Can I withdraw bonus...?")
  * Process questions ("How do I verify my account?", "What documents are needed?")
  * Risk/protection questions ("What if something goes wrong?", "How do I set limits?")
- Answer the actual question directly in the first sentence
- Include specific details (numbers, timeframes, methods) not vague generalities
- Don't repeat information from other sections - add NEW value`,
  },

  methodology: {
    name: 'Methodology Block',
    description: 'Scoring/evaluation explanation for EEAT',
    useCase: 'How we rank/review sections, EEAT foundation',
    prompt: `Explain the evaluation methodology with weighted criteria:

**Our Evaluation Criteria:**

- **Safety & Licensing (30%)**: [What you verify - license validity, security measures, responsible gambling tools]
- **Bonuses & Promotions (20%)**: [What you evaluate - offer value, wagering fairness, terms transparency]
- **Game Selection (20%)**: [What you check - variety, providers, RTP information]
- **Payment Options (15%)**: [What you assess - method variety, speed, fees, limits]
- **User Experience (15%)**: [What you test - site speed, mobile, support responsiveness]

REQUIREMENTS:
- Percentages should total 100%
- Be specific about what you actually check for each criterion
- Include a disclosure statement: "We may receive compensation from operators featured on this site. This does not influence our rankings, which are based on independent evaluation."
- End with a brief statement about review frequency/updates`,
  },

  legal_rg: {
    name: 'Legal + Responsible Gambling Block',
    description: 'Jurisdiction info, risks, and help resources',
    useCase: 'Compliance section, legal disclaimers',
    prompt: `Write a comprehensive legal and responsible gambling section:

**1. Legal Status**
Explain the jurisdiction situation for the target market:
- What laws apply to online gambling
- Whether the sites featured are licensed (and by whom)
- Tax implications if applicable (briefly)

**2. Player Protections**
What protections exist (or don't):
- Self-exclusion programs available
- Deposit/loss limits
- Reality checks and session reminders
- Cooling-off periods

**3. Risks to Consider**
Balanced, factual risk acknowledgment (not fear-mongering):
- Gambling involves risk of loss
- Bonuses have terms that must be met
- Offshore sites may have different dispute resolution

**4. Help Resources**
Include ACTUAL help resources with contact info:
- National gambling helplines
- Self-exclusion registries
- Problem gambling organizations
- Format as a clear list with URLs/phone numbers

**5. Age Restriction**
- Clear 18+/21+ statement
- Brief responsible gambling call-to-action

Keep the tone informative and helpful, not preachy.`,
  },

  safety_checklist: {
    name: 'Safety Checklist',
    description: 'Green flags vs red flags comparison',
    useCase: 'Trust signals, how to identify safe/unsafe sites',
    prompt: `Write a safety checklist in two-column format:

| ✓ Green Flags (Safe Signs) | ✗ Red Flags (Warning Signs) |
|---------------------------|----------------------------|

REQUIREMENTS:
- Include 6-8 items per column
- Green flags: Valid license displayed, SSL encryption, responsible gambling tools, transparent terms, established reputation, responsive support, fair withdrawal times
- Red flags: No license info, unrealistic bonus promises, hidden terms, withdrawal complaints, poor support, no responsible gambling tools, copied content

After the table:
1. Write a paragraph on how to verify a site's license
2. Include a brief "What to do if you spot red flags" section`,
  },

  player_profiles: {
    name: 'Player Profiles',
    description: 'Profile-based recommendations table',
    useCase: 'Decision helper, personalized recommendations',
    prompt: `Write a player profile recommendation table:

| Player Type | What They Want | Best Choice | Why |
|-------------|----------------|-------------|-----|

REQUIREMENTS:
- Include 4-6 distinct player profiles:
  * Bonus hunters (want best value offers)
  * High rollers (want high limits, VIP treatment)
  * Casual players (want simple experience, low stakes)
  * Live casino fans (want live dealer variety)
  * Crypto users (want anonymous play, crypto bonuses)
  * Mobile players (want excellent app/mobile experience)
- "What They Want" should list 2-3 priorities
- "Best Choice" should name a specific recommendation
- "Why" should give a concrete reason (not generic)

After the table, write 1-2 paragraphs with additional guidance on finding the right fit.`,
  },

  decision_flow: {
    name: 'Decision Flow',
    description: 'Step-by-step numbered guide',
    useCase: 'How-to sections, getting started guides',
    prompt: `Write a step-by-step numbered guide:

**Step 1: [Action Title]**
[2-3 sentences explaining this step with specific details]

**Step 2: [Action Title]**
[2-3 sentences explaining this step with specific details]

...continue for all steps...

REQUIREMENTS:
- Include 5-8 steps
- Each step should be a clear, actionable item
- Include specific details (what to click, what to enter, what to expect)
- Mention time estimates where relevant ("This typically takes 2-3 minutes")
- Note any requirements or prerequisites
- Warn about common mistakes at relevant steps
- The final step should confirm completion or next actions

After the steps, include a brief "Pro Tips" section with 2-3 insider tips.`,
  },

  glossary: {
    name: 'Glossary',
    description: 'Terms with definitions',
    useCase: 'Reference section, terminology explanation',
    prompt: `Write a glossary of key terms:

**[Term 1]**: [Clear, concise definition in 1-2 sentences]

**[Term 2]**: [Clear, concise definition in 1-2 sentences]

...continue for all terms...

REQUIREMENTS:
- Include 8-15 terms relevant to the article topic
- Organize alphabetically
- Keep definitions jargon-free - explain in plain language
- Include practical context where helpful ("This means that...")
- Cover both basic terms (for beginners) and more advanced concepts
- If a term has multiple meanings in context, clarify which applies

Terms to consider including (select what's relevant):
- Wagering requirement / Playthrough
- RTP (Return to Player)
- Volatility / Variance
- Welcome bonus / Sign-up bonus
- Free spins
- No deposit bonus
- VIP / Loyalty program
- KYC (Know Your Customer)
- Self-exclusion
- Progressive jackpot`,
  },

  sources: {
    name: 'Sources Box',
    description: 'Authoritative references and citations',
    useCase: 'Citations section, footer references',
    prompt: `Write a sources/references section:

**Sources & References**

1. [Source title/description] - [URL or citation]
2. [Source title/description] - [URL or citation]
...

REQUIREMENTS:
- Include 3-6 authoritative sources
- Prioritize official/regulatory sources:
  * Gambling commission websites
  * Official license verification pages
  * Government statistics
  * Academic research on gambling
  * Responsible gambling organization data
- Format consistently with clickable URLs where available
- Add brief context for why each source is relevant/authoritative
- Include date accessed or publication date if available

After the source list, add a brief editorial note:
"This article was last updated [month year]. We regularly review and update our content to ensure accuracy."`,
  },
};

/**
 * Get the prompt instructions for a specific component type.
 */
export function getComponentPrompt(
  type: ComponentType,
  context: ComponentPromptContext
): string {
  const definition = COMPONENT_DEFINITIONS[type];

  if (!definition) {
    return COMPONENT_DEFINITIONS.prose.prompt;
  }

  let prompt = `## COMPONENT FORMAT: ${definition.name}

${definition.prompt}

SECTION CONTEXT:
- Heading: ${context.sectionHeading}
- Description: ${context.sectionDescription}
- Target keyword: ${context.keyword}`;

  if (context.targetCountry) {
    prompt += `\n- Target market: ${context.targetCountry}`;
  }

  if (context.itemCount) {
    prompt += `\n- Number of items to include: ${context.itemCount}`;
  }

  return prompt;
}

/**
 * Get metadata about a component type (for API endpoints).
 */
export function getComponentInfo(type: ComponentType): ComponentDefinition | undefined {
  return COMPONENT_DEFINITIONS[type];
}

/**
 * Get all available component types with their metadata.
 */
export function getAllComponents(): Array<{
  id: ComponentType;
  name: string;
  description: string;
  useCase: string;
}> {
  return (Object.keys(COMPONENT_DEFINITIONS) as ComponentType[]).map((id) => ({
    id,
    name: COMPONENT_DEFINITIONS[id].name,
    description: COMPONENT_DEFINITIONS[id].description,
    useCase: COMPONENT_DEFINITIONS[id].useCase,
  }));
}

/**
 * Check if a component type is valid.
 */
export function isValidComponentType(type: string): type is ComponentType {
  return type in COMPONENT_DEFINITIONS;
}
