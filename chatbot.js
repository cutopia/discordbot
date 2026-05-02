import { getLMStudioResponse } from './lmstudio.js';
import { queryVectorStore, vectorStores, getRagQuery } from './rag.js';

// Store conversation history per channel
const conversationHistory = new Map();

// Store active RAG source per channel
const activeRAGSources = new Map();

/**
 * Get conversation history for a specific channel
 * @param {string} channelId - The Discord channel ID
 * @returns {Array<{role: string, content: string}>} - Array of messages in the conversation
 */
function getChannelHistory(channelId) {
  if (!conversationHistory.has(channelId)) {
    conversationHistory.set(channelId, []);
  }
  return conversationHistory.get(channelId);
}

/**
 * Add a message to the conversation history for a channel
 * @param {string} channelId - The Discord channel ID
 * @param {string} role - The role of the message sender ('user' or 'assistant')
 * @param {string} content - The message content
 */
function addToHistory(channelId, role, content) {
  if (!conversationHistory.has(channelId)) {
    conversationHistory.set(channelId, []);
  }
  
  const history = conversationHistory.get(channelId);
  history.push({ role, content });
  
  // Keep only the last 10 messages to avoid token limits
  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }
}

/**
 * Set the active RAG source for a channel
 * @param {string} channelId - The Discord channel ID
 * @param {string} sourceName - Name of the PDF source
 */
export function setRAGSource(channelId, sourceName) {
  activeRAGSources.set(channelId, sourceName);
  // Clear conversation history when switching knowledge bases to avoid contamination
  conversationHistory.delete(channelId);
}

/**
 * Get the active RAG source for a channel
 * @param {string} channelId - The Discord channel ID
 * @returns {string|null} - Active source name or null
 */
export function getRAGSource(channelId) {
  return activeRAGSources.get(channelId) || null;
}

/**
 * Clear conversation history for a channel
 * @param {string} channelId - The Discord channel ID
 */
export function clearChannelHistory(channelId) {
  conversationHistory.delete(channelId);
  activeRAGSources.delete(channelId);
}

/**
 * Process a chat message using LM Studio with optional RAG context
 * @param {string} message - The user's message
 * @param {string} channelId - The Discord channel ID for context
 * @returns {Promise<string>} - The AI's response
 */
export async function processChatMessage(message, channelId) {
  try {
    // Check if there's an active RAG source for this channel
    const ragSource = getRAGSource(channelId);
    
    console.log(`[CHATBOT] Checking RAG status for channel ${channelId}`);
    console.log(`[CHATBOT] Active RAG source: ${ragSource || 'none'}`);
    console.log(`[CHATBOT] Vector stores available: ${vectorStores.size}`);
    
    if (ragSource && vectorStores.has(ragSource)) {
      console.log(`[CHATBOT] Using RAG context for "${ragSource}"`);
      
      // For RAG queries, use empty history to prevent contamination from previous generic responses
      let enhancedMessage = message;
      
      try {
        // Get formatted RAG query using the prompt template from prompt.txt
        enhancedMessage = await getRagQuery(ragSource, message, 3);
        console.log(`[CHATBOT] RAG query generated (length: ${enhancedMessage.length} chars)`);
        console.log(`[CHATBOT] First 200 chars of RAG prompt: ${enhancedMessage.substring(0, 200)}...`);
      } catch (error) {
        console.error('Error getting RAG query:', error);
        // Continue with original message if RAG fails
      }
      
      // Use empty history for RAG queries to avoid contamination
      const response = await getLMStudioResponse(enhancedMessage, []);
      
      // Add only this exchange to history (not the full conversation)
      addToHistory(channelId, 'user', message);
      addToHistory(channelId, 'assistant', response);
      
      return response;
    } else {
      // Non-RAG queries use full conversation history
      const history = getChannelHistory(channelId);
      const response = await getLMStudioResponse(message, history);
      
      // Add messages to history
      addToHistory(channelId, 'user', message);
      addToHistory(channelId, 'assistant', response);
      
      return response;
    }
  } catch (error) {
    console.error('Error processing chat message:', error);
    return `Sorry, I encountered an error: ${error.message}. Please check that LM Studio is running and the API is accessible.`;
  }
}

/**
 * Get the list of available models from LM Studio
 * @returns {Promise<Array>} - Array of model names
 */
export async function getAvailableModels() {
  return await getLMStudioModels();
}
