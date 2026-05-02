# RAG Similarity Search Fix

## Problem

The RAG agent wasn't performing proper similarity search. The `SimpleVectorStore.similaritySearch()` method was simply returning the first k documents without any actual vector comparison or relevance scoring.

## Root Cause

1. **No similarity calculation**: The original implementation used `slice(0, k)` to return the first k documents
2. **No relevance scores**: All returned documents had a score of 0
3. **No sorting by relevance**: Documents weren't sorted by their actual similarity to the query

## Solution Implemented

### 1. Added Cosine Similarity Calculation

```javascript
cosineSimilarity(vec1, vec2) {
  // Calculate cosine similarity between two vectors
  // Returns value in range [-1, 1], where higher = more similar
}
```

### 2. Implemented Proper Similarity Search

The `similaritySearch()` method now:
- Generates embedding for the query using Ollama API (or fallback hash)
- Calculates cosine similarity between query and all document embeddings
- Sorts results by similarity score (highest first)
- Returns top k documents with actual relevance scores

### 3. Enhanced Error Handling

- Added rate limiting to batch embedding requests (100ms delay between batches of 5)
- Improved fallback mechanism when Ollama API fails
- Better error messages for debugging

## Changes Made

### File: `rag.js`

#### Modified `SimpleVectorStore` class:

1. **Updated `similaritySearch()` method**:
   - Now generates query embedding
   - Calculates cosine similarity with all documents
   - Sorts by relevance score
   - Returns documents with actual scores

2. **Added `cosineSimilarity()` method**:
   ```javascript
   cosineSimilarity(vec1, vec2) {
     // Computes dot product / (magnitude1 * magnitude2)
     // Returns value in [-1, 1]
   }
   ```

3. **Added `generateHashEmbedding()` method**:
   - Fallback embedding generation when Ollama API unavailable
   - Generates deterministic 384-dimensional vectors

4. **Enhanced `embedDocuments()` method**:
   - Added batch processing with rate limiting
   - Improved error handling for individual documents

## Verification Results

### Before Fix
```
Query: "What is this document about?"
Document 1 (score: 0): First k documents returned without relevance calculation
Document 2 (score: 0): 
Document 3 (score: 0):
```

### After Fix
```
Query: "magic spells"
Document 1 (score: 0.5465): Contains "Spells That Itch In Your Blood"
Document 2 (score: 0.4786): Related to magic content
Document 3 (score: 0.4256): Less relevant

Query: "combat rules battle"  
Document 1 (score: 0.5321): Contains combat-related content
Document 2 (score: 0.5299): Related to battle mechanics
Document 3 (score: 0.5120): Less relevant
```

## Testing

Run the verification script:
```bash
node verify-rag-fix.js
```

Expected output:
- ✓ All RAG similarity search tests PASSED!
- Documents sorted by relevance score
- Different queries return different top documents
- Scores in valid range [-1, 1]

## System Requirements

### For Full Functionality (Ollama Embeddings)
- **RAM**: 2GB minimum (for all-minilm model)
- **Storage**: 50MB for embedding model
- **CPU**: Any modern CPU (embeddings are lightweight)

### Fallback Mode
- Works without Ollama API using hash-based embeddings
- Less accurate but functional

## Configuration

The system automatically uses:
1. Ollama embeddings if available (`http://localhost:11434/api/embeddings`)
2. Hash-based fallback if Ollama is unavailable

Environment variables (optional):
```env
OLLAMA_API_URL=http://localhost:11434/api
OLLAMA_EMBEDDING_MODEL=all-minilm
```

## Benefits

1. **Semantic Search**: Uses actual ML embeddings for meaningful similarity calculation
2. **Relevance Ranking**: Most relevant documents appear first
3. **Transparency**: Returns actual relevance scores
4. **Robustness**: Falls back to hash embeddings if Ollama unavailable
5. **Performance**: Caching prevents redundant embedding generation

## Future Enhancements

1. Add batch embedding support when available
2. Implement more sophisticated similarity metrics (e.g., Euclidean distance)
3. Add query expansion techniques
4. Support for hybrid search (keyword + semantic)
