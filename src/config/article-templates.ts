import { ArticleTemplate } from '../types/article-template';

/**
 * PARASITE Template - Comprehensive Affiliate Article (7-8k words)
 *
 * Designed for high-converting affiliate content with:
 * - Strong EEAT signals (methodology, credentials)
 * - Multiple ranking tables for different intents
 * - Individual reviews for each ranked item
 * - Legal/compliance sections for trust
 * - Comprehensive FAQ coverage
 */
export const PARASITE_TEMPLATE: ArticleTemplate = {
  id: 'parasite',
  name: 'Parasite (7-8k Affiliate)',
  description: 'Comprehensive affiliate article with main ranking, category rankings, individual reviews, and extensive FAQs. Ideal for competitive keywords.',
  icon: 'Bug',
  category: 'affiliate',
  articleSize: {
    preset: 'custom',
    targetWordCount: 7500,
    minHeadings: 25,
    maxHeadings: 30,
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
      purpose: 'Top 3 picks summary for skimmers who want fast answers. Include key differentiators for each pick.',
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
          purpose: 'Top 3-5 for users who prioritize speed. Include specific timeframes.',
          suggestedWordCount: 150,
        },
        {
          id: 'category-crypto',
          sectionType: 'category_crypto',
          headingGuidance: 'A heading for crypto-friendly options (e.g., "Best for Crypto Users" or "Top Bitcoin Options")',
          level: 3,
          componentType: 'category_ranking',
          purpose: 'Top 3-5 for crypto users. Include supported coins and any crypto-specific bonuses.',
          suggestedWordCount: 150,
        },
        {
          id: 'category-bonuses',
          sectionType: 'category_bonuses',
          headingGuidance: 'A heading for best welcome offers (e.g., "Best Welcome Bonuses" or "Biggest Sign-Up Offers")',
          level: 3,
          componentType: 'category_ranking',
          purpose: 'Top 3-5 for bonus hunters. Include bonus amounts and wagering requirements.',
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
      headingGuidance: 'A heading about legal/regulatory aspects (e.g., "Legal Status" or "Regulation & Player Protection")',
      level: 2,
      componentType: 'legal_rg',
      purpose: 'Legal status in target jurisdiction, player protection measures, responsible gambling resources. Include helpline numbers.',
      suggestedWordCount: 400,
    },
    // 19. Comparison Table
    {
      id: 'comparison',
      sectionType: 'comparison',
      headingGuidance: 'A heading comparing two main options/approaches (e.g., "Regulated vs Offshore" or "Type A vs Type B")',
      level: 2,
      componentType: 'comparison',
      purpose: 'Two-column comparison table (e.g., regulated vs non-regulated). Help readers understand trade-offs.',
      suggestedWordCount: 350,
    },
    // 20. Tax Considerations
    {
      id: 'tax',
      sectionType: 'tax',
      headingGuidance: 'A heading about tax implications (e.g., "Tax Considerations" or "Do You Need to Pay Tax?")',
      level: 2,
      componentType: 'prose',
      purpose: 'Tax considerations for the target market with appropriate disclaimers. Point to official resources.',
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
      purpose: 'Common questions (6-8) covering the most searched queries. Target featured snippets.',
      suggestedWordCount: 400,
    },
    // 24. Conclusion
    {
      id: 'conclusion',
      sectionType: 'conclusion',
      headingGuidance: 'A concluding heading with a recommendation focus (e.g., "Final Verdict" or "Our Recommendation")',
      level: 2,
      componentType: 'prose',
      purpose: 'Summary of key recommendations with clear next steps. Strong CTA for top pick.',
      suggestedWordCount: 200,
    },
    // 25. Deep Dive
    {
      id: 'deep-dive',
      sectionType: 'deep_dive',
      headingGuidance: 'A heading for additional in-depth coverage (e.g., "Deep Dive" or "Advanced Topics")',
      level: 2,
      componentType: 'prose',
      purpose: 'Additional in-depth topics that demonstrate expertise. Cover edge cases and advanced considerations.',
      suggestedWordCount: 500,
    },
    // 26. Extended FAQ
    {
      id: 'extended-faq',
      sectionType: 'extended_faq',
      headingGuidance: 'A heading for additional questions (e.g., "More Questions" or "Additional FAQ")',
      level: 2,
      componentType: 'faq',
      purpose: 'Additional 12 detailed questions covering long-tail queries. Target additional featured snippets.',
      suggestedWordCount: 600,
    },
    // 27. Glossary
    {
      id: 'glossary',
      sectionType: 'glossary',
      headingGuidance: 'A heading for terminology definitions (e.g., "Glossary" or "Key Terms Explained")',
      level: 2,
      componentType: 'glossary',
      purpose: 'Key terms and definitions for newcomers. Also helps with topical authority.',
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
