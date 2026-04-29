import 'dotenv/config';
import express from 'express';
import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest, splitMessage } from './utils.js';
import { getShuffledOptions, getResult } from './game.js';
import { processChatMessage, clearChannelHistory } from './chatbot.js';
import {
  sendPaginatedMessage,
  handlePaginationInteraction,
  paginationStore
} from './pagination.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// To keep track of our active games
const activeGames = {};

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction id, token, type and data
  const { id, token, type, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "test" command
    if (name === 'test') {
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              // Fetches a random emoji to send from a helper function
              content: `hello world ${getRandomEmoji()}`
            }
          ]
        },
      });
    }

    // "chat" command - sends message to LM Studio for processing
    if (name === 'chat') {
      const message = data.options?.[0]?.value || '';
      
      if (!message) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Please provide a message to send to the AI.'
          }
        });
      }

      // Get channel ID for conversation context
      // The channel_id is available at the root level of the interaction payload for slash commands
      const channelId = req.body.channel_id;
      
      if (!channelId) {
        console.error('Error: Could not determine channel ID from interaction payload');
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Error: Could not determine channel context. Please try again in a server channel.',
            flags: InteractionResponseFlags.EPHEMERAL
          }
        });
      }
      
      // Check if this is a DM/GDM channel (type 1 or 3) where bot might not have permission
      const channelType = req.body.channel_type;
      if (channelType === 1 || channelType === 3) {
        console.warn(`Warning: Command invoked in DM/GDM channel (type ${channelType}). Bot may not have permission to post.`);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'This command is only available in server channels where the bot has permission to post messages.',
            flags: InteractionResponseFlags.EPHEMERAL
          }
        });
      }
      
      try {
        console.log('Processing chat message...');
        
        // Send immediate "thinking..." response using deferred type
        // This prevents the 3-second timeout error
        res.send({
          type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Thinking... ⏳'
          }
        });
        
        // Process the chat message with LM Studio in background
        processChatMessage(message, channelId)
          .then(async (response) => {
            console.log('Got response from LM Studio, editing original message...');
            
            try {
              // Split response if it's too long for Discord
              const chunks = splitMessage(response);
              
              // If we have multiple chunks, use pagination system
              if (chunks.length > 1) {
                console.log(`Sending paginated message with ${chunks.length} pages...`);
                
                // Send first chunk with pagination controls
                await sendPaginatedMessage(channelId, chunks, DiscordRequest, process.env.DISCORD_APP_ID, token);
                
                console.log('Successfully sent paginated response');
              } else {
                // Single chunk - edit original message directly
                console.log('Sending single chunk response...');
                
                await DiscordRequest(`webhooks/${process.env.DISCORD_APP_ID}/${token}/messages/@original`, {
                  method: 'PATCH',
                  body: {
                    content: chunks[0],
                    allowed_mentions: {
                      parse: ['users', 'roles']
                    }
                  }
                });
                
                console.log('Successfully edited message with AI response');
              }
            } catch (editError) {
              console.error('Error sending paginated message:', editError);
              
              // Check if it's a permission error
              const isPermissionError = 
                editError.message?.includes('50001') || // Missing Access
                editError.message?.includes('50013');   // Missing Permissions
                
              if (isPermissionError) {
                console.warn('Bot lacks permission to post in this channel. The command may have been invoked in a DM or restricted channel.');
              }
              
              // Fallback to regular message sending only if we have a valid server channel
              if (channelId && !isPermissionError) {
                try {
                  const chunks = splitMessage(`AI response: ${response}`);
                  
                  for (let i = 0; i < chunks.length; i++) {
                    await DiscordRequest(`channels/${channelId}/messages`, {
                      method: 'POST',
                      body: {
                        content: chunks[i],
                        allowed_mentions: {
                          parse: ['users', 'roles']
                        }
                      }
                    });
                  }
                } catch (postError) {
                  console.error('Failed to send fallback message:', postError);
                }
              } else if (!channelId) {
                console.warn('No valid channel ID available for fallback messages');
              }
            }
          })
          .catch(async (error) => {
            console.error('Error processing chat message:', error);
            
            // Check if it's a permission error
            const isPermissionError = 
              error.message?.includes('50001') || // Missing Access
              error.message?.includes('50013');   // Missing Permissions
            
            try {
              // Split error message if needed
              const chunks = splitMessage(`Sorry, I encountered an error: ${error.message}`);
              
              // If we have permission issues, don't try to send follow-up messages via webhook
              if (isPermissionError) {
                console.warn('Bot lacks permission to post in this channel. Error message will not be sent.');
                return;
              }
              
              // Edit the original deferred message with the first chunk
              await DiscordRequest(`webhooks/${process.env.DISCORD_APP_ID}/${token}/messages/@original`, {
                method: 'PATCH',
                body: {
                  content: chunks[0],
                  allowed_mentions: {
                    parse: ['users', 'roles']
                  }
                }
              });
              
              // Send additional chunks as follow-up messages if needed
              for (let i = 1; i < chunks.length; i++) {
                try {
                  await DiscordRequest(`webhooks/${process.env.DISCORD_APP_ID}/${token}/messages`, {
                    method: 'POST',
                    body: {
                      content: chunks[i],
                      allowed_mentions: {
                        parse: ['users', 'roles']
                      }
                    }
                  });
                  console.log(`Sent follow-up error message chunk ${i + 1}/${chunks.length}`);
                } catch (postError) {
                  console.error(`Failed to send follow-up error message chunk ${i + 1}:`, postError);
                  
                  // If webhook fails, try channel API as fallback
                  if (channelId && !isPermissionError) {
                    try {
                      await DiscordRequest(`channels/${channelId}/messages`, {
                        method: 'POST',
                        body: {
                          content: chunks[i],
                          allowed_mentions: {
                            parse: ['users', 'roles']
                          }
                        }
                      });
                      console.log(`Sent follow-up error message chunk ${i + 1}/${chunks.length} via channel API`);
                    } catch (channelError) {
                      console.error(`Failed to send follow-up error message chunk ${i + 1} via channel API:`, channelError);
                    }
                  }
                }
              }
            } catch (editError) {
              console.error('Error editing message with error:', editError);
            }
          });
        
        // Return immediately to avoid timeout
        return res.status(204).end();
      } catch (error) {
        console.error('Unexpected error processing chat command:', error);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Sorry, I encountered an unexpected error: ${error.message}`
          }
        });
      }
    }

    // "clearchat" command - clears conversation history for the channel
    if (name === 'clearchat') {
      const channelId = data.channel_id;
      clearChannelHistory(channelId);
      
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Conversation history cleared for this channel.',
          flags: InteractionResponseFlags.EPHEMERAL
        }
      });
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  /**
   * Handle requests from interactive components (button clicks)
   */
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const componentId = data.custom_id;
    const channelId = req.body.channel.id;
    const messageId = req.body.message.id;
    
    console.log('Received button click:', componentId);
    
    // Check if this is a pagination button
    if (componentId.startsWith('pagination_')) {
      try {
        const response = await handlePaginationInteraction(
          componentId,
          channelId,
          messageId,
          process.env.DISCORD_APP_ID,
          token
        );
        
        if (response) {
          return res.send(response);
        }
      } catch (error) {
        console.error('Error handling pagination interaction:', error);
      }
    }
    
    // Default response for unknown components
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Button clicked!' }
    });
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
