# RAG Prompt Integration

This document describes how the prompt template from `prompt.txt` is now integrated into the RAG agent.

## Overview

The Discord bot's RAG (Retrieval-Augmented Generation) system now uses a structured prompt template to ensure AI responses are based on the loaded context documents. The prompt template is loaded from `prompt.txt` and applied when constructing queries for LM Studio.

## Changes Made

### 1. rag.js - Prompt Template Loading

Added functions to load and use the RAG prompt template:

- **`loadRagPromptTemplate()`** - Loads the prompt from `prompt.txt` with fallback to default
- **`ragPromptTemplate`** - Global constant storing the loaded template
- **`formatQueryWithPrompt(sourceName, query, context)`** - Formats a query using the prompt template
- **`getRagQuery(sourceName, query, k=3)`** - Convenience function that retrieves context and formats the full query

### 2. chatbot.js - Updated RAG Integration

Modified `processChatMessage()` to use the new RAG query formatting:

```javascript
// Before: Manual context concatenation
enhancedMessage = `Based on the following context from ${ragSource}:\n\n${contextText}\n\nUser question: ${message}`;

// After: Using prompt template
enhancedMessage = await getRagQuery(ragSource, message, 3);
```

## Prompt Template Structure

The prompt from `prompt.txt` includes:

1. **Role definition**: "You are a helpful AI roleplaying game expert system"
2. **Rules**:
   - Only use information from the provided context
   - Admit when context is insufficient
   - Be specific and cite relevant parts
   - Keep answers clear and concise
   - Admit uncertainty rather than guessing
   - Be original for creative tasks (don't copy examples)
3. **Context placeholder**: `{context}` - replaced with retrieved documents
4. **Question placeholder**: `{input}` - replaced with user's question

## How It Works

1. User sends a message in Discord
2. `chatbot.js` detects if there's an active RAG source for the channel
3. If yes, it calls `getRagQuery()` which:
   - Retrieves relevant context from the vector store (top 3 matches)
   - Formats the context into chunks with "Context N:" labels
   - Applies the prompt template by replacing `{context}` and `{input}`
4. The formatted query is sent to LM Studio for processing
5. Response is returned to the user

## Benefits

- **Consistent behavior**: All RAG queries follow the same structured format
- **Better adherence to context**: Explicit instructions tell the AI to stick to the provided information
- **Clear error handling**: When context is insufficient, the AI knows to say so honestly
- **Creative guidance**: Instructions for originality while staying within the world's framework

## Testing

To verify the integration:

1. Load a PDF using `/rag_source` command
2. Ask a question related to that document
3. The bot should now use the structured prompt template
4. Check logs for any RAG query formatting messages

## Files Modified

- `rag.js` - Added prompt loading and formatting functions
- `chatbot.js` - Updated to use new RAG query formatting
