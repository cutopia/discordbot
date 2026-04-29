# Pagination Feature for Discord Bot

## Overview

The Discord bot now supports automatic message pagination when responses exceed Discord's 2000-character limit. When a response is too long, it will be split into multiple pages with navigation controls.

## Features

### Automatic Pagination
- **Smart splitting**: Messages are automatically split at natural breakpoints (newlines) to preserve paragraph structure
- **Navigation buttons**: Users can navigate between pages using ⬅️ Previous and ➡️ Next buttons
- **Page indicator**: Shows current page number (e.g., "1/3") in the center button

### How It Works

1. When a message exceeds 2000 characters, it's split into chunks
2. The first chunk is sent with pagination controls
3. Users can click navigation buttons to move between pages
4. Each page maintains its own state and navigation controls

## Technical Implementation

### Files Modified/Created

1. **`pagination.js`** (NEW)
   - `splitMessage()` - Splits long messages into Discord-compliant chunks
   - `createPaginationComponents()` - Creates the button components for pagination
   - `sendPaginatedMessage()` - Sends paginated messages with controls
   - `handlePaginationInteraction()` - Processes button clicks for navigation

2. **`app.js`** (MODIFIED)
   - Updated chat command to use pagination system
   - Added MESSAGE_COMPONENT interaction handler for button clicks
   - Integrated pagination store for tracking message state

3. **`utils.js`** (MODIFIED)
   - Kept original `splitMessage()` function for backward compatibility
   - Pagination logic moved to dedicated module

### Key Functions

#### `sendPaginatedMessage(channelId, chunks, DiscordRequest)`
Sends the first page of a paginated message with navigation controls.

**Parameters:**
- `channelId` (string): Discord channel ID
- `chunks` (Array<string>): Array of message chunks
- `DiscordRequest` (function): Discord API request function

**Returns:** Promise that resolves to the message ID

#### `handlePaginationInteraction(customId, channelId, messageId, webhookId, token)`
Handles button click events for pagination navigation.

**Parameters:**
- `customId` (string): The button's custom_id
- `channelId` (string): Discord channel ID
- `messageId` (string): Message ID to update
- `webhookId` (string): Application ID
- `token` (string): Interaction token

**Returns:** Promise that resolves to Discord interaction response

### Button Components

The pagination system creates three buttons in an action row:

1. **Previous Button** (⬅️)
   - Navigates to the previous page
   - Disabled on first page

2. **Page Indicator**
   - Shows current page number (e.g., "2/5")
   - Non-clickable, displays state

3. **Next Button** (➡️)
   - Navigates to the next page
   - Disabled on last page

## Usage Examples

### Example 1: Chat Command with Long Response

```javascript
// User sends: /chat "Please write a very long story..."
// Bot response: 5000 characters

// Result:
// Message 1: First 2000 chars + pagination controls
// [⬅️ Previous] [1/3] [➡️ Next]
//
// Clicking ➡️ updates to:
// Message 2: Second 2000 chars + updated controls  
// [⬅️ Previous] [2/3] [➡️ Next]
//
// Clicking ➡️ again updates to:
// Message 3: Final 1000 chars
// [⬅️ Previous] [3/3] [➡️ Next (disabled)]
```

### Example 2: Short Response

```javascript
// User sends: /chat "Hello!"
// Bot response: 50 characters

// Result:
// Single message with no pagination controls
// Hello!
```

## Discord API Integration

### Message Components Structure

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

### Interaction Response Types

- **Type 7 (Update Message)**: Used for pagination button clicks to update the existing message
- **Type 4 (Channel Message With Source)**: Used for ephemeral error messages

## Error Handling

The system includes robust error handling:

1. **Network failures**: Falls back to regular message sending if pagination fails
2. **Invalid pagination data**: Shows user-friendly error message
3. **Permission errors**: Logs specific Discord API error codes

## Testing the Feature

### Manual Testing Steps

1. Start your bot with `node app.js`
2. Use a `/chat` command that generates a long response (5000+ characters)
3. Verify pagination controls appear on the first message
4. Click the "Next" button to navigate through pages
5. Test edge cases:
   - Single page messages (no controls)
   - Two-page messages
   - Many-page messages

### Example Long Response Generator

To test with a long response, you can temporarily modify your chatbot to return a very long string:

```javascript
// In chatbot.js, modify processChatMessage to return a long response:
const longResponse = "A".repeat(5000); // 5000 characters
return longResponse;
```

## Future Enhancements

Potential improvements for future versions:

1. **Jump controls**: Add buttons to jump to first/last page
2. **Page selector**: Dropdown or number input to select specific page
3. **Keyboard navigation**: Support arrow keys for navigation
4. **Pagination persistence**: Keep pagination state across sessions
5. **Customizable emojis**: Allow users to configure navigation emojis

## Troubleshooting

### Pagination controls not appearing

- Check that `chunks.length > 1` (message is actually split)
- Verify button click handlers are registered in app.js
- Ensure MESSAGE_COMPONENT interaction type is handled

### Buttons don't respond to clicks

- Check Discord developer portal for correct interaction endpoint
- Verify token and webhook ID are correctly passed
- Review browser console for error messages

### Messages not updating on button click

- Confirm response type is 7 (Update Message) for interactions
- Check that paginationStore has the correct data
- Validate channel permissions for bot to edit messages

## License

Same as main project.
