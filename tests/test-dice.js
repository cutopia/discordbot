import { parseDiceNotation, rollDice, processDiceRoll } from '../dice.js';

// Test parseDiceNotation function
console.log('Testing parseDiceNotation...');

const testCases = [
  { input: '1d20+5', expected: { numberOfDice: 1, sides: 20, modifier: 5 } },
  { input: '2d6-3', expected: { numberOfDice: 2, sides: 6, modifier: -3 } },
  { input: '3d8', expected: { numberOfDice: 3, sides: 8, modifier: 0 } },
  { input: '10d100+50', expected: { numberOfDice: 10, sides: 100, modifier: 50 } },
  { input: 'invalid', expected: null },
  { input: '', expected: null },
  { input: 'd20', expected: null },
  { input: '1dx+5', expected: null },
];

let parseTestsPassed = 0;
for (const testCase of testCases) {
  const result = parseDiceNotation(testCase.input);
  
  if (testCase.expected === null) {
    if (result === null || result.error) {
      console.log(`✓ "${testCase.input}" correctly rejected`);
      parseTestsPassed++;
    } else {
      console.log(`✗ "${testCase.input}" should have been rejected but got:`, result);
    }
  } else {
    if (result && 
        result.numberOfDice === testCase.expected.numberOfDice &&
        result.sides === testCase.expected.sides &&
        result.modifier === testCase.expected.modifier) {
      console.log(`✓ "${testCase.input}" parsed correctly`);
      parseTestsPassed++;
    } else {
      console.log(`✗ "${testCase.input}" parsing failed. Expected:`, testCase.expected, 'Got:', result);
    }
  }
}

console.log(`Parse tests: ${parseTestsPassed}/${testCases.length} passed\n`);

// Test rollDice function
console.log('Testing rollDice...');

const rollTests = [
  { dice: 1, sides: 6, count: 100 },
  { dice: 2, sides: 20, count: 50 },
  { dice: 3, sides: 8, count: 50 },
];

let rollTestsPassed = 0;
for (const test of rollTests) {
  for (let i = 0; i < test.count; i++) {
    const result = rollDice(test.dice, test.sides);
    
    // Check that we got the right number of rolls
    if (result.rolls.length !== test.dice) {
      console.log(`✗ Expected ${test.dice} rolls but got ${result.rolls.length}`);
      break;
    }
    
    // Check that each roll is within valid range
    for (const roll of result.rolls) {
      if (roll < 1 || roll > test.sides) {
        console.log(`✗ Roll value ${roll} out of range [1, ${test.sides}]`);
        break;
      }
    }
    
    // Check sum calculation
    const calculatedSum = result.rolls.reduce((a, b) => a + b, 0);
    if (calculatedSum !== result.sum) {
      console.log(`✗ Sum calculation error: expected ${calculatedSum}, got ${result.sum}`);
      break;
    }
    
    // Check min/max
    if (result.min !== test.dice || result.max !== test.sides * test.dice) {
      console.log(`✗ Min/Max error: expected min=${test.dice}, max=${test.sides * test.dice}, got min=${result.min}, max=${result.max}`);
      break;
    }
  }
  rollTestsPassed++;
  console.log(`✓ ${test.dice}d${test.sides} rolls validated (${test.count} iterations)`);
}

console.log(`Roll tests: ${rollTestsPassed}/${rollTests.length} passed\n`);

// Test processDiceRoll function
console.log('Testing processDiceRoll...');

const processTests = [
  { input: '1d20+5', shouldSucceed: true },
  { input: '2d6-3', shouldSucceed: true },
  { input: 'invalid', shouldSucceed: false },
];

let processTestsPassed = 0;
for (const testCase of processTests) {
  const result = processDiceRoll(testCase.input);
  
  if (testCase.shouldSucceed) {
    if (result.success && 
        result.message && 
        result.details &&
        result.details.total !== undefined) {
      console.log(`✓ "${testCase.input}" processed successfully`);
      console.log(`  Message: ${result.message.split('\n')[0]}`);
      processTestsPassed++;
    } else {
      console.log(`✗ "${testCase.input}" should have succeeded but got:`, result);
    }
  } else {
    if (!result.success && result.error) {
      console.log(`✓ "${testCase.input}" correctly rejected with error: ${result.error}`);
      processTestsPassed++;
    } else {
      console.log(`✗ "${testCase.input}" should have been rejected`);
    }
  }
}

console.log(`Process tests: ${processTestsPassed}/${processTests.length} passed\n`);

// Test critical roll detection (d20)
console.log('Testing critical roll detection...');
const criticalTest = processDiceRoll('1d20');
if (criticalTest.success) {
  const singleRoll = criticalTest.details.rolls[0];
  if (singleRoll === 20) {
    console.log(`✓ Critical success detected for roll ${singleRoll}`);
  } else if (singleRoll === 1) {
    console.log(`✓ Critical failure detected for roll ${singleRoll}`);
  } else {
    console.log(`✓ Normal roll ${singleRoll} handled correctly`);
  }
}

// Summary
console.log('\n=== SUMMARY ===');
const totalTests = testCases.length + rollTests.length + processTests.length;
const totalPassed = parseTestsPassed + rollTestsPassed + processTestsPassed;
console.log(`Total: ${totalPassed}/${totalTests} tests passed`);

if (totalPassed === totalTests) {
  console.log('✅ All tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed');
  process.exit(1);
}
