/**
 * Index knowledge base files and test search
 * Run with: npx ts-node scripts/index-knowledge-base.ts
 */

import { config } from 'dotenv';
config();

import { knowledgeBaseService } from '../src/services/knowledge-base';
import { vectorStoreService } from '../src/services/vector-store';

async function main() {
  console.log('\n=== Knowledge Base Indexer ===\n');

  // Check if vector store is enabled
  if (!vectorStoreService.isEnabled()) {
    console.error('❌ Vector store not enabled. Check your .env configuration.');
    process.exit(1);
  }

  // Index all knowledge base files
  console.log('1. Indexing knowledge base files...\n');
  const { indexed, files } = await knowledgeBaseService.loadAndIndexAll();

  console.log(`   Files processed: ${files.length}`);
  for (const file of files) {
    console.log(`   - ${file.split('/').pop()}`);
  }
  console.log(`   Total entries indexed: ${indexed}\n`);

  if (indexed === 0) {
    console.log('⚠️  No entries indexed. Check your data/ folder for JSON files.\n');
    return;
  }

  // Test searches
  console.log('2. Testing knowledge base search...\n');

  const testQueries = [
    'Swedish gambling tax rate',
    'Dutch online casino regulations',
    'Denmark gambling license requirements',
    'upcoming gambling law changes in Europe',
    'gambling authority responsible for player protection',
  ];

  for (const query of testQueries) {
    console.log(`   Query: "${query}"`);
    const results = await knowledgeBaseService.search(query, { limit: 2 });

    if (results.length === 0) {
      console.log('   - No results found\n');
    } else {
      for (const result of results) {
        const country = result.metadata?.country || 'Unknown';
        const field = result.metadata?.field || '';
        console.log(`   - [${result.similarity.toFixed(3)}] [${country}] ${result.content.slice(0, 80)}...`);
        console.log(`     Citation: ${result.sourceUrl}`);
      }
      console.log('');
    }
  }

  // Test country-specific search
  console.log('3. Testing country-specific search...\n');

  const swedenResults = await knowledgeBaseService.search('gambling regulations', {
    limit: 3,
    country: 'Sweden'
  });

  console.log('   Query: "gambling regulations" (Sweden only)');
  for (const result of swedenResults) {
    console.log(`   - [${result.similarity.toFixed(3)}] ${result.content.slice(0, 80)}...`);
  }

  console.log('\n=== Knowledge base ready! ===\n');
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
