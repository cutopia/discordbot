# Character Generation Command Fix

## Summary of Changes

The `/character` command has been fixed to properly use ONLY the currently selected RAG source with NO fallbacks. This ensures that character generation is based solely on the rules from the selected RPG rulebook.

## Files Modified

### 1. `app.js`
**Changes:**
- Added validation to check if a RAG source is selected before proceeding
- Returns an error message if no RAG source is active, requiring users to use `/rag_source` first
- Removed the "default world rules" fallback behavior

**Before:**
```javascript
if (ragSource) {
  console.log(`Using RAG source: ${ragSource}`);
} else {
  console.log('No RAG source active, using default world rules');
}
```

**After:**
```javascript
if (!ragSource) {
  return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: '❌ No RAG source selected. Please use `/rag_source` to select a PDF document before creating a character.',
      flags: InteractionResponseFlags.EPHEMERAL
    }
  });
}

console.log(`Using RAG source: ${ragSource}`);
```

### 2. `character-generator.js`
**Changes:**
- Implemented agentic loop with max 3 attempts per step
- Added strict validation without LLM-generated fallback explanations
- Modified error handling to stop immediately on failures

#### Agentic Loop Implementation
```javascript
async function generateCharacterStep(step, ragSource, previousData = {}, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Generate response and validate
    const isValid = step.validation(validationData);
    
    if (isValid) {
      return { success: true, data: validationData };
    }
    
    // If on last attempt and still failed, don't retry
    if (attempt === maxAttempts) break;
  }
  
  // All attempts failed - no fallbacks
  return { 
    success: false, 
    failureMessage: `Failed to complete step "${step.name}" after ${maxAttempts} attempts...`
  };
}
```

#### Strict Validation
```javascript
export async function validateStep(step, data, ragSource = null) {
  const isValid = step.validation(data);
  
  if (isValid) {
    return { isValid: true };
  }
  
  // Validation failed - no fallbacks allowed
  return {
    isValid: false,
    failureMessage: `Validation failed for step "${step.name}": ${step.description}. The character data does not meet the required validation criteria.`
  };
}
```

#### Immediate Error Handling
```javascript
if (!generationResult.success) {
  // Step failed after all attempts - no fallbacks allowed
  result.progressUpdates[result.progressUpdates.length - 1].status = 'error';
  throw new Error(generationResult.failureMessage || `Failed to complete step: ${step.name}`);
}
```

## Behavior Changes

### Before Fix
- Used default rules when no RAG source was selected
- Collected validation failures and continued generation
- Used LLM-generated explanations for validation failures (fallback behavior)
- Would attempt multiple steps even if earlier steps failed

### After Fix
- **Requires** a RAG source to be selected via `/rag_source` before character creation
- Uses ONLY the selected RAG source - no fallbacks
- Implements agentic loop with max 3 attempts per step
- Stops immediately if any step fails after all attempts are exhausted
- Provides clear, direct failure messages without LLM-generated explanations

## User Workflow

1. **Select a RAG source:**
   ```
   /rag_source Heart_Core_Book_Delve_Edition_2024-07-23
   ```

2. **Create a character:**
   ```
   /character
   ```

3. **If generation fails:**
   - The command stops at the first failed step
   - Reports exactly which step failed and why
   - Shows how many attempts were made before giving up

## Example Error Messages

### No RAG Source Selected
```
❌ No RAG source selected. Please use `/rag_source` to select a PDF document before creating a character.
```

### Step Validation Failure
```
❌ Validation failed for step "Select an ancestry": Choose a character ancestry (drow, aelfir, human, or gnoll). The character data does not meet the required validation criteria.
```

### Generation Exhaustion
```
❌ Failed to complete step "Select abilities" after 3 attempts. The AI was unable to generate valid character data that meets the validation requirements for this step.
```

## Validation Rules

Each step has specific validation rules:

1. **Ancestry**: Must be one of: drow, aelfir, human, gnoll
2. **Calling**: Must be one of: Adventure, Enlightenment, Forced, Heartsong, Penitent
3. **Class**: Must be one of the valid classes from the rulebook
4. **Abilities**: Must have 1 major and at least 3 minor abilities
5. **Equipment**: Must be a non-empty array
6. **Beats**: Must be an array with at least 2 items
7. **Calling Questions**: Must have at least one question-answer pair
8. **Finishing Details**: Must include name, appearance, and personality

## Testing Recommendations

1. Test without selecting a RAG source first (should fail)
2. Test with a valid RAG source selected (should succeed if AI generates valid data)
3. Test with an AI that consistently fails validation (should stop after 3 attempts per step)
4. Verify error messages are clear and actionable
