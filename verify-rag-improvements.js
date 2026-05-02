import 'dotenv/config';
import {
  getAvailablePDFs,
  extractTextFromPDF,
  createVectorStore,
  vectorStores,
  queryVectorStore,
  clearAllVectorStores
} from './rag.js';

async function verifyRAGImprovements() {
  console.log('=== Verifying RAG Improvements ===\n');

  const pdfs = getAvailablePDFs();
  if (pdfs.length === 0) {
    console.log('❌ No PDF files found');
    return false;
  }

  clearAllVectorStores();

  // Test with first PDF
  const selectedPDF = pdfs[0];
  console.log(`Testing with: ${selectedPDF.name}\n`);

  try {
    const text = await extractTextFromPDF(selectedPDF.path);
    console.log(`✓ Extracted ${text.length} characters from PDF\n`);

    // Create vector store
    const startTime = Date.now();
    const vectorStore = await createVectorStore(selectedPDF.name, text.substring(0, 15000));
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    vectorStores.set(selectedPDF.name, vectorStore);

    console.log(`✓ Created vector store with ${vectorStore.documents.length} chunks in ${duration}s\n`);

    // Verify chunking improvements
    const avgChunkSize = text.substring(0, 15000).length / vectorStore.documents.length;
    console.log('Chunking Statistics:');
    console.log(`  - Total chunks: ${vectorStore.documents.length}`);
    console.log(`  - Average chunk size: ${Math.round(avgChunkSize)} characters`);
    console.log(`  - Coverage: ${(vectorStore.documents.length * avgChunkSize / 15000 * 100).toFixed(1)}% of text\n`);

    // Test query with relevance scores
    const testQuery = 'What is this document about?';
    const docs = await queryVectorStore(selectedPDF.name, testQuery, 3);

    console.log('Query Results for: "' + testQuery + '"');
    console.log(`  - Retrieved ${docs.length} documents\n`);

    let hasGoodResults = false;
    docs.forEach((doc, i) => {
      const relevanceScore = Math.round(doc.score * 100);
      console.log(`  Document ${i + 1}:`);
      console.log(`    - Relevance: ${relevanceScore}%`);
      console.log(`    - Content preview: ${doc.content.substring(0, 80)}...`);
      
      if (relevanceScore >= 35) {
        hasGoodResults = true;
      }
    });

    console.log('\n=== Verification Results ===\n');
    
    const improvements = [];
    
    // Check chunk count improvement
    if (vectorStore.documents.length > 10) {
      improvements.push('✓ Chunking improved: ' + vectorStore.documents.length + ' chunks created');
    } else {
      improvements.push('⚠️  Low chunk count: only ' + vectorStore.documents.length + ' chunks');
    }
    
    // Check relevance scores (35% is good for semantic search, baseline was ~25%)
    const avgRelevance = docs.reduce((sum, doc) => sum + doc.score, 0) / docs.length;
    if (avgRelevance >= 0.30) {
      improvements.push('✓ Relevance scores improved: average ' + Math.round(avgRelevance * 100) + '%');
    } else {
      improvements.push('⚠️  Low relevance scores: average ' + Math.round(avgRelevance * 100) + '% (baseline was ~25%)');
    }
    
    // Check result quality
    if (hasGoodResults) {
      improvements.push('✓ Good results retrieved with high relevance');
    } else {
      improvements.push('⚠️  Results need improvement');
    }

    improvements.forEach(improvement => console.log(improvement));

    const allGood = vectorStore.documents.length > 10 && avgRelevance >= 0.30;
    
    console.log('\n' + (allGood ? '✅ RAG system is working well!' : '⚠️  Some improvements still needed'));
    
    return allGood;

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    return false;
  }
}

verifyRAGImprovements().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
