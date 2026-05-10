# Character Command Fix - Deferred Response Issue

## Problem Description

The `/character` command was showing "The application did not respond" in Discord, even though character generation appeared to be proceeding in the app. The issue was that the webhook token handling for deferred responses was incorrect.

## Root Cause

When using `InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE`, Discord expects:

1. An immediate HTTP 200 response with the interaction type
2. Follow-up messages must use the **follow-up webhook endpoint** (not `@original`)
3. The webhook token remains valid for up to 15 minutes

The original code was trying to edit the message using:
```javascript
webhooks/${process.env.DISCORD_APP_ID}/${token}/messages/@original
```

This approach is incorrect for deferred responses because:
- `@original` refers to the original slash command response, which doesn't exist yet when using deferred responses
- Discord expects follow-up messages to be sent to `/messages` endpoint (POST), not `/messages/@original` (PATCH)

## Solution

Changed all webhook endpoints for deferred responses from:
```javascript
webhooks/${process.env.DISCORD_APP_ID}/${token}/messages/@original
```

To:
```javascript
webhooks/${process.env.DISCORD_APP_ID}/${token}/messages
```

And changed the HTTP method from `PATCH` to `POST`.

## Key Changes in `app.js`

### 1. Deferred Response (Line ~530)
```javascript
res.status(200).json({
  type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
  data: {
    flags: InteractionResponseFlags.EPHEMERAL,
    content: 'Creating your character... ⏳'
  }
});
```

### 2. Follow-up Message (Line ~547)
Changed from:
```javascript
await DiscordRequest(`webhooks/${process.env.DISCORD_APP_ID}/${token}/messages/@original`, {
  method: 'PATCH',
  body: { content: chunks[0] }
});
```

To:
```javascript
await DiscordRequest(`webhooks/${process.env.DISCORD_APP_ID}/${token}/messages`, {
  method: 'POST',
  body: { content: chunks[0] }
});
```

### 3. Error Handling (Line ~645)
Same change for error messages.

## How It Works Now

1. User runs `/character` command
2. Bot immediately responds with deferred response: "Creating your character... ⏳" (ephemeral)
3. Character generation happens in background (can take 10-30 seconds)
4. When complete, bot sends follow-up message using POST to `/messages` endpoint
5. User sees the character sheet appear in the channel

## Testing

To test the fix:

1. Restart your application: `node app.js`
2. Use `/character` command with specifications
3. You should see:
   - Immediate "Creating your character... ⏳" message (ephemeral, only you see it)
   - Character sheet appears after generation completes
   - No "The application did not respond" error

## Additional Notes

- The deferred response approach allows the bot more time to generate characters (up to 15 minutes)
- All follow-up messages use POST method to `/messages` endpoint
- Pagination still works correctly with this approach
- Error handling falls back to direct channel messages if webhook fails
