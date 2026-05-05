# Discord AI Bot

A Discord bot with integrated AI chat capabilities using LM Studio and RAG (Retrieval-Augmented Generation) for context-aware responses.

## Features

- **AI Chat**: Real-time conversation with locally-hosted LLM via LM Studio
- **RAG Support**: Contextual answers from uploaded PDF documents
- **Conversation History**: Maintains chat context within channels
- **Pagination**: Handles long AI responses with interactive pagination
- **Character Generation**: Create RPG characters using RAG context and dice rolls
- **Local Processing**: All AI processing runs locally (no external API costs)

## Prerequisites

- Node.js >= 18.x
- LM Studio running locally with a model loaded
- Discord bot application

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd discordbot

# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the project root:

```env
# Discord credentials
DISCORD_APP_ID=your_app_id
DISCORD_TOKEN=your_bot_token
PUBLIC_KEY=your_public_key

# LM Studio (local AI)
LM_STUDIO_API_URL=http://localhost:1234/v1/chat/completions
DEFAULT_MODEL=

# Optional: Ollama for embeddings (if using RAG)
OLLAMA_API_URL=http://localhost:11434/api
OLLAMA_EMBEDDING_MODEL=all-minilm

# Optional: Timeout settings
LM_STUDIO_TIMEOUT=25000
CONTEXT_WINDOW_SIZE=4096
```

## Setup

### 1. Start LM Studio

1. Open LM Studio
2. Load a local model (e.g., Mistral, Llama-2)
3. Start the local server on port 1234

### 2. Register Slash Commands

```bash
npm run register
```

### 3. Run the Bot

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## Usage

### Character Generation Command

Create RPG characters with the `/character` command:

```
/character
/character Human Fighter with high strength
```

The character generation process:
1. Determines race and class (or uses user specifications)
2. Calculates ability scores using 4d6 drop lowest method
3. Selects background and personality traits
4. Generates equipment and skills based on class
5. Creates a complete character sheet

### Chat Command

Use `/chat` to send messages to the AI:

```
/chat What is the capital of France?
```

The bot will respond using your locally-hosted model.

### RAG Context (Optional)

1. Upload PDF documents to a directory
2. The bot will embed and index them for contextual responses
3. Use `/rag` commands to switch between document sources

## Project Structure

- `app.js` - Main Discord bot entry point
- `chatbot.js` - Chat processing with conversation history
- `lmstudio.js` - LM Studio API integration
- `rag.js` - RAG functionality and document embedding
- `pagination.js` - Interactive pagination for long responses
- `commands.js` - Slash command definitions
- `character-agent.js` - RPG character generation agent
- `dice.js` - Dice rolling utilities
- `game.js` - Rock-paper-scissors game (example feature)
- `utils.js` - Utility functions

## Testing

```bash
# Test LM Studio connection
npm run test-lmstudio

# Test RAG functionality
npm run test-rag

# Test dice rolling
npm run test-dice

# Test character generation agent
npm run test-character

# Test tools integration
npm run test-tools
```

## License

MIT
