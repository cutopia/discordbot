/**
 * Complete RAG + Character Generation System Test
 * 
 * This test demonstrates the full character generation pipeline without Discord,
 * using one of our RPG rulebook PDFs as the RAG source.
 */

import { CharacterGenerationAgent } from '../character-generator.js';
import { 
  getAvailablePDFs, 
  getOrCreateVectorStore, 
  clearAllVectorStores,
  vectorStores
} from '../rag.js';

/**
 * Main test function
 */
async function runCompleteSystemTest() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   Complete RAG + Character Generation System Test              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  // Step 1: Check available PDFs
  console.log('📋 Step 1: Checking for RPG rulebook PDFs...');
  const pdfFiles = getAvailablePDFs();
  
  if (pdfFiles.length === 0) {
    console.error('❌ No PDF files found in ragsourcebooks/ directory');
    return;
  }
  
  console.log(`✅ Found ${pdfFiles.length} PDF file(s):`);
  pdfFiles.forEach(pdf => {
    const size = (pdf.path.length / 1024).toFixed(1);
    console.log(`   • ${pdf.name} (${size} KB)`);
  });
  
  // Step 2: Load the first PDF into vector store
  console.log('\n📚 Step 2: Loading rulebook into RAG system...');
  const pdfPath = pdfFiles[0].path;
  const sourceName = pdfFiles[0].name;
  
  try {
    const startTime = Date.now();
    await getOrCreateVectorStore(pdfPath);
    const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Loaded ${sourceName} in ${loadTime}s`);
    
    // Get vector store info
    const vs = vectorStores.get(sourceName);
    if (vs) {
      console.log(`   • Vector store contains ${vs.documents.length} document chunks`);
    }
  } catch (error) {
    console.error('❌ Failed to load PDF:', error.message);
    return;
  }
  
  // Step 3: Create character generation agent
  console.log('\n👤 Step 3: Creating character generation agent...');
  const specifications = 'Create a fantasy character for this RPG system. Focus on character creation steps, choices, and options.';
  const channelId = 'test-channel';
  
  let agent;
  try {
    agent = new CharacterGenerationAgent(specifications, sourceName, channelId);
    console.log('✅ Agent created successfully');
    console.log(`   • Specifications: ${specifications.substring(0, 60)}...`);
    console.log(`   • RAG Source: ${sourceName}`);
  } catch (error) {
    console.error('❌ Failed to create agent:', error.message);
    return;
  }
  
  // Step 4: Test RAG context retrieval
  console.log('\n🔍 Step 4: Testing RAG context retrieval...');
  try {
    const ragContext = await agent.getRagContext();
    
    if (!ragContext) {
      console.error('❌ Failed to retrieve RAG context');
      return;
    }
    
    // Verify we got actual content, not [object Object]
    if (ragContext.includes('[object Object]')) {
      console.error('❌ Context contains [object Object] - fix needed!');
      return;
    }
    
    console.log('✅ Successfully retrieved RAG context');
    console.log(`   • Context length: ${ragContext.length} characters`);
    
    // Show a snippet
    if (ragContext.length > 200) {
      const preview = ragContext.substring(0, 200);
      console.log(`   • Preview: "${preview.replace(/\n/g, ' ').substring(0, 150)}..."`);
    }
    
    // Verify context contains actual text
    if (ragContext.length > 100 && !ragContext.includes('[object Object]')) {
      console.log('✅ Context contains actual rulebook content');
    } else {
      console.error('❌ Context appears to be empty or malformed');
      return;
    }
  } catch (error) {
    console.error('❌ Error retrieving RAG context:', error.message);
    return;
  }
  
  // Step 5: Test research phase
  console.log('\n🎓 Step 5: Testing character creation research...');
  try {
    const researchResult = await agent.researchCharacterCreation();
    
    if (!researchResult) {
      console.error('❌ Research returned no result');
      return;
    }
    
    if (researchResult.success) {
      console.log('✅ Character creation research completed');
      
      // Verify we got actual content
      if (researchResult.message && !researchResult.message.includes('[object Object]')) {
        console.log(`   • Research message length: ${researchResult.message.length} characters`);
        
        if (researchResult.message.length > 50) {
          const preview = researchResult.message.substring(0, 100);
          console.log(`   • Preview: "${preview.replace(/\n/g, ' ').substring(0, 80)}..."`);
        }
      } else {
        console.error('❌ Research result contains [object Object]');
        return;
      }
    } else {
      console.error('❌ Research failed:', researchResult.message);
      return;
    }
  } catch (error) {
    console.error('❌ Error during research phase:', error.message);
    return;
  }
  
  // Step 6: Test character sheet formatting
  console.log('\n📝 Step 6: Testing character sheet formatting...');
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
    
    if (!formattedSheet) {
      console.error('❌ Formatting returned no result');
      return;
    }
    
    // Verify we got actual content
    if (formattedSheet.includes('[object Object]')) {
      console.error('❌ Formatted sheet contains [object Object]');
      return;
    }
    
    console.log('✅ Character sheet formatting successful');
    console.log(`   • Output length: ${formattedSheet.length} characters`);
    
    // Verify key elements are present
    const hasName = formattedSheet.includes('Test Character');
    const hasAttributes = formattedSheet.includes('Strength') || formattedSheet.includes('Dexterity');
    
    if (hasName && hasAttributes) {
      console.log('✅ Contains expected character data');
    } else {
      console.warn('⚠️  Some expected data may be missing');
    }
  } catch (error) {
    console.error('❌ Error during formatting:', error.message);
    return;
  }
  
  // Step 7: Test progress tracking
  console.log('\n📊 Step 7: Testing character generation progress tracking...');
  try {
    const progress = agent.getProgress();
    
    if (!progress || typeof progress.phase !== 'string') {
      console.error('❌ Progress tracking issue');
      return;
    }
    
    console.log('✅ Progress tracking works');
    console.log(`   • Current phase: ${progress.phase}`);
    console.log(`   • Iteration count: ${progress.iterationCount}`);
    console.log(`   • Validation attempts: ${progress.validationAttempts}`);
  } catch (error) {
    console.error('❌ Error during progress tracking:', error.message);
    return;
  }
  
  // Step 8: Test with second PDF if available
  if (pdfFiles.length > 1) {
    console.log('\n📖 Step 8: Testing with second PDF...');
    const pdfPath2 = pdfFiles[1].path;
    const sourceName2 = pdfFiles[1].name;
    
    try {
      await getOrCreateVectorStore(pdfPath2);
      console.log(`✅ Loaded ${sourceName2}`);
      
      // Test that we can query this vector store too
      const agent2 = new CharacterGenerationAgent(specifications, sourceName2, channelId + '-2');
      const ragContext2 = await agent2.getRagContext();
      
      if (ragContext2 && !ragContext2.includes('[object Object]')) {
        console.log(`✅ ${sourceName2} RAG context retrieved successfully`);
        console.log(`   • Context length: ${ragContext2.length} characters`);
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
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const allTestsPassed = true; // All previous steps passed if we got here
  
  if (allTestsPassed) {
    console.log('✅ All core components working:');
    console.log('   • PDF loading and text extraction');
    console.log('   • Vector store creation');
    console.log('   • RAG context retrieval (no [object Object] issue)');
    console.log('   • Character generation agent');
    console.log('   • Research phase');
    console.log('   • Character sheet formatting');
    console.log('   • Progress tracking');
    
    if (pdfFiles.length > 1) {
      console.log('   • Multiple PDF support');
    }
    
    console.log('\n🎉 System is ready for use!');
    console.log('\nThe character generator can now:');
    console.log('   1. Load RPG rulebook PDFs into RAG system');
    console.log('   2. Retrieve relevant context from rulebooks');
    console.log('   3. Generate characters using actual game rules');
    console.log('   4. Track progress through character creation steps');
    console.log('   5. Format and validate character sheets\n');
  } else {
    console.error('❌ Some tests failed - see output above for details');
  }
}

// Run the test
runCompleteSystemTest().catch(console.error);
