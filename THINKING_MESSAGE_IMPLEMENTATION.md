# Thinking Message Implementation

## Problem
Many LLM responses take longer than 3 seconds to generate, causing Discord to print an error instead of the response.

## Solution
Implemented a deferred response pattern that:
1. Immediately sends a "Thinking... ⏳" message when a user invokes the `/chat` command
2. Processes the LLM request in the background
3. Edits the original message with the actual AI response when it arrives

## Changes Made

### `app.js`
- Modified the `/chat` command handler to use `InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE`
- This sends an immediate acknowledgment to Discord, preventing the 3-second timeout
- The LLM processing now happens asynchronously in the background
- When the response arrives, it edits the original deferred message using the Discord Webhook API

## How It Works

1. **User invokes `/chat` command**
2. **Bot immediately responds** with "Thinking... ⏳" (ephemeral message)
3. **Bot processes LLM request** in background (can take 5-20+ seconds)
4. **When response arrives**, bot edits the original message to show the AI's response
5. **If editing fails**, bot sends a follow-up message with the response

## API Endpoints Used

- `POST /interactions` - Initial acknowledgment with deferred type
- `PATCH /webhooks/{app_id}/{token}/messages/@original` - Edit the original deferred message
- `POST /channels/{channel_id}/messages` - Fallback: send follow-up message if editing fails

## Environment Variables Required

Make sure your `.env` file includes:
```
DISCORD_APP_ID=your_application_id
DISCORD_TOKEN=your_bot_token
PUBLIC_KEY=your_public_key
```

## Testing

To test this implementation:

1. Start the bot: `npm start`
2. Register commands: `npm run register`
3. Use `/chat` command with a complex prompt that takes >3 seconds to respond
4. You should see "Thinking... ⏳" immediately, then the message updates with the AI response

## Benefits

- ✅ No more timeout errors for slow LLM responses
- ✅ Better user experience with immediate feedback
- ✅ Clean UI with single message update (no duplicate messages)
- ✅ Graceful fallback if editing fails
