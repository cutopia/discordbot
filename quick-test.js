import { queryVectorStore, getOrCreateVectorStore, clearAllVectorStores } from './rag.js';

async function quickTest() {
  console.log('=== Quick RAG Test ===\n');
  
  const pdfPath = './ragsourcebooks/Those_Dark_Places.pdf';
  const sourceName = 'Those_Dark_Places';
  
  try {
    // Create vector store
    console.log(`Creating vector store for "${sourceName}"...`);
    await getOrCreateVectorStore(pdfPath);
    
    // Test character creation query with expanded results
    const primaryQuery = "What are the step-by-step instructions for creating a player character in this RPG system?";
    
    console.log(`\nQuerying with k=10 (expanded)...\n`);
    const docs = await queryVectorStore(sourceName, primaryQuery, 10);
    
    console.log(`\n✅ Retrieved ${docs.length} documents\n`);
    
    if (docs.length > 0) {
      console.log('Document details:');
      docs.forEach((doc, i) => {
        const contentLength = doc.content ? doc.content.length : (doc.pageContent ? doc.pageContent.length : 0);
        console.log(`  ${i + 1}. Score: ${Math.round(doc.score * 100)}%, Length: ${contentLength} chars`);
      });
      
      // Show first document preview
      if (docs[0].content) {
        console.log(`\n📄 First document preview (${Math.min(200, docs[0].content.length)} chars):`);
        console.log(docs[0].content.substring(0, 200) + '...');
      }
    } else {
      console.log('⚠️  No documents retrieved');
    }
    
    clearAllVectorStores();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

quickTest();
