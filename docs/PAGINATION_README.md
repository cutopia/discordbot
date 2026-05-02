# Discord Bot Pagination System

## 🎯 Overview

This implementation adds automatic message pagination to your Discord bot with emoji navigation controls (⬅️/➡️) to handle messages that exceed Discord's 2000-character limit.

## ✨ Features

- **Automatic splitting**: Messages >2000 characters are automatically split into pages
- **Emoji navigation**: Users can navigate using ⬅️ Previous and ➡️ Next buttons
- **Page indicators**: Shows current page (e.g., "2/5") in the center button
- **Smart formatting**: Preserves paragraph structure when possible
- **Error handling**: Graceful fallbacks if pagination fails

## 📁 Files Created

### Core Implementation
1. **`pagination.js`** - Main pagination logic and API
   - `splitMessage()` - Split long messages into chunks
   - `createPaginationComponents()` - Create navigation buttons
   - `sendPaginatedMessage()` - Send paginated messages
   - `handlePaginationInteraction()` - Process button clicks

### Documentation
2. **`PAGINATION_FEATURE.md`** - Feature overview and usage guide
3. **`PAGINATION_API_REFERENCE.md`** - Complete API documentation
4. **`PAGINATION_FLOW_DIAGRAM.md`** - Visual flow diagrams
5. **`IMPLEMENTATION_SUMMARY.md`** - Technical implementation details

### Testing
6. **`tests/test-pagination.js`** - Test suite for pagination functionality

## 🚀 Quick Start

### 1. Import the pagination module

```javascript
import {
  sendPaginatedMessage,
  handlePaginationInteraction
} from './pagination.js';
```

### 2. Use in your chat command

```javascript
// In your slash command handler:
const response = await processChatMessage(message, channelId);
const chunks = splitMessage(response);

if (chunks.length > 1) {
  // Multiple pages - use pagination system
  await sendPaginatedMessage(channelId, chunks, DiscordRequest);
} else {
  // Single page - send normally
  await DiscordRequest(`channels/${channelId}/messages`, {
    method: 'POST',
    body: { content: chunks[0] }
  });
}
```

### 3. Handle button clicks

```javascript
// In your MESSAGE_COMPONENT handler:
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

## 📖 How It Works

### Message Flow

1. **User sends a long message** (e.g., 5000 characters)
2. **Bot processes the response** using your chatbot logic
3. **`splitMessage()`** splits into chunks:
   - Chunk 1: 2000 chars + pagination controls
   - Chunk 2: 2000 chars + pagination controls
   - Chunk 3: 1000 chars + pagination controls
4. **First chunk is sent** with navigation buttons
5. **User clicks "Next"** → Message updates to show next page
6. **Repeat until last page**

### Button Components

Each paginated message includes three buttons:

```
[⬅️ Previous] [1/3] [➡️ Next]
```

- **Previous (⬅️)**: Go to previous page (disabled on first page)
- **Page indicator**: Shows current progress (non-clickable)
- **Next (➡️)**: Go to next page (disabled on last page)

## 🧪 Testing

Run the test suite:

```bash
node tests/test-pagination.js
```

Expected output:
```
Test 1: Short message
Chunks: 1
Components: []  # No pagination needed

Test 2: Message at limit
Chunks: 1

Test 3: Message slightly over limit
Chunks: 2
Components: [pagination controls]

Test 4: Very long message with newlines
Chunks: 2+ (depending on content)

Test 5: Pagination components for multi-page message
# Shows button states for each page

Test 6: Edge cases
# Handles empty strings, null values, etc.
```

## 📚 Documentation

### Complete API Reference
See [`PAGINATION_API_REFERENCE.md`](./PAGINATION_API_REFERENCE.md) for:
- Function signatures and parameters
- Response types
- Error handling examples
- Integration checklist

### Visual Flow Diagrams
See [`PAGINATION_FLOW_DIAGRAM.md`](./PAGINATION_FLOW_DIAGRAM.md) for:
- Complete message flow diagrams
- Button state transitions
- Data flow visualizations
- Session management

### Feature Details
See [`PAGINATION_FEATURE.md`](./PAGINATION_FEATURE.md) for:
- Technical implementation details
- Discord API integration
- Usage examples
- Troubleshooting guide

## 🔧 Configuration

No additional configuration needed! The system automatically:

1. Detects when messages exceed 2000 characters
2. Splits messages at natural breakpoints (newlines)
3. Creates navigation buttons with appropriate states
4. Handles button clicks and updates messages

## 🛠️ Customization

### Change Button Emojis

Edit `pagination.js`:

```javascript
// Find this section:
emoji: { name: '⬅️' }  // Change to your preferred emoji
emoji: { name: '➡️' }  // Change to your preferred emoji
```

### Adjust Split Logic

Modify `splitMessage()` in `utils.js` or `pagination.js`:

```javascript
const DISCORD_MESSAGE_LIMIT = 2000; // Change limit if needed
// Or implement custom splitting logic
```

## 🐛 Troubleshooting

### Pagination controls not appearing
- ✅ Check that message is >2000 characters
- ✅ Verify `chunks.length > 1`
- ✅ Ensure components array is included in message payload

### Buttons don't respond to clicks
- ✅ Check MESSAGE_COMPONENT interaction type is handled
- ✅ Verify custom_id starts with 'pagination_'
- ✅ Confirm token and webhookId are correct

### Messages not updating on button click
- ✅ Confirm response type is 7 (Update Message)
- ✅ Check paginationStore has correct data
- ✅ Verify bot has permission to edit messages

## 📊 Example Usage

### Short Response (<2000 chars)
```
User: /chat "Hello!"
Bot: Hello! 👋
```

### Long Response (>2000 chars)
```
User: /chat "Write a 5000 character story about AI"
Bot: [First 2000 characters]
     [⬅️ Previous] [1/3] [➡️ Next]

User clicks ➡️
Bot: [Next 2000 characters]
     [⬅️ Previous] [2/3] [➡️ Next]

User clicks ➡️
Bot: [Final 1000 characters]
     [⬅️ Previous] [3/3] [➡️ Next (disabled)]
```

## 🎓 Best Practices

1. **Use for long responses only**: Don't add pagination to short messages
2. **Preserve context**: Keep conversation history in your chatbot logic
3. **Handle errors gracefully**: Show user-friendly error messages
4. **Clean up sessions**: Remove old pagination data periodically
5. **Test thoroughly**: Verify all edge cases work correctly

## 📈 Future Enhancements

Potential improvements:
- ⏭️ Jump to first/last page buttons
- 📋 Page selector dropdown
- ⌨️ Keyboard navigation (arrow keys)
- 💾 Persistent pagination across sessions
- 🎨 Customizable button styles and emojis
- 📊 Analytics on which messages get paginated

## 🤝 Contributing

When contributing to this feature:
1. Update documentation for any API changes
2. Add tests for new functionality
3. Follow existing code style
4. Test with various message lengths

## 📄 License

Same as main project.

---

**Need help?** Check the documentation files or review the test examples in `tests/test-pagination.js`.
