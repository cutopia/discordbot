# RAG Feature Quick Reference

## Available Slash Commands

| Command | Description | Options |
|---------|-------------|---------|
| `/rag_list` | List all available PDF sources | None |
| `/rag_source [source]` | Select a PDF source for RAG | Source name (dropdown) |
| `/rag_clear` | Clear all RAG vector stores | None |
| `/chat [message]` | Send message to AI with RAG context | Message text |

## Quick Start

1. **List available sources:**
   ```
   /rag_list
   ```

2. **Select a source:**
   ```
   /rag_source Heart_Core_Book_Delve_Edition_2024-07-23
   ```

3. **Ask questions:**
   ```
   /chat What does this document say about [topic]?
   ```

## File Structure

```
project/
├── app.js                    # Main bot file (updated with RAG commands)
├── chatbot.js               # Chat processing with RAG integration
├── rag.js                   # RAG functionality module
├── tests/test-rag.js              # Test script for RAG
├── commands.js              # Slash command definitions
├── package.json             # Dependencies (updated)
├── .env                     # Environment variables
├── ragsourcebooks/          # PDF files directory
│   ├── Heart_Core_Book_Delve_Edition_2024-07-23.pdf
│   └── Those_Dark_Places.pdf
└── RAG_FEATURE.md           # Detailed documentation
```

## Key Functions

### rag.js Module

| Function | Description |
|----------|-------------|
| `getAvailablePDFs()` | Returns array of available PDF sources |
| `extractTextFromPDF(path)` | Extracts text from a PDF file |
| `createVectorStore(name, text)` | Creates vector embeddings for text |
| `queryVectorStore(source, query, k)` | Searches for relevant documents |
| `getOrCreateVectorStore(path)` | Gets or creates vector store for source |
| `clearVectorStore(name)` | Clears specific vector store |
| `clearAllVectorStores()` | Clears all vector stores |

### chatbot.js Integration

| Function | Description |
|----------|-------------|
| `setRAGSource(channelId, sourceName)` | Set active RAG source for channel |
| `getRAGSource(channelId)` | Get active RAG source for channel |
| `processChatMessage(message, channelId)` | Process message with optional RAG context |

## Environment Variables

```env
# Required
DISCORD_APP_ID=your_app_id
DISCORD_TOKEN=your_bot_token
PUBLIC_KEY=your_public_key
LM_STUDIO_API_URL=http://localhost:1234/v1/chat/completions

# Optional (for embeddings)
OPENAI_API_KEY=sk-your_api_key
```

## Common Tasks

### Add a new PDF source
1. Place the PDF in `ragsourcebooks/` directory
2. Use `/rag_list` to verify it's detected
3. Select with `/rag_source [name]`

### Switch between sources
1. Clear current source: `/rag_clear`
2. Select new source: `/rag_source [new_name]`

### Reset everything
```
/rag_clear
```

## Testing

Run the test script:
```bash
node tests/test-rag.js
```

Expected output shows successful PDF extraction, vector store creation, and query functionality.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No PDFs found | Check `ragsourcebooks/` directory exists with PDF files |
| Vector store error | Add OpenAI API key to `.env` file |
| Bot not responding | Re-run `/register` command and restart bot |
| Slow responses | Reduce chunk size or number of retrieved documents |

## Performance Tips

1. **For large PDFs:**
   - Process in smaller batches
   - Use fewer retrieval results (`k=2` instead of `k=5`)
   
2. **For faster queries:**
   - Keep vector stores cached (don't clear unnecessarily)
   - Use specific, focused questions
   
3. **Memory management:**
   - Clear unused sources with `/rag_clear`
   - Consider persistent storage for production use

## Next Steps

- Read `RAG_FEATURE.md` for detailed documentation
- Check `RAG_INSTALLATION.md` for setup instructions
- Review `tests/test-rag.js` for code examples
