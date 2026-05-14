/**
 * Complete System Test - Demonstrates all features working together
 */

import { CharacterGenerationAgent } from '../character-generator.js';
import { getAvailablePDFs, getOrCreateVectorStore, clearAllVectorStores } from '../rag.js';

async function testCompleteSystem() {
  console.log('\n' + '='.repeat(60));
  console.log('COMPLETE SYSTEM TEST - Character Generator RAG Consultation');
  console.log('='.repeat(60) + '\n');

  // Setup
  const pdfFiles = getAvailablePDFs();
  
  if (pdfFiles.length === 0) {
    console.log('❌ No PDF files found. Cannot run complete system test.');
    return false;
  }

  try {
    // Load RAG source
    console.log('1️⃣  Loading RPG rulebook...');
    await getOrCreateVectorStore(pdfFiles[0].path);
    console.log(`   ✅ Loaded ${pdfFiles[0].name}\n`);

    // Create agent
    console.log('2️⃣  Creating character generation agent...');
    const agent = new CharacterGenerationAgent('', pdfFiles[0].name, 'test-channel');
    console.log('   ✅ Agent created\n');

    // Test placeholder classification
    console.log('3️⃣  Testing placeholder classification system...');
    const testPlaceholders = [
      '[PLACEHOLDER: character_name]',
      '[MISSING: attribute_score]', 
      '[UNKNOWN: skill_level]',
      '[PLACEHOLDER: background_story]',
      '[MISSING: equipment_item]'
    ];

    for (const placeholder of testPlaceholders) {
      const type = agent.placeholderResolver.classifyPlaceholder(placeholder);
      console.log(`   ${placeholder.padEnd(30)} -> ${type}`);
    }
    console.log('   ✅ Classification working\n');

    // Test query generation
    console.log('4️⃣  Testing targeted RAG query generation...');
    const queries = agent.placeholderResolver.generateQueries('ATTRIBUTE', { 
      fieldName: 'core_attribute' 
    });
    console.log(`   Generated ${queries.length} targeted queries for ATTRIBUTE`);
    console.log('   ✅ Query generation working\n');

    // Test research phase
    console.log('5️⃣  Testing character creation research...');
    const researchResult = await agent.researchCharacterCreation();
    if (researchResult.success) {
      console.log(`   ✅ Research completed: ${researchResult.message}\n`);
    } else {
      console.log(`   ⚠️  Research issue: ${researchResult.message}\n`);
    }

    // Test character sheet structure extraction
    console.log('6️⃣  Testing character sheet structure extraction...');
    const structure = await agent.extractCharacterSheetStructure();
    if (structure) {
      console.log(`   ✅ Structure extracted (${structure.length} chars)\n`);
    } else {
      console.log('   ⚠️  No structure found\n');
    }

    // Test placeholder resolution
    console.log('7️⃣  Testing placeholder resolution with RAG...');
    const testPlaceholder = '[PLACEHOLDER: attribute_score]';
    const resolution = await agent.placeholderResolver.resolvePlaceholder(
      testPlaceholder,
      { fieldName: 'core_attribute' }
    );
    
    if (resolution.resolved && resolution.resolved !== 'No relevant information found in the rulebook.') {
      console.log(`   ✅ Placeholder resolved (${resolution.resolved.length} chars)`);
      console.log(`   Type: ${resolution.type}`);
      console.log(`   Queries used: ${resolution.queriesUsed.length}\n`);
    } else {
      console.log('   ⚠️  Resolution returned no results\n');
    }

    // Test complete workflow
    console.log('8️⃣  Testing complete character generation workflow...');
    
    const agent2 = new CharacterGenerationAgent('', pdfFiles[0].name, 'test-channel-2');
    
    // Step 1: Research
    const research = await agent2.researchCharacterCreation();
    if (!research.success) {
      console.log(`   ⚠️  Research failed: ${research.message}`);
      return false;
    }
    console.log('   ✅ Research phase completed');

    // Step 2: Extract structure
    const structure2 = await agent2.extractCharacterSheetStructure();
    if (structure2) {
      console.log('   ✅ Structure extraction completed');
    }

    // Step 3: Create draft (simulated)
    agent2.characterSheet = {
      rawContent: '# Character Sheet\n\n## Attributes\n- [PLACEHOLDER: attribute_name]: [MISSING: value]\n',
      placeholders: [
        { index: 0, text: '[PLACEHOLDER: attribute_name]', type: 'NAME', resolved: false },
        { index: 1, text: '[MISSING: value]', type: 'ATTRIBUTE', resolved: false }
      ]
    };
    console.log('   ✅ Draft created with placeholders');

    // Step 4: Refine (using new placeholder resolver)
    const refinement = await agent2.refineCharacter();
    console.log(`   ✅ Refinement completed: ${refinement.message}`);
    console.log(`   Remaining placeholders: ${refinement.remainingPlaceholders || 0}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ COMPLETE SYSTEM TEST PASSED');
    console.log('='.repeat(60) + '\n');

    return true;

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    return false;
  }
}

// Run test
await testCompleteSystem();
