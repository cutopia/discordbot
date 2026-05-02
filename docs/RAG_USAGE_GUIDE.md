# RAG Usage Guide

## Overview

The RAG (Retrieval-Augmented Generation) system allows the AI to answer questions based on specific PDF documents. This provides more accurate and context-aware responses.

## Setup Requirements

### 1. LM Studio
- Must be running locally
- API should be accessible at `http://localhost:1234/v1/chat/completions`

### 2. Ollama Embedding Model
The system uses local embeddings for semantic search:

```bash
# Pull the embedding model (if not already installed)
ollama pull all-minilm

# Verify it's available
curl http://localhost:11434/api/tags
```

## Basic Usage

### 1. Select a PDF Source

Use the `/rag_source` command to select which document you want to use:

```
/rag_source
```

Select from the dropdown menu:
- Heart_Core_Book_Delve_Edition_2024-07-23
- Those_Dark_Places

### 2. Ask Questions

Use the `/chat` command to ask questions about your selected document:

```
/chat What are the combat rules?
/chat How do I create a character?
/chat Can you explain the magic system?
```

The AI will retrieve relevant context from the PDF and use it to answer your question.

### 3. Clear RAG Context

To start fresh with a new document:

```
/rag_clear
```

## Advanced Usage

### Multiple Sessions

Each Discord channel maintains its own RAG source. You can have different channels using different PDFs simultaneously.

### Checking Active Source

The system automatically uses the last selected RAG source for each channel until you change it or clear it.

### Viewing Available Sources

Use `/rag_list` to see all available PDF sources:

```
/rag_list
```

## Troubleshooting

### No Context Retrieved

If the AI says "No relevant information found":

1. **Verify PDF is loaded**: Make sure you've selected a source with `/rag_source`
2. **Check Ollama**: Ensure Ollama embedding model is running:
   ```bash
   curl http://localhost:11434/api/embeddings -X POST \
     -H "Content-Type: application/json" \
     -d '{"model":"all-minilm","prompt":"test"}'
   ```
3. **Rebuild vector store**: Clear and re-select the source:
   ```
   /rag_clear
   /rag_source [select your document]
   ```

### Low Relevance Scores

If retrieved results seem irrelevant:

1. **Try more specific queries**: Instead of "combat", try "combat rules" or "combat system"
2. **Check chunking**: The system creates ~30-70 chunks per PDF for better coverage
3. **Verify embeddings**: Make sure the embedding model is working correctly

### LM Studio Connection Issues

If you see connection errors:

1. Ensure LM Studio is running
2. Verify API endpoint in `.env`:
   ```
   LMSTUDIO_API_URL=http://localhost:1234/v1/chat/completions
   ```

## Performance Notes

- **First query**: May be slower as vector store is created and cached
- **Subsequent queries**: Much faster due to caching
- **Chunking time**: ~0.5-1 second per PDF (depends on size)
- **Query time**: ~0.2-0.5 seconds for retrieval

## Tips for Better Results

1. **Be specific**: "What are the combat rules?" works better than "Tell me about combat"
2. **Use keywords**: Include key terms from the document
3. **Check relevance scores**: The system shows relevance percentages (aim for >30%)
4. **Try different phrasing**: If one query doesn't work, try rephrasing

## Example Queries

### For Heart_Core_Book_Delve_Edition:
- "What is the setting about?"
- "How do I create a character?"
- "Can you explain the magic system?"
- "What are the combat rules?"
- "Tell me about the different factions"

### For Those_Dark_Places:
- "What is the main theme?"
- "How does the game mechanics work?"
- "What are the key features?"

## Technical Details

### Vector Store
- **Chunk size**: 384 characters (optimized for embeddings)
- **Overlap**: 76 characters (10% of chunk size)
- **Embeddings**: Ollama all-minilm model (384 dimensions)
- **Similarity search**: Cosine similarity with threshold

### Relevance Threshold
- Minimum score: 25%
- Default results: Top 3 matches
- Results below threshold are still shown but marked as less relevant
