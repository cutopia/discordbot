import 'dotenv/config';

// Discord message length limit
const DISCORD_MESSAGE_LIMIT = 2000;

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  
  // Webhook endpoints use the token in the URL path and should NOT include Authorization header
  const isWebhookEndpoint = endpoint.startsWith('webhooks/');
  
  // Use fetch to make requests
  const res = await fetch(url, {
    headers: {
      ...(isWebhookEndpoint ? {} : { Authorization: `Bot ${process.env.DISCORD_TOKEN}` }),
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
    },
    ...options
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    
    // Log specific error details for debugging
    if (data.code === 50001) {
      console.error('Missing Access error - bot may not have permission to access this channel or user');
    } else if (data.code === 50013) {
      console.error('Missing Permissions error - bot lacks necessary permissions for this action');
    }
    
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
    console.log('✅ Global commands installed successfully');
  } catch (err) {
    console.error('❌ Error installing global commands:', err);
  }
}

export async function InstallGuildCommands(appId, guildId, commands) {
  // API endpoint to overwrite guild-specific commands
  const endpoint = `applications/${appId}/guilds/${guildId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint for guild commands
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
    console.log('✅ Guild commands installed successfully');
  } catch (err) {
    console.error('❌ Error installing guild commands:', err);
  }
}

// Simple method that returns a random emoji from list
export function getRandomEmoji() {
  const emojiList = ['😭','😄','😌','🤓','😎','😤','🤖','😶‍🌫️','🌏','📸','💿','👋','🌊','✨'];
  return emojiList[Math.floor(Math.random() * emojiList.length)];
}

/**
 * Check if a channel ID is likely to be a server channel (type 0)
 * DM channels have type 1, Group DMs have type 3
 * @param {string} channelId - Discord channel ID
 * @returns {boolean} - True if likely a server channel
 */
export function isServerChannel(channelId) {
  // Basic validation: channel IDs should be numeric strings
  if (!channelId || typeof channelId !== 'string' || !/^\d+$/.test(channelId)) {
    return false;
  }
  
  // Note: We can't determine the exact channel type from just the ID,
  // but we can check if it's a valid format for a server channel
  return true;
}

/**
 * Check if an error is related to permissions or access issues
 * @param {Error} error - The error object
 * @returns {boolean} - True if it's a permission/access error
 */
export function isPermissionError(error) {
  const errorMessage = typeof error === 'string' ? error : error?.message || '';
  return errorMessage.includes('50001') || // Missing Access
         errorMessage.includes('50013');   // Missing Permissions
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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
