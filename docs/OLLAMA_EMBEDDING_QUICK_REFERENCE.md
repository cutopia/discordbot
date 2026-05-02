# Ollama Embedding Quick Reference

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_API_URL` | `http://localhost:11434/api` | Ollama API endpoint |
| `OLLAMA_EMBEDDING_MODEL` | `all-minilm` | Model name for embeddings |

## Setup Steps

### 1. Verify Ollama is Running
```bash
ollama list
```

Expected output should include:
```
all-minilm:latest
```

### 2. Configure Environment
Copy `.env.example` to `.env` and ensure these lines are present:
```env
OLLAMA_API_URL=http://localhost:11434/api
OLLAMA_EMBEDDING_MODEL=all-minilm
```

### 3. Test Embeddings API
```bash
curl http://localhost:11434/api/embeddings -X POST \
  -H "Content-Type: application/json" \
  -d '{"model":"all-minilm","prompt":"test"}'
```

## Usage in Code

### Creating Embeddings Instance
```javascript
import { LocalEmbeddings } from './rag.js';

const embeddings = new LocalEmbeddings();
// Uses Ollama by default
```

### Generating Embeddings
```javascript
// For documents
const docEmbeddings = await embeddings.embedDocuments(texts);

// For queries
const queryEmbedding = await embeddings.embedQuery(query);
```

## API Response Format

### Request
```json
POST /api/embeddings
{
  "model": "all-minilm",
  "prompt": "text to embed"
}
```

### Response
```json
{
  "embedding": [0.12, -0.05, ..., 0.08] // 384 floats
}
```

## Common Commands

### Start Ollama
```bash
ollama serve
```

### Pull Model (if not installed)
```bash
ollama pull all-minilm
```

### List Models
```bash
ollama list
```

### Remove Model
```bash
ollama rm all-minilm
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| API returns 404 | Ensure Ollama is running: `ollama serve` |
| Model not found | Pull model: `ollama pull all-minilm` |
| Slow embeddings | Use GPU or smaller quantized model |
| Fallback to hash | Check network connectivity to localhost:11434 |

## Verification Checklist

- [ ] Ollama is running (`ollama serve`)
- [ ] Model is installed (`ollama list` shows `all-minilm`)
- [ ] API responds to requests
- [ ] `.env` file has correct configuration
- [ ] RAG tests pass (`npm run test-rag`)

## Notes

- Embeddings are cached to avoid redundant API calls
- Fallback hash-based embeddings work if Ollama is unavailable
- 384-dimensional vectors compatible with all-MiniLM-L6-v2 models
