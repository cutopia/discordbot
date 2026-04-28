# Quick Setup for LM Studio Integration

## Prerequisites
- Node.js 18 or higher
- LM Studio installed and running

## Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
- Add your Discord bot token, public key, and app ID
- Verify LM Studio API URL (default: `http://localhost:1234/v1/chat/completions`)
- Optionally specify a model name or API key

### 3. Load a Model in LM Studio
1. Open LM Studio
2. Go to the "Model Hub" tab
3. Select and load any model you want to use
4. Click "Start Server" (top right)
5. Verify the server is running on port 1234

### 4. Test the Connection
```bash
npm run test-lmstudio
```

This will verify your LM Studio connection works.

### 5. Register Discord Commands
```bash
npm run register
```

### 6. Start the Bot
```bash
npm start
```

## Usage in Discord

Once the bot is running:

1. Use `/chat message:Hello!` to send a message
2. The bot will respond using your LM Studio model
3. Use `/clearchat` to reset conversation history

The bot remembers context within each channel for natural conversations!
