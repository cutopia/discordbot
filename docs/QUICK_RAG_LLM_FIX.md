# Quick RAG LLM Fix Reference

## Problem
Summaries show "LLM unavailable" instead of actual AI content.

## Solution (3 Steps)

### 1. Verify LM Studio is Running
```bash
curl http://localhost:1234/v1/models
```

Should return model list, not connection error.

### 2. Check Environment
```env
LM_STUDIO_API_URL=http://localhost:1234/v1/chat/completions
DEFAULT_MODEL=auto
CONTEXT_WINDOW_SIZE=4096
```

### 3. Run Verification
```bash
node verify-llm.js
```

Should show all tests passing.

## Files Changed

| File | Change |
|------|--------|
| `rag_summarizer.js` | Updated to use chat completions API |
| `tests/test-summary-system.js` | Added LM Studio integration tests |
| `verify-llm.js` | New verification script |

## Quick Test

```bash
# Test without LM Studio (uses mock)
node tests/test-summary-system.js

# Test with LM Studio (if running)
node verify-llm.js
```

## Expected Results

**Before:**
```json
{
  "characterCreation": "[CHARACTERCREATION SUMMARY - Content preview (LLM unavailable): ...]"
}
```

**After:**
```json
{
  "characterCreation": "Character Creation Summary: Players create characters by choosing race, class..."
}
```

## Common Issues

### LM Studio not responding?
- Start server in LM Studio UI
- Check port is 1234 (or update `.env`)

### Request timeout?
```env
LM_STUDIO_TIMEOUT=60000
```

### Still seeing placeholders?
1. Run `verify-llm.js`
2. Check logs for specific errors
3. Verify model supports chat completions

## Files to Review

- `docs/RAG_LLM_FIX_COMPLETE.md` - Full documentation
- `docs/RAG_SUMMARY_FIX_SUMMARY.md` - Quick summary
- `docs/RAG_LLM_FIX.md` - Technical details
