# 🚀 Pagination Quick Reference

## Core Functions

### 1. Split Message
```javascript
import { splitMessage } from './pagination.js';

const chunks = splitMessage("Very long message...");
// Returns: ["chunk1", "chunk2", ...]
```

### 2. Send Paginated Message
```javascript
import { sendPaginatedMessage } from './pagination.js';

await sendPaginatedMessage(channelId, chunks, DiscordRequest);
```

### 3. Handle Button Clicks
```javascript
import { handlePaginationInteraction } from './pagination.js';

const response = await handlePaginationInteraction(
  custom_id,
  channelId,
  messageId,
  process.env.DISCORD_APP_ID,
  token
);
return res.send(response);
```

---

## Integration Checklist

### In `app.js`:

1. **Import pagination:**
```javascript
import {
  sendPaginatedMessage,
  handlePaginationInteraction
} from './pagination.js';
```

2. **Use in chat command:**
```javascript
const chunks = splitMessage(response);
if (chunks.length > 1) {
  await sendPaginatedMessage(channelId, chunks, DiscordRequest);
}
```

3. **Handle button clicks:**
```javascript
if (type === InteractionType.MESSAGE_COMPONENT) {
  if (data.custom_id.startsWith('pagination_')) {
    const response = await handlePaginationInteraction(...);
    return res.send(response);
  }
}
```

---

## Button States

### First Page (0 of 3):
```
[⬅️ Previous] [1/3] [➡️ Next]
 ↑ Disabled      ↑ Active   ↑ Enabled
```

### Middle Page (1 of 3):
```
[⬅️ Previous] [2/3] [➡️ Next]
 ↑ Enabled       ↑ Active   ↑ Enabled
```

### Last Page (2 of 3):
```
[⬅️ Previous] [3/3] [➡️ Next]
 ↑ Enabled      ↑ Active    ↑ Disabled
```

---

## Common Patterns

### Pattern 1: Chat Command with Pagination
```javascript
app.post('/interactions', async (req, res) => {
  const { type, token, data } = req.body;
  
  if (type === InteractionType.APPLICATION_COMMAND && data.name === 'chat') {
    // Send deferred response
    res.send({ type: 5, data: { content: 'Thinking...' } });
    
    try {
      const response = await processChatMessage(message, channelId);
      const chunks = splitMessage(response);
      
      if (chunks.length > 1) {
        await sendPaginatedMessage(channelId, chunks, DiscordRequest);
      } else {
        // Single page
        await DiscordRequest(`webhooks/${appId}/${token}/messages/@original`, {
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
    const response = await handlePaginationInteraction(...);
    return res.send(response);
  }
});
```

### Pattern 2: Manual Pagination Control
```javascript
// Check if pagination needed
const chunks = splitMessage(response);

if (chunks.length > 1) {
  // Use pagination system
  await sendPaginatedMessage(channelId, chunks, DiscordRequest);
} else {
  // Send normally
  await DiscordRequest(`channels/${channelId}/messages`, {
    method: 'POST',
    body: { content: chunks[0] }
  });
}
```

---

## Testing

### Run Tests:
```bash
node tests/tests/test-pagination.js
```

### Expected Output:
- ✅ Short messages: No pagination controls
- ✅ Long messages: Pagination controls appear
- ✅ Button states: Update correctly on navigation
- ✅ Edge cases: Handled gracefully

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Controls not appearing | Check `chunks.length > 1` |
| Buttons don't respond | Verify MESSAGE_COMPONENT handler |
| Messages not updating | Confirm response type is 7 (Update Message) |
| Error: "Pagination data not found" | Check session ID matches |

---

## API Quick Reference

### `splitMessage(content)`
- **Input**: String
- **Output**: Array of strings (each ≤2000 chars)
- **Purpose**: Split long messages into chunks

### `createPaginationComponents(currentPage, totalPages)`
- **Input**: Page index (0-based), total pages
- **Output**: Discord component array
- **Purpose**: Create navigation buttons

### `sendPaginatedMessage(channelId, chunks, DiscordRequest)`
- **Input**: Channel ID, chunks array, request function
- **Output**: Message ID promise
- **Purpose**: Send first page with controls

### `handlePaginationInteraction(customId, channelId, messageId, webhookId, token)`
- **Input**: Button ID, channel ID, message ID, app ID, token
- **Output**: Interaction response object
- **Purpose**: Process button clicks and update messages

---

## File Locations

```
project/
├── pagination.js          # Core implementation
├── tests/test-pagination.js     # Test suite
├── app.js                 # Main application (modified)
├── utils.js               # Utility functions
├── PAGINATION_README.md   # Quick start guide
├── PAGINATION_API_REFERENCE.md  # Complete API docs
└── PAGINATION_FLOW_DIAGRAM.md   # Visual diagrams
```

---

## Key Constants

```javascript
DISCORD_MESSAGE_LIMIT = 2000;  // Maximum characters per message
BUTTON_TYPE_PREVIOUS = "pagination_prev";
BUTTON_TYPE_NEXT = "pagination_next";
BUTTON_TYPE_PAGE = "pagination_page";
```

---

## Session Management

### Store Structure:
```javascript
Map {
  "pagination_{timestamp}_{random}" → {
    chunks: ["chunk1", "chunk2", ...],
    currentPage: 0,
    totalPages: 3,
    timestamp: 1709823456789
  }
}
```

### Cleanup Strategy:
```javascript
// Remove sessions older than 1 hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of paginationStore.entries()) {
    if (now - value.timestamp > 3600000) {
      paginationStore.delete(key);
    }
  }
}, 60000); // Check every minute
```

---

## Discord API Integration

### Message Payload:
```json
{
  "content": "First page content...",
  "components": [
    {
      "type": 1,
      "components": [
        {
          "type": 2,
          "custom_id": "pagination_prev_0",
          "label": "Previous",
          "style": 1,
          "emoji": {"name": "⬅️"},
          "disabled": true
        },
        {
          "type": 2,
          "custom_id": "pagination_page_1_of_3",
          "label": "1/3",
          "style": 3,
          "disabled": true
        },
        {
          "type": 2,
          "custom_id": "pagination_next_0",
          "label": "Next",
          "style": 1,
          "emoji": {"name": "➡️"},
          "disabled": false
        }
      ]
    }
  ]
}
```

### Interaction Response:
```json
{
  "type": 7,  // Update Message
  "data": {
    "content": "Second page content...",
    "components": [...],
    "allowed_mentions": {"parse": ["users", "roles"]}
  }
}
```

---

## Best Practices

1. ✅ Use pagination only for messages >2000 chars
2. ✅ Handle errors gracefully with user-friendly messages
3. ✅ Clean up old sessions periodically
4. ✅ Test with various message lengths
5. ✅ Monitor logs for any issues

---

## Quick Commands

```bash
# Run tests
node tests/tests/test-pagination.js

# Start app
node app.js

# Check pagination store
console.log(paginationStore.size);

# Clear all sessions
paginationStore.clear();
```

---

## Support

- **Documentation**: See `PAGINATION_README.md`
- **API Reference**: See `PAGINATION_API_REFERENCE.md`
- **Flow Diagrams**: See `PAGINATION_FLOW_DIAGRAM.md`
- **Tests**: See `tests/test-pagination.js`

---

**Remember**: The pagination system is automatic! Just use `splitMessage()` and `sendPaginatedMessage()`, and the rest handles itself.
