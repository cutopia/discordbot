# RAG Conversation History Fix

## Problem Analysis

When using `/chat` with a selected RAG source, the bot responds generically instead of using the RAG context. This happens because:

1. **Conversation history is sent separately** from the RAG-enhanced prompt
2. **The model receives both** the RAG context AND previous conversation messages
3. **Previous generic responses in history** can override the current RAG instructions

## Current Flow (BROKEN)

```
User: "What are the combat rules?"
↓
chatbot.js creates enhanced message:
  "Context from PDF: [combat rules]\n\nQuestion: What are the combat rules?"
↓
LM Studio receives:
  [
    {role: 'user', content: 'Hello'},
    {role: 'assistant', content: 'Hello! How can I help?'},
    {role: 'user', content: '[RAG-enhanced prompt with combat rules]'}
  ]
↓
Model sees history of generic responses → ignores RAG context
```

## Solution

### Option 1: Clear History When Setting RAG Source (RECOMMENDED)

Modify `chatbot.js` to clear conversation history when a new RAG source is selected:

```javascript
export function setRAGSource(channelId, sourceName) {
  activeRAGSources.set(channelId, sourceName);
  // Clear conversation history when switching knowledge bases
  conversationHistory.delete(channelId);
}
```

### Option 2: Include History in RAG Context

Modify the prompt template to explicitly handle conversation context:

```javascript
// In prompt.txt
You are a helpful AI roleplaying game expert system that answers questions based on the provided context.
Rules:
1. Only use information from the provided context to answer questions.
2. If the context doesn't contain enough information, say so honestly
3. Be specific and cite relevant parts of the context
4. Keep your answers clear and concise
5. If asked about previous conversation history, refer to it, but prioritize the current context

Context:
{context}

Conversation History (if relevant):
{history}

Question: {input}

Answer based on the context above:
```

### Option 3: Reset History After RAG Queries

Clear conversation history after each RAG-enhanced query to prevent contamination:

```javascript
export async function processChatMessage(message, channelId) {
  try {
    const history = getChannelHistory(channelId);
    const ragSource = getRAGSource(channelId);
    
    if (ragSource && vectorStores.has(ragSource)) {
      // For RAG queries, use empty history to avoid contamination
      const enhancedMessage = await getRagQuery(ragSource, message, 3);
      const response = await getLMStudioResponse(enhancedMessage, []);
      
      // Add only this exchange to history
      addToHistory(channelId, 'user', message);
      addToHistory(channelId, 'assistant', response);
      
      return response;
    }
    
    // Non-RAG queries use full history
    const response = await getLMStudioResponse(message, history);
    addToHistory(channelId, 'user', message);
    addToHistory(channelId, 'assistant', response);
    
    return response;
  } catch (error) {
    console.error('Error processing chat message:', error);
    return `Sorry, I encountered an error: ${error.message}`;
  }
}
```

## Recommended Implementation

**Use Option 1 + Option 3 combination:**

1. Clear history when setting RAG source
2. Use empty history for RAG queries to prevent contamination
3. Only add the current exchange to history after successful response

This ensures:
- Clean slate when switching knowledge bases
- No previous generic responses interfere with RAG context
- Conversation history still works for non-RAG questions

## Testing Steps

1. Clear conversation history: `/clearchat`
2. Set RAG source: `/rag_source <combat_rules.pdf>`
3. Ask about combat rules
4. Verify response uses only the PDF content
5. Check that subsequent questions don't reference previous answers unless relevant
