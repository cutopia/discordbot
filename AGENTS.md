# AGENTS.md

## Model Usage Policy

### Non-Local Models Prohibited

**Non-local models must never be used.** All AI models must be self-hosted locally.

### Current Model: Qwen3

We are currently hosting **Qwen3** on localhost with LM Studio.

> ⚠️ **Important**: You must make other required models available by documenting them with suggestions for local hosting.

## Embedding Models Policy

### Local Embeddings Required

All embedding models (used for RAG, similarity search, etc.) must also be self-hosted locally. The following external dependencies are prohibited:

- `@langchain/openai` - Uses OpenAI API
- Any cloud-based embedding service

### Supported Local Embedding Solutions

| Solution | Model | Port | Storage |
|----------|-------|------|---------|
| LM Studio | all-MiniLM-L6-v2 | 1234 | 500MB |
| Ollama | nomic-embed-text | 11434 | 400MB |
| transformers.js | all-MiniLM-L6-v2 | N/A (browser) | 1GB |

See `LOCAL_EMBEDDINGS.md` for detailed setup instructions.

### Hosting Requirements for Additional Models

For any additional models we need, always:

1. Document the model requirements
2. Provide clear instructions for local/self-hosted deployment
3. Suggest appropriate hosting solutions (e.g., LM Studio, Ollama, vLLM, etc.)
4. Include system resource requirements (GPU/CPU memory, storage)
5. Specify any required configuration changes

### Implementation Checklist

When adding a new model requirement:

- [ ] Identify the model name and purpose
- [ ] Document local hosting method
- [ ] Provide startup commands or configuration
- [ ] Note API endpoint details (host, port, model ID)
- [ ] Include verification steps to confirm availability

---

*This policy ensures full control over our AI infrastructure while maintaining privacy and reliability.*
