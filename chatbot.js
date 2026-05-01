import { getLMStudioResponse } from './lmstudio.js';
import { queryVectorStore, vectorStores } from './rag.js';

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
    // Get conversation history for this channel
    const history = getChannelHistory(channelId);
    
    // Check if there's an active RAG source for this channel
    const ragSource = getRAGSource(channelId);
    let enhancedMessage = message;
    
    if (ragSource && vectorStores.has(ragSource)) {
      try {
        // Get relevant context from the vector store
        const docs = await queryVectorStore(ragSource, message, 3);
        
        if (docs.length > 0) {
          // Format context for the AI
          const contextText = docs.map((doc, index) => 
            `Context ${index + 1}:\n${doc.content}\n`
          ).join('\n---\n');
          
          enhancedMessage = `Based on the following context from ${ragSource}:\n\n${contextText}\n\nUser question: ${message}`;
        }
      } catch (error) {
        console.error('Error querying vector store:', error);
        // Continue with original message if RAG fails
      }
    }
    
    // Get response from LM Studio
    const response = await getLMStudioResponse(enhancedMessage, history);
    
    // Add messages to history
    addToHistory(channelId, 'user', message);
    addToHistory(channelId, 'assistant', response);
    
    return response;
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
