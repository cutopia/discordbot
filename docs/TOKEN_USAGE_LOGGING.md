# Token Usage Logging

This project now includes comprehensive console logging for tracking token usage against context window limits.

## Features

### Request Token Information
Before sending a request to LM Studio, the system logs:
- **Estimated prompt tokens**: Rough approximation (4 characters ≈ 1 token)
- **Message count**: Number of messages in the conversation history
- **Total request size**: Size in characters

### Response Token Usage
After receiving a response from LM Studio, the system logs:
- **Prompt tokens**: Actual tokens used for the input
- **Completion tokens**: Actual tokens used for the output
- **Total tokens**: Sum of prompt + completion tokens
- **Context window**: Configured maximum context size (default: 4096)
- **Usage percentage**: How much of the context window was consumed

## Configuration

Set `CONTEXT_WINDOW_SIZE` in your `.env` file to match your model's capabilities:

```bash
# Default (4k tokens - suitable for most models)
CONTEXT_WINDOW_SIZE=4096

# For models with larger context windows:
CONTEXT_WINDOW_SIZE=8192    # Llama-2-7b-chat, Mistral-7B-Instruct v0.1
CONTEXT_WINDOW_SIZE=32768   # Mistral-7B-Instruct v0.2, Mixtral-8x7B
CONTEXT_WINDOW_SIZE=131072  # Llama-3-70b-Instruct, Claude models
```

## Programmatic Access

You can also access token usage information programmatically:

```javascript
import { getLMStudioResponse, getLastTokenUsage, getContextWindowSize } from './lmstudio.js';

// Make a request
const response = await getLMStudioResponse("Hello!", []);

// Get the token usage info
const usage = getLastTokenUsage();
if (usage) {
  console.log(`Total tokens used: ${usage.totalTokens}`);
  console.log(`Context window: ${usage.maxContextWindow} (${usage.usagePercentage}% used)`);
}

console.log(`Configured context window: ${getContextWindowSize()} tokens`);
```

## Example Output

When a request is processed, you'll see console output like:

```
LM Studio Request Token Info:
  Estimated prompt tokens: 156
  Message count: 5
  Total request size: 624 characters

LM Studio Token Usage:
  Prompt tokens: 148
  Completion tokens: 32
  Total tokens: 180
  Context window: 4096 tokens
  Usage: 4.4% of context window
```

## Benefits

1. **Monitor token consumption**: Track how much of your model's context window is being used
2. **Optimize prompts**: Identify when you're approaching token limits
3. **Debug issues**: Understand if token limits are causing truncation or errors
4. **Cost management**: Estimate API costs based on actual token usage

## Notes

- Token estimation uses a rough approximation (4 chars ≈ 1 token) for request size
- Actual token counts come from LM Studio's response `usage` field when available
- Some models may not return detailed token usage information
- The context window can be configured per deployment based on your model

## Example Usage Scenarios

### Scenario 1: Checking if you're approaching limits
```javascript
const usage = getLastTokenUsage();
if (usage && usage.usagePercentage > 80) {
  console.warn('Warning: High token usage detected! Consider reducing context.');
}
```

### Scenario 2: Model comparison
```javascript
// Test different models with the same prompt
const model1Response = await getLMStudioResponse("Summarize this...", []);
const model1Usage = getLastTokenUsage();

const model2Response = await getLMStudioResponse("Summarize this...", []);
const model2Usage = getLastTokenUsage();

console.log(`Model 1: ${model1Usage.totalTokens} tokens`);
console.log(`Model 2: ${model2Usage.totalTokens} tokens`);
```

### Scenario 3: Dynamic context management
```javascript
// Adjust context window based on usage
if (usage && usage.usagePercentage > 70) {
  // Reduce conversation history to stay within limits
  clearChannelHistory(channelId);
}
```
