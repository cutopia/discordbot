# Adaptive Query Generation for Character Generator

## Problem Statement

The previous character generator used **predetermined, rigid queries** that didn't allow the LLM to explore the RPG rulebook context dynamically. Each placeholder type had a fixed set of 3-4 questions that were too specific and didn't adapt to what the LLM discovered during its initial exploration.

### Issues with Old Approach

1. **Fixed query sets**: Each placeholder type had exactly 2-4 predetermined questions
2. **No exploration context**: Queries didn't change based on what was discovered in the rulebook
3. **Limited flexibility**: The LLM couldn't generate follow-up queries for gaps it identified
4. **Static responses**: Same queries regardless of the specific RPG system being used

## Solution: Adaptive Query Generation

The new implementation allows the LLM to create its own queries from the steps it initially finds when looking at the character creation process in the RPG rulebook context.

### Key Components

#### 1. Base Queries (Starting Points)

```javascript
getBaseQueries(placeholderType) {
  const queries = {
    NAME: [
      'What naming conventions exist in this RPG system?',
      'Are there cultural or regional naming patterns?'
    ],
    // ... other types with minimal base queries
  };
  return queries[placeholderType] || [];
}
```

- Provides minimal starting points (2 queries per type)
- Keeps the query set small and focused
- Serves as a foundation for adaptive expansion

#### 2. Adaptive Query Generation

```javascript
generateAdaptiveQueries(placeholderType, explorationContext = {}) {
  const baseQueries = this.getBaseQueries(placeholderType);
  
  if (explorationContext && explorationContext.discoveredConcepts) {
    return [
      ...baseQueries,
      // Generate queries based on what was discovered in the rulebook
      ...this.generateGapBasedQueries(placeholderType, explorationContext)
    ];
  }
  
  return baseQueries;
}
```

- Combines base queries with adaptive queries when exploration context is available
- Allows dynamic expansion of query set based on discovered concepts

#### 3. Gap-Based Queries

```javascript
generateGapBasedQueries(placeholderType, explorationContext) {
  const gapQueries = [];
  
  // Analyze what concepts were discovered and create targeted follow-up questions
  if (explorationContext.discoveredConcepts && 
      Array.isArray(explorationContext.discoveredConcepts)) {
    
    for (const concept of explorationContext.discoveredConcepts) {
      switch (placeholderType) {
        case 'NAME':
          gapQueries.push(
            `How does the ${concept} concept affect character naming?`,
            `Are there specific names or naming patterns related to ${concept}?`
          );
          break;
        // ... other cases
      }
    }
  }
  
  return gapQueries;
}
```

- Generates targeted follow-up questions based on discovered concepts
- Creates queries that address specific gaps identified during exploration

#### 4. Concept Extraction from Research Results

```javascript
extractDiscoveredConcepts(researchResults) {
  // Try to parse as JSON first (if the LLM returned structured output)
  try {
    const parsed = JSON.parse(researchResults);
    if (parsed.concepts && Array.isArray(parsed.concepts)) {
      return parsed.concepts;
    }
  } catch (e) {
    // Not JSON, continue with text parsing
  }
  
  // Fallback: extract potential concepts from research results text
  const concepts = [];
  const lines = researchResults.split('\n');
  for (const line of lines) {
    // Match patterns like "1. Concept", "- Concept", "* Concept"
    const match = line.match(/^(?:\d+[\.)]\s*[-•]?\s*|\-\s*|\*\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (match && match[1]) {
      concepts.push(match[1]);
    }
  }
  
  return [...new Set(concepts)].slice(0, 5); // Deduplicate and limit
}
```

- Extracts key concepts from the LLM's research results
- These concepts drive the adaptive query generation

## How It Works

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Research (Initial Exploration)                     │
├─────────────────────────────────────────────────────────────┤
│ 1. LLM analyzes RPG rulebook for character creation steps   │
│ 2. Extracts key concepts from research results              │
│    - e.g., "Magic System", "Technology Levels",             │
│      "Social Class"                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Adaptive Query Generation                          │
├─────────────────────────────────────────────────────────────┤
│ For each placeholder type (NAME, ATTRIBUTE, etc.):          │
│                                                             │
│ Base Queries (2) + Gap-Based Queries (8) = Total (10)      │
│                                                             │
│ Example for NAME:                                           │
│   1. What naming conventions exist?                         │
│   2. Are there cultural or regional patterns?               │
│   3. How does Magic affect character naming?                │
│   4. Are there specific names related to Magic?             │
│   5. How does Technology affect character naming?           │
│   6. Are there specific names related to Technology?        │
│   ... (additional gap-based queries)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: RAG Query Execution                                │
├─────────────────────────────────────────────────────────────┤
│ Execute all generated queries against vector store          │
│ Collect relevant documents for each placeholder             │
└─────────────────────────────────────────────────────────────┘
```

### Example Output

**Before (Old Approach)**:
- NAME: 2 fixed queries
- ATTRIBUTE: 4 fixed queries  
- SKILL: 4 fixed queries

**After (New Approach with Exploration Context)**:
- NAME: 10 total queries (2 base + 8 adaptive)
- ATTRIBUTE: 10 total queries (2 base + 8 adaptive)
- SKILL: 10 total queries (2 base + 8 adaptive)

## Benefits

1. **Dynamic Query Generation**: Queries adapt based on what the LLM discovers
2. **Better Coverage**: More comprehensive query set leads to better resolution
3. **RPG System Agnostic**: Works with any RPG system without manual query tuning
4. **Exploration-Driven**: The LLM guides its own query generation based on gaps it identifies

## Testing

Run the adaptive query tests:

```bash
node tests/test-adaptive-queries.js
```

All existing tests continue to pass:

```bash
node tests/test-placeholder-resolution-system.js
```

## Migration Notes

The changes are **backward compatible**:
- Old code that calls `getBaseQueries()` still works
- New `explorationContext` parameter is optional with default value `{}`
