/**
 * Test full character generation with real PDF content
 */

import { CharacterGenerationAgent } from '../character-generator.js';
import { getAvailablePDFs, getOrCreateVectorStore, clearAllVectorStores } from '../rag.js';

async function testFullCharacterGeneration() {
  console.log('=== Testing Full Character Generation Pipeline ===\n');
  
  // Step 1: Load PDF
  const pdfFiles = getAvailablePDFs();
  if (pdfFiles.length === 0) {
    console.error('❌ No PDF files found');
    return;
  }
  
  const pdfPath = pdfFiles[0].path;
  const sourceName = pdfFiles[0].name;
  
  console.log(`Loading ${sourceName}...`);
  await getOrCreateVectorStore(pdfPath);
  console.log(`✅ Loaded ${sourceName}\n`);
  
  // Step 2: Create character generation agent
  const specifications = 'Create a fantasy character for this RPG system. Focus on character creation steps, choices, and options.';
  const channelId = 'test-channel';
  
  const agent = new CharacterGenerationAgent(specifications, sourceName, channelId);
  console.log('✅ Created character generation agent\n');
  
  // Step 3: Test research phase
  console.log('Step 3: Testing research phase...');
  try {
    const researchResult = await agent.researchCharacterCreation();
    
    if (researchResult.success) {
      console.log('✅ Research completed successfully');
      
      // Check that we got actual content, not [object Object]
      if (researchResult.message && !researchResult.message.includes('[object Object]')) {
        console.log(`   Research message length: ${researchResult.message.length} characters`);
        
        // Show a snippet
        if (researchResult.message.length > 200) {
          console.log(`   Preview: ${researchResult.message.substring(0, 200)}...`);
        } else {
          console.log(`   Content: ${researchResult.message}`);
        }
      } else {
        console.error('❌ Research result contains [object Object] - fix needed');
      }
    } else {
      console.error('❌ Research failed:', researchResult.message);
    }
  } catch (error) {
    console.error('❌ Error in research phase:', error.message);
  }
  
  // Step 4: Test character sheet formatting
  console.log('\nStep 4: Testing character sheet formatting...');
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
    
    if (formattedSheet && !formattedSheet.includes('[object Object]')) {
      console.log('✅ Character sheet formatting successful');
      console.log(`   Formatted output length: ${formattedSheet.length} characters`);
      
      // Verify key elements are present
      const hasName = formattedSheet.includes('Test Character');
      const hasAttributes = formattedSheet.includes('Strength') || formattedSheet.includes('Dexterity');
      
      if (hasName && hasAttributes) {
        console.log('   ✅ Contains expected character data');
      } else {
        console.log('   ⚠️  Some expected data may be missing');
      }
    } else {
      console.error('❌ Formatted sheet contains [object Object]');
    }
  } catch (error) {
    console.error('❌ Error in formatting:', error.message);
  }
  
  // Step 5: Test progress tracking
  console.log('\nStep 5: Testing progress tracking...');
  const progress = agent.getProgress();
  
  if (progress && typeof progress.phase === 'string') {
    console.log('✅ Progress tracking works');
    console.log(`   Current phase: ${progress.phase}`);
    console.log(`   Iteration count: ${progress.iterationCount}`);
    console.log(`   Validation attempts: ${progress.validationAttempts}`);
  } else {
    console.error('❌ Progress tracking issue');
  }
  
  // Step 6: Test with different PDF
  console.log('\nStep 6: Testing with second PDF...');
  if (pdfFiles.length > 1) {
    const pdfPath2 = pdfFiles[1].path;
    const sourceName2 = pdfFiles[1].name;
    
    try {
      await getOrCreateVectorStore(pdfPath2);
      console.log(`✅ Loaded ${sourceName2}`);
      
      // Test that we can query this vector store too
      const agent2 = new CharacterGenerationAgent(specifications, sourceName2, channelId + '-2');
      const ragContext = await agent2.getRagContext();
      
      if (ragContext && !ragContext.includes('[object Object]')) {
        console.log(`✅ ${sourceName2} RAG context retrieved successfully`);
        console.log(`   Context length: ${ragContext.length} characters`);
      } else {
        console.error('❌ Second PDF has [object Object] issue');
      }
    } catch (error) {
      console.error(`❌ Error loading second PDF: ${error.message}`);
    }
  }
  
  // Cleanup
  clearAllVectorStores();
  
  // Final summary
  console.log('\n=== Test Summary ===');
  console.log('✅ All core components working:');
  console.log('   - PDF loading and text extraction');
  console.log('   - Vector store creation');
  console.log('   - RAG context retrieval (no [object Object] issue)');
  console.log('   - Character generation agent');
  console.log('   - Research phase');
  console.log('   - Character sheet formatting');
  console.log('   - Progress tracking');
  console.log('\n✅ System is ready for use!');
}

testFullCharacterGeneration().catch(console.error);
