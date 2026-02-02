import { ArticleTemplate } from '../types/article-template';

/**
 * PARASITE Template - Comprehensive Affiliate Article (6-7k words)
 *
 * Designed for high-converting affiliate content with:
 * - Strong EEAT signals (methodology, credentials)
 * - Multiple ranking tables for different intents
 * - Individual reviews for each ranked item
 * - Legal/compliance sections for trust
 * - FAQ and glossary for long-tail coverage
 */
export const PARASITE_TEMPLATE: ArticleTemplate = {
  id: 'parasite',
  name: 'Parasite (6-7k Affiliate)',
  description: 'Comprehensive affiliate article with main ranking, category rankings, individual reviews, and FAQ. Ideal for competitive keywords.',
  icon: 'Bug',
  category: 'affiliate',
  articleSize: {
    preset: 'custom',
    targetWordCount: 7000,
    minHeadings: 24,
    maxHeadings: 28,
    subsectionsPerSection: 2,
    wordsPerSection: 350,
    introductionLength: 'standard',
    conclusionLength: 'standard',
  },
  structure: {
    keyTakeaways: false,
    conclusion: true,
    faqs: true,
    tableOfContents: true,
  },
  suggestedTone: 'authoritative',
  suggestedPointOfView: 'first-person-plural',
  suggestedFormality: 'informal',
  additionalSystemPrompt: `AFFILIATE CONTENT STYLE:
- Write with authority and conviction - readers want clear recommendations, not wishy-washy advice
- Include specific numbers, percentages, and concrete details (withdrawal times, bonus amounts, wagering requirements)
- Address objections directly and turn them into selling points
- Use comparison-based language ("Unlike X, this option offers...")
- Include trust signals: licenses, years in operation, user counts
- Every section should subtly reinforce why the top picks are the best choices
- Balance SEO density with natural readability
- Use tables and lists aggressively - they convert better than prose
- Include micro-CTAs throughout, not just at the end`,
  isBuiltIn: true,
  outlineSkeleton: [
    // 1. Introduction
    {
      id: 'introduction',
      sectionType: 'introduction',
      headingGuidance: 'A compelling heading that includes the main keyword and current year, addressing the searcher\'s core intent',
      level: 2,
      componentType: 'prose',
      purpose: 'Hook addressing searcher intent, preview article value, establish authority. Mention how many options were reviewed and the criteria used.',
      suggestedWordCount: 200,
    },
    // 2. Quick Verdict
    {
      id: 'quick-verdict',
      sectionType: 'quick_verdict',
      headingGuidance: 'A heading for the quick summary/TLDR section (e.g., "Quick Verdict" or "Top 3 Picks at a Glance")',
      level: 2,
      componentType: 'prose',
      purpose: 'Top picks summary for skimmers who want fast answers. Include key differentiators for each pick. DEDUP: Keep it brief (2-3 sentences per pick). Do NOT explain methodology or go into detail - that comes later. Do NOT repeat in the conclusion.',
      suggestedWordCount: 150,
    },
    // 3. Methodology
    {
      id: 'methodology',
      sectionType: 'methodology',
      headingGuidance: 'A heading explaining how items were evaluated (e.g., "How We Rank" or "Our Evaluation Criteria")',
      level: 2,
      componentType: 'methodology',
      purpose: 'Explain evaluation methodology with weighted criteria percentages. Build trust through transparency. Include credentials/experience.',
      suggestedWordCount: 300,
    },
    // 4. Main Ranking Table
    {
      id: 'main-ranking',
      sectionType: 'main_ranking',
      headingGuidance: 'A heading for the main top 10 comparison table with the keyword',
      level: 2,
      componentType: 'toplist',
      purpose: 'Main top 10 comparison table with key metrics. This is the core conversion section - make it scannable and actionable.',
      suggestedWordCount: 500,
    },
    // 5. Category Picks (with subsections)
    {
      id: 'category-picks',
      sectionType: 'category_picks',
      headingGuidance: 'A heading introducing category-specific rankings (e.g., "Best By Category" or "Top Picks for Different Needs")',
      level: 2,
      componentType: 'prose',
      purpose: 'Brief intro to category-specific rankings. Explain why different users have different needs.',
      suggestedWordCount: 100,
      subsections: [
        {
          id: 'category-fastest',
          sectionType: 'category_fastest',
          headingGuidance: 'A heading for the fastest/quickest option category (e.g., "Fastest Payouts" or "Best for Quick Withdrawals")',
          level: 3,
          componentType: 'category_ranking',
          purpose: 'Rank by WITHDRAWAL SPEED only. Table columns: Name, Fastest Method, Time. DEDUP: Do NOT mention bonuses or crypto here - focus purely on speed.',
          suggestedWordCount: 150,
        },
        {
          id: 'category-crypto',
          sectionType: 'category_crypto',
          headingGuidance: 'A heading for crypto-friendly options (e.g., "Best for Crypto Users" or "Top Bitcoin Options")',
          level: 3,
          componentType: 'category_ranking',
          purpose: 'Rank by CRYPTO SUPPORT only. Table columns: Name, Supported Coins, Crypto Bonus (if any). DEDUP: Do NOT mention withdrawal speed or welcome bonuses here - focus purely on crypto features.',
          suggestedWordCount: 150,
        },
        {
          id: 'category-bonuses',
          sectionType: 'category_bonuses',
          headingGuidance: 'A heading for best welcome offers (e.g., "Best Welcome Bonuses" or "Biggest Sign-Up Offers")',
          level: 3,
          componentType: 'category_ranking',
          purpose: 'Rank by BONUS VALUE only. Table columns: Name, Welcome Bonus, Wagering Requirement. DEDUP: Do NOT mention withdrawal speed or crypto here - focus purely on bonus generosity.',
          suggestedWordCount: 150,
        },
      ],
    },
    // 6-15. Individual Reviews (repeatable)
    {
      id: 'individual-review',
      sectionType: 'individual_review',
      headingGuidance: 'A heading with the rank number and name (e.g., "#1 Brand Name - Best Overall" or "1. Brand Name Review")',
      level: 2,
      componentType: 'mini_review',
      purpose: 'Detailed mini-review covering license, welcome offer, key features, payments, best for whom. Include specific pros/cons.',
      suggestedWordCount: 400,
      isRepeatable: true,
      repeatCount: 10,
    },
    // 16. Payment Methods
    {
      id: 'payments',
      sectionType: 'payments',
      headingGuidance: 'A heading about payment and banking options (e.g., "Payment Methods" or "Deposits & Withdrawals")',
      level: 2,
      componentType: 'payment_table',
      purpose: 'Payment methods comparison table with deposit/withdrawal times, limits, and fees. Cover major payment types.',
      suggestedWordCount: 400,
    },
    // 17. Bonus Terms
    {
      id: 'bonus-terms',
      sectionType: 'bonus_terms',
      headingGuidance: 'A heading explaining bonus mechanics (e.g., "Understanding Bonus Terms" or "Wagering Requirements Explained")',
      level: 2,
      componentType: 'prose',
      purpose: 'Explain wagering requirements, restrictions, and how to maximize bonus value. Include calculation examples.',
      suggestedWordCount: 350,
    },
    // 18. Legal Status
    {
      id: 'legal-status',
      sectionType: 'legal_status',
      headingGuidance: 'A heading about legal/regulatory aspects (e.g., "Legal Status" or "Licenses & Regulation")',
      level: 2,
      componentType: 'legal_rg',
      purpose: 'Focus on LEGAL aspects: Which licenses exist (MGA, Curacao, etc.), what each license means for player protection, how disputes are handled, and official helpline numbers. DEDUP: Do NOT list responsible gambling tools (insättningsgränser, förlustgränser, självexkludering) - those are covered in the Deep Dive section. Do NOT repeat tax info (covered in Tax section).',
      suggestedWordCount: 400,
    },
    // 19. Comparison Table
    {
      id: 'comparison',
      sectionType: 'comparison',
      headingGuidance: 'A heading comparing two main options/approaches (e.g., "Regulated vs Offshore" or "Type A vs Type B")',
      level: 2,
      componentType: 'comparison',
      purpose: 'Two-column comparison TABLE focusing on practical differences: bonuses, game selection, withdrawal speed, payment methods, betting limits. DEDUP: Do NOT explain what licenses mean (covered in Legal section). Do NOT discuss taxes (covered in Tax section). Keep it factual and table-focused.',
      suggestedWordCount: 350,
    },
    // 20. Tax Considerations
    {
      id: 'tax',
      sectionType: 'tax',
      headingGuidance: 'A heading about tax implications (e.g., "Tax Considerations" or "Do You Need to Pay Tax?")',
      level: 2,
      componentType: 'prose',
      purpose: 'ONLY cover tax rules: Which winnings are taxable vs tax-free based on license jurisdiction, how to declare winnings, links to official tax authority. DEDUP: Do NOT explain what MGA or Curacao licenses are (covered in Legal section). Just state tax implications per license type.',
      suggestedWordCount: 200,
    },
    // 21. How to Choose
    {
      id: 'how-to-choose',
      sectionType: 'how_to_choose',
      headingGuidance: 'A heading guiding the selection process (e.g., "How to Choose" or "Step-by-Step Selection Guide")',
      level: 2,
      componentType: 'decision_flow',
      purpose: 'Step-by-step guide to choosing the right option. Help readers self-identify their needs.',
      suggestedWordCount: 300,
    },
    // 22. Industry Trends
    {
      id: 'trends',
      sectionType: 'trends',
      headingGuidance: 'A heading about current trends and changes (e.g., "Industry Trends" or "What\'s Changing in [Year]")',
      level: 2,
      componentType: 'prose',
      purpose: 'Industry trends and what\'s changing. Establishes recency and expertise.',
      suggestedWordCount: 250,
    },
    // 23. FAQ (primary)
    {
      id: 'faq',
      sectionType: 'faq',
      headingGuidance: 'A heading for frequently asked questions (e.g., "FAQ" or "Common Questions")',
      level: 2,
      componentType: 'faq',
      purpose: '6-8 unique questions NOT already answered in the article. Focus on edge cases, specific scenarios, and long-tail queries. DEDUP: Do NOT ask questions whose answers are already in dedicated sections (e.g., "What licenses exist?" is in Legal, "How do bonuses work?" is in Bonus Terms). Each Q&A should provide NEW information.',
      suggestedWordCount: 400,
    },
    // 24. Conclusion
    {
      id: 'conclusion',
      sectionType: 'conclusion',
      headingGuidance: 'A concluding heading with a recommendation focus (e.g., "Final Verdict" or "Our Recommendation")',
      level: 2,
      componentType: 'prose',
      purpose: 'Wrap up for readers who read the whole article. State ONE clear top recommendation with a strong CTA. DEDUP: Do NOT re-list all picks (that was in Quick Verdict). Do NOT repeat methodology or criteria. Just give the final verdict and next action.',
      suggestedWordCount: 200,
    },
    // 25. Deep Dive
    {
      id: 'deep-dive',
      sectionType: 'deep_dive',
      headingGuidance: 'A heading about responsible gambling and player safety (e.g., "Responsible Gambling" or "Playing Safely")',
      level: 2,
      componentType: 'prose',
      purpose: 'Focus on RESPONSIBLE GAMBLING: Available self-control tools (deposit limits, loss limits, session limits, self-exclusion), warning signs of problem gambling, how to set personal limits, and resources for getting help. DEDUP: Do NOT explain licenses or legal status (covered in Legal section). Do NOT list helpline numbers (covered in Legal section). Focus on practical tools and self-help strategies.',
      suggestedWordCount: 500,
    },
    // 26. Glossary
    {
      id: 'glossary',
      sectionType: 'glossary',
      headingGuidance: 'A heading for terminology definitions (e.g., "Glossary" or "Key Terms Explained")',
      level: 2,
      componentType: 'glossary',
      purpose: 'Brief 1-2 sentence definitions of 10-15 industry terms. Format: **Term**: Definition. DEDUP: Keep definitions SHORT. Do NOT turn this into explanations - other sections already explain concepts in depth. Just define the jargon.',
      suggestedWordCount: 400,
    },
  ],
};

/**
 * All available article templates
 */
export const ARTICLE_TEMPLATES: ArticleTemplate[] = [
  PARASITE_TEMPLATE,
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): ArticleTemplate | undefined {
  return ARTICLE_TEMPLATES.find(t => t.id === id);
}

/**
 * Get all templates
 */
export function getAllTemplates(): ArticleTemplate[] {
  return ARTICLE_TEMPLATES;
}
