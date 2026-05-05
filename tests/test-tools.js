import {
  availableTools,
  getToolNames,
  getToolDefinitions,
  getToolByName,
  executeTool,
  formatToolResult,
  getToolExamples
} from '../tools.js';

console.log('Testing tools module...\n');

// Test 1: Check available tools
console.log('Test 1: Available tools');
const toolNames = getToolNames();
console.log(`Available tools: ${toolNames.join(', ')}`);
if (toolNames.includes('roll_dice')) {
  console.log('✓ roll_dice tool is available\n');
} else {
  console.log('✗ roll_dice tool not found\n');
}

// Test 2: Get tool definitions
console.log('Test 2: Tool definitions');
const definitions = getToolDefinitions();
console.log(`Number of tools: ${definitions.length}`);
if (definitions.length > 0) {
  console.log('✓ Tool definitions retrieved successfully\n');
} else {
  console.log('✗ No tool definitions found\n');
}

// Test 3: Get specific tool by name
console.log('Test 3: Get tool by name');
const diceTool = getToolByName('roll_dice');
if (diceTool) {
  console.log(`✓ Found tool: ${diceTool.name}`);
  console.log(`  Description: ${diceTool.description.substring(0, 50)}...`);
} else {
  console.log('✗ Tool not found\n');
}

// Test 4: Get non-existent tool
console.log('\nTest 4: Non-existent tool');
const nonexistent = getToolByName('nonexistent_tool');
if (!nonexistent) {
  console.log('✓ Correctly returned null for non-existent tool\n');
} else {
  console.log('✗ Should have returned null\n');
}

// Test 5: Execute roll_dice tool
console.log('Test 5: Execute roll_dice tool');
const testNotations = ['1d20+5', '2d6-3', '3d8'];

for (const notation of testNotations) {
  try {
    const result = await executeTool('roll_dice', { notation });
    
    if (result.success) {
      console.log(`✓ ${notation} executed successfully`);
      console.log(`  Total: ${result.details?.total || result.message.split('\n').pop()}`);
    } else {
      console.log(`✗ ${notation} failed: ${result.error}`);
    }
  } catch (error) {
    console.log(`✗ ${notation} threw error: ${error.message}`);
  }
}

// Test 6: Execute with invalid notation
console.log('\nTest 6: Invalid dice notation');
const invalidResult = await executeTool('roll_dice', { notation: 'invalid' });
if (!invalidResult.success) {
  console.log(`✓ Correctly rejected invalid notation`);
  console.log(`  Error: ${invalidResult.error}`);
} else {
  console.log('✗ Should have failed with invalid notation\n');
}

// Test 7: Execute non-existent tool
console.log('\nTest 7: Non-existent tool execution');
const nonexistentTool = await executeTool('nonexistent_tool', {});
if (!nonexistentTool.success) {
  console.log(`✓ Correctly rejected non-existent tool`);
  console.log(`  Error: ${nonexistentTool.error}`);
} else {
  console.log('✗ Should have failed with non-existent tool\n');
}

// Test 8: Format tool results
console.log('\nTest 8: Format tool results');
const formatted = formatToolResult('roll_dice', { 
  success: true, 
  message: '🎲 **1d20+5**\nRolls: [15] (sum: 15)\nModifier: +5\n**Total: 20**' 
});
if (formatted.includes('Dice roll successful')) {
  console.log('✓ Result formatting works correctly');
} else {
  console.log('✗ Result formatting failed\n');
}

// Test 9: Get tool examples
console.log('\nTest 9: Tool examples');
const examples = getToolExamples();
console.log(`Number of examples: ${examples.length}`);
if (examples.length > 0) {
  console.log('✓ Examples retrieved successfully');
  examples.forEach(example => console.log(`  - ${example}`));
} else {
  console.log('✗ No examples found\n');
}

// Summary
console.log('\n=== SUMMARY ===');
console.log('Tools module tests completed');
