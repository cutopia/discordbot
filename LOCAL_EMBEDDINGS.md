# Local Embeddings Documentation

## Overview

This project uses **fully local embeddings** for RAG (Retrieval-Augmented Generation) functionality. No external API keys or cloud services are required.

## Current Implementation

### LocalEmbeddings Class

The `rag.js` file contains a `LocalEmbeddings` class that generates embeddings locally using:

- **Model**: Simplified hash-based embedding generation
- **Dimensions**: 384 (compatible with all-MiniLM-L6-v2)
- **Caching**: Embedding cache to avoid recomputing

## Required Local Models for Production Use

### For Full RAG Functionality

To enable production-grade embeddings, you should host one of the following local embedding models:

#### Option 1: LM Studio (Recommended)

**Model**: `all-MiniLM-L6-v2` or similar

**Setup**:
1. Install [LM Studio](https://lmstudio.ai/)
2. Search for "all-MiniLM-L6-v2" in the model library
3. Download and load the model
4. Start the local server (default: `http://localhost**: 4GB minimum (2GB for model + overhead)
- **Storage**: 500MB for embedding models
- **CPU**: Any modern CPU (embeddings are lightweight)

### For transformers.js

- **RAM**: 8GB+ recommended for model loading
- **Storage**: 1GB for model files
- **CPU**: Modern CPU with AVX2 support recommended

## Migration from External APIs

The project previously used `@langchain/openai` which required:

```bash
# Old configuration (REMOVED)
OPENAI_API_KEY=sk-...
```

**This dependency has been removed.** The new implementation uses local embeddings only.

## Testing Local Embeddings

Run the RAG test script to verify embeddings work:

```bash
npm run test-rag
```

## Adding More Models

When adding additional models, always follow these guidelines:

1. **Document the model name and purpose**
2. **Provide local hosting instructions** (LM Studio, Ollama, etc.)
3. **Include system resource requirements**
4. **Specify API endpoint details** (host, port, model ID)
5. **Add verification steps**

See `AGENTS.md` for full policy details.
