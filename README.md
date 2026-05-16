# Discord AI Bot

A Discord bot with integrated AI chat capabilities using LM Studio and advanced RAG (Retrieval-Augmented Generation) for context-aware responses.

## Features

### Core Functionality
- **AI Chat**: Real-time conversation with locally-hosted LLM via LM Studio
- **RAG Support**: Contextual answers from uploaded PDF documents
- **Conversation History**: Maintains chat context within channels
- **Pagination**: Handles long AI responses with interactive pagination
- **Character Generation**: Create RPG characters with step-by-step generation, dice rolls, and optional RAG integration for world consistency
- **Progress Reporting**: Real-time updates during character generation showing which steps are completed
- **Local Processing**: All AI processing runs locally (no external API costs)

### Advanced RAG System

#### Original Chunk-Based RAG
- PDF parsing and text extraction
- Vector store with local embeddings (Ollama)
- Semantic search for relevant rule chunks
- Backward compatible with existing workflows

#### NEW: Chapter-by-Chapter Analysis RAG
- **Intelligent chapter detection** - Automatically finds chapters and sections in rulebooks
- **Aspect-focused analysis** - LLM generates rich summaries for 4 key RPG aspects:
  - Character creation rules and processes
  - Combat scenario rules and procedures  
  - Non-combat success determination & gameplay rules
  - Setting places, people, and atmosphere
- **Enhanced retrieval** - Both raw chunks and semantic summaries with metadata
- **Aspect-aware queries** - Automatically route questions to relevant content

## Prerequisites

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

**Features:**
- **Step-by-step generation**: 8 steps maximum to prevent infinite loops
- **Dice integration**: Uses enhanced dice notation (e.g., `4d6dl1` for ability scores)
- **RAG context**: Optionally uses PDF context for world consistency
- **Progress reporting**: Shows which steps are completed during generation

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

### Core Files
- `app.js` - Main Discord bot entry point
- `chatbot.js` - Chat processing with conversation history
- `lmstudio.js` - LM Studio API integration
- `rag.js` - Original RAG functionality and document embedding
- `pagination.js` - Interactive pagination for long responses
- `commands.js` - Slash command definitions

### RPG Character System
- `character-generator.js` - High-level orchestration with RAG integration
- `dice.js` - Dice rolling utilities
- `game.js` - Rock-paper-scissors game (example feature)

### Advanced RAG System
- `chapter-analyzer.js` - Chapter detection and aspect-focused analysis
- `rag-enhanced.js` - Enhanced RAG system with summary support
- `chapter-rag-integration.js` - Integration examples and demo

### Utilities
- `utils.js` - Utility functions
- `seeded-random.js` - Seeded random number generation for dice

### Tests
- `tests/test-chapter-analysis.js` - Test suite for chapter analysis system
- Other test files for core functionality

## Testing

```bash
# Test LM Studio connection
npm run test-lmstudio

# Test RAG functionality (original chunk-based)
npm run test-rag

# Test dice rolling
npm run test-dice

# Test character generation agent (core logic)
npm run test-character

# Test dice integration
npm run test-character-dice-integration

# Test RAG integration with character generation
npm run test-character-rag-integration

# Test tools integration
npm run test-tools

# Test new chapter analysis system
node tests/test-chapter-analysis.js

# Test chapter-RAG integration
node chapter-rag-integration.js
```

## License

MIT
