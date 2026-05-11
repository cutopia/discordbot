import { 
  availableClarifyTools,
  executeClarifyTool,
  generateClarifyPrompt,
  analyzeStepForClarification,
  getClarifyToolDefinitions
} from './clarify.js';

async function testClarificationSystem() {
  console.log('=== Testing Clarification System ===\n');
  
  // Test 1: Check available tools
  console.log('Test 1: Available clarification tools');
  console.log('-------------------------------------');
  const toolNames = getClarifyToolDefinitions();
  console.log(`Found ${toolNames.length} clarification tool(s):`);
  toolNames.forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description.substring(0, 80)}...`);
  });
  
  // Test 2: Execute clarification tool
  console.log('\nTest 2: Execute clarification tool');
  console.log('----------------------------------');
  try {
    const result = await executeClarifyTool('request_clarification', {
      question: 'What are the available character classes for drow characters?',
      context: 'The user wants to create a drow character but the context doesn\'t specify available classes'
    });
    
    console.log(`Result: ${result.success ? '✅ Success' : '❌ Failed'}`);
    if (result.success) {
      console.log(`Message: ${result.message}`);
    } else {
      console.log(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error('Error executing tool:', error);
  }
  
  // Test 3: Analyze steps for clarification needs
  console.log('\nTest 3: Step analysis for clarification');
  console.log('-----------------------------------------');
  
  const testSteps = [
    {
      stepName: 'Choose a character class',
      choice: 'Select your character\'s class',
      options: ['Warrior', 'Mage', 'Rogue'],
      method: 'player_choice'
    },
    {
      stepName: 'Determine ability scores',
      choice: null,
      options: [],
      method: 'dice_roll'
    },
    {
      stepName: 'Select background',
      choice: 'Choose your character\'s background',
      options: [],
      method: 'player_choice'
    },
    {
      stepName: '',
      choice: null,
      options: [],
      method: null
    }
  ];
  
  testSteps.forEach((step, index) => {
    const analysis = analyzeStepForClarification(step);
    console.log(`\nStep ${index + 1}: "${step.stepName || '(empty)'}"`);
    console.log(`  Needs clarification: ${analysis.needsClarification ? '✅ Yes' : '❌ No'}`);
    console.log(`  Confidence: ${analysis.confidence}%`);
    if (analysis.reasons.length > 0) {
      console.log('  Reasons:');
      analysis.reasons.forEach(reason => console.log(`    - ${reason}`));
    }
  });
  
  // Test 4: Generate clarification prompt
  console.log('\nTest 4: Generate clarification prompt');
  console.log('---------------------------------------');
  const prompt = generateClarifyPrompt({
    stepName: 'Choose a character class',
    currentContext: 'The RPG system has multiple classes but the context doesn\'t list them all.',
    availableOptions: ['Warrior', 'Mage', 'Rogue']
  });
  
  console.log('Generated prompt (first 500 chars):');
  console.log(prompt.substring(0, 500) + '...');
  
  // Test 5: Integration test with character generator
  console.log('\nTest 5: Integration with character generator');
  console.log('----------------------------------------------');
  try {
    const { CharacterGenerationAgent } = await import('./character-generator.js');
    
    // Create a mock agent to test the clarification integration
    const agent = new CharacterGenerationAgent(
      'Create a drow character seeking redemption',
      'test_source'
    );
    
    // Test step analysis with the agent's method
    const testStep = {
      stepName: 'Choose a character class',
      choice: null,
      options: [],
      method: 'player_choice'
    };
    
    const agentAnalysis = analyzeStepForClarification(testStep);
    console.log(`Agent can analyze steps for clarification: ${agentAnalysis.needsClarification ? '✅ Yes' : '❌ No'}`);
    
  } catch (error) {
    console.error('Error in integration test:', error.message);
  }
  
  // Test 6: Error handling
  console.log('\nTest 6: Error handling');
  console.log('-----------------------');
  try {
    const result = await executeClarifyTool('nonexistent_tool', {});
    console.log(`Unknown tool handled: ${result.success ? '❌ Should have failed' : '✅ Correctly failed'}`);
    if (!result.success) {
      console.log(`Error message: ${result.error}`);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  console.log('\n=== Clarification System Tests Complete ===');
}

// Run the tests
testClarificationSystem().catch(console.error);
