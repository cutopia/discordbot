# Character Validation JSON Parsing Fix

## Problem

The character validation system was failing when the LLM returned responses wrapped in markdown code blocks (```json). This caused errors like:

```
❌ [VALIDATION] JSON parsing failed!
[VALIDATION] Error details: Unexpected token '`', "```json { "... is not valid JSON
```

## Root Cause

The `validateCharacterSheet` method in `character-generator.js` was attempting to parse the LLM response directly as JSON without first stripping any markdown formatting that might be present.

When LLMs return structured responses, they often wrap them in markdown code blocks for clarity:
```json
{
  "success": true,
  "message": "Validation passed",
  "issues": []
}
```

The original code would try to parse this entire string (including the backticks and language identifier) as JSON, which would fail.

## Solution

Modified the `validateCharacterSheet` method to:

1. **Strip markdown code blocks** before parsing:
   - Remove ```json prefix if present
   - Remove ``` prefix if present  
   - Remove ``` suffix if present
   - Trim whitespace after each operation

2. **Improved error logging** to show when markdown code blocks are detected

3. **Maintained backward compatibility** with the heuristic fallback for completely malformed responses

## Code Changes

In `character-generator.js`, lines ~600-650:

```javascript
// Before parsing, strip markdown code blocks if present
let cleanResponse = response.trim();
if (cleanResponse.startsWith('```json')) {
  cleanResponse = cleanResponse.slice(7); // Remove ```json prefix
}
if (cleanResponse.startsWith('```')) {
  cleanResponse = cleanResponse.slice(3); // Remove ``` prefix
}
if (cleanResponse.endsWith('```')) {
  cleanResponse = cleanResponse.slice(0, -3); // Remove ``` suffix
}
cleanResponse = cleanResponse.trim();

// Now parse the cleaned response
validation = JSON.parse(cleanResponse);
```

## Testing

To verify this fix works:

1. Run character generation with a model that returns markdown-wrapped responses
2. Check logs for `[VALIDATION] Cleaned response length` message
3. Verify validation succeeds without JSON parsing errors

## Impact

- **User-facing**: Character sheets will now be generated successfully even when the LLM wraps responses in markdown
- **Performance**: Minimal overhead from string operations (typically < 1ms)
- **Compatibility**: Fully backward compatible with existing code
