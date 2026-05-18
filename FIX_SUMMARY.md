# Fix for "Invalid Webhook Token" Error (Code 50027)

## Problem

The `/rag_source` command was crashing with error:
```
Error: {"message":"Invalid Webhook Token","code":50027}
```

This occurred because:

1. The command sends a deferred response immediately when invoked
2. It then processes the PDF and generates summaries (which can take several minutes for large documents)
3. After processing completes, it tries to edit the original webhook message using `webhooks/${appId}/${token}/messages/@original`
4. By this time, the webhook token has expired (Discord webhook tokens from interactions are short-lived)

## Solution

Changed the approach to send follow-up messages directly to the channel instead of trying to edit the original webhook message after a long delay.

### Before (Broken)
```javascript
getOrCreateVectorStore(pdfPath, llmEndpoint)
  .then(({ vectorStore, summaries }) => {
    // ... process results ...
    
    // This fails because token expired during processing
    DiscordRequest(`webhooks/${process.env.DISCORD_APP_ID}/${token}/messages/@original`, {
      method: 'PATCH',
      body: { content: "Success message" }
    });
  })
```

### After (Fixed)
```javascript
getOrCreateVectorStore(pdfPath, llmEndpoint)
  .then(({ vectorStore, summaries }) => {
    // ... process results ...
    
    // Send follow-up message directly to channel (token not needed)
    DiscordRequest(`channels/${req.body.channel_id}/messages`, {
      method: 'POST',
      body: { 
        content: "Success message",
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });
  })
```

## Changes Made

**File: `/home/dev/discordbot/app.js`**

### 1. `rag_source` command handler (lines ~305-360)
- Changed from editing webhook message to sending follow-up channel messages
- Added error handling for follow-up message sending
- Added comments explaining why this approach is used

### 2. `chat` command handler - success path (lines ~145-170)
- Changed single-chunk responses from webhook API to channel API
- This prevents potential token expiration issues if LM Studio takes longer than expected

### 3. `chat` command handler - error path (lines ~205-245)
- Simplified error handling to use channel API consistently
- Removed complex fallback logic since channel API is now the primary approach

## Benefits

1. **No token expiration issues** - Channel API doesn't require interaction tokens
2. **More reliable** - Messages will be delivered regardless of processing time
3. **Consistent approach** - All commands now use the same message sending strategy
4. **Better error handling** - Errors in follow-up messages don't crash the command

## Testing

To verify the fix works:

1. Run `/rag_source` with a large PDF document
2. Wait for processing to complete (may take several minutes)
3. Verify that the success message appears in the channel
4. Check that no "Invalid Webhook Token" errors occur in logs

For the `chat` command:
1. Run `/chat` with a message
2. Verify the response appears correctly
3. Check logs for any webhook-related errors
