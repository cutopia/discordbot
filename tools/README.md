# Tools Module

This directory contains the LLM tools integration system for the Discord bot.

## Files

- `tools.js` - Main tools module with available tools and execution functions
- `test-tools.js` - Test suite for the tools module
- `llm-tools-example.js` - Example usage patterns for LLM integration

## Quick Start

### Import the tools module

```javascript
import { executeTool, getToolDefinitions } from './tools.js';
```

### Execute a tool

```javascript
const result = await executeTool('roll_dice', {
  notation: '1d20+5'
});

console.log(result.message);
// Output: 🎲 **1d20+5**\nRolls: [18] (sum: 18)\nModifier: +5\n**Total: 23**
```

### Get available tools

```javascript
const tools = getToolDefinitions();
console.log(tools);
// Output: [{ name: 'roll_dice', description: '...', parameters: {...} }]
```

## Available Tools

### roll_dice

Roll dice using standard notation.

- **Parameters:** `notation` (string) - e.g., "1d20+5", "2d6-3"
- **Returns:** Object with success status, message, and detailed results

## Integration Guide

See `examples/llm-tools-example.js` for comprehensive examples of:

- Single tool execution
- Sequential tool calls
- Tool validation
- Result formatting for LLM consumption

## Testing

Run the test suite:

```bash
npm run test-tools
```

## Adding New Tools

1. Implement your tool function in a separate module
2. Add it to the `availableTools` array in `tools.js`
3. Include proper parameter validation and error handling
4. Update this documentation with new tools
