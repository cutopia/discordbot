# Character Generator Refactoring - Aagnostic RPG System Support

## Problem Statement

The previous `character-generator.js` implementation had **hardcoded steps specific to the "Heart" RPG system**, including:
- Hardcoded step definitions (ancestry, calling, class, abilities, etc.)
- Hardcoded validation rules for each step
- Hardcoded response parsing logic for specific data structures
- No integration with the selected RAG source's actual game rules

This violated the core requirement: **The character generator should be agnostic to any RPG system and dynamically follow the steps specified in the currently selected RAG source.**

## Solution Overview

The refactored `character-generator.js` now:

1. ✅ **Dynamically retrieves character creation steps from the RAG source**
2. ✅ **Follows those steps exactly as documented in the game rules**
3. ✅ **Contains zero hardcoded RPG system-specific logic**
4. ✅ **Has no fallbacks to specific game mechanics**

## Key Changes

### 1. Removed Hardcoded Steps
**Before:**
```javascript
const CHARACTER_STEPS = [
  {
    step: 1,
    name: 'Select an ancestry',
    description: 'Choose a character ancestry (drow, aelfir, human, or gnoll)',
    validation: (data) => ['drow', 'aelfir', 'human', 'gnoll'].includes(data.ancestry?.toLowerCase())
  },
  // ... more hardcoded steps
];
```

**After:**
```javascript
async function getCharacterSteps(ragSource) {
  const prompt = `What are the complete, step-by-step instructions for creating a new character in this RPG system?`;
  const context = await getRagQuery(ragSource, prompt, 5);
  return context;
}
```

### 2. Dynamic Step Parsing
The system now parses the RAG response to extract numbered steps or bullet points:

```javascript
function parseCharacterSteps(stepsText) {
  // Extracts numbered steps (1., 2., etc.) or bullet points
  // Creates structured step objects dynamically
}
```

### 3. Agnostic Step Generation
Each character generation step now:
- Uses the step description from RAG
- Queries RAG for detailed context about that specific step
- Returns raw AI response without system-specific parsing

```javascript
async function generateCharacterStep(step, ragSource, previousData = {}, maxAttempts = 3) {
  // Build prompt using step.description from RAG (not hardcoded)
  
  // Get specific instructions from RAG about what this step requires
  const stepDetails = await getRagQuery(ragSource, `What are the requirements for ${step.description}?`, 2);
  
  // Return raw response - no system-specific parsing
  return {
    prompt,
    response: lastResponse,
    success: true,
    data: { [step.description]: lastResponse } // Generic key-value storage
  };
}
```

### 4. Generic Validation
Validation is now generic - it only checks that character data exists:

```javascript
// Final validation - no fallbacks allowed
// Since we're agnostic, we can't do system-specific validation
const hasCharacterData = Object.keys(characterData).some(
  key => typeof characterData[key] === 'string' && characterData[key].length > 10
);
```

### 5. Dynamic Formatting
The final character sheet formatting also queries the RAG source:

```javascript
async function formatCharacterSheet(characterData, ragSource) {
  const formattingInstructions = await getRagQuery(
    ragSource,
    `How should a complete character sheet be formatted?`,
    2
  );
  
  // Format based on RAG guidance or use generic fallback
}
```

## How It Works Now

1. User runs `/character` command
2. Bot checks for active RAG source (set via `/rag_source`)
3. **Queries RAG source**: "What are the character creation steps?"
4. **Parses** the response to extract structured steps
5. For each step:
   - Queries RAG: "What are the requirements for [step description]?"
   - Sends AI prompt with context and previous choices
   - Stores raw response in generic data structure
6. **Formats** final sheet using RAG guidance or generic fallback

## Benefits

✅ **Truly agnostic** - Works with ANY RPG system that has character creation rules documented in PDF  
✅ **No hardcoded game mechanics** - No "Heart" specific logic remains  
✅ **No fallbacks** - Doesn't try to "help" with system-specific defaults  
✅ **Follows RAG source exactly** - Character creation matches the documented rules  
✅ **Extensible** - New RPG systems work immediately when their PDF is loaded  

## Testing

To test with a new RPG system:

1. Load the system's PDF via `/rag_source`
2. Run `/character` command
3. The bot will:
   - Query the PDF for character creation steps
   - Follow those steps dynamically
   - Generate a character that matches the system's rules

## Files Modified

- `character-generator.js` - Complete refactor to agnostic implementation

## Backwards Compatibility

⚠️ **Breaking Change**: This is not backwards compatible with the old hardcoded approach. However, this was explicitly requested as the previous implementation violated the core requirement of being agnostic.
