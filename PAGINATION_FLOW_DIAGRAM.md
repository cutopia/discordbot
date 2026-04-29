# Pagination Flow Diagram

## Complete Message Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER ACTION                                    │
│                         /chat "Write a long..."                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INTERACTION RECEIVED                                │
│                    app.js: POST /interactions                              │
│                         type: APPLICATION_COMMAND                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DEFERRED RESPONSE                                     │
│              Send "Thinking..." to prevent timeout                         │
│         type: DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PROCESS CHAT MESSAGE                                   │
│                    chatbot.js: processChatMessage()                        │
│                  - Get response from LM Studio                             │
│                  - Add to conversation history                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SPLIT MESSAGE                                        │
│                    utils.js: splitMessage(response)                        │
│                                                                            │
│  Input: "Very long AI response that exceeds 2000 characters..."           │
│                                                                            │
│  Logic:                                                                    │
│    - If length ≤ 2000 → [single chunk]                                     │
│    - If length > 2000 → split by newlines, then by character limit         │
│                                                                            │
│  Output:                                                                   │
│    ["Chunk 1 (2000 chars)", "Chunk 2 (2000 chars)", "Chunk 3 (500 chars)"] │
└─────────────────────────────────────────────────────────────────────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
            ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
            │   1 chunk     │     │   2+ chunks   │     │    Error      │
            │ (≤2000 chars) │     │ (>2000 chars) │     │ handling      │
            └───────────────┘     └───────────────┘     └───────────────┘
                    │                       │                       │
                    │                       ▼                       │
                    │          ┌────────────────────────────────┐    │
                    │          │  PAGINATION SYSTEM             │    │
                    │          │                                │    │
                    │          │ 1. Generate unique session ID  │    │
                    │          │    sessionId = "pagination_...""│    │
                    │          │                                │    │
                    │          │ 2. Store chunks in Map:        │    │
                    │          │   paginationStore.set(         │    │
                    │          │     sessionId, {               │    │
                    │          │       chunks,                  │    │
                    │          │       currentPage: 0,          │    │
                    │          │       totalPages              │    │
                    │          │     }                         │    │
                    │          │   })                          │    │
                    │          │                                │    │
                    │          │ 3. Create pagination buttons: │    │
                    │          │   ➡️ Previous | 1/3 | Next ⬅️  │    │
                    │          │                                │    │
                    │          │ 4. Send first chunk + buttons: │    │
                    │          │   POST /channels/{id}/messages │    │
                    │          │     content: chunks[0]         │    │
                    │          │     components: [buttons]      │    │
                    │          └────────────────────────────────┘    │
                    │                       │                       │
                    │                       ▼                       │
                    │          ┌────────────────────────────────┐    │
                    │          │   USER INTERACTION             │    │
                    │          │                                │    │
                    │          │ User clicks "Next" button      │    │
                    │          │ custom_id: "pagination_next_0""│    │
                    │          └────────────────────────────────┘    │
                    │                       │                       │
                    │                       ▼                       │
                    │          ┌────────────────────────────────┐    │
                    │          │  HANDLE INTERACTION            │    │
                    │          │                                │    │
                    │          │ app.js: MESSAGE_COMPONENT      │    │
                    │          │   type: MESSAGE_COMPONENT      │    │
                    │          │                                │    │
                    │          │ 1. Parse custom_id             │    │
                    │          │   parts = ["pagination",       │    │
                    │          │           "next", "0"]         │    │
                    │          │                                │    │
                    │          │ 2. Get current page from ID    │    │
                    │          │   currentPage = parseInt("0")  │    │
                    │          │                                │    │
                    │          │ 3. Increment page:             │    │
                    │          │   if action === "next":        │    │
                    │          │     currentPage++              │    │
                    │          │                                │    │
                    │          │ 4. Update pagination store:    │    │
                    │          │   paginationStore.set(         │    │
                    │          │     sessionId, {               │    │
                    │          │       currentPage             │    │
                    │          │     }                         │    │
                    │          │   })                          │    │
                    │          └────────────────────────────────┘    │
                    │                       │                       │
                    │                       ▼                       │
                    │          ┌────────────────────────────────┐    │
                    │          │  UPDATE MESSAGE                │    │
                    │          │                                │    │
                    │          │ 1. Get updated chunks:         │    │
                    │          │   chunks = paginationStore.get│    │
                    │          │                              │    │
                    │          │ 2. Create new button state:    │    │
                    │          │   currentPage = 1              │    │
                    │          │   totalPages = 3               │    │
                    │          │                               │    │
                    │          │   ➡️ Previous | 2/3 | Next ⬅️  │    │
                    │          │   (Previous now enabled)       │    │
                    │          │                               │    │
                    │          │ 3. Send update response:       │    │
                    │          │   type: 7 (Update Message)     │    │
                    │          │   content: chunks[1]           │    │
                    │          │   components: [new buttons]    │    │
                    │          └────────────────────────────────┘    │
                    │                       │                       │
                    │                       ▼                       │
                    │          ┌────────────────────────────────┐    │
                    │          │   MESSAGE UPDATED              │    │
                    │          │                                │    │
                    │          │ Discord shows:                 │    │
                    │          │                               │    │
                    │          │ "Chunk 2 content..."          │    │
                    │          │                               │    │
                    │          │ [⬅️ Previous] [2/3] [➡️ Next]  │    │
                    │          └────────────────────────────────┘    │
                    │                       │                       │
                    ▼                       ▼                       ▼
            ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
            │   Done!       │     │ Repeat if more│     │ Show error  │
            │               │     │ pages exist   │     │ message     │
            └───────────────┘     └───────────────┘     └───────────────┘
```

## Button State Transitions

### Page 1 of 3 (Initial)
```
[⬅️ Previous] [1/3] [➡️ Next]
 ↑ Disabled      ↑ Active   ↑ Enabled
```

### Page 2 of 3 (After clicking Next)
```
[⬅️ Previous] [2/3] [➡️ Next]
 ↑ Enabled       ↑ Active   ↑ Enabled
```

### Page 3 of 3 (Last page)
```
[⬅️ Previous] [3/3] [➡️ Next]
 ↑ Enabled      ↑ Active    ↑ Disabled
```

## Data Flow Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   User Input │────▶│  Chatbot     │────▶│  splitMessage()│
└──────────────┘     └──────────────┘     └──────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │  chunks Array   │
                                    │                 │
                                    │ [chunk1, chunk2,│
                                    │  chunk3]        │
                                    └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ paginationStore │
                                    │                 │
                                    │ sessionId → {   │
                                    │   chunks: [...] │
                                    │   currentPage: 0│
                                    │ }               │
                                    └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ sendPaginated() │
                                    │                 │
                                    │ POST /messages  │
                                    │ content: chunk1 │
                                    │ components: []  │
                                    └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │   Discord UI    │
                                    │                 │
                                    │ chunk1 + buttons│
                                    │ [⬅️][1/3][➡️]   │
                                    └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ Button Clicked  │
                                    │ custom_id:      │
                                    │ "pagination_..."│
                                    └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │handleInteraction│
                                    │                 │
                                    │ Parse custom_id │
                                    │ Update store    │
                                    │ Create new state│
                                    └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │  PATCH /messages│
                                    │ content: chunk2 │
                                    │ components: []  │
                                    └─────────────────┘
```

## Error Handling Flow

```
┌──────────────┐
│   Send Page  │
└──────┬───────┘
       │
       ▼
┌──────────────┐     Yes      ┌──────────────┐
│ Discord API  │────▶────────▶│   Success    │
│   returns 2xx│              └──────────────┘
└──────┬───────┘
       │ No
       ▼
┌──────────────┐     Yes      ┌──────────────┐
│ Rate limit?  │────▶────────▶│ Wait & retry │
└──────┬───────┘              └──────────────┘
       │ No
       ▼
┌──────────────┐     Yes      ┌──────────────┐
│ Permission   │────▶────────▶│ Show error   │
│   denied?    │              │   message    │
└──────┬───────┘              └──────────────┘
       │ No
       ▼
┌──────────────┐
│ Network      │
│   error?     │
└──────┬───────┘
       │ Yes
       ▼
┌──────────────┐
│ Fallback to  │
│ channel API  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Show error │
│   message    │
└──────────────┘
```

## Component Structure

### Action Row (type: 1)
Contains the pagination button group:

```json
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
```

### Button Types

| Type | Style | Color | Purpose |
|------|-------|-------|---------|
| 2 | 1 (Primary) | Blue | Navigation buttons |
| 2 | 3 (Secondary) | Grey | Page indicator |

## Session Management

```javascript
// Session ID format
"pagination_{timestamp}_{random_string}"

// Example
"pagination_1709823456789_abcd1234efgh"

// Storage structure
Map {
  "pagination_1709823456789_abcd1234efgh" → {
    chunks: ["chunk1", "chunk2", "chunk3"],
    currentPage: 1,
    totalPages: 3,
    timestamp: 1709823456789
  },
  // ... more sessions
}
```

## Cleanup Strategy

```javascript
// Remove old sessions (older than 1 hour)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of paginationStore.entries()) {
    if (now - value.timestamp > 3600000) { // 1 hour
      console.log(`Cleaning up old session: ${key}`);
      paginationStore.delete(key);
    }
  }
}, 60000); // Check every minute
```
