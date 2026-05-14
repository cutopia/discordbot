/**
 * Debug script to trace RAG context formatting issue
 */

import { getAvailablePDFs, getOrCreateVectorStore, queryVectorStore, clearAllVectorStores } from '../rag.js';

async function debugRagContext() {
  console.log('=== Debugging RAG Context Formatting ===\n');
  
  // Get available PDFs
  const pdfFiles = getAvailablePDFs();
  if (pdfFiles.length === 0) {
    console.error('No PDF files found');
    return;
  }
  
  const pdfPath = pdfFiles[0].path;
  const sourceName = pdfFiles[0].name;
  
  // Load vector store
  console.log(`Loading ${sourceName}...`);
  const vectorStore = await getOrCreateVectorStore(pdfPath);
  
  // Test query
  const query = 'What are the steps for character creation?';
  console.log(`\nQuerying with: "${query}"\n`);
  
  // Get results directly from similaritySearch
  console.log('Step 1: Getting raw results from vectorStore.similaritySearch()');
  const rawDocs = await vectorStore.similaritySearch(query, 3);
  console.log(`Retrieved ${rawDocs.length} documents`);
  
  rawDocs.forEach((doc, i) => {
    console.log(`\nDocument ${i + 1}:`);
    console.log(`  Type: ${typeof doc}`);
    console.log(`  Keys: ${Object.keys(doc).join(', ')}`);
    console.log(`  Has pageContent: ${'pageContent' in doc}`);
    console.log(`  Has content: ${'content' in doc}`);
    
    if ('pageContent' in doc) {
      const pc = doc.pageContent;
      console.log(`  pageContent type: ${typeof pc}`);
      console.log(`  pageContent length: ${pc.length}`);
      console.log(`  pageContent preview: "${pc.substring(0, 100)}..."`);
    }
    
    if ('content' in doc) {
      const c = doc.content;
      console.log(`  content type: ${typeof c}`);
      console.log(`  content length: ${c.length}`);
      console.log(`  content preview: "${c.substring(0, 100)}..."`);
    }
  });
  
  // Get results from queryVectorStore
  console.log('\n\nStep 2: Getting results from queryVectorStore()');
  const queriedDocs = await queryVectorStore(sourceName, query, 3);
  console.log(`Retrieved ${queriedDocs.length} documents`);
  
  queriedDocs.forEach((doc, i) => {
    console.log(`\nDocument ${i + 1}:`);
    console.log(`  Type: ${typeof doc}`);
    console.log(`  Keys: ${Object.keys(doc).join(', ')}`);
    console.log(`  Has pageContent: ${'pageContent' in doc}`);
    console.log(`  Has content: ${'content' in doc}`);
    
    if ('pageContent' in doc) {
      const pc = doc.pageContent;
      console.log(`  pageContent type: ${typeof pc}`);
      console.log(`  pageContent length: ${pc.length}`);
      console.log(`  pageContent preview: "${pc.substring(0, 100)}..."`);
    }
    
    if ('content' in doc) {
      const c = doc.content;
      console.log(`  content type: ${typeof c}`);
      console.log(`  content length: ${c.length}`);
      console.log(`  content preview: "${c.substring(0, 100)}..."`);
    }
  });
  
  // Test string conversion
  console.log('\n\nStep 3: Testing string conversion');
  const testDoc = queriedDocs[0];
  console.log(`Direct string conversion: "${String(testDoc)}"`);
  console.log(`JSON.stringify: ${JSON.stringify(testDoc, null, 2).substring(0, 200)}...`);
  
  // Test template replacement
  console.log('\n\nStep 4: Testing template replacement');
  const context = queriedDocs.map((doc, index) => {
    const relevanceScore = Math.round(doc.score * 100);
    const content = doc.pageContent || doc.content || '';
    return `Context ${index + 1} (Relevance: ${relevanceScore}%):\n${content}\n`;
  }).join('\n---\n');
  
  console.log(`Formatted context length: ${context.length}`);
  console.log(`First 500 chars of formatted context:\n${context.substring(0, 500)}...`);
  
  // Cleanup
  clearAllVectorStores();
}

debugRagContext().catch(console.error);
