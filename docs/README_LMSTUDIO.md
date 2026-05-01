# Discord Bot with LM Studio Integration and RAG Support

This is a modified version of the Discord bot example that connects to your self-hosted LM Studio instance and functions as an intelligent chatbot with Retrieval-Augmented Generation (RAG) capabilities.

## What's New?

### LM Studio Features
- **LM Studio Integration**: Connects to your local AI model via LM Studio API
- **Conversation Memory**: Remembers context within each channel for natural conversations
- **Simple Commands**: `/chat` to send messages, `/clearchat` to reset history

### RAG (Retrieval-Augmented Generation) Features
- **PDF Source Selection**: Choose from multiple PDF documents as knowledge sources
- **Vector Store Creation**: Automatically creates vector embeddings for efficient search
- **Context-Aware Responses**: AI answers questions based on your selected document(s)
- **Multiple Sources**: Support for switching between different PDF knowledge bases

## Quick Start

### 1. Prerequisites
- Node.js 18+
- LM Studio installed and running with a loaded model
- PDF files to use as knowledge sources (place in `ragsourcebooks/` directory)

### 2. Setup
```bash
# Install dependencies (includes RAG packages: pdf-parse, langchain)
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your Discord and LM Studio settings
```

### 3. Configure LM Studio
1. Open LM Studio
2. Load any model you want to use
3. Click "Start Server" (default: http://localhost:1234)

### 4. Add PDF Sources
Place your PDF files in the `ragsourcebooks/` directory:
- Heart_Core_Book_Delve_Edition_2024-07-23.pdf
- Those_Dark_Places.pdf

### 5. Test Connection
```bash
npm run test-lmstudio
node test-rag.js
```

### 6. Register Commands & Start
```bash
npm run register
npm start
```

The bot will remember context within each channel for natural conversations!

## Files Overview

### Core Modules
- `lmstudio.js` - LM Studio API communication
- `chatbot.js` - Chat functionality with memory management
- `app.js` - Discord bot with new commands

### Configuration
- `.env.example` - Environment variable template
- `.env` - Your actual configuration (create from template)

### Documentation
- `README_LMSTUDIO.md` - This file
- `SETUP_LMSTUDIO.md` - Detailed setup instructions
- `LMSTUDIO_INTEGRATION.md` - Integration guide
- `CHANGES_SUMMARY.md` - Technical changes overview

### Testing
- `test-lmstudio.js` - Verify LM Studio connection

## Configuration Options

Edit `.env` to customize:

```env
# LM Studio API settings
LM_STUDIO_API_URL=http://localhost:1234/v1/chat/completions
LM_STUDIO_API_KEY=your_api_key_if_required
DEFAULT_MODEL=model_name_to_use_automatically
```

## Features

✅ **Conversation Memory** - Remembers context within channels  
✅ **Flexible Model Selection** - Works with any LM Studio model  
✅ **Error Handling** - Graceful fallbacks and user-friendly messages  
✅ **Per-Channel History** - Each channel has its own conversation memory  
✅ **Easy Setup** - Simple configuration via environment variables  

## Troubleshooting

### Connection Issues
- Verify LM Studio server is running on port 1234
- Check `LM_STUDIO_API_URL` in `.env`
- Ensure firewall allows connections to localhost:1234

### No Models Found
- Load a model in LM Studio before starting the bot
- Check that "Start Server" button shows active status

## Customization

### Change Conversation History Length
Edit `chatbot.js`:
```javascript
if (history.length > 20) { // Adjust this number
```

### Modify AI Behavior
Edit `lmstudio.js`:
```javascript
temperature: 0.7,     // Creativity level
max_tokens: -1,       // Response length
```

## RAG Configuration

For full RAG functionality with vector embeddings:

1. Add your OpenAI API key to `.env`:
   ```env
   OPENAI_API_KEY=sk-your_api_key_here
   ```

2. Or modify `rag.js` to use a different embedding provider for local development.

## What Changed from Original?

| Feature | Original Bot | New Chat Bot |
|---------|-------------|--------------|
| AI Integration | ❌ | ✅ LM Studio |
| Conversation Memory | ❌ | ✅ Per-channel |
| Customizable Model | ❌ | ✅ Any model |
| Context Awareness | ❌ | ✅ Yes |

## RAG Features Added

| Feature | Description |
|---------|-------------|
| PDF Source Selection | Choose from multiple PDF documents as knowledge sources |
| Vector Store Creation | Automatically creates vector embeddings for efficient search |
| Context-Aware Responses | AI answers questions based on your selected document(s) |
| Multiple Sources | Support for switching between different PDF knowledge bases |

## Next Steps

1. Set up your `.env` file
2. Load a model in LM Studio
3. Test with `npm run test-lmstudio`
4. Add PDF files to `ragsourcebooks/` directory
5. Register commands and start chatting!

Enjoy your intelligent Discord bot powered by your self-hosted AI model! 🚀

For more information, see the [RAG Feature Guide](RAG_FEATURE.md).
