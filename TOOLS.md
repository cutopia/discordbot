# Tools Module

The `tools.js` module exposes various functions as callable tools for AI models. This allows LLMs to perform actions like dice rolling, data retrieval, and other operations.

## Available Tools

### roll_dice

Roll dice using standard notation (e.g., "1d20+5", "2d6-3").

**Parameters:**
- `notation` (string): Dice notation in the format `{number}d{sides}[{modifier}]`
  - Examples: `"1d20+5"`, `"2d6-3"`, `"3d8"`, `"4d6+3"`

**Returns:**
- Object with success status, message, and detailed results

## Usage

### Basic Tool Execution

```javascript
import { executeTool } from './tools.js';

// Roll a d20 with +5 modifier
const result = await executeTool('roll_dice', {
  notation: '1d20+5'
});

console.log(result);
// Output:
// {
//   success: true,
//   message: "🎲 **1d20+5**\nRolls: [18] (sum: 18)\nModifier: +5\n**Total: 23**",
//   details: { ... }
// }
```

### Get Tool Information

```javascript
import {
  getToolNames,
  getToolDefinitions,
  getToolByName
} from './tools.js';

// Get list of available tool names
const tools = getToolNames();
console.log(tools); // ['roll_dice']

// Get detailed tool definitions
const definitions = getToolDefinitions();
console.log(definitions);

// Get specific tool by name
const diceTool = getToolByName('roll_dice');
```

### Format Tool Results

```javascript
import { formatToolResult } from './tools.js';

// Format result for LLM consumption
const formatted = formatToolResult('roll_dice', result);
console.log(formatted);
```

## Integration with AI Models

The tools module is designed to work with AI models that support function calling. Here's an example of how to integrate it:

```javascript
import { executeTool, getToolDefinitions } from './tools.js';

// Get tool definitions for the model
const tools = getToolDefinitions();

// When the model requests a tool call:
// 1. Parse the requested tool name and arguments
// 2. Execute the tool using executeTool()
// 3. Format the result and return it to the model

async function handleToolCall(toolName, args) {
  const result = await executeTool(toolName, args);
  
  if (result.success) {
    return `✅ ${toolName} succeeded: ${JSON.stringify(result)}`;
  } else {
    return `❌ ${toolName} failed: ${result.error}`;
  }
}
```

## Adding New Tools

To add a new tool:

1. Implement the tool function in your module
2. Add it to the `availableTools` array in `tools.js`
3. Include proper parameter validation and error handling

Example:

```javascript
export const availableTools = [
  {
    name: 'new_tool',
    description: 'Description of what the tool does',
    parameters: {
      type: 'object',
      properties: {
        param1: { type: 'string', description: 'First parameter' },
        param2: { type: 'number', description: 'Second parameter' }
      },
      required: ['param1']
    },
    handler: async (args) => {
      // Tool implementation
      return { success: true, result: '...' };
    }
  }
];
```

## Testing

Run the tools tests with:

```bash
npm run test-tools
```

This will verify:
- Tool availability and definitions
- Tool execution functionality
- Error handling for invalid inputs
- Result formatting
