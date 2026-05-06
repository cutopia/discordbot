# Character Generation RAG Integration Fix

## Problem

The `/character` command was generating characters using default world rules (D&D-style races/classes) instead of using the context from the loaded PDF document. For example, when a user had an industrial sci-fi system PDF loaded, the character generator would still output "Dwarf Bard" with standard D&D races and classes.

## Root Cause

The `CharacterGenerationAgent` class in `character-agent.js` was receiving the RAG source path but not actually using it to retrieve or apply world-specific context. The agent had hardcoded lists of races, classes, and backgrounds that were independent of the loaded PDF content.

## Solution

### 1. Updated `character-agent.js`

- **Added RAG import**: Imported `queryVectorStore` and `getOrCreateVectorStore` from `rag.js`
- **Enhanced initialization**: The `initialize()` method now:
  - Creates the vector store if it doesn't exist
  - Queries the vector store for world-specific context (races, classes, backgrounds, ability scores, personality traits, backstories)
  - Stores retrieved context in `this.ragContext` array

- **Updated generation methods**: All character generation steps now use RAG context when available:
  - `determineRace()`: Extracts available races from RAG context using LLM
  - `determineClass()`: Extracts available classes from RAG context using LLM  
  - `determineBackground()`: Extracts available backgrounds from RAG context using LLM
  - `generatePersonalityTraits()`: Generates world-appropriate personality traits using LLM and RAG context
  - `generateBackstory()`: Creates a backstory that fits the world setting using LLM and RAG context
  - `calculateAbilityScores()`: Determines the correct ability score generation method from RAG context

### 2. Updated `character-generator.js`

- **Added vector store creation**: The `getStepContext()` function now ensures the vector store exists before querying it
- **Fixed source name handling**: Converts full PDF paths to source names (filename without path/extension) for consistent vector store access

## How It Works Now

1. When `/character` is invoked with a RAG source:
   - The agent initializes and creates/retrieves the vector store for that PDF
   - It queries the vector store for world-specific information about races, classes, backgrounds, etc.
   - For each generation step, it uses LLM to extract or generate content based on the retrieved context

2. Example flow with an industrial sci-fi PDF:
   ```
   Query: "What races are available in this world?"
   → RAG returns relevant chunks from the PDF
   → LLM extracts: "Cybernetic Humans, Augmented Elves, Machine-Organic Dwarves"
   → Character generator selects from these options instead of default D&D races
   ```

## Testing

All existing tests pass:
- `tests/test-character.js`: 18/18 tests passing
- `tests/test-character-with-rag.js`: RAG integration tests passing

The fix ensures that when a PDF is loaded via `/rag_source`, the character generator will use world-specific content from that document rather than default D&D-style rules.

## Files Modified

1. `character-agent.js` - Enhanced with full RAG integration
2. `character-generator.js` - Fixed source name handling and vector store creation
