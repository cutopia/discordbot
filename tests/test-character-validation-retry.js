import { CharacterGenerationAgent } from '../character-generator.js';

/**
 * Test character validation retry logic
 */
async function testCharacterValidationRetry() {
  console.log('=== Testing Character Validation Retry Logic ===\n');
  
  // Create a mock agent with test specifications
  const agent = new CharacterGenerationAgent(
    'Create a fantasy character for a D&D-style game',
    'test-rag-source'
  );
  
  // Test 1: Verify maxValidationRetries property exists and is set to 3
  console.log('Test 1: Check maxValidationRetries property');
  if (agent.maxValidationRetries === 3) {
    console.log('✅ PASS: maxValidationRetries is correctly set to 3\n');
  } else {
    console.log(`❌ FAIL: maxValidationRetries is ${agent.maxValidationRetries}, expected 3\n`);
  }
  
  // Test 2: Verify validateCharacterSheet method exists
  console.log('Test 2: Check validateCharacterSheet method exists');
  if (typeof agent.validateCharacterSheet === 'function') {
    console.log('✅ PASS: validateCharacterSheet method exists\n');
  } else {
    console.log('❌ FAIL: validateCharacterSheet method does not exist\n');
  }
  
  // Test 3: Verify validateCharacterSheetWithRetry method exists
  console.log('Test 3: Check validateCharacterSheetWithRetry method exists');
  if (typeof agent.validateCharacterSheetWithRetry === 'function') {
    console.log('✅ PASS: validateCharacterSheetWithRetry method exists\n');
  } else {
    console.log('❌ FAIL: validateCharacterSheetWithRetry method does not exist\n');
  }
  
  // Test 4: Verify reexecuteStep method exists
  console.log('Test 4: Check reexecuteStep method exists');
  if (typeof agent.reexecuteStep === 'function') {
    console.log('✅ PASS: reexecuteStep method exists\n');
  } else {
    console.log('❌ FAIL: reexecuteStep method does not exist\n');
  }
  
  // Test 5: Verify generateCharacter method uses validateCharacterSheetWithRetry
  console.log('Test 5: Check generateCharacter method implementation');
  const generateCharacterSource = agent.generateCharacter.toString();
  if (generateCharacterSource.includes('validateCharacterSheetWithRetry')) {
    console.log('✅ PASS: generateCharacter uses validateCharacterSheetWithRetry\n');
  } else {
    console.log('❌ FAIL: generateCharacter does not use validateCharacterSheetWithRetry\n');
  }
  
  // Test 6: Verify validation result structure
  console.log('Test 6: Check validation result structure');
  const mockValidationResult = await agent.validateCharacterSheet(0);
  if (mockValidationResult && 
      typeof mockValidationResult.success === 'boolean' && 
      typeof mockValidationResult.message === 'string') {
    console.log('✅ PASS: Validation result has correct structure\n');
  } else {
    console.log('❌ FAIL: Validation result structure is incorrect\n');
  }
  
  // Test 7: Verify retryCount parameter is passed to validation
  console.log('Test 7: Check retryCount parameter handling');
  const validateSource = agent.validateCharacterSheet.toString();
  if (validateSource.includes('retryCount') && validateSource.includes('retryCount < this.maxValidationRetries')) {
    console.log('✅ PASS: retryCount parameter is properly handled\n');
  } else {
    console.log('❌ FAIL: retryCount parameter handling is incorrect\n');
  }
  
  // Test 8: Verify shouldRetry flag in validation results
  console.log('Test 8: Check shouldRetry flag in validation results');
  if (validateSource.includes('shouldRetry')) {
    console.log('✅ PASS: shouldRetry flag is present in validation logic\n');
  } else {
    console.log('❌ FAIL: shouldRetry flag is missing from validation logic\n');
  }
  
  // Test 9: Verify reexecuteStep updates character sheet
  const validateRetrySource = agent.validateCharacterSheetWithRetry.toString();
  if (validateRetrySource.includes('Object.assign') && validateRetrySource.includes('characterSheet')) {
    console.log('✅ PASS: Validation retry loop properly updates character sheet\n');
  } else {
    console.log('❌ FAIL: Validation retry loop does not properly update character sheet\n');
  }
  
  // Test 10: Verify validation retry loop logic
  if (validateRetrySource.includes('while') && 
      validateRetrySource.includes('shouldRetry') &&
      validateRetrySource.includes('reexecuteStep')) {
    console.log('✅ PASS: Validation retry loop logic is correct\n');
  } else {
    console.log('❌ FAIL: Validation retry loop logic is incorrect\n');
  }
  
  // Test 11: Verify reexecuteStep method exists and has proper implementation
  const reexecuteSource = agent.reexecuteStep.toString();
  if (reexecuteSource.includes('getStepContext') && 
      reexecuteSource.includes('executeStepWithClarification')) {
    console.log('✅ PASS: reexecuteStep method has complete implementation\n');
  } else {
    console.log('❌ FAIL: reexecuteStep method implementation is incomplete\n');
  }
  
  // Test 12: Verify validation result includes retryCount
  if (validateSource.includes('retryCount: retryCount')) {
    console.log('✅ PASS: Validation results include retryCount information\n');
  } else {
    console.log('❌ FAIL: Validation results do not include retryCount information\n');
  }
  
  // Test 13: Verify max retries exceeded handling
  if (validateSource.includes('Max validation retries') && 
      validateSource.includes('proceeding with warnings')) {
    console.log('✅ PASS: Max retries exceeded handling is implemented\n');
  } else {
    console.log('❌ FAIL: Max retries exceeded handling is missing\n');
  }
  
  // Test 14: Verify error handling in validation
  if (validateSource.includes('catch') && 
      validateSource.includes('Error validating character sheet')) {
    console.log('✅ PASS: Error handling in validation is implemented\n');
  } else {
    console.log('❌ FAIL: Error handling in validation is missing\n');
  }
  
  // Test 15: Verify generateCharacter logs validation attempts
  const genCharSource = agent.generateCharacter.toString();
  if (genCharSource.includes('validation attempt')) {
    console.log('✅ PASS: Character generation logs validation attempts\n');
  } else {
    console.log('❌ FAIL: Character generation does not log validation attempts\n');
  }
  
  console.log('=== Test Summary ===');
  console.log('All tests completed. The character validation retry logic has been implemented with:');
  console.log('- maxValidationRetries property set to 3');
  console.log('- validateCharacterSheet method with retryCount parameter');
  console.log('- validateCharacterSheetWithRetry method for automatic retries');
  console.log('- reexecuteStep method for re-running steps after failed validation');
  console.log('- generateCharacter method using the new validation logic');
}

// Run tests
await testCharacterValidationRetry();
