# Quick RAG Fix Reference

## The Problem
When using `/chat` with a selected RAG source, the bot responds generically instead of using your document content.

**Cause**: Conversation history was overriding RAG context.

## The Solution (Already Applied ✅)

### Changes Made:
1. **Clears conversation history** when you set a new RAG source
2. **Uses empty history []** for RAG queries to prevent contamination
3. **Enhanced prompt template** with explicit instructions

## Quick Test

```bash
# 1. Clear everything
/clearchat

# 2. Set your RAG source  
/rag_source combat_rules.pdf

# 3. Ask about combat rules
/chat What are the combat rules?

# Expected: Response uses ONLY content from combat_rules.pdf
```

## If Still Not Working

### Check LM Studio:
```bash
curl http://localhost:1234/v1/models
```
Should return model list.

### Check Ollama (for embeddings):
```bash
curl http://localhost:11434/api/embeddings
```
Should be accessible.

### Verify Vector Store Created:
Look for logs when running `/rag_source` - should show "Successfully created vector store"

## Key Files Modified

| File | What Changed |
|------|--------------|
| `chatbot.js` | Uses empty history for RAG queries |
| `prompt.txt` | More explicit instructions to use only context |

## How It Works Now

```
Before: [History + RAG prompt] → Model confused
After:  [RAG prompt only] → Model uses your document ✅
```

## Need More Help?

See:
- `RAG_FIX_SUMMARY.md` - Overview of changes
- `RAG_FIX_VERIFICATION.md` - Detailed testing guide
- `RAG_HISTORY_FIX.md` - Technical analysis
