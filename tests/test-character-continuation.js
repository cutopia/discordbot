import { generateCharacterWithProgress, formatCharacterSheet } from '../character-generator.js';

// Mock RAG and LMStudio functions to simulate failures
const originalGetRagQuery = global.getRagQuery || null;
const originalGetLMStudioResponse = global.getLMStudioResponse || null;

async function runContinuationTest() {
  console.log('🧪 Testing Character Generation Continuation on Step Failures\n');
  
  // Track which steps were attempted
  const stepsAttempted = [];
  let step1Failed = false;
  let step3Failed = false;
  
  // Mock RAG query to return character creation info
  global.getRagQuery = async (source, topic) => {
    if (topic.includes('steps')) {
      return 'Character creation involves selecting ancestry, calling, class, abilities, equipment, beats, answering questions, and adding finishing details.';
    }
    return 'Mock context for character generation';
  };
  
  // Mock LM Studio response to simulate step failures
  global.getLMStudioResponse = async (prompt) => {
    stepsAttempted.push(prompt.substring(0, 50));
    
    if (prompt.includes('STEP 1') || prompt.includes('Select an ancestry')) {
      if (!step1Failed) {
        // First attempt fails, return invalid data
        step1Failed = true;
        return 'invalid_ancestry'; // Will fail validation
      }
      // Second attempt succeeds
      return '{"ancestry": "human"}';
    }
    
    if (prompt.includes('STEP 2') || prompt.includes('Choose a Calling')) {
      return '{"calling": "Adventure"}';
    }
    
    if (prompt.includes('STEP 3') || prompt.includes('Choose a class')) {
      if (!step3Failed) {
        // First attempt fails
        step3Failed = true;
        return 'invalid_class'; // Will fail validation
      }
      // Second attempt succeeds
      return '{"class": "Cleaver"}';
    }
    
    if (prompt.includes('STEP 4') || prompt.includes('Select abilities')) {
      return '{"majorAbility": "Strength", "minorAbilities": ["Agility", "Intelligence", "Charisma"]}';
    }
    
    if (prompt.includes('STEP 5') || prompt.includes('Choose equipment')) {
      return '["Sword", "Shield", "Armor"]';
    }
    
    if (prompt.includes('STEP 6') || prompt.includes('Select beats')) {
      return '["Survive first delve", "Find a valuable item"]';
    }
    
    if (prompt.includes('STEP 7') || prompt.includes('Answer calling questions')) {
      return '{"callingQuestions": {"Why are you in the Heart?": "Seeking adventure"}}';
    }
    
    if (prompt.includes('STEP 8') || prompt.includes('Add finishing details')) {
      return '{"name": "Test Character", "appearance": "A brave warrior", "personality": "Courageous"}';
    }
    
    return '{}';
  };
  
  try {
    // Test character generation with simulated failures
    const result = await generateCharacterWithProgress('Test specifications', 'test_source');
    
    console.log('📊 Character Generation Results:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📝 Progress updates: ${result.progressUpdates.length}`);
    console.log(`⚠️  Validation failures recorded: ${result.characterData.validationFailures?.length || 0}`);
    
    // Check that all steps were attempted
    const stepNames = result.progressUpdates.map(u => u.name);
    console.log('\n📋 Steps attempted:');
    for (const update of result.progressUpdates) {
      if (update.step > 0) {
        const statusIcon = {
          'completed': '✅',
          'error': '❌',
          'in-progress': '⏳'
        }[update.status] || 'ℹ️';
        
        console.log(`   ${statusIcon} Step ${update.step}: ${update.name}`);
      }
    }
    
    // Verify that failures were recorded but didn't stop execution
    const hasStep1Failure = result.characterData.validationFailures?.some(f => 
      f.step === 'Select an ancestry'
    );
    const hasStep3Failure = result.characterData.validationFailures?.some(f => 
      f.step === 'Choose a class'
    );
    
    console.log('\n🔍 Failure Analysis:');
    console.log(`   Step 1 (ancestry) failure recorded: ${hasStep1Failure}`);
    console.log(`   Step 3 (class) failure recorded: ${hasStep3Failure}`);
    console.log(`   All steps attempted: ${stepsAttempted.length >= 8}`);
    
    // Verify character sheet was still generated despite failures
    const hasCharacterSheet = result.formattedSheet && result.formattedSheet.length > 0;
    const hasValidationSection = result.formattedSheet?.includes('Validation Status');
    const hasFailureMessages = result.formattedSheet?.includes('Validation Failure Messages');
    
    console.log('\n📄 Character Sheet:');
    console.log(`   Generated: ${hasCharacterSheet}`);
    console.log(`   Has validation section: ${hasValidationSection}`);
    console.log(`   Has failure messages: ${hasFailureMessages}`);
    
    // Display the character sheet
    if (result.formattedSheet) {
      console.log('\n📝 Character Sheet Preview:');
      const lines = result.formattedSheet.split('\n').slice(0, 20);
      for (const line of lines) {
        console.log(`   ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
      }
    }
    
    // Summary
    const testPassed = 
      stepsAttempted.length >= 8 && // All steps attempted
      hasStep1Failure && // Failure recorded for step 1
      hasStep3Failure && // Failure recorded for step 3
      hasCharacterSheet && // Sheet still generated
      hasValidationSection && // Validation section present
      hasFailureMessages; // Failure messages included
    
    console.log('\n' + '='.repeat(60));
    if (testPassed) {
      console.log('✅ All continuation tests passed!');
      console.log('   Character generation continued despite step failures.');
      console.log('   Failures were properly recorded and reported.');
    } else {
      console.log('❌ Some continuation tests failed.');
      console.log(`   Steps attempted: ${stepsAttempted.length}/8`);
      console.log(`   Step 1 failure recorded: ${hasStep1Failure}`);
      console.log(`   Step 3 failure recorded: ${hasStep3Failure}`);
      console.log(`   Character sheet generated: ${hasCharacterSheet}`);
    }
    console.log('='.repeat(60));
    
    return testPassed;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  } finally {
    // Restore original functions
    if (originalGetRagQuery) global.getRagQuery = originalGetRagQuery;
    if (originalGetLMStudioResponse) global.getLMStudioResponse = originalGetLMStudioResponse;
  }
}

// Run the test
runContinuationTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
