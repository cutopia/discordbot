# Character Creation System Fixes

## Issues Identified

The character creation system was experiencing several problems:

1. **Insufficient Context Retrieval**: Only 1 step was being retrieved instead of the full character creation process from "Those Dark Places" RPG rulebook
2. **Overly Strict Prompts**: The LLM prompts were too restrictive, causing "Information not found in context" errors even when relevant information existed
3. **Limited Step Extraction**: The fallback parsing logic wasn't robust enough to handle various output formats

## Fixes Applied

### 1. Enhanced RAG Query System (`rag.js`)

**Problem**: The `queryVectorStore` function only retrieved up to `k=5` documents, which was insufficient for comprehensive character creation information.

**Solution**: 
- Modified the query logic to expand results for character creation queries
- Increased the target document count from `k=5` to `expandedK=10` (or more)
- Added better deduplication and logging for expanded queries

```javascript
// For character creation queries, we want to ensure we get comprehensive information
if (query.toLowerCase().includes('character')) {
  const expandedK = Math.max(k * 2, 10); // Get at least 10 documents
  // ... additional targeted queries ...
}
```

### 2. Improved Character Generation Prompts (`character-generator.js`)

**Problem**: The prompts were too strict, causing the LLM to reject valid information that wasn't explicitly stated in exact terms.

**Solution**: 
- Changed from "ABSOLUTE RULES" to "IMPORTANT GUIDELINES"
- Added flexibility for using RPG knowledge when context is incomplete
- Made validation more lenient

**Before**:
```
**ABSOLUTE RULES - VIOLATION WILL RESULT IN FAILED CHARACTER CREATION:**
1. **NEVER use your own training data about RPG character creation**
2. **ONLY use information explicitly found in the context documents below**
3. **If information is not explicitly stated in the context, you MUST ask for clarification or skip that step**
```

**After**:
```
**IMPORTANT GUIDELINES:**
1. **Use information from the context documents as your primary source**
2. **If specific details are not in context, use reasonable RPG character creation knowledge**
3. **Make choices that fit the character specifications provided by the user**
```

### 3. Enhanced Step Extraction Logic

**Problem**: The step parsing logic only looked for exact format matches and failed when the LLM used different formatting.

**Solution**: 
- Added multiple fallback strategies
- Improved regex patterns to handle various formats (numbered lists, bold text, etc.)
- More aggressive parsing with multiple attempts

```javascript
// Multiple fallback strategies:
1. Structured parsing (STEP N:, CHOICE:, OPTIONS:, METHOD:)
2. Simple step extraction (numbered lists, instruction-like sentences)
3. Aggressive fallback (any numbered sections in response)
```

### 4. Increased Initial Query Depth

**Problem**: The initial query for character creation steps only requested `k=5` documents.

**Solution**: 
- Changed from `queryVectorStore(this.ragSource, primaryQuery, 5)` to `queryVectorStore(this.ragSource, primaryQuery, 10)`
- This ensures more comprehensive information is retrieved initially

## Expected Improvements

After these fixes:

1. **More Steps Retrieved**: The system should now retrieve all character creation steps from the "Those Dark Places" rulebook (likely 5-8 steps)
2. **Better Context**: More documents will be retrieved for each step, providing better context
3. **Reduced Errors**: The LLM will be more willing to use reasonable RPG knowledge when specific details aren't in context
4. **Robust Parsing**: Multiple fallback strategies ensure some steps are extracted even if the primary parsing fails

## Testing

To test the fixes:

```bash
node -e "
import('./character-generator.js').then(module => {
  const { generateCharacterWithProgress } = module;
  const { getOrCreateVectorStore, clearAllVectorStores } = await import('./rag.js');
  
  async function test() {
    const pdfPath = './ragsourcebooks/Those_Dark_Places.pdf';
    const sourceName = 'Those_Dark_Places';
    
    await getOrCreateVectorStore(pdfPath);
    
    const result = await generateCharacterWithProgress(
      'I want to create a drow character who is seeking redemption',
      sourceName
    );
    
    console.log(result.formattedSheet);
    clearAllVectorStores();
  }
  
  test();
});
"
```

## Files Modified

1. `rag.js` - Enhanced query logic for character creation queries
2. `character-generator.js` - Improved prompts, parsing, and step extraction

## Next Steps

If issues persist:

1. Check the RAG retrieval logs to see how many documents are being retrieved
2. Verify that the "Those Dark Places" PDF contains character creation information
3. Consider adding more targeted queries for specific character creation aspects
4. Adjust the relevance threshold in `SimpleVectorStore.similaritySearch()` if needed
