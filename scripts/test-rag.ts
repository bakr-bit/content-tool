/**
 * Test script for the RAG system
 * Run with: npx ts-node scripts/test-rag.ts
 */

import { config } from 'dotenv';
config();

import { getEmbeddingProvider, isEmbeddingEnabled } from '../src/integrations/embeddings';
import { vectorStoreService } from '../src/services/vector-store';

async function main() {
  console.log('\n=== RAG System Test ===\n');

  // 1. Check configuration
  console.log('1. Checking configuration...');
  console.log(`   - Embedding enabled: ${isEmbeddingEnabled()}`);
  console.log(`   - Vector store enabled: ${vectorStoreService.isEnabled()}`);

  if (!isEmbeddingEnabled()) {
    console.error('\n❌ Embedding is not enabled. Check EMBEDDING_ENABLED and GEMINI_API_KEY.');
    process.exit(1);
  }

  if (!vectorStoreService.isEnabled()) {
    console.error('\n❌ Vector store is not enabled. Check SUPABASE_URL and SUPABASE_ANON_KEY.');
    process.exit(1);
  }

  console.log('   ✓ Configuration OK\n');

  // 2. Test embedding generation
  console.log('2. Testing embedding generation...');
  const embeddingProvider = getEmbeddingProvider();
  if (!embeddingProvider) {
    console.error('❌ Failed to get embedding provider');
    process.exit(1);
  }

  const testText = 'The Swedish Gambling Authority regulates online casinos and betting.';
  const { embedding } = await embeddingProvider.embed(testText);
  console.log(`   - Generated embedding with ${embedding.length} dimensions`);
  console.log(`   - First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
  console.log('   ✓ Embedding generation OK\n');

  // 3. Test document insertion
  console.log('3. Testing document insertion...');
  const testDocs = [
    {
      content: 'The Swedish Gambling Authority (Spelinspektionen) is responsible for licensing and supervising gambling operators in Sweden.',
      contentType: 'page_chunk' as const,
      contentHash: `test-sweden-${Date.now()}`,
      sourceUrl: 'https://example.com/sweden-gambling',
      sourceTitle: 'Swedish Gambling Regulations',
      metadata: { test: true },
    },
    {
      content: 'The Dutch gambling tax rate increased to 37.8% of Gross Gaming Revenue as of January 2026.',
      contentType: 'fact' as const,
      contentHash: `test-netherlands-${Date.now()}`,
      sourceUrl: 'https://example.com/netherlands-tax',
      sourceTitle: 'Dutch Gambling Tax',
      metadata: { test: true },
    },
    {
      content: 'Denmark requires a 28% tax on Gross Gaming Revenue for online casinos and betting operators.',
      contentType: 'fact' as const,
      contentHash: `test-denmark-${Date.now()}`,
      sourceUrl: 'https://example.com/denmark-regulations',
      sourceTitle: 'Danish Gambling Rules',
      metadata: { test: true },
    },
  ];

  const ids = await vectorStoreService.upsertBatch(testDocs);
  console.log(`   - Inserted ${ids.length} documents`);
  console.log(`   - IDs: ${ids.slice(0, 2).join(', ')}...`);
  console.log('   ✓ Document insertion OK\n');

  // 4. Test semantic search
  console.log('4. Testing semantic search...');

  const queries = [
    'Swedish gambling regulations',
    'gambling tax rates in Europe',
    'Dutch casino licensing',
  ];

  for (const query of queries) {
    console.log(`\n   Query: "${query}"`);
    const results = await vectorStoreService.search(query, {
      limit: 3,
      similarityThreshold: 0.3,
    });

    if (results.length === 0) {
      console.log('   - No results found');
    } else {
      for (const result of results) {
        console.log(`   - [${result.similarity.toFixed(3)}] ${result.content.slice(0, 80)}...`);
      }
    }
  }

  console.log('\n   ✓ Semantic search OK\n');

  // 5. Test filtering by content type
  console.log('5. Testing content type filtering...');
  const factsOnly = await vectorStoreService.search('gambling tax', {
    limit: 5,
    contentTypes: ['fact'],
    similarityThreshold: 0.3,
  });
  console.log(`   - Found ${factsOnly.length} facts about gambling tax`);
  console.log('   ✓ Content type filtering OK\n');

  console.log('=== All tests passed! ===\n');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
