# Changes Made to Fix Webhook Token Expiration

## Summary
Fixed "Invalid Webhook Token" (code 50027) errors by switching from webhook API to channel API for sending follow-up messages after deferred responses.

## Root Cause
Discord interaction tokens expire quickly. When commands like `/rag_source` take several minutes to process (PDF extraction + LLM summary generation), the webhook token is no longer valid when trying to edit the original message.

## Files Modified

### 1. `/home/dev/discordbot/app.js`

#### Change 1: `rag_source` command success path
**Before:** Used webhook API to edit original deferred message
```javascript
DiscordRequest(`webhooks/${process.env.DISCORD_APP_ID}/${token}/messages/@original`, {
  method: 'PATCH',
  body: { content: "Success" }
})
```

**After:** Uses channel API for follow-up messages
```javascript
DiscordRequest(`channels/${req.body.channel_id}/messages`, {
  method: 'POST',
  body: { 
    content: "Success",
    flags: InteractionResponseFlags.EPHEMERAL
  }
})
```

#### Change 2: `rag_source` command error path  
**Before:** Used webhook API for error messages
**After:** Uses channel API for error messages

#### Change 3: `chat` command success path (single chunk)
**Before:** Used webhook API to edit original deferred message
**After:** Uses channel API for follow-up messages

#### Change 4: `chat` command error path
**Before:** Complex fallback logic with webhook API as primary
**After:** Simplified to use channel API consistently

### 2. `/home/dev/discordbot/FIX_SUMMARY.md` (new file)
Documentation of the fix and how to test it.

### 3. `/home/dev/discordbot/CHANGES.md` (this file)
Detailed changelog.

## Technical Details

### Why Channel API Instead of Webhook API?

| Aspect | Webhook API | Channel API |
|--------|-------------|-------------|
| Token requirement | Interaction token (short-lived) | Bot token (long-lived) |
| Expiration | ~15 minutes max | No expiration for bot tokens |
| Use case | Immediate responses | Follow-up messages |

### When to Use Each

- **Webhook API**: For immediate responses within the 3-second interaction window
- **Channel API**: For follow-up messages after deferred responses

## Testing Recommendations

1. Test `/rag_source` with large PDFs (should complete without token errors)
2. Test `/chat` with long responses (should use pagination correctly)
3. Verify error messages appear in channel for both commands
4. Check logs for any webhook-related errors

## Backward Compatibility

These changes are backward compatible:
- Messages still appear in the same channel
- Content and formatting remain unchanged
- Only the API endpoint changed from webhook to channel
