import { CharacterGenerationAgent } from './character-generator.js';

// Test 1: Verify buildPreviousChoicesHistory method
console.log("Test 1: Testing buildPreviousChoicesHistory method");
const agent = new CharacterGenerationAgent('Create a drow character with stealth focus', 'test-source');

// Add some sample choices to the history
agent.recordChoice('Step 1: Choose Ancestry', { ancestry: 'Drow' });
agent.recordChoice('Step 2: Choose Calling', { calling: 'Rogue' });

const history = agent.buildPreviousChoicesHistory();
console.log("Previous choices history:");
console.log(history);

// Verify the history contains our sample choices
if (history.includes('Drow') && history.includes('Rogue')) {
    console.log("✓ History correctly includes previous choices\n");
} else {
    console.log("✗ History does not include expected choices\n");
}

// Test 2: Verify specifications are stored
console.log("Test 2: Testing specifications storage");
if (agent.specifications === 'Create a drow character with stealth focus') {
    console.log("✓ Specifications correctly stored\n");
} else {
    console.log("✗ Specifications not correctly stored\n");
}

// Test 3: Verify recordChoice method works
console.log("Test 3: Testing recordChoice method");
const initialLength = agent.previousChoices.length;
agent.recordChoice('Step 3: Choose Skills', { skills: ['Stealth', 'Perception'] });
if (agent.previousChoices.length === initialLength + 1) {
    console.log("✓ recordChoice correctly adds to history\n");
} else {
    console.log("✗ recordChoice did not add to history\n");
}

console.log("All basic tests completed!");
