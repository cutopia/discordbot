# RAG Fix Verification Guide

## What Was Fixed

### Problem: Conversation History Overriding RAG Context

When you asked about combat rules after selecting a RAG source, the bot responded generically instead of using your document content.

**Root Cause**: The conversation history (previous messages) was being sent to LM Studio alongside the RAG-enhanced prompt. If your previous conversations were generic, the model would continue that pattern instead of following the RAG instructions.

## Changes Made

### 1. `chatbot.js` - Two Key Fixes

#### Fix A: Clear History When Setting RAG Source
```javascript
export function setRAGSource(channelId, sourceName) {
  activeRAGSources.set(channelId, sourceName);
  // NEW: Clear conversation history when switching knowledge bases to avoid contamination
  conversationHistory.delete(channelId);  // ← This line added
}
```

#### Fix B: Use Empty History for RAG Queries
```javascript
if (ragSource && vectorStores.has(ragSource)) {
  // NEW: Use empty history [] instead of full history
  const response = await getLMStudioResponse(enhancedMessage, []);
  
  // Only add current exchange to history
  addToHistory(channelId, 'user', message);
  addToHistory(channelId, 'assistant', response);
}
```

### 2. `prompt.txt` - Enhanced Instructions

Added explicit warnings:
- "ONLY use information from the provided context"
- "NEVER use your general training data or prior conversation history for factual answers when context is provided"
- "If asked about previous conversation history, refer to it only if explicitly mentioned in the current context"

## How to Test

### Step-by-Step Test

1. **Clear existing history** (important!):
   ```
   /clearchat
   ```

2. **Set your RAG source**:
   ```
   /rag_source combat_rules.pdf
   ```

3. **Ask about combat rules**:
   ```
   /chat What are the combat rules?
   ```

4. **Expected Result**: Response should use ONLY content from `combat_rules.pdf`, not generic knowledge.

5. **Test with previous history** (to verify fix):
   - First ask a generic question: `/chat Hello`
   - Then ask about combat rules again
   - The response should STILL use the RAG context, not be contaminated by the "Hello" exchange

### What to Look For

✅ **Good Response**: 
- References specific rules from your document
- Uses phrases like "According to the document..."
- Doesn't mention previous generic conversations

❌ **Bad Response** (if fix didn't work):
- Generic combat advice not in your document
- Mentions previous conversation history
- Uses model's general training data instead of RAG context

## Troubleshooting

### If Still Getting Generic Responses:

1. **Verify LM Studio is running**:
   ```bash
   curl http://localhost:1234/v1/models
   ```

2. **Check vector store was created**:
   - Look for logs when running `/rag_source`
   - Should show "Successfully created vector store"

3. **Verify embeddings are working**:
   - Check Ollama is running on port 11434
   - Test: `curl http://localhost:11434/api/embeddings`

4. **Clear everything and start fresh**:
   ```
   /clearchat
   /rag_clear
   /rag_source combat_rules.pdf
   ```

### If No RAG Context is Retrieved:

1. Check PDF file exists in `ragsourcebooks/` directory
2. Verify PDF contains text (not just images)
3. Check console logs for embedding errors

## Technical Details

### Before Fix:
```
User: "What are combat rules?"
↓
LM Studio receives:
  [
    {role: 'user', content: 'Hello'},
    {role: 'assistant', content: 'Hello! How can I help?'},
    {role: 'user', content: '[RAG context] What are combat rules?'}
  ]
↓
Model sees pattern of generic responses → ignores RAG instructions
```

### After Fix:
```
User: "What are combat rules?"
↓
LM Studio receives:
  [
    {role: 'user', content: '[RAG context] What are combat rules?'}
  ]
  (empty history - no contamination!)
↓
Model sees ONLY RAG context → uses PDF content correctly
```

## Files Modified

| File | Changes |
|------|---------|
| `chatbot.js` | Clear history on RAG source set, use empty history for RAG queries |
| `prompt.txt` | Enhanced instructions to prioritize RAG context |
| `RAG_HISTORY_FIX.md` | Detailed analysis (new) |
| `test-rag-history-fix.js` | Test script (new) |

## Summary

The fix ensures that:
1. ✅ Conversation history is cleared when switching RAG sources
2. ✅ Empty history is used for RAG queries to prevent contamination  
3. ✅ Only the current exchange is added to history after successful response
4. ✅ Prompt template explicitly instructs AI to use ONLY context

This guarantees that your combat rules (or any other RAG source) will be used correctly, without interference from previous generic conversations.
