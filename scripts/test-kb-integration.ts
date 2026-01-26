/**
 * Test knowledge base integration with deep research
 * Run with: npx ts-node scripts/test-kb-integration.ts
 */

import { config } from 'dotenv';
config();

import { knowledgeBaseService } from '../src/services/knowledge-base';
import { vectorStoreService } from '../src/services/vector-store';

async function main() {
  console.log('\n=== Knowledge Base Integration Test ===\n');

  if (!vectorStoreService.isEnabled()) {
    console.error('❌ Vector store not enabled');
    process.exit(1);
  }

  // Simulate section research queries that would come from article generation
  const sectionQueries = [
    {
      keyword: 'online gambling regulation Europe',
      heading: 'Tax Rates and Revenue',
      description: 'Overview of gambling tax rates across European countries'
    },
    {
      keyword: 'casino licensing requirements',
      heading: 'Regulatory Bodies',
      description: 'Key authorities responsible for gambling oversight'
    },
    {
      keyword: 'gambling industry trends 2026',
      heading: 'Upcoming Legislative Changes',
      description: 'New laws and regulations coming into effect'
    }
  ];

  for (const section of sectionQueries) {
    const query = `${section.keyword} ${section.heading} ${section.description}`;

    console.log(`Section: "${section.heading}"`);
    console.log(`Query: ${query.slice(0, 60)}...\n`);

    const results = await knowledgeBaseService.search(query, { limit: 3 });

    if (results.length === 0) {
      console.log('   No knowledge base results\n');
    } else {
      for (const result of results) {
        const country = result.metadata?.country || '';
        const entity = result.metadata?.entityName || '';
        console.log(`   [${result.similarity.toFixed(3)}] ${country} - ${entity}`);
        console.log(`   Content: ${result.content.slice(0, 100)}...`);
        console.log(`   Citation: ${result.sourceUrl}\n`);
      }
    }
    console.log('---\n');
  }

  console.log('=== Integration test complete ===');
  console.log('\nThe knowledge base will automatically be queried during article generation.');
  console.log('Facts and citations will be included in section research context.\n');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
