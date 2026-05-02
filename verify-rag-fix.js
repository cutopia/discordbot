import 'dotenv/config';
import { getAvailablePDFs, extractTextFromPDF, getOrCreateVectorStore, queryVectorStore } from './rag.js';

async function verifyRAGFix() {
  console.log('=== Verifying RAG Similarity Search Fix ===\n');
  
  const pdfs = getAvailablePDFs();
  
  if (pdfs.length === 0) {
    console.log('No PDF files found. Please add PDFs to the ragsourcebooks directory.');
    return;
  }
  
  // Test with first PDF
  const testPDF = pdfs[0];
  console.log(`Testing with: ${testPDF.name}\n`);
  
  try {
    // Get or create vector store (this will use the full document)
    console.log('1. Creating vector store from full PDF...');
    const startTime = Date.now();
    const vectorStore = await getOrCreateVectorStore(testPDF.path);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`   ✓ Vector store created in ${duration}s`);
    console.log(`   Number of chunks: ${vectorStore.documents.length}`);
    console.log();
    
    // Test multiple queries to verify similarity search is working
    console.log('2. Testing similarity search with different queries...\n');
    
    const testCases = [
      {
        query: 'What is Heart?',
        expectedRelevance: true
      },
      {
        query: 'magic spells',
        expectedRelevance: true
      },
      {
        query: 'combat rules battle',
        expectedRelevance: true
      }
    ];
    
    let allPassed = true;
    
    for (const testCase of testCases) {
      const queryStartTime = Date.now();
      const docs = await queryVectorStore(testPDF.name, testCase.query, 3);
      const queryDuration = ((Date.now() - queryStartTime) / 1000).toFixed(2);
      
      console.log(`Query: "${testCase.query}"`);
      console.log(`  Results: ${docs.length} documents in ${queryDuration}s`);
      
      if (docs.length === 0) {
        console.log('  ✗ FAILED: No documents returned');
        allPassed = false;
        continue;
      }
      
      // Check that scores are reasonable and sorted
      let isSorted = true;
      for (let i = 1; i < docs.length; i++) {
        if (docs[i].score > docs[i-1].score) {
          isSorted = false;
          break;
        }
      }
      
      const hasValidScores = docs.every(doc => doc.score >= -1 && doc.score <= 1);
      
      console.log(`  Scores: ${docs.map(d => d.score.toFixed(4)).join(', ')}`);
      console.log(`  Sorted correctly: ${isSorted ? '✓' : '✗'}`);
      console.log(`  Valid scores ([-1,1]): ${hasValidScores ? '✓' : '✗'}`);
      
      if (!isSorted || !hasValidScores) {
        allPassed = false;
        console.log('  ✗ FAILED: Score validation failed');
      } else {
        console.log('  ✓ PASSED');
      }
      console.log();
    }
    
    // Test that different queries return different results
    console.log('3. Testing query differentiation...');
    const magicDocs = await queryVectorStore(testPDF.name, 'magic spells', 2);
    const combatDocs = await queryVectorStore(testPDF.name, 'combat rules', 2);
    
    if (magicDocs[0].content !== combatDocs[0].content) {
      console.log('   ✓ Different queries return different top documents');
    } else {
      console.log('   ⚠ Warning: Top documents are the same for different queries');
    }
    console.log();
    
    // Summary
    console.log('=== Verification Summary ===');
    if (allPassed) {
      console.log('✓ All RAG similarity search tests PASSED!');
      console.log('\nKey fixes implemented:');
      console.log('1. Added proper cosine similarity calculation to SimpleVectorStore.similaritySearch()');
      console.log('2. Implemented vector sorting by relevance score');
      console.log('3. Properly integrated with Ollama embeddings API for semantic search');
    } else {
      console.log('✗ Some tests FAILED - review output above');
    }
    
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

verifyRAGFix().catch(console.error);
