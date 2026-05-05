/**
 * Tools module for LLM integration
 * Exposes various functions as callable tools for AI models
 */

import { processDiceRoll } from './dice.js';

/**
 * Available tools that can be called by the LLM
 */
export const availableTools = [
  {
    name: 'roll_dice',
    description: 'Roll dice using notation like "1d20+5", "2d6-3", etc. Supports various dice combinations with optional modifiers.',
    parameters: {
      type: 'object',
      properties: {
        notation: {
          type: 'string',
          description: 'Dice notation (e.g., "1d20+5", "2d6-3", "3d8", "4d6+3")'
        }
      },
      required: ['notation']
    },
    handler: processDiceRoll
  }
];

/**
 * Get a list of available tool names
 * @returns {string[]} Array of tool names
 */
export function getToolNames() {
  return availableTools.map(tool => tool.name);
}

/**
 * Get detailed information about all available tools
 * @returns {Array} Array of tool definitions with name, description, and parameters
 */
export function getToolDefinitions() {
  return availableTools.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters
  }));
}

/**
 * Find a tool by name
 * @param {string} name - The name of the tool to find
 * @returns {object|null} The tool definition or null if not found
 */
export function getToolByName(name) {
  return availableTools.find(tool => tool.name === name) || null;
}

/**
 * Execute a tool by name with given arguments
 * @param {string} name - The name of the tool to execute
 * @param {object} args - Arguments to pass to the tool handler
 * @returns {Promise<object>} Result from the tool execution
 */
export async function executeTool(name, args = {}) {
  const tool = getToolByName(name);
  
  if (!tool) {
    return {
      success: false,
      error: `Unknown tool: ${name}. Available tools: ${getToolNames().join(', ')}`
    };
  }
  
  try {
    // Validate required parameters
    if (tool.parameters?.required) {
      for (const requiredParam of tool.parameters.required) {
        if (!(requiredParam in args)) {
          return {
            success: false,
            error: `Missing required parameter: ${requiredParam}`
          };
        }
      }
    }
    
    // Execute the tool handler
    const result = await tool.handler(args.notation);
    
    // Ensure result has proper structure
    if (typeof result === 'string') {
      return { success: true, message: result };
    } else if (!result.success && !result.error) {
      return { ...result, success: false, error: 'Tool execution failed' };
    }
    
    return result;
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return {
      success: false,
      error: `Failed to execute tool ${name}: ${error.message}`
    };
  }
}

/**
 * Format tool results for LLM consumption
 * @param {string} toolName - Name of the tool that was executed
 * @param {object} result - Result from tool execution
 * @returns {string} Formatted result string
 */
export function formatToolResult(toolName, result) {
  if (toolName === 'roll_dice') {
    if (result.success) {
      return `🎲 Dice roll successful:\n${result.message}`;
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
 * Get tool usage examples for documentation
 * @returns {string[]} Array of example tool calls
 */
export function getToolExamples() {
  return [
    'roll_dice(notation: "1d20+5")',
    'roll_dice(notation: "2d6-3")',
    'roll_dice(notation: "3d8")'
  ];
}
