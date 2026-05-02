import 'dotenv/config';

const LM_STUDIO_API_URL = process.env.LM_STUDIO_API_URL || 'http://localhost:1234/v1/chat/completions';
const LM_STUDIO_API_KEY = process.env.LM_STUDIO_API_KEY || '';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || '';
const LM_STUDIO_TIMEOUT = parseInt(process.env.LM_STUDIO_TIMEOUT, 10) || 25000;

// Get context window from environment or use a reasonable default
const CONTEXT_WINDOW_SIZE = parseInt(process.env.CONTEXT_WINDOW_SIZE, 10) || 4096;

// Store the last token usage information for programmatic access
let lastTokenUsage = null;

// Request queue to handle concurrent requests
const requestQueue = [];
let isProcessing = false;

/**
 * Process the next request in the queue
 */
async function processNextInQueue() {
  if (isProcessing || requestQueue.length === 0) {
    return;
  }
  
  isProcessing = true;
  const { resolve, reject, message, conversationHistory } = requestQueue.shift();
  
  try {
    const response = await getLMStudioResponseInternal(message, conversationHistory);
    resolve(response);
  } catch (error) {
    reject(error);
  } finally {
    isProcessing = false;
    // Process next item if queue isn't empty
    processNextInQueue();
  }
}

/**
 * Internal implementation of LM Studio API call (without queue logic)
 */
async function getLMStudioResponseInternal(message, conversationHistory = []) {
  const controller = new AbortController();
  let timeoutId;

  try {
    // Build the messages array with conversation history and current message
    const messages = [
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Estimate token count for the request (rough approximation: ~4 chars per token)
    const totalChars = JSON.stringify(messages).length;
    const estimatedPromptTokens = Math.ceil(totalChars / 4);
    
    console.log('LM Studio Request Token Info:');
    console.log(`  Estimated prompt tokens: ${estimatedPromptTokens}`);
    console.log(`  Message count: ${messages.length}`);
    console.log(`  Total request size: ${totalChars} characters`);
    
    // Log the actual prompt being sent to LM Studio
    console.log('\n=== LM Studio Prompt Being Sent ===');
    messages.forEach((msg, index) => {
      console.log(`\nMessage ${index + 1} (${msg.role}):`);
      console.log('---');
      console.log(msg.content);
      console.log('---');
    });
    console.log('\n===================================');
    
    const requestBody = {
      model: DEFAULT_MODEL || 'auto',
      messages: messages,
      temperature: 0.7,
      max_tokens: -1,
      stream: false
    };

    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (LM_STUDIO_API_KEY) {
      headers['Authorization'] = `Bearer ${LM_STUDIO_API_KEY}`;
    }

    // Log the complete request body being sent (after all configuration is set)
    console.log('\n=== Complete Request Body to LM Studio ===');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('==========================================\n');

    // Add timeout to prevent hanging requests
    timeoutId = setTimeout(() => controller.abort(), LM_STUDIO_TIMEOUT);

    const response = await fetch(LM_STUDIO_API_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('LM Studio API Error:', errorData);
      throw new Error(`LM Studio API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract the assistant's message and token usage from the response
    if (data.choices && data.choices.length > 0) {
      const assistantMessage = data.choices[0].message.content;
      
      // Log token usage information if available in the response
      if (data.usage) {
        const promptTokens = data.usage.prompt_tokens || 0;
        const completionTokens = data.usage.completion_tokens || 0;
        const totalTokens = data.usage.total_tokens || 0;
        
        console.log('LM Studio Token Usage:');
        console.log(`  Prompt tokens: ${promptTokens}`);
        console.log(`  Completion tokens: ${completionTokens}`);
        console.log(`  Total tokens: ${totalTokens}`);
        
        // Use configured context window size
        const maxContextWindow = CONTEXT_WINDOW_SIZE;
        const usagePercentage = ((totalTokens / maxContextWindow) * 100).toFixed(1);
        
        console.log(`  Context window: ${maxContextWindow} tokens`);
        console.log(`  Usage: ${usagePercentage}% of context window`);
        
        // Store token usage for programmatic access
        lastTokenUsage = {
          promptTokens,
          completionTokens,
          totalTokens,
          maxContextWindow,
          usagePercentage: parseFloat(usagePercentage)
        };
      } else {
        console.log('LM Studio response received (token usage not available in response)');
        lastTokenUsage = null;
      }
      
      return assistantMessage;
    } else {
      console.error('Unexpected LM Studio response format:', data);
      throw new Error('Invalid response format from LM Studio');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('LM Studio request timed out');
      throw new Error('Request to AI model timed out. Please try a shorter prompt or check your model configuration.');
    }
    console.error('Error getting response from LM Studio:', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Send a request to LM Studio API for chat completions with queue management
 * @param {string} message - The user's message
 * @param {Array<{role: string, content: string}>} conversationHistory - Array of previous messages in the conversation
 * @returns {Promise<string>} - The AI's response
 */
export async function getLMStudioResponse(message, conversationHistory = []) {
  return new Promise((resolve, reject) => {
    // Add request to queue
    requestQueue.push({ resolve, reject, message, conversationHistory });
    
    // Start processing if not already doing so
    if (!isProcessing) {
      processNextInQueue();
    }
  });
}

/**
 * Get the last token usage information (if available)
 * @returns {Object|null} - Token usage object or null if not available
 */
export function getLastTokenUsage() {
  return lastTokenUsage;
}

/**
 * Get the configured context window size
 * @returns {number} - Context window size in tokens
 */
export function getContextWindowSize() {
  return CONTEXT_WINDOW_SIZE;
}

/**
 * Get the list of available models from LM Studio
 * @returns {Promise<Array>} - Array of model names
 */
export async function getLMStudioModels() {
  try {
    const response = await fetch(`${LM_STUDIO_API_URL.replace('/chat/completions', '/models')}`, {
      method: 'GET',
      headers: LM_STUDIO_API_KEY ? { 
        'Authorization': `Bearer ${LM_STUDIO_API_KEY}`,
        'Content-Type': 'application/json'
      } : { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.error('Failed to fetch models from LM Studio');
      return [];
    }

    const data = await response.json();
    
    if (data.data && Array.isArray(data.data)) {
      return data.data.map(model => model.id);
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching models from LM Studio:', error);
    return [];
  }
}
