/**
 * Example: Integrating Tools with an LLM
 * 
 * This example shows how to use the tools module with an AI model
 * that supports function calling.
 */

import { executeTool, getToolDefinitions } from '../tools.js';

// Example tool definitions for the LLM
const toolDefinitions = getToolDefinitions();

console.log('Available tools for LLM:');
toolDefinitions.forEach(tool => {
  console.log(`- ${tool.name}: ${tool.description}`);
});

/**
 * Simulate an LLM requesting a tool call
 * In a real implementation, this would come from your AI model
 */
async function simulateLLMToolRequest() {
  // Example: The LLM decides to roll dice
  const llmRequest = {
    toolName: 'roll_dice',
    arguments: { notation: '1d20+5' }
  };

  console.log('\n--- LLM Tool Request ---');
  console.log(`Tool: ${llmRequest.toolName}`);
  console.log(`Arguments:`, JSON.stringify(llmRequest.arguments, null, 2));

  try {
    // Execute the tool
    const result = await executeTool(
      llmRequest.toolName,
      llmRequest.arguments
    );

    console.log('\n--- Tool Execution Result ---');
    if (result.success) {
      console.log('✅ Success!');
      console.log(`Message: ${result.message}`);
      console.log(`Details:`, JSON.stringify(result.details, null, 2));
      
      // Format result for the LLM to consume
      const formattedResult = formatResultForLLM(llmRequest.toolName, result);
      console.log('\n--- Formatted Result for LLM ---');
      console.log(formattedResult);
    } else {
      console.log('❌ Failed:', result.error);
    }
  } catch (error) {
    console.error('Error executing tool:', error.message);
  }
}

/**
 * Format tool results for the LLM to consume
 */
function formatResultForLLM(toolName, result) {
  if (toolName === 'roll_dice') {
    if (result.success) {
      return `🎲 Dice roll successful!\n${result.message}`;
    } else {
      return `❌ Dice roll failed: ${result.error}`;
    }
  }
  
  // Default formatting
  if (result.success) {
    return JSON.stringify(result, null, 2);
  } else {
    return `Error: ${result.error}`;
  }
}

/**
 * Example: Multiple sequential tool calls
 */
async function simulateSequentialToolCalls() {
  console.log('\n\n=== Sequential Tool Calls ===');
  
  const notations = ['1d6', '1d8+2', '2d10-3'];
  
  for (const notation of notations) {
    console.log(`\nRolling: ${notation}`);
    
    const result = await executeTool('roll_dice', { notation });
    
    if (result.success) {
      console.log(`Result: Total ${result.details.total} (rolls: ${result.details.rolls.join(', ')})`);
    } else {
      console.log(`Error: ${result.error}`);
    }
  }
}

/**
 * Example: Tool validation
 */
function validateToolRequest(toolName, args) {
  const tool = getToolDefinitions().find(t => t.name === toolName);
  
  if (!tool) {
    return { valid: false, error: `Unknown tool: ${toolName}` };
  }
  
  // Check required parameters
  if (tool.parameters?.required) {
    for (const requiredParam of tool.parameters.required) {
      if (!(requiredParam in args)) {
        return { 
          valid: false, 
          error: `Missing required parameter: ${requiredParam}` 
        };
      }
    }
  }
  
  return { valid: true };
}

// Run examples
async function runExamples() {
  console.log('=== LLM Tools Integration Examples ===\n');
  
  // Example 1: Single tool call
  await simulateLLMToolRequest();
  
  // Example 2: Sequential calls
  await simulateSequentialToolCalls();
  
  // Example 3: Validation
  console.log('\n\n=== Tool Validation Examples ===');
  
  const validationTests = [
    { tool: 'roll_dice', args: { notation: '1d20' } },
    { tool: 'roll_dice', args: {} }, // Missing required parameter
    { tool: 'unknown_tool', args: {} }
  ];
  
  for (const test of validationTests) {
    const result = validateToolRequest(test.tool, test.args);
    
    if (result.valid) {
      console.log(`✓ ${test.tool} with ${JSON.stringify(test.args)} is valid`);
    } else {
      console.log(`✗ ${test.tool} validation failed: ${result.error}`);
    }
  }
}

// Run all examples
runExamples().catch(console.error);
