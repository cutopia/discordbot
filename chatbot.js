import { getLMStudioResponse } from './lmstudio.js';

// Store conversation history per channel
const conversationHistory = new Map();

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
 * Clear conversation history for a channel
 * @param {string} channelId - The Discord channel ID
 */
export function clearChannelHistory(channelId) {
  conversationHistory.delete(channelId);
}

/**
 * Process a chat message using LM Studio
 * @param {string} message - The user's message
 * @param {string} channelId - The Discord channel ID for context
 * @returns {Promise<string>} - The AI's response
 */
export async function processChatMessage(message, channelId) {
  try {
    // Get conversation history for this channel
    const history = getChannelHistory(channelId);
    
    // Get response from LM Studio
    const response = await getLMStudioResponse(message, history);
    
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
