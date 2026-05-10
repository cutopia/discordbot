import { validateStep, formatCharacterSheet } from '../character-generator.js';

// Test validation with mock data
async function runTests() {
  console.log('🧪 Testing Character Validation System\n');
  
  // Test 1: Valid character data
  const validData = {
    ancestry: 'human',
    calling: 'Adventure',
    class: 'Cleaver',
    majorAbility: 'Strength',
    minorAbilities: ['Agility', 'Intelligence', 'Charisma'],
    equipment: ['Sword', 'Shield', 'Armor'],
    beats: ['Survive first delve', 'Find a valuable item'],
    callingQuestions: { 'Why are you in the Heart?': 'Seeking treasure' },
    name: 'Test Character',
    appearance: 'A brave warrior',
    personality: 'Courageous and honest'
  };
  
  const validStep = {
    validation: (data) => data.ancestry && data.calling && data.class
  };
  
  console.log('Test 1: Valid character data');
  const validResult = await validateStep(validStep, validData);
  console.log(`Expected: { isValid: true }, Got: ${JSON.stringify(validResult)}`);
  console.log(`✅ Test 1 passed: ${validResult.isValid === true}\n`);
  
  // Test 2: Invalid character data (missing ancestry)
  const invalidData = {
    calling: 'Adventure',
    class: 'Cleaver'
    // Missing ancestry
  };
  
  console.log('Test 2: Invalid character data (missing ancestry)');
  const invalidResult = await validateStep(validStep, invalidData);
  console.log(`Expected: { isValid: false }, Got: ${JSON.stringify(invalidResult)}`);
  console.log(`✅ Test 2 passed: ${invalidResult.isValid === false}\n`);
  
  // Test 3: Format character sheet with validation failures
  const dataWithFailures = {
    name: 'Failed Character',
    ancestry: null,
    calling: 'Adventure',
    class: 'Cleaver',
    validationStatus: { allStepsValid: false, finalValid: false },
    validationFailures: [
      {
        step: 'Select an ancestry',
        message: 'Validation failed: Ancestry must be one of drow, aelfir, human, or gnoll. Please provide a valid ancestry from the allowed list.'
      },
      {
        step: 'Final Validation', 
        message: 'Character is missing required fields. Please ensure all character creation steps are completed.'
      }
    ]
  };
  
  console.log('Test 3: Format character sheet with validation failures');
  const formattedSheet = formatCharacterSheet(dataWithFailures);
  const hasFailureSection = formattedSheet.includes('Validation Failure Messages');
  const hasStep1Failure = formattedSheet.includes('Select an ancestry');
  const hasFinalFailure = formattedSheet.includes('Final Validation');
  
  console.log(`Formatted sheet includes failure section: ${hasFailureSection}`);
  console.log(`Formatted sheet includes step 1 failure: ${hasStep1Failure}`);
  console.log(`Formatted sheet includes final validation failure: ${hasFinalFailure}`);
  console.log(`✅ Test 3 passed: ${hasFailureSection && hasStep1Failure && hasFinalFailure}\n`);
  
  // Test 4: Format character sheet without validation failures
  const cleanData = {
    name: 'Clean Character',
    ancestry: 'human',
    calling: 'Adventure',
    class: 'Cleaver',
    validationStatus: { allStepsValid: true, finalValid: true }
  };
  
  console.log('Test 4: Format character sheet without validation failures');
  const cleanSheet = formatCharacterSheet(cleanData);
  const noFailureSection = !cleanSheet.includes('Validation Failure Messages');
  
  console.log(`Clean sheet does not include failure section: ${noFailureSection}`);
  console.log(`✅ Test 4 passed: ${noFailureSection}\n`);
  
  // Summary
  const allTestsPassed = 
    validResult.isValid === true &&
    invalidResult.isValid === false &&
    hasFailureSection && hasStep1Failure && hasFinalFailure &&
    noFailureSection;
  
  console.log('='.repeat(50));
  if (allTestsPassed) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Some tests failed. Please review the implementation.');
  }
  console.log('='.repeat(50));
}

// Run tests
runTests().catch(console.error);
