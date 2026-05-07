# System-Agnostic Character Features

## Overview

The `determineRace` and `determineClass` methods have been refactored to be system-agnostic. These functions now adapt to whatever character features are relevant in the loaded PDF file, rather than being hardcoded for specific RPG systems.

## Changes Made

### Method Renames
- `determineRace()` → `determineCharacterFeatures()`
- `determineClass()` → `determineCharacterClass()`

### System-Agnostic Behavior

The new methods work as follows:

1. **Query RAG Context**: They first check if the loaded PDF file contains information about character categories
2. **LLM Extraction**: If RAG context exists, they use an LLM to extract available features/classes from the context
3. **Fallback Handling**: If no RAG context is available or parsing fails, they fall back to generic defaults

### Key Features

- **Flexible Feature Types**: Can handle races, classes, species, factions, or any other defining characteristics
- **Context-Aware**: Adapts to whatever exists in the loaded PDF file
- **No Hardcoded Assumptions**: Doesn't assume specific RPG systems (D&D, Pathfinder, etc.)
- **Graceful Degradation**: Falls back to sensible defaults when RAG context is unavailable

## Implementation Details

### determineCharacterFeatures()

```javascript
async determineCharacterFeatures() {
  // 1. Check for race context in RAG
  const raceContext = this.ragContext.find(ctx => ctx.type === 'races');
  
  if (raceContext && raceContext.documents.length > 0) {
    // Use LLM to extract available features from context
    const prompt = `Based on the following world context, list all playable character categories or types. These could be races, classes, species, factions, or any other defining characteristics.
Return only the feature names as a comma-separated list.

World Context:
${contextText}

Available features:`;
    
    // Parse LLM response and filter results
  } else {
    // Fallback to defaults if no RAG context
    availableFeatures = ['Human', 'Elf', 'Dwarf', ...];
  }
  
  // Select random feature from available options
}
```

### determineCharacterClass()

```javascript
async determineCharacterClass() {
  // 1. Check for class context in RAG
  const classContext = this.ragContext.find(ctx => ctx.type === 'classes');
  
  if (classContext && classContext.documents.length > 0) {
    // Use LLM to extract available classes from context
    const prompt = `Based on the following world context, list all playable character classes or roles. These could be traditional RPG classes,职业, archetypes, or any other defining role types.
Return only the class names as a comma-separated list.

World Context:
${contextText}

Available classes:`;
    
    // Parse LLM response and filter results
  } else {
    // Fallback to defaults if no RAG context
    availableClasses = ['Fighter', 'Wizard', 'Cleric', ...];
  }
  
  // Select random class from available options
}
```

## Benefits

1. **Universal Compatibility**: Works with any RPG system or custom world
2. **Context-Aware Generation**: Character features are derived from the loaded PDF content
3. **Extensible**: Can handle new feature types without code changes
4. **Maintainable**: Clear separation between feature detection and selection logic

## Migration Notes

### For Existing Code

If you're calling these methods directly:

```javascript
// Old (deprecated)
await agent.determineRace();
await agent.determineClass();

// New (system-agnostic)
await agent.determineCharacterFeatures();
await agent.determineCharacterClass();
```

### Test Updates

Update test descriptions to reflect the system-agnostic nature:

```javascript
// Old
describe('determineRace', () => { ... });

// New
describe('determineCharacterFeatures', () => { ... });
```

## Future Enhancements

Potential improvements for even more flexibility:

1. **Multiple Feature Selection**: Allow selection of multiple features (e.g., race + faction)
2. **Feature Combinations**: Support complex character definitions (hybrid classes, multiclassing)
3. **Custom Feature Types**: Enable users to define their own feature categories
4. **Validation Rules**: Add system-specific validation for generated characters

## Related Files

- `character-agent.js` - Main implementation
- `tests/test-character.js` - Updated tests
- `rag.js` - RAG context retrieval functions
- `lmstudio.js` - LLM integration for feature extraction
