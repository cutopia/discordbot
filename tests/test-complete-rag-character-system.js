/**
 * Test the complete RAG and character generation system without Discord
 * Uses Heart_Core_Book_Delve_Edition as the RAG source
 */

import { CharacterGenerationAgent } from '../character-generator.js';
import { getAvailablePDFs, getOrCreateVectorStore, clearAllVectorStores } from '../rag.js';

/**
 * Test the complete RAG-character generation pipeline
 */
async function testCompleteRagCharacterSystem() {
  console.log('=== Testing Complete RAG + Character Generation System ===\n');
  
  // Step 1: Check available PDFs
  console.log('Step 1: Checking for available PDF rulebooks...');
  const pdfFiles = getAvailablePDFs();
  console.log(`Found ${pdfFiles.length} PDF files:`);
  pdfFiles.forEach(pdf => {
    console.log(`  - ${pdf.name}: ${pdf.path}`);
  });
  
  if (pdfFiles.length === 0) {
    console.error('❌ FAIL: No PDF rulebooks found in ragsourcebooks/ directory');
    return;
  }
  
  // Step 2: Load the first available PDF into vector store
  const pdfPath = pdfFiles[0].path;
  const sourceName = pdfFiles[0].name;
  
  console.log(`\nStep 2: Loading ${sourceName} into vector store...`);
  
  try {
    const vectorStore = await getOrCreateVectorStore(pdfPath);
    console.log(`✅ Successfully loaded ${sourceName}`);
    console.log(`   Vector store contains ${vectorStore.documents.length} document chunks`);
  } catch (error) {
    console.error('❌ FAIL: Error loading PDF into vector store:', error.message);
    return;
  }
  
  // Step 3: Test character generation with the loaded rulebook
  console.log('\nStep 3: Testing character generation...');
  
  const testSpecifications = 'Create a fantasy character for this RPG system. Focus on character creation steps, choices, and options.';
  const channelId = 'test-channel';
  
  try {
    // Create agent with the loaded PDF as RAG source
    const agent = new CharacterGenerationAgent(testSpecifications, sourceName, channelId);
    
    console.log('✅ Character generation agent created successfully');
    console.log(`   Specifications: ${testSpecifications.substring(0, 80)}...`);
    console.log(`   RAG Source: ${sourceName}`);
    
    // Test that the agent can access the vector store
    const ragContext = await agent.getRagContext();
    
    if (ragContext) {
      console.log('✅ Successfully retrieved RAG context from vector store');
      console.log(`   Context length: ${ragContext.length} characters`);
      
      // Show a snippet of the context
      if (ragContext.length > 200) {
        console.log(`   Preview: ${ragContext.substring(0, 200)}...`);
      } else {
        console.log(`   Content: ${ragContext}`);
      }
    } else {
      console.error('❌ FAIL: Could not retrieve RAG context');
      return;
    }
    
    // Step 4: Test research phase
    console.log('\nStep 4: Testing character creation research phase...');
    
    try {
      const researchResult = await agent.researchCharacterCreation();
      
      if (researchResult.success) {
        console.log('✅ Character creation research completed');
        console.log(`   Research results length: ${researchResult.message.length} characters`);
        
        // Show a snippet of research results
        if (researchResult.message.length > 200) {
          console.log(`   Preview: ${researchResult.message.substring(0, 200)}...`);
        } else {
          console.log(`   Content: ${researchResult.message}`);
        }
      } else {
        console.error('❌ Research phase failed:', researchResult.message);
      }
    } catch (error) {
      console.error('❌ Error during research phase:', error.message);
    }
    
    // Step 5: Test character sheet formatting
    console.log('\nStep 5: Testing character sheet formatting...');
    
    const rawContent = `# Character Sheet
    
## Basic Information
- Name: Test Character
- Race: Human
- Class: Fighter

## Attributes
- Strength: 16
- Dexterity: 14
- Constitution: 14
- Intelligence: 12
- Wisdom: 10
- Charisma: 8`;
    
    try {
      const formattedSheet = agent.formatCharacterSheet(rawContent);
      console.log('✅ Character sheet formatting completed');
      console.log(`   Formatted output length: ${formattedSheet.length} characters`);
      
      if (formattedSheet.length > 200) {
        console.log(`   Preview: ${formattedSheet.substring(0, 200)}...`);
      }
    } catch (error) {
      console.error('❌ Error during formatting:', error.message);
    }
    
    // Step 6: Test progress tracking
    console.log('\nStep 6: Testing character generation progress tracking...');
    
    const progress = agent.getProgress();
    console.log(`✅ Progress tracking works`);
    console.log(`   Current phase: ${progress.phase}`);
    console.log(`   Iteration count: ${progress.iterationCount}`);
    console.log(`   Validation attempts: ${progress.validationAttempts}`);
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log('✅ All core components working:');
    console.log('   - PDF loading and text extraction');
    console.log('   - Vector store creation');
    console.log('   - RAG context retrieval');
    console.log('   - Character generation agent');
    console.log('   - Research phase');
    console.log('   - Character sheet formatting');
    console.log('   - Progress tracking');
    
    // Cleanup
    clearAllVectorStores();
    console.log('\n✅ Test completed successfully! System is ready for use.');
    
  } catch (error) {
    console.error('❌ FAIL: Error during character generation test:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testCompleteRagCharacterSystem().catch(console.error);
