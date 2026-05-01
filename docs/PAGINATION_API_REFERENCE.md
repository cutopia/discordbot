# Pagination API Reference

## Quick Start

### Basic Usage

```javascript
import { splitMessage, sendPaginatedMessage } from './pagination.js';

// Split a long message into chunks
const response = "Very long AI response...";
const chunks = splitMessage(response);

// Send paginated message if needed
if (chunks.length > 1) {
  await sendPaginatedMessage(channelId, chunks, DiscordRequest);
} else {
  // Single chunk - send normally
  await DiscordRequest(`channels/${channelId}/messages`, {...});
}
```

## Core Functions

### `splitMessage(content)`

Splits a message into Discord-compliant chunks.

**Parameters:**
- `content` (string): The message content to split

**Returns:** `Array<string>` - Array of message chunks, each ≤2000 characters

**Example:**
```javascript
const longText = "A".repeat(5000);
const chunks = splitMessage(longText);
// Returns: ["AAA... (2000 chars)", "AAA... (2000 chars)", "AAA... (1000 chars)"]
```

---

### `createPaginationComponents(currentPage, totalPages)`

Creates Discord button components for pagination navigation.

**Parameters:**
- `currentPage` (number): Current page index (0-based)
- `totalPages` (number): Total number of pages

**Returns:** `Array` - Discord component array with action row and buttons

**Example:**
```javascript
// For a 3-page message on page 1 (index 1)
const components = createPaginationComponents(1, 3);
/*
Returns:
[
  {
    type: 1,
    components: [
      { custom_id: "pagination_prev_1", label: "Previous", emoji: "⬅️", disabled: false },
      { custom_id: "pagination_page_2_of_3", label: "2/3", disabled: true },
      { custom_id: "pagination_next_1", label: "Next", emoji: "➡️", disabled: false }
    ]
  }
]
*/
```

---

### `sendPaginatedMessage(channelId, chunks, DiscordRequest)`

Sends the first page of a paginated message with navigation controls.

**Parameters:**
- `channelId` (string): Discord channel ID
- `chunks` (Array<string>): Array of message chunks
- `DiscordRequest` (function): Your Discord API request function

**Returns:** `Promise<string>` - The message ID of the first page

**Example:**
```javascript
const chunks = splitMessage(response);
if (chunks.length > 1) {
  const messageId = await sendPaginatedMessage(channelId, chunks, DiscordRequest);
  console.log(`Sent paginated message with ID: ${messageId}`);
}
```

---

### `handlePaginationInteraction(customId, channelId, messageId, webhookId, token)`

Handles button click events for pagination navigation.

**Parameters:**
- `customId` (string): The button's custom_id from the interaction
- `channelId` (string): Discord channel ID
- `messageId` (string): Message ID to update
- `webhookId` (string): Application ID (your bot's app ID)
- `token` (string): Interaction token

**Returns:** `Promise<Object>` - Discord interaction response object

**Example:**
```javascript
// In your app.js interactions handler:
if (type === InteractionType.MESSAGE_COMPONENT) {
  const componentId = data.custom_id;
  
  if (componentId.startsWith('pagination_')) {
    const response = await handlePaginationInteraction(
      componentId,
      channelId,
      messageId,
      process.env.DISCORD_APP_ID,
      token
    );
    
    return res.send(response);
  }
}
```

---

## Response Types

### For Button Clicks

The `handlePaginationInteraction` function returns a Discord interaction response object:

```javascript
{
  type: 7, // Update Message
  data: {
    content: chunks[currentPage],
    components: createPaginationComponents(currentPage, totalPages),
    allowed_mentions: { parse: ['users', 'roles'] }
  }
}
```

**Response Type Codes:**
- `4` = Channel Message With Source (ephemeral)
- `7` = Update Message
- `8` = Deferred Update Message

---

## State Management

### Pagination Store

The system uses a Map to store pagination state:

```javascript
paginationStore.set(sessionId, {
  chunks: ["chunk1", "chunk2", ...],
  currentPage: 0,
  totalPages: 3
});
```

**Accessing stored data:**
```javascript
const sessionKey = `${webhookId}_${token}`;
const paginationData = paginationStore.get(sessionKey);

if (paginationData) {
  console.log(`Current page: ${paginationData.currentPage}`);
  console.log(`Total pages: ${paginationData.totalPages}`);
}
```

---

## Button Component Reference

### Previous Button
```javascript
{
  type: 2, // Button
  custom_id: "pagination_prev_0",
  label: "Previous",
  style: 1, // Primary (Blue)
  emoji: { name: "⬅️" },
  disabled: currentPage === 0  // Disabled on first page
}
```

### Page Indicator
```javascript
{
  type: 2, // Button
  custom_id: `pagination_page_${currentPage + 1}_of_${totalPages}`,
  label: `${currentPage + 1}/${totalPages}`,
  style: 3, // Secondary (Grey)
  disabled: true  // Non-clickable
}
```

### Next Button
```javascript
{
  type: 2, // Button
  custom_id: "pagination_next_0",
  label: "Next",
  style: 1, // Primary (Blue)
  emoji: { name: "➡️" },
  disabled: currentPage === totalPages - 1  // Disabled on last page
}
```

---

## Error Handling

### Common Errors and Solutions

**Error: "Pagination data not found"**
```javascript
// Solution: Check if session exists before handling interaction
if (!paginationStore.has(sessionKey)) {
  return res.send({
    type: 4,
    data: { content: 'Session expired. Please try again.', flags: 64 }
  });
}
```

**Error: "Failed to send follow-up message"**
```javascript
// Solution: Use fallback channel API
try {
  await DiscordRequest(`webhooks/${webhookId}/${token}/messages`, {...});
} catch (error) {
  await DiscordRequest(`channels/${channelId}/messages`, {...});
}
```

---

## Integration Checklist

### In app.js

1. **Import pagination functions:**
```javascript
import { sendPaginatedMessage, handlePaginationInteraction } from './pagination.js';
```

2. **Handle MESSAGE_COMPONENT interactions:**
```javascript
if (type === InteractionType.MESSAGE_COMPONENT) {
  if (data.custom_id.startsWith('pagination_')) {
    const response = await handlePaginationInteraction(
      data.custom_id,
      req.body.channel.id,
      req.body.message.id,
      process.env.DISCORD_APP_ID,
      token
    );
    return res.send(response);
  }
}
```

3. **Use pagination in chat command:**
```javascript
const chunks = splitMessage(response);
if (chunks.length > 1) {
  await sendPaginatedMessage(channelId, chunks, DiscordRequest);
} else {
  // Send single chunk normally
}
```

---

## Testing

### Test Pagination Manually

1. **Send a long message:**
```javascript
// In Discord, use /chat with a very long prompt
/chat "Write a story that's at least 5000 characters long..."
```

2. **Verify pagination appears:**
- First page should show navigation controls
- Page indicator shows current/total pages

3. **Test navigation:**
- Click ➡️ to go to next page
- Verify buttons update correctly
- Test edge cases (first/last page)

---

## Performance Tips

1. **Clean up old sessions:**
```javascript
// Periodically remove old pagination data
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of paginationStore.entries()) {
    if (now - value.timestamp > 3600000) { // 1 hour
      paginationStore.delete(key);
    }
  }
}, 60000); // Check every minute
```

2. **Limit chunks for very long messages:**
```javascript
// If you have 10+ chunks, consider summarizing or using a different approach
if (chunks.length > 10) {
  const summary = chunks.slice(0, 3).join('\n\n... [truncated] ...\n\n') + 
                  `\n\n[Response continues in ${chunks.length} pages]`;
  await DiscordRequest(`channels/${channelId}/messages`, { content: summary });
}
```

---

## Troubleshooting

### Buttons don't respond to clicks
- Verify `MESSAGE_COMPONENT` interaction type is handled
- Check that custom_id starts with 'pagination_'
- Ensure token and webhookId are correct

### Messages not updating
- Confirm response type is 7 (Update Message)
- Check Discord API rate limits
- Verify bot has permission to edit messages

### Pagination controls missing
- Ensure chunks.length > 1
- Check that components array is included in message payload
- Verify IS_COMPONENTS_V2 flag if needed

---

## Examples

### Complete Chat Command with Pagination

```javascript
app.post('/interactions', async (req, res) => {
  const { type, token, data } = req.body;
  
  if (type === InteractionType.APPLICATION_COMMAND && data.name === 'chat') {
    const message = data.options?.[0]?.value || '';
    const channelId = req.body.channel_id;
    
    // Send deferred response
    res.send({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Thinking...' }
    });
    
    try {
      const response = await processChatMessage(message, channelId);
      const chunks = splitMessage(response);
      
      if (chunks.length > 1) {
        // Use pagination
        await sendPaginatedMessage(channelId, chunks, DiscordRequest);
      } else {
        // Single page
        await DiscordRequest(`webhooks/${process.env.DISCORD_APP_ID}/${token}/messages/@original`, {
          method: 'PATCH',
          body: { content: chunks[0] }
        });
      }
    } catch (error) {
      console.error(error);
    }
    
    return res.status(204).end();
  }
  
  // Handle button clicks
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const response = await handlePaginationInteraction(
      data.custom_id,
      req.body.channel.id,
      req.body.message.id,
      process.env.DISCORD_APP_ID,
      token
    );
    return res.send(response);
  }
});
```

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review test-pagination.js for usage examples
3. Examine app.js integration points
4. Check Discord API documentation for component types
