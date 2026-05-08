# Character Validation Failure Messages

## Overview

The character generation system now includes LLM-powered validation failure messages. When a character step fails validation, the system will:

1. Detect the validation failure using the defined validation rules
2. Query the RAG source for guidance on common validation failures
3. Use an LLM to generate a specific, helpful failure message explaining what went wrong and how to fix it
4. Display these messages in the character sheet so users can understand and correct issues

## Implementation Details

### Validation Function

The `validateStep` function has been updated to return more detailed information:

```javascript
export async function validateStep(step, data, ragSource = null) {
  // Returns an object with:
  // - isValid: boolean indicating if validation passed
  // - failureMessage: string explaining why validation failed (if applicable)
  // - validationGuidance: the RAG context used for generating the message
}
```

### Progress Updates

Progress updates now include LLM-generated failure messages:

```javascript
result.progressUpdates[result.progressUpdates.length - 1].message += 
  isValid ? ' ✅' : ` ⚠️ (${validationResult.failureMessage || 'requires review'})`;
```

### Character Sheet Display

The character sheet now includes a dedicated section for validation failures:

```markdown
## ❗ Validation Failure Messages

### Step Name
LLM-generated explanation of what went wrong and how to fix it.

### Another Step Name  
Another LLM-generated failure message.
```

## Usage Example

When generating a character, if validation fails at any step:

1. The progress report will show warnings with the LLM's explanation
2. The final character sheet will include all validation failures
3. Users can see exactly what needs to be corrected

## Configuration

The system uses:
- **RAG Source**: Provides context about common validation failures
- **LLM (Qwen3)**: Generates specific, helpful failure messages
- **Validation Rules**: Defined in `CHARACTER_STEPS` array for each character creation step

## Benefits

1. **Better User Experience**: Users get specific guidance on what went wrong
2. **Reduced Support**: LLM-generated messages reduce the need for manual troubleshooting
3. **Context-Aware**: Messages are tailored to the specific validation failure and available rules
4. **Transparent**: All failure messages are displayed in the character sheet for review
