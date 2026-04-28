import 'dotenv/config';

const LM_STUDIO_API_URL = process.env.LM_STUDIO_API_URL || 'http://localhost:1234/v1/chat/completions';
const LM_STUDIO_API_KEY = process.env.LM_STUDIO_API_KEY || '';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || '';

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
  try {
    // Build the messages array with conversation history and current message
    const messages = [
      ...conversationHistory,
      { role: 'user', content: message }
    ];

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

    const response = await fetch(LM_STUDIO_API_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('LM Studio API Error:', errorData);
      throw new Error(`LM Studio API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract the assistant's message from the response
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    } else {
      console.error('Unexpected LM Studio response format:', data);
      throw new Error('Invalid response format from LM Studio');
    }
  } catch (error) {
    console.error('Error getting response from LM Studio:', error);
    throw error;
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
