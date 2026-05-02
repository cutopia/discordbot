# Ollama Embedding Setup Guide

## Overview

This project now uses **Ollama's all-minilm model** for local embeddings in RAG (Retrieval-Augmented Generation) functionality. No external API keys or cloud services are required.

## Current Implementation

### LocalEmbeddings Class

The `rag.js` file contains a `LocalEmbeddings` class that generates embeddings locally using:

- **Model**: `all-minilm` from Ollama
- **Dimensions**: 384 (compatible with all-MiniLM-L6-v2)
- **Caching**: Embedding cache to avoid recomputing
- **Fallback**: Hash-based embedding generation if Ollama API is unavailable

## Required Local Models for Production Use

### Ollama Setup

**Model**: `all-minilm` (already installed)

**Setup**:
```bash
# Check available models
ollama list

# If all-minilm is not installed, pull it
ollama pull all-minilm

# Start Ollama server (if not already running)
ollama serve
```

## Environment Variables

Add these to your `.env` file:

```env
OLLAMA_API_URL=http://localhost:11434/api
OLLAMA_EMBEDDING_MODEL=all-minilm
```

## System Requirements

### For Ollama Hosting
- **RAM**: 2GB minimum (for all-minilm model)
- **Storage**: 50MB for embedding models
- **CPU**: Any modern CPU (embeddings are lightweight)

## Testing Ollama Embeddings

1. Ensure Ollama is running:
   ```bash
   ollama serve
   ```

2. Test the embeddings API directly:
   ```bash
   curl http://localhost:11434/api/embeddings -X POST \
     -H "Content-Type: application/json" \
     -d '{"model":"all-minilm","prompt":"test"}'
   ```

3. Run the RAG test script to verify embeddings work:
   ```bash
   npm run test-rag
   ```

## Migration from External APIs

The project previously used `@langchain/openai` which required:

```bash
# Old configuration (REMOVED)
OPENAI_API_KEY=sk-...
```

**This dependency has been removed.** The new implementation uses local Ollama embeddings only.

## Troubleshooting

### Ollama API Not Responding

If you see errors like "Ollama API error: 404", check:

1. Ollama is running:
   ```bash
   ollama serve
   ```

2. The model is installed:
   ```bash
   ollama list
   ```

3. The API URL is correct in your `.env` file

### Fallback to Hash-Based Embeddings

If the Ollama API fails, the system will automatically fall back to hash-based embeddings for demo purposes. This ensures functionality even when the embedding server is unavailable.

## Adding More Models

When adding additional models, always follow these guidelines:

1. **Document the model name and purpose**
2. **Provide local hosting instructions** (Ollama, LM Studio, etc.)
3. **Include system resource requirements**
4. **Specify API endpoint details** (host, port, model ID)
5. **Add verification steps**

See `AGENTS.md` for full policy details.
