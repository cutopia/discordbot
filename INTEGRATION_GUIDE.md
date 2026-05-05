# LLM Tools Integration Guide

This guide explains how to integrate the tools module with your AI model for function calling capabilities.

## Overview

The tools module provides a standardized way for AI models to execute predefined functions. Currently, it includes:

- **roll_dice**: Roll dice using standard notation (e.g., "1d20+5")

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   LLM       │────▶│  Tools API   │────▶│  Dice Logic │
│ (Request)   │◀────│  (Executor)  │◀────│  (Handler)  │
└─────────────┘     └──────────────┘     └─────────────┘
```

## Integration Steps

### Step 1: Import the Tools Module

```javascript
import {
  executeTool,
  getToolDefinitions,
  formatToolResult
} from './tools.js';
```

### Step 2: Get Tool Definitions for Your LLM

```javascript
const tools = getToolDefinitions();

// Send these definitions to your LLM so it knows what tools are available
console.log(JSON.stringify(tools, null, 2));
```

### Step 3: Handle Tool Requests from the LLM

```javascript
async function handleLLMRequest(llmResponse) {
  // The LLM might respond with a tool request
  if (llmResponse.toolCall) {
    const { toolName, arguments } = llmResponse.toolCall;
    
    try {
      const result = await executeTool(toolName, arguments);
      
      // Format the result for the LLM to consume
      const formattedResult = formatToolResult(toolName, result);
      
      return {
        success: true,
        result: formattedResult
      };
    } catch (error) {
      return {
        success: false,
        error: `Tool execution failed: ${error.message}`
      };
    }
  }
  
  // Handle regular text response
  return { success: true, message: llmResponse.text };
}
```

### Step 4: Implement Tool Calling Logic

```javascript
// Example tool calling loop
async function runToolCallingLoop(userPrompt) {
  let messages = [
    { role: 'system', content: 'You have access to tools. Use them when appropriate.' },
    { role: 'user', content: userPrompt }
  ];
  
  for (let i = 0; i < 5; i++) { // Max iterations
    const llmResponse = await callYourLLM(messages);
    
    if (llmResponse.toolCall) {
      // Execute the tool
      const result = await executeTool(
        llmResponse.toolCall.toolName,
        llmResponse.toolCall.arguments
      );
      
      // Add tool result to conversation
      messages.push({
        role: 'tool',
        name: llmResponse.toolCall.toolName,
        content: JSON.stringify(result)
      });
    } else {
      // LLM provided a final response
      return llmResponse.text;
    }
  }
  
  throw new Error('Max tool calling iterations reached');
}
```

## Tool Definitions

### roll_dice

Roll dice using standard notation.

**Definition:**
```json
{
  "name": "roll_dice",
  "description": "Roll dice using notation like \"1d20+5\", \"2d6-3\", etc.",
  "parameters": {
    "type": "object",
    "properties": {
      "notation": {
        "type": "string",
        "description": "Dice notation (e.g., \"1d20+5\", \"2d6-3\", \"3d8\")"
      }
    },
    "required": ["notation"]
  }
}
```

**Example Usage:**
```javascript
const result = await executeTool('roll_dice', {
  notation: '1d20+5'
});

console.log(result);
// {
//   success: true,
//   message: "🎲 **1d20+5**\nRolls: [18] (sum: 18)\nModifier: +5\n**Total: 23**",
//   details: {
//     notation: '1d20+5',
//     numberOfDice: 1,
//     sides: 20,
//     modifier: 5,
//     rolls: [18],
//     sum: 18,
//     total: 23
//   }
// }
```

## Error Handling

### Invalid Tool Name

```javascript
const result = await executeTool('unknown_tool', {});
console.log(result);
// {
//   success: false,
//   error: "Unknown tool: unknown_tool. Available tools: roll_dice"
// }
```

### Missing Required Parameters

```javascript
const result = await executeTool('roll_dice', {});
console.log(result);
// {
//   success: false,
//   error: "Missing required parameter: notation"
// }
```

### Invalid Tool Arguments

```javascript
const result = await executeTool('roll_dice', {
  notation: 'invalid'
});
console.log(result);
// {
//   success: false,
//   error: "Invalid dice notation. Use format like \"1d20+5\", \"2d6-3\", or \"3d8\""
// }
```

## Best Practices

### 1. Validate Tool Requests

Always validate tool names and arguments before execution:

```javascript
function validateToolRequest(toolName, args) {
  const tool = getToolDefinitions().find(t => t.name === toolName);
  
  if (!tool) return { valid: false, error: `Unknown tool: ${toolName}` };
  
  if (tool.parameters?.required) {
    for (const requiredParam of tool.parameters.required) {
      if (!(requiredParam in args)) {
        return { valid: false, error: `Missing parameter: ${requiredParam}` };
      }
    }
  }
  
  return { valid: true };
}
```

### 2. Format Results Clearly

Use the provided formatting functions to ensure consistent output:

```javascript
const formatted = formatToolResult(toolName, result);
// Provides standardized formatting for LLM consumption
```

### 3. Handle Errors Gracefully

Always handle potential errors in tool execution:

```javascript
try {
  const result = await executeTool(toolName, arguments);
  
  if (result.success) {
    // Process successful result
  } else {
    // Handle error case
    console.error(`Tool ${toolName} failed:`, result.error);
  }
} catch (error) {
  // Handle unexpected errors
  console.error(`Unexpected error executing ${toolName}:`, error);
}
```

### 4. Limit Tool Calling Iterations

Prevent infinite loops by limiting iterations:

```javascript
const MAX_ITERATIONS = 5;
let iteration = 0;

while (shouldContinue && iteration < MAX_ITERATIONS) {
  // ... tool calling logic
  iteration++;
}

if (iteration >= MAX_ITERATIONS) {
  throw new Error('Max tool calling iterations reached');
}
```

## Example: Complete Integration

```javascript
import { executeTool, getToolDefinitions } from './tools.js';

class LLMIntegration {
  constructor(llmClient) {
    this.llm = llmClient;
    this.tools = getToolDefinitions();
  }
  
  async processRequest(userMessage) {
    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      { role: 'user', content: userMessage }
    ];
    
    let response;
    for (let i = 0; i < 5; i++) {
      response = await this.llm.chat(messages);
      
      if (response.toolCall) {
        const result = await executeTool(
          response.toolCall.toolName,
          response.toolCall.arguments
        );
        
        messages.push({
          role: 'tool',
          name: response.toolCall.toolName,
          content: JSON.stringify(result)
        });
      } else {
        break; // Got final response
      }
    }
    
    return response.text;
  }
  
  getSystemPrompt() {
    const toolDescriptions = this.tools.map(tool => 
      `- ${tool.name}: ${tool.description}`
    ).join('\n');
    
    return `You have access to the following tools:\n${toolDescriptions}\n\n` +
           'Use them when appropriate to help answer the user\'s question.';
  }
}

// Usage
const integration = new LLMIntegration(myLLMClient);
const response = await integration.processRequest('Roll a d20 with +5 modifier');
console.log(response);
```

## Testing

Run the test suite to verify tool functionality:

```bash
npm run test-tools
```

Check the example file for more usage patterns:

```bash
node examples/llm-tools-example.js
```
