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
  // Interaction id, type and data
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
              
              console.log('Successfully edited message with AI response');
              
              // Send additional chunks as follow-up messages using webhook (more reliable)
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
                  console.log(`Sent follow-up message chunk ${i + 1}/${chunks.length}`);
                } catch (postError) {
                  console.error(`Failed to send follow-up message chunk ${i + 1}:`, postError);
                  // If webhook fails, try channel API as fallback
                  if (channelId) {
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
                      console.log(`Sent follow-up message chunk ${i + 1}/${chunks.length} via channel API`);
                    } catch (channelError) {
                      console.error(`Failed to send follow-up message chunk ${i + 1} via channel API:`, channelError);
                    }
                  }
                }
              }
            } catch (editError) {
              console.error('Error editing message:', editError);
              // If editing fails, try to send a follow-up message
              if (channelId) {
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
                  console.error('Failed to send follow-up message:', postError);
                }
              } else {
                console.error('Cannot send follow-up: channelId is undefined');
              }
            }
          })
          .catch(async (error) => {
            console.error('Error processing chat message:', error);
            
            try {
              // Split error message if needed
              const chunks = splitMessage(`Sorry, I encountered an error: ${error.message}`);
              
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
              
              // Send additional chunks as follow-up messages using webhook (more reliable)
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
                  if (channelId) {
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

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
