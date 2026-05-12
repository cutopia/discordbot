/**
 * Test the improved prompt structure for character generation
 */

import { ImprovedPromptBuilder } from '../docs/example-prompt-builder.js';

// Test data
const testSpecifications = 'Create a drow character with stealth focus';
const testStepDetails = {
  stepName: 'Determine Character Role/Archetype',
  choice: 'Select a character role or archetype that fits the RPG system',
  options: ['Soldier', 'Scout', 'Spy', 'Expert'],
  method: 'player_choice'
};

const testRagContext = `
From the RPG rulebook:

Character roles define your character's primary function in the game world.
Each role comes with its own set of starting skills and abilities.

Available Roles:
- Soldier: Trained in combat, excellent for frontline fighters
- Scout: Skilled in tracking and survival, perfect for wilderness exploration
- Spy: Master of stealth and deception, ideal for infiltration missions
- Expert: Versatile and adaptable, with skills in many areas

For drow characters, the Spy role is particularly common due to their natural stealth abilities.
`;

// Test cases
const testCases = [
  {
    name: 'First step prompt structure',
    setup: () => new ImprovedPromptBuilder({}, testSpecifications, 0, 5),
    expectedSections: [
      'CRITICAL INSTRUCTIONS - READ CAREFULLY',
      'STRICTLY PROHIBITED',
      'DO NOT use any RPG rules from your training data',
      'CURRENT CHARACTER SHEET STATE',
      'Empty - no choices made yet',
      'CURRENT STEP (1/5)',
      'RETRIEVED CONTEXT FROM RPG RULEBOOK',
      'USER SPECIFICATIONS TO CONSIDER',
      testSpecifications,
      'OUTPUT FORMAT REQUIREMENTS'
    ]
  },
  {
    name: 'Subsequent step prompt structure',
    setup: () => new ImprovedPromptBuilder(
      { Name: 'Zaryx', Role: 'Spy' },
      testSpecifications,
      1, 5
    ),
    expectedSections: [
      'CRITICAL INSTRUCTIONS - READ CAREFULLY',
      'STRICTLY PROHIBITED',
      'DO NOT use any RPG rules from your training data',
      'CURRENT CHARACTER SHEET STATE',
      '- Name: Zaryx',
      '- Role: Spy',
      'CURRENT STEP (2/5)',
      'RETRIEVED CONTEXT FROM RPG RULEBOOK',
      'USER SPECIFICATIONS TO CONSIDER',
      testSpecifications,
      'OUTPUT FORMAT REQUIREMENTS'
    ]
  },
  {
    name: 'Prompt without user specifications',
    setup: () => new ImprovedPromptBuilder({}, '', 0, 5),
    expectedSections: [
      'CRITICAL INSTRUCTIONS - READ CAREFULLY',
      'STRICTLY PROHIBITED',
      'CURRENT CHARACTER SHEET STATE',
      'Empty - no choices made yet',
      'OUTPUT FORMAT REQUIREMENTS'
    ],
    shouldNotContain: ['USER SPECIFICATIONS']
  },
  {
    name: 'Prohibitions section is comprehensive',
    setup: () => new ImprovedPromptBuilder({}, testSpecifications, 0, 5),
    expectedSections: [
      'DO NOT use any RPG rules from your training data',
      'including D&D, Pathfinder',
      'DO NOT invent stats, classes, or mechanics',
      'Make choices that are CONSISTENT with the current character sheet state'
    ]
  }
];

// Run tests
async function runTests() {
  console.log('Testing improved prompt structure...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const builder = testCase.setup();
    
    // Build a sample prompt
    const prompt = builder.buildPrompt(testStepDetails, testRagContext);
    
    console.log(`Test: ${testCase.name}`);
    
    // Check expected sections
    let testPassed = true;
    
    if (testCase.expectedSections) {
      for (const section of testCase.expectedSections) {
        if (!prompt.includes(section)) {
          console.log(`  ❌ Missing expected section: "${section}"`);
          testPassed = false;
        }
      }
    }
    
    // Check sections that should not be present
    if (testCase.shouldNotContain) {
      for (const section of testCase.shouldNotContain) {
        if (prompt.includes(section)) {
          console.log(`  ❌ Should not contain: "${section}"`);
          testPassed = false;
        }
      }
    }
    
    // Check prompt length is reasonable
    if (prompt.length > 5000) {
      console.log(`  ⚠️  Prompt is quite long (${prompt.length} chars)`);
    }
    
    if (testPassed) {
      console.log(`  ✅ PASSED`);
      passed++;
    } else {
      console.log(`  ❌ FAILED`);
      failed++;
    }
    
    // Show prompt length for reference
    console.log(`  Prompt length: ${prompt.length} characters\n`);
  }
  
  console.log('=== Test Summary ===');
  console.log(`Passed: ${passed}/${testCases.length}`);
  console.log(`Failed: ${failed}/${testCases.length}`);
  
  return failed === 0;
}

// Run if executed directly
if (typeof process !== 'undefined' && process.argv[1] === import.meta.url) {
  const success = await runTests();
  process.exit(success ? 0 : 1);
}

export { runTests, ImprovedPromptBuilder };
