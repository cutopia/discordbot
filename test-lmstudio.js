import 'dotenv/config';
import { getLMStudioResponse, getLMStudioModels } from './lmstudio.js';

async function testConnection() {
  console.log('Testing LM Studio connection...\n');
  
  try {
    // Test 1: Get available models
    console.log('Fetching available models...');
    const models = await getLMStudioModels();
    
    if (models.length > 0) {
      console.log(`Found ${models.length} model(s):`);
      models.forEach(model => console.log(`- ${model}`));
    } else {
      console.log('No models found. Make sure you have loaded a model in LM Studio.');
    }
    
    // Test 2: Send a test message
    console.log('\nSending test message...');
    const testMessage = 'Hello! Can you introduce yourself in one sentence?';
    const response = await getLMStudioResponse(testMessage);
    
    console.log(`\nTest Message: "${testMessage}"`);
    console.log(`AI Response: ${response}`);
    
    // Test 3: Test conversation history
    console.log('\nTesting conversation history...');
    const followUp = 'What did I just ask you?';
    const followUpResponse = await getLMStudioResponse(followUp, [
      { role: 'user', content: testMessage },
      { role: 'assistant', content: response }
    ]);
    
    console.log(`Follow-up Message: "${followUp}"`);
    console.log(`AI Response: ${followUpResponse}`);
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nMake sure LM Studio is running and the API is accessible.');
    process.exit(1);
  }
}

testConnection();
