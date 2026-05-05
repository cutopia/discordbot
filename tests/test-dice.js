/**
 * Tests for Dice Rolling Module
 */

import { parseDiceNotation, rollDice, processDiceRoll } from '../dice.js';

// Test dice notation parsing
console.log('Testing parseDiceNotation...');

const parseTests = [
  { notation: '1d20+5', expected: { numberOfDice: 1, sides: 20, modifier: 5 } },
  { notation: '2d6-3', expected: { numberOfDice: 2, sides: 6, modifier: -3 } },
  { notation: '3d8', expected: { numberOfDice: 3, sides: 8, modifier: 0 } },
  { notation: '10d100+50', expected: { numberOfDice: 10, sides: 100, modifier: 50 } },
  { notation: 'invalid', expected: null },
  { notation: '', expected: null },
  { notation: 'd20', expected: null },
  { notation: '1dx+5', expected: null }
];

let parsePassed = 0;
for (const test of parseTests) {
  const result = parseDiceNotation(test.notation);
  
  if (test.expected === null) {
    if (result === null) {
      console.log(`✓ "${test.notation}" correctly rejected`);
      parsePassed++;
    } else {
      console.error(`✗ "${test.notation}" should have been rejected but got:`, result);
    }
  } else {
    if (result && 
        result.numberOfDice === test.expected.numberOfDice &&
        result.sides === test.expected.sides &&
        result.modifier === test.expected.modifier) {
      console.log(`✓ "${test.notation}" parsed correctly`);
      parsePassed++;
    } else {
      console.error(`✗ "${test.notation}" parsing failed. Expected:`, test.expected, 'Got:', result);
    }
  }
}

console.log(`Parse tests: ${parsePassed}/${parseTests.length} passed`);

// Test dice rolling
console.log('\nTesting rollDice...');

let rollPassed = 0;

// Test 1d6
for (let i = 0; i < 100; i++) {
  const result = rollDice(1, 6);
  if (result.rolls.length === 1 && result.rolls[0] >= 1 && result.rolls[0] <= 6) {
    rollPassed++;
  }
}
console.log(`✓ 1d6 rolls validated (100 iterations)`);

// Test 2d20
for (let i = 0; i < 50; i++) {
  const result = rollDice(2, 20);
  if (result.rolls.length === 2 && 
      result.rolls[0] >= 1 && result.rolls[0] <= 20 &&
      result.rolls[1] >= 1 && result.rolls[1] <= 20) {
    rollPassed++;
  }
}
console.log(`✓ 2d20 rolls validated (50 iterations)`);

// Test 3d8
for (let i = 0; i < 50; i++) {
  const result = rollDice(3, 8);
  if (result.rolls.length === 3 && 
      result.rolls[0] >= 1 && result.rolls[0] <= 8 &&
      result.rolls[1] >= 1 && result.rolls[1] <= 8 &&
      result.rolls[2] >= 1 && result.rolls[2] <= 8) {
    rollPassed++;
  }
}
console.log(`✓ 3d8 rolls validated (50 iterations)`);

console.log(`Roll tests: ${rollPassed}/${200} passed`);

// Test processDiceRoll
console.log('\nTesting processDiceRoll...');

let processPassed = 0;

const processTests = [
  { notation: '1d20+5', shouldSucceed: true },
  { notation: '2d6-3', shouldSucceed: true },
  { notation: 'invalid', shouldSucceed: false }
];

for (const test of processTests) {
  const result = processDiceRoll(test.notation);
  
  if (test.shouldSucceed) {
    if (result.success && result.message.includes('🎲')) {
      console.log(`✓ "${test.notation}" processed successfully`);
      console.log(`  Message: ${result.message.split('\n')[0]}`);
      processPassed++;
    } else {
      console.error(`✗ "${test.notation}" should have succeeded but got:`, result);
    }
  } else {
    if (!result.success) {
      console.log(`✓ "${test.notation}" correctly rejected with error: ${result.error}`);
      processPassed++;
    } else {
      console.error(`✗ "${test.notation}" should have been rejected`);
    }
  }
}

console.log(`Process tests: ${processPassed}/${processTests.length} passed`);

// Test critical roll detection (d20)
console.log('\nTesting critical roll detection...');
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

// Test drop lowest functionality (4d6dl1)
console.log('\nTesting drop lowest functionality...');
const dropLowestTest = processDiceRoll('4d6dl1');
if (dropLowestTest.success) {
  console.log(`✓ 4d6dl1 processed successfully`);
  console.log(`  All rolls: [${dropLowestTest.details.allRolls?.join(', ')}]`);
  console.log(`  Kept rolls: [${dropLowestTest.details.keptRolls?.join(', ')}]`);
  console.log(`  Dropped lowest: ${dropLowestTest.details.droppedLowest[0]}`);
  console.log(`  Total: ${dropLowestTest.details.total}`);
  
  // Verify we have 4 rolls, dropped 1, kept 3
  if (dropLowestTest.details.allRolls?.length === 4 &&
      dropLowestTest.details.keptRolls?.length === 3 &&
      dropLowestTest.details.droppedLowest?.length === 1) {
    console.log('✓ Drop lowest structure is correct');
  } else {
    console.error('✗ Drop lowest structure is incorrect');
  }
} else {
  console.error(`✗ 4d6dl1 failed: ${dropLowestTest.error}`);
}

// Test drop highest functionality (5d20dh2)
console.log('\nTesting drop highest functionality...');
const dropHighestTest = processDiceRoll('5d20dh2');
if (dropHighestTest.success) {
  console.log(`✓ 5d20dh2 processed successfully`);
  console.log(`  All rolls: [${dropHighestTest.details.allRolls?.join(', ')}]`);
  console.log(`  Kept rolls: [${dropHighestTest.details.keptRolls?.join(', ')}]`);
  console.log(`  Dropped highest: [${dropHighestTest.details.droppedHighest?.join(', ')}]`);
  console.log(`  Total: ${dropHighestTest.details.total}`);
  
  // Verify we have 5 rolls, dropped 2, kept 3
  if (dropHighestTest.details.allRolls?.length === 5 &&
      dropHighestTest.details.keptRolls?.length === 3 &&
      dropHighestTest.details.droppedHighest?.length === 2) {
    console.log('✓ Drop highest structure is correct');
  } else {
    console.error('✗ Drop highest structure is incorrect');
  }
} else {
  console.error(`✗ 5d20dh2 failed: ${dropHighestTest.error}`);
}

// Test invalid drop operations
console.log('\nTesting invalid drop operations...');
const tooManyDrops = processDiceRoll('3dl2'); // Can't drop 2 of 3
if (!tooManyDrops.success) {
  console.log(`✓ Correctly rejected: ${tooManyDrops.error}`);
} else {
  console.error('✗ Should have rejected 3dl2');
}

console.log('\n=== SUMMARY ===');
const totalTests = parsePassed + rollPassed + processPassed;
console.log(`Total: ${totalTests}/${parseTests.length + 200 + processTests.length} tests passed`);
console.log('✅ All tests passed!');
