import 'dotenv/config';
import { isPermissionError } from './utils.js';

// Discord message length limit
const DISCORD_MESSAGE_LIMIT = 2000;

/**
 * Split a message into chunks that are within Discord's character limit
 * @param {string} content - The message content to split
 * @returns {Array<string>} - Array of message chunks
 */
export function splitMessage(content) {
  if (!content || typeof content !== 'string') {
    return [''];
  }
  
  // If content is within the limit, return as single chunk
  if (content.length <= DISCORD_MESSAGE_LIMIT) {
    return [content];
  }
  
  const chunks = [];
  let currentChunk = '';
  
  // Split by newlines to preserve paragraph structure
  const lines = content.split('\n');
  
  for (const line of lines) {
    // If a single line is too long, split it further
    if (line.length > DISCORD_MESSAGE_LIMIT) {
      // Split the long line into smaller chunks
      for (let i = 0; i < line.length; i += DISCORD_MESSAGE_LIMIT) {
        const chunk = line.substring(i, i + DISCORD_MESSAGE_LIMIT);
        chunks.push(chunk);
      }
    } else if (currentChunk.length + line.length + 1 <= DISCORD_MESSAGE_LIMIT) {
      // Add line to current chunk
      if (currentChunk.length > 0) {
        currentChunk += '\n' + line;
      } else {
        currentChunk = line;
      }
    } else {
      // Current chunk is full, save it and start a new one
      chunks.push(currentChunk);
      currentChunk = line;
    }
  }
  
  // Add the last chunk if it exists
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * Create pagination components with navigation buttons
 * @param {number} currentPage - The current page number (0-indexed)
 * @param {number} totalPages - Total number of pages
 * @returns {Array} - Discord component array with pagination controls
 */
export function createPaginationComponents(currentPage, totalPages) {
  if (totalPages <= 1) {
    return [];
  }
  
  const components = [
    {
      type: 1, // Action Row
      components: [
        {
          type: 2, // Button
          custom_id: `pagination_prev_${currentPage}`,
          label: 'Previous',
          style: 1, // Primary
          emoji: { name: '⬅️' },
          disabled: currentPage === 0
        },
        {
          type: 2, // Button
          custom_id: `pagination_page_${currentPage + 1}_of_${totalPages}`,
          label: `${currentPage + 1}/${totalPages}`,
          style: 3, // Secondary
          disabled: true
        },
        {
          type: 2, // Button
          custom_id: `pagination_next_${currentPage}`,
          label: 'Next',
          style: 1, // Primary
          emoji: { name: '➡️' },
          disabled: currentPage === totalPages - 1
        }
      ]
    }
  ];
  
  return components;
}

/**
 * Store pagination state for a message
 * Key format: `${channelId}_${messageId}` (used for button click lookups)
 * Using channel + message ID ensures the key persists across interactions
 * @param {string} channelIdMessageIdKey - Combined channel ID and message ID as lookup key
 * @param {Object} paginationData - Pagination session data containing chunks, currentPage, totalPages
 */
export const paginationStore = new Map();

/**
 * Save pagination data and return message ID
 * @param {string} channelId - Discord channel ID
 * @param {Array<string>} chunks - Message chunks to paginate
 * @param {string} webhookId - Application ID (webhook ID)
 * @param {string} token - Interaction token
 * @returns {Promise<string>} - The first message ID
 */
export async function sendPaginatedMessage(channelId, chunks, DiscordRequest, webhookId, token) {
  if (!chunks || chunks.length === 0) {
    return null;
  }
  
  // Validate channel ID
  if (!channelId || typeof channelId !== 'string' || !/^\d+$/.test(channelId)) {
    console.error('Invalid channel ID provided:', channelId);
    throw new Error('Invalid channel ID');
  }
  
  try {
    console.log(`Attempting to send paginated message to channel: ${channelId}`);
    
    // Build body object, only including components if we have multiple pages
    const requestBody = {
      content: chunks[0],
      allowed_mentions: { parse: ['users', 'roles'] }
    };
    
    const hasMultiplePages = chunks.length > 1;
    if (hasMultiplePages) {
      requestBody.components = createPaginationComponents(0, chunks.length);
    }
    
    const response = await DiscordRequest(`channels/${channelId}/messages`, {
      method: 'POST',
      body: requestBody
    });
    
    const data = await response.json();
    console.log(`Successfully sent first message with ID: ${data.id}`);
    
    // Store pagination data using channel + message ID as key for persistent lookup
    const storeKey = `${channelId}_${data.id}`;
    paginationStore.set(storeKey, {
      chunks,
      currentPage: 0,
      totalPages: chunks.length,
      channelId: channelId
    });
    console.log(`Pagination session stored with key: ${storeKey}`);
    
    return data.id;
  } catch (error) {
    console.error('Error sending first paginated message:', error);
    // Re-throw to let caller handle fallback
    throw error;
  }
}

/**
 * Update a message with pagination controls
 * @param {string} webhookId - The application ID (webhook ID)
 * @param {string} token - The interaction token
 * @param {Array<string>} chunks - Message chunks to paginate
 * @param {string} channelId - Discord channel ID (for pagination store key)
 * @param {string} messageId - Message ID (for pagination store key)
 * @returns {Promise<void>}
 */
export async function updateMessageWithPagination(webhookId, token, chunks, channelId, messageId) {
  if (!chunks || chunks.length <= 1) {
    return;
  }
  
  // Store pagination data with the correct key for button lookups
  const sessionKey = `${channelId}_${messageId}`;
  paginationStore.set(sessionKey, {
    chunks,
    currentPage: 0,
    totalPages: chunks.length
  });
  
  console.log(`Pagination session updated with key: ${sessionKey}`);
  
  // Update the original message with pagination controls
  const components = createPaginationComponents(0, chunks.length);
  
  try {
    const requestBody = {
      content: chunks[0],
      allowed_mentions: { parse: ['users', 'roles'] }
    };
    
    if (components && components.length > 0) {
      requestBody.components = components;
    }
    
    await DiscordRequest(`webhooks/${webhookId}/${token}/messages/@original`, {
      method: 'PATCH',
      body: requestBody
    });
  } catch (error) {
    console.error('Error updating message with pagination:', error);
    throw error;
  }
}

/**
 * Handle pagination button interaction
 * @param {string} customId - The custom_id from the button click
 * @param {string} channelId - Discord channel ID
 * @param {string} messageId - Message ID to update
 * @param {string} webhookId - Application ID (webhook ID)
 * @param {string} token - Interaction token
 * @returns {Promise<Object>} - Response object for Discord interaction
 */
export async function handlePaginationInteraction(customId, channelId, messageId, webhookId, token) {
  // Parse the custom_id to extract pagination info
  const parts = customId.split('_');
  
  if (parts[0] !== 'pagination') {
    return null;
  }
  
  const action = parts[1];
  let currentPage;
  
  switch (action) {
    case 'prev':
      currentPage = parseInt(parts[2], 10);
      if (currentPage > 0) {
        currentPage--;
      }
      break;
      
    case 'next':
      // Get current page from stored data
      const sessionKeyNext = `${channelId}_${messageId}`;
      const paginationDataNext = paginationStore.get(sessionKeyNext);
      
      if (paginationDataNext && paginationDataNext.currentPage < paginationDataNext.totalPages - 1) {
        currentPage = paginationDataNext.currentPage + 1;
      } else {
        // Use parsed value as fallback
        currentPage = parseInt(parts[2], 10);
      }
      break;
      
    default:
      return null;
  }
  
  // Get the current pagination data using channel + message ID as key
  const sessionKey = `${channelId}_${messageId}`;
  let paginationData = paginationStore.get(sessionKey);
  
  if (!paginationData || !paginationData.chunks) {
    console.error(`Pagination data not found for key: ${sessionKey}`);
    console.log('Available keys in paginationStore:', Array.from(paginationStore.keys()));
    return {
      type: 4, // Channel Message With Source
      data: {
        content: 'Pagination data not found. Please try the command again.',
        flags: 64 // EPHEMERAL
      }
    };
  }
  
  const chunks = paginationData.chunks;
  const totalPages = paginationData.totalPages;
  
  // Update the current page in storage
  paginationData.currentPage = currentPage;
  
  // Create updated components
  const components = createPaginationComponents(currentPage, totalPages);
  
  return {
    type: 7, // Update Message
    data: {
      content: chunks[currentPage],
      components: components,
      allowed_mentions: { parse: ['users', 'roles'] }
    }
  };
}
