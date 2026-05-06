# Character Pagination Implementation

## Overview
The `/character` command now uses the same emoji-based pagination system as the `/chat` command to display long character sheets without truncation.

## Changes Made

### 1. Updated `app.js` - Character Command Handler

**Before:** The character command sent multiple webhook PATCH messages sequentially, which could lead to:
- Messages appearing out of order
- No navigation controls for users
- Truncation issues with very long character sheets

**After:** The character command now uses the pagination system:

```javascript
// Split the character sheet content if it exceeds Discord's limit
const chunks = splitMessage(responseContent);

// If we have multiple chunks, use pagination system
if (chunks.length > 1) {
  console.log(`Sending paginated character sheet with ${chunks.length} pages...`);
  
  // Send first chunk with pagination controls
  await sendPaginatedMessage(channelId, chunks, DiscordRequest, process.env.DISCORD_APP_ID, token);
  
  console.log('Successfully sent paginated character sheet');
} else {
  // Single chunk - edit original message directly
  console.log('Sending single chunk character sheet...');
  
  await DiscordRequest(`webhooks/${process.env.DISCORD_APP_ID}/${token}/messages/@original`, {
    method: 'PATCH',
    body: {
      content: chunks[0],
      allowed_mentions: { parse: ['users', 'roles'] }
    }
  });
}
```

### 2. Error Handling with Pagination

All message types now use pagination when needed:

- **Success case:** Character sheets are paginated if they exceed Discord's 2000 character limit
- **Error case (generation failure):** Failed generation messages are also paginated if too long
- **Error case (processing error):** Processing errors use pagination when needed
- **Fallback:** Single chunk messages still work without pagination controls

### 3. Error Case Implementation

When character generation fails, the error message is now also paginated:

```javascript
if (!result.success) {
  // Split error message and use pagination if needed
  const chunks = splitMessage(`❌ Character generation failed: ${result.error}`);
  
  if (chunks.length > 1) {
    await sendPaginatedMessage(channelId, chunks, DiscordRequest, process.env.DISCORD_APP_ID, token);
  } else {
    // Single chunk - direct webhook PATCH
    await DiscordRequest(...);
  }
  return;
}
```

### 3. Pagination Components

The system automatically adds navigation buttons when there are multiple pages:

```
⬅️ [1/3] ➡️
```

- **Previous button** (⬅️): Disabled on first page, enables navigation to previous page
- **Page indicator** ([1/3]): Shows current page and total pages
- **Next button** (➡️): Enabled when more pages exist

## How It Works

### 1. Message Splitting
The `splitMessage()` function from `pagination.js` splits long content into chunks:
- Preserves paragraph structure by splitting on newlines
- Ensures each chunk is ≤2000 characters (Discord's limit)
- Handles very long single lines by splitting them further

### 2. Pagination Storage
When a paginated message is sent, the system stores pagination state:

```javascript
paginationStore.set(`${channelId}_${messageId}`, {
  chunks: [...],        // All message chunks
  currentPage: 0,       // Current page index (0-based)
  totalPages: 3,        // Total number of pages
  channelId: '123456'   // Channel ID for reference
});
```

### 3. Button Interaction Handling

When a user clicks a pagination button:

1. Discord sends a `MESSAGE_COMPONENT` interaction with the button's `custom_id`
2. The system parses the `custom_id` to extract:
   - Action (prev/next)
   - Current page number
3. Retrieves pagination data from `paginationStore`
4. Updates current page and returns updated message with new content and components

## Testing

### Manual Testing Steps

1. **Generate a character** using `/character` command
2. **Check for pagination controls** if the character sheet is long:
   - Look for Previous/Next buttons below the message
   - Verify page indicator shows correct page count
3. **Test navigation:**
   - Click "Next" to see remaining content
   - Click "Previous" to go back
   - Verify buttons disable correctly at boundaries

### Example Output

For a short character sheet (≤2000 chars):
```
✅ Character generated successfully!
[No pagination controls shown]
```

For a long character sheet (>2000 chars):
```
# 🎲 Character Sheet

## Elf Wizard
**Background:** Sage

### Ability Scores
...

⬅️ [1/3] ➡️
```

Click "Next" →
```
### Skills
...

⬅️ [2/3] ➡️
```

Click "Next" again →
```
### Equipment
...

⬅️ [3/3] ➡️
```

## Benefits

1. **No Truncation:** Long character sheets display completely without being cut off
2. **Better UX:** Users can navigate through pages at their own pace
3. **Consistent with /chat:** Uses the same pagination system as chat messages
4. **Backward Compatible:** Short messages still work without pagination controls

## Technical Details

### Files Modified
- `app.js`: Updated character command handler to use pagination

### Files Used (Already Existed)
- `pagination.js`: Contains all pagination logic
  - `splitMessage()`: Splits content into Discord-compatible chunks
  - `createPaginationComponents()`: Creates navigation button components
  - `sendPaginatedMessage()`: Sends first page with controls
  - `handlePaginationInteraction()`: Processes button clicks

### Integration Points
- Character generation result is split using `splitMessage()`
- If multiple chunks, uses `sendPaginatedMessage()` instead of multiple webhook PATCH calls
- Pagination state stored in `paginationStore` Map for button click lookups

## Future Enhancements

Potential improvements:
1. Add "First" and "Last" page buttons
2. Implement keyboard navigation (arrow keys)
3. Add page number selector dropdown
4. Support for message threading or replies
