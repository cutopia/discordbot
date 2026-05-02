# Token Usage Logging Implementation Summary

## Changes Made

### 1. Core Implementation (`lmstudio.js`)

#### Added Context Window Configuration
- New constant `CONTEXT_WINDOW_SIZE` (default: 4096 tokens)
- Configurable via environment variable `CONTEXT_WINDOW_SIZE`

#### Request Token Information
Added logging before sending requests:
```javascript
console.log('LM Studio Request Token Info:');
console.log(`  Estimated prompt tokens: ${estimatedPromptTokens}`);
console.log(`  Message count: ${messages.length}`);
console.log(`  Total request size: ${totalChars} characters`);
```

#### Response Token Usage Logging
Added comprehensive logging after receiving responses:
```javascript
console.log('LM Studio Token Usage:');
console.log(`  Prompt tokens: ${promptTokens}`);
console.log(`  Completion tokens: ${completionTokens}`);
console.log(`  Total tokens: ${totalTokens}`);
console.log(`  Context window: ${maxContextWindow} tokens`);
console.log(`  Usage: ${usagePercentage}% of context window`);
```

#### Programmatic Access Functions
Added utility functions:
- `getLastTokenUsage()` - Returns token usage object with detailed stats
- `getContextWindowSize()` - Returns configured context window size

### 2. Configuration Files

#### `.env.example`
Added documentation for the new configuration option:
```bash
# Context Window Configuration (optional, defaults to 4096 tokens)
CONTEXT_WINDOW_SIZE=4096
```

### 3. Documentation

Created comprehensive documentation files:

1. **`TOKEN_USAGE_LOGGING.md`** - Complete guide covering:
   - Features and benefits
   - Configuration options
   - Example output
   - Programmatic access examples
   - Usage scenarios

2. **`TOKEN_USAGE_CHANGES.md`** - This file, summarizing all changes

## Token Usage Object Structure

When available, the token usage object contains:

```javascript
{
  promptTokens: number,      // Tokens used for input
  completionTokens: number,  // Tokens used for output  
  totalTokens: number,       // Sum of both
  maxContextWindow: number,  // Configured context limit
  usagePercentage: number    // Percentage of context window used
}
```

## Example Console Output

### Request Phase:
```
LM Studio Request Token Info:
  Estimated prompt tokens: 156
  Message count: 5
  Total request size: 624 characters
```

### Response Phase (when usage data available):
```
LM Studio Token Usage:
  Prompt tokens: 148
  Completion tokens: 32
  Total tokens: 180
  Context window: 4096 tokens
  Usage: 4.4% of context window
```

### Response Phase (when usage data not available):
```
LM Studio response received (token usage not available in response)
```

## Benefits

1. **Visibility**: Real-time insight into token consumption
2. **Optimization**: Identify when prompts are approaching limits
3. **Debugging**: Understand if truncation is caused by token limits
4. **Monitoring**: Track usage patterns over time
5. **Cost Control**: Estimate costs based on actual usage

## Backward Compatibility

- All changes are additive (no breaking changes)
- Default context window of 4096 tokens works for most models
- Token estimation uses reasonable approximations
- Graceful fallback when usage data not available from API

## Testing

To verify the implementation:

1. Ensure LM Studio is running with a model that supports token usage reporting
2. Make a chat request via the Discord bot or direct API call
3. Check console output for token usage information
4. Use `getLastTokenUsage()` programmatically to access stats

## Future Enhancements

Potential improvements:
- Per-message token breakdown
- Historical usage tracking
- Alert thresholds for high usage
- Automatic context window detection per model
- Integration with RAG context token counting
