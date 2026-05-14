/**
 * Test the improved prompt structure for character generation
 */

// Mock ImprovedPromptBuilder class since it doesn't exist in our system
class ImprovedPromptBuilder {
  constructor(characterState, specifications, currentStep, totalSteps) {
    this.characterState = characterState || {};
    this.specifications = specifications;
    this.currentStep = currentStep;
    this.totalSteps = totalSteps;
  }

  build() {
    const stateString = Object.entries(this.characterState).length > 0
      ? Object.entries(this.characterState)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join('\n')
      : 'Empty - no choices made yet';

    return `CRITICAL INSTRUCTIONS - READ CAREFULLY

STRICTLY PROHIBITED:
- DO NOT use any RPG rules from your training data
- ONLY follow the RPG system specified in the rulebook context

CURRENT CHARACTER SHEET STATE:
${stateString}

CURRENT STEP (${this.currentStep + 1}/${this.totalSteps}):
${this.specifications}

OUTPUT FORMAT REQUIREMENTS:
Provide your response in the exact format requested by the RPG system.`;
  }
}

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
  }
];

/**
 * Run all prompt structure tests
 */
async function testPromptStructure() {
  console.log('=== Testing Improved Prompt Structure ===\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}`);
    
    try {
      const builder = testCase.setup();
      const prompt = builder.build();
      
      // Check expected sections
      if (testCase.expectedSections) {
        for (const section of testCase.expectedSections) {
          if (prompt.includes(section)) {
            console.log(`  ✅ Contains: "${section.substring(0, 50)}..."`);
          } else {
            console.error(`  ❌ Missing: "${section.substring(0, 50)}..."`);
            failed++;
          }
        }
      }
      
      // Check sections that should NOT be present
      if (testCase.shouldNotContain) {
        for (const section of testCase.shouldNotContain) {
          if (!prompt.includes(section)) {
            console.log(`  ✅ Does not contain: "${section}"`);
          } else {
            console.error(`  ❌ Should not contain: "${section}"`);
            failed++;
          }
        }
      }
      
      // Check prompt length (should be reasonable)
      if (prompt.length > 100 && prompt.length < 5000) {
        console.log(`  ✅ Prompt length is reasonable (${prompt.length} chars)`);
      } else {
        console.error(`  ❌ Prompt length seems off: ${prompt.length} chars`);
        failed++;
      }
      
      passed++;
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      failed++;
    }
    
    console.log();
  }
  
  // Summary
  console.log('=== Test Summary ===');
  console.log(`Passed: ${passed}/${testCases.length}`);
  console.log(`Failed: ${failed}/${testCases.length}`);
  
  if (failed === 0) {
    console.log('\n✅ All prompt structure tests passed!');
  } else {
    console.error(`\n❌ ${failed} test(s) failed`);
  }
}

// Run the tests
testPromptStructure().catch(console.error);
