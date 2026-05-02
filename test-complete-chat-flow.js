import 'dotenv/config';
import {
  getAvailablePDFs,
  extractTextFromPDF,
  createVectorStore,
  vectorStores,
  queryVectorStore,
  getContextForQuery,
  formatQueryWithPrompt,
  clearAllVectorStores
} from './rag.js';

async function testCompleteChatFlow() {
  console.log('=== Complete Chat Flow Test with RAG ===\n');

  // Step 1: Check available PDFs
  const pdfs = getAvailablePDFs();
  if (pdfs.length === 0) {
    console.log('No PDF files found. Please add PDFs to the ragsourcebooks directory.');
    return;
  }

  console.log(`Found ${pdfs.length} PDF file(s):\n`);
  pdfs.forEach(pdf => console.log(`- ${pdf.name}`));
  console.log();

  // Step 2: Clear any existing vector stores
  clearAllVectorStores();
  console.log('Cleared existing vector stores\n');

  // Step 3: Process the first PDF
  const selectedPDF = pdfs[0];
  console.log(`Processing "${selectedPDF.name}"...\n`);

  try {
    const text = await extractTextFromPDF(selectedPDF.path);
    console.log(`Extracted ${text.length} characters from PDF\n`);

    // Step 4: Create vector store with optimized chunking
    const startTime = Date.now();
    const vectorStore = await createVectorStore(selectedPDF.name, text.substring(0, 20000));
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Store in global map (simulating what happens when user selects a source)
    vectorStores.set(selectedPDF.name, vectorStore);

    console.log(`✓ Created vector store with ${vectorStore.documents.length} chunks in ${duration}s\n`);

    // Step 5: Test various queries
    const testQueries = [
      'What is the setting about?',
      'How do I create a character?',
      'What are the combat rules?',
      'Can you explain the magic system?'
    ];

    console.log('Testing query retrieval:\n');

    for (const query of testQueries) {
      console.log(`Query: "${query}"`);

      // Get context from vector store
      const context = await getContextForQuery(selectedPDF.name, query, 3);
      console.log(`  Context length: ${context.length} characters`);

      // Format with prompt template (simulating what chatbot.js does)
      const formattedPrompt = formatQueryWithPrompt(selectedPDF.name, query, context);
      console.log(`  Formatted prompt length: ${formattedPrompt.length} characters`);

      // Show first part of formatted prompt
      console.log(`  Prompt preview:\n${formattedPrompt.substring(0, 300)}...\n`);
    }

    // Step 6: Demonstrate the complete flow as it would happen in chatbot.js
    console.log('\n=== Simulating Complete Chat Flow ===\n');

    const channelId = 'test-channel-' + Date.now();
    const userMessage = 'What are the combat rules?';

    console.log(`Channel ID: ${channelId}`);
    console.log(`User message: "${userMessage}"`);
    console.log();

    // Get RAG-enhanced message (this is what chatbot.js does)
    let enhancedMessage = userMessage;
    if (vectorStores.has(selectedPDF.name)) {
      try {
        enhancedMessage = await formatQueryWithPrompt(
          selectedPDF.name,
          userMessage,
          await getContextForQuery(selectedPDF.name, userMessage, 3)
        );
        console.log('✓ RAG context retrieved and applied');
      } catch (error) {
        console.log('⚠️  RAG failed, using original message:', error.message);
      }
    }

    console.log(`\nEnhanced message length: ${enhancedMessage.length} characters`);
    console.log(`Enhanced message preview:\n${enhancedMessage.substring(0, 400)}...\n`);

    // Step 7: Show what would be sent to LM Studio
    console.log('=== What Would Be Sent to LM Studio ===\n');
    console.log(enhancedMessage);

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error(`Error during test: ${error.message}`);
    console.error(error.stack);
  }
}

testCompleteChatFlow().catch(console.error);
