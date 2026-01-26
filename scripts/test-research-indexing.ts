/**
 * Test research indexing into RAG
 * Run with: npx ts-node scripts/test-research-indexing.ts
 */

import { config } from 'dotenv';
config();

import { deepResearchService } from '../src/services/deep-research/deep-research.service';
import { vectorStoreService } from '../src/services/vector-store';

async function main() {
  console.log('\n=== Research Indexing Test ===\n');

  if (!vectorStoreService.isEnabled()) {
    console.error('❌ Vector store not enabled');
    process.exit(1);
  }

  // 1. Run a research query
  const keyword = 'online gambling regulations Sweden 2026';
  console.log(`1. Running research on: "${keyword}"\n`);

  const { research, gaps } = await deepResearchService.researchTopic(
    keyword,
    [], // No competitor content for this test
    { enabled: true, depth: 'shallow', topicLevelResearch: true, sectionLevelResearch: false }
  );

  console.log(`   Research complete:`);
  console.log(`   - Answer length: ${research.answer.length} chars`);
  console.log(`   - Sources found: ${research.sources.length}`);
  console.log(`   - Facts extracted: ${research.facts.length}`);
  console.log(`   - Gaps identified: ${gaps.gaps.length}\n`);

  // Show some extracted facts
  if (research.facts.length > 0) {
    console.log('   Sample facts:');
    for (const fact of research.facts.slice(0, 3)) {
      console.log(`   - [${fact.type}] ${fact.fact.slice(0, 80)}...`);
    }
    console.log('');
  }

  // 2. Wait a moment for async indexing to complete
  console.log('2. Waiting for async indexing to complete...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 3. Search the vector store for the indexed content
  console.log('3. Searching vector store for indexed research...\n');

  const testQueries = [
    'Swedish gambling regulations',
    'gambling tax rate Sweden',
    'Spelinspektionen licensing',
  ];

  for (const query of testQueries) {
    console.log(`   Query: "${query}"`);

    // Search all content types
    const results = await vectorStoreService.search(query, {
      limit: 3,
      similarityThreshold: 0.5,
    });

    if (results.length === 0) {
      console.log('   - No results found\n');
    } else {
      for (const result of results) {
        const typeLabel = result.contentType.padEnd(16);
        console.log(`   - [${result.similarity.toFixed(3)}] [${typeLabel}] ${result.content.slice(0, 60)}...`);
      }
      console.log('');
    }
  }

  // 4. Check specifically for research_answer and fact types
  console.log('4. Checking indexed content by type...\n');

  const factsSearch = await vectorStoreService.search(keyword, {
    limit: 5,
    contentTypes: ['fact'],
    similarityThreshold: 0.4,
  });
  console.log(`   Facts indexed: ${factsSearch.length}`);

  const answersSearch = await vectorStoreService.search(keyword, {
    limit: 5,
    contentTypes: ['research_answer'],
    similarityThreshold: 0.4,
  });
  console.log(`   Research answers indexed: ${answersSearch.length}`);

  const kbSearch = await vectorStoreService.search(keyword, {
    limit: 5,
    contentTypes: ['knowledge_base'],
    similarityThreshold: 0.4,
  });
  console.log(`   Knowledge base matches: ${kbSearch.length}`);

  console.log('\n=== Test complete ===\n');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
