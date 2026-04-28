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
import { getRandomEmoji, DiscordRequest } from './utils.js';
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
      const channelId = data.channel_id;
      
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
              // Edit the original deferred message with the actual response
              await DiscordRequest(`webhooks/${process.env.DISCORD_APP_ID}/${token}/messages/@original`, {
                method: 'PATCH',
                body: {
                  content: response,
                  allowed_mentions: {
                    parse: ['users', 'roles']
                  }
                }
              });
              
              console.log('Successfully edited message with AI response');
            } catch (editError) {
              console.error('Error editing message:', editError);
              // If editing fails, try to send a follow-up message
              try {
                await DiscordRequest(`channels/${channelId}/messages`, {
                  method: 'POST',
                  body: {
                    content: `AI response: ${response}`,
                    allowed_mentions: {
                      parse: ['users', 'roles']
                    }
                  }
                });
              } catch (postError) {
                console.error('Failed to send follow-up message:', postError);
              }
            }
          })
          .catch(async (error) => {
            console.error('Error processing chat message:', error);
            
            try {
              // Edit the original message with error info
              await DiscordRequest(`webhooks/${process.env.DISCORD_APP_ID}/${token}/messages/@original`, {
                method: 'PATCH',
                body: {
                  content: `Sorry, I encountered an error: ${error.message}`
                }
              });
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
