# LM Studio Integration

This Discord bot has been modified to connect to your self-hosted LM Studio instance and function as a chatbot.

## Setup Instructions

### 1. Start LM Studio

Make sure you have:
- LM Studio installed and running
- A model loaded in LM Studio
- The local server started (click the "Start Server" button in LM Studio)

By default, LM Studio runs on `http://localhost:1234`

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

- **DISCORD_TOKEN**: Your Discord bot token
- **PUBLIC_KEY**: Your Discord application public key
- **DISCORD_APP_ID**: Your Discord application ID
- **LM_STUDIO_API_URL**: URL of your LM Studio API (default: `http://localhost:1234/v1/chat/completions`)
- **LM_STUDIO_API_KEY**: Optional API key if you've configured authentication in LM Studio
- **DEFAULT_MODEL**: Optional model name to use (leave empty for auto-detect)

### 3. Install Dependencies

```bash
npm install
```

### 4. Register Commands

Register the slash commands with Discord:

```bash
npm run register
```

### 5. Start the Bot

```bash
npm start
```

## Available Commands

- `/chat message:your_message` - Send a message to the AI assistant
- `/clearchat` - Clear conversation history for the current channel

## Features

- **Conversation Memory**: The bot remembers context within each channel (last 20 messages)
- **Model Selection**: Automatically uses whatever model is loaded in LM Studio
- **Error Handling**: Graceful error messages if LM Studio is unavailable

## Troubleshooting

### Connection Issues

If you see connection errors:
1. Verify LM Studio is running and the server is started
2. Check that `LM_STUDIO_API_URL` points to the correct address
3. Ensure your firewall isn't blocking connections on port 1234

### Model Not Found

If the bot can't find a model:
1. Load a model in LM Studio's interface
2. Click "Start Server" after loading the model
3. Check that the model name matches what's shown in LM Studio

## Customization

You can modify the conversation history length by editing the `chatbot.js` file:

```javascript
// In addToHistory function, change:
if (history.length > 20) {
```

To adjust AI behavior, modify the request parameters in `lmstudio.js`:

```javascript
const requestBody = {
  temperature: 0.7,  // Adjust for more/less creative responses
  max_tokens: -1,    // Set maximum response length
  // ...
};
```
