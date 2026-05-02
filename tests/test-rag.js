import 'dotenv/config';
import { getAvailablePDFs, extractTextFromPDF, createVectorStore, queryVectorStore, vectorStores } from '../rag.js';

async function testRAG() {
  console.log('=== Testing RAG Functionality ===\n');

  // Test 1: Get available PDFs
  console.log('1. Checking available PDF sources...');
  const pdfs = getAvailablePDFs();
  console.log(`Found ${pdfs.length} PDF(s):`);
  pdfs.forEach(pdf => {
    console.log(`   - ${pdf.name}: ${pdf.path}`);
  });
  console.log();

  if (pdfs.length === 0) {
    console.log('No PDF files found. Please add PDFs to the ragsourcebooks directory.');
    return;
  }

  // Test 2: Extract text from first PDF
  const testPDF = pdfs[0];
  console.log(`2. Testing text extraction from ${testPDF.name}...`);
  
  let extractedText;
  try {
    const startTime = Date.now();
    extractedText = await extractTextFromPDF(testPDF.path);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`   ✓ Successfully extracted ${extractedText.length} characters in ${duration}s`);
    console.log(`   First 500 chars: "${extractedText.substring(0, 500)}..."`);
    console.log();
  } catch (error) {
    console.error(`   ✗ Error extracting text: ${error.message}`);
    return;
  }

  // Test 3: Create vector store
  console.log('3. Creating vector store...');
  
  try {
    const startTime = Date.now();
    const vectorStore = await createVectorStore(testPDF.name, extractedText.substring(0, 5000)); // Use first 5000 chars for testing
    
    // Store it in the global map so we can query it later
    vectorStores.set(testPDF.name, vectorStore);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`   ✓ Vector store created in ${duration}s`);
    console.log();
  } catch (error) {
    console.error(`   ✗ Error creating vector store: ${error.message}`);
    console.log('   Note: This might be due to missing OpenAI API key. For local development, consider using a local embedding model.');
    return;
  }

  // Test 4: Query the vector store
  console.log('4. Testing query functionality...');
  
  try {
    const testQuery = 'What is this document about?';
    const docs = await queryVectorStore(testPDF.name, testQuery, 2);
    
    console.log(`   ✓ Found ${docs.length} relevant document(s) for query: "${testQuery}"`);
    docs.forEach((doc, index) => {
      console.log(`   Document ${index + 1}: ${doc.content.substring(0, 150)}...`);
    });
    console.log();
  } catch (error) {
    console.error(`   ✗ Error querying vector store: ${error.message}`);
    return;
  }

  console.log('=== All RAG tests completed successfully! ===');
}

testRAG().catch(console.error);
