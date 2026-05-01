# RAG (Retrieval-Augmented Generation) Feature

This Discord bot now supports RAG functionality, allowing you to upload PDF documents and use them as context for AI responses.

## Features

- **PDF Source Selection**: Choose from multiple PDF files using slash commands
- **Vector Store Creation**: Automatically creates vector embeddings for efficient similarity search
- **Context-Aware Responses**: AI answers questions based on your selected document(s)
- **Multiple Sources**: Support for multiple PDF sources with easy switching

## Setup

### 1. Install Dependencies

```bash
npm install
```

This will install the required packages:
- `pdf-parse` - For extracting text from PDF files
- `@langchain/openai` and `@langchain/textsplitters` - For vector embeddings and text processing
- `langchain` - Core LangChain library for RAG functionality

### 2. Add PDF Files

Place your PDF files in the `ragsourcebooks/` directory. The bot will automatically detect them.

Currently available sources:
- Heart_Core_Book_Delve_Edition_2024-07-23.pdf
- Those_Dark_Places.pdf

### 3. Configure Environment Variables

Create a `.env` file with the following variables:

```env
# Discord Bot Configuration
DISCORD_APP_ID=your_discord_app_id
DISCORD_TOKEN=your_bot_token
PUBLIC_KEY=your_public_key

# LM Studio API (for AI responses)
LM_STUDIO_API_URL=http://localhost:1234/v1/chat/completions
LM_STUDIO_API_KEY=
DEFAULT_MODEL=

# OpenAI API (for embeddings - optional, uses fallback if not set)
OPENAI_API_KEY=your_openai_api_key

# Optional: Guild ID for server-specific commands
GUILD_ID=your_guild_id
```

**Note on Embeddings**: The current implementation uses OpenAI's embedding model by default. For local development without an OpenAI API key, you can modify the `rag.js` file to use a different embedding provider or implement a fallback mechanism.

## Usage

### Available Slash Commands

#### `/rag_list`
Lists all available PDF sources that can be used for RAG.

**Example:**
```
/rag_list
```

**Response:**
```
📚 Available RAG Sources:
- Heart_Core_Book_Delve_Edition_2024-07-23
- Those_Dark_Places

Use /rag_source to select one as your knowledge base.
```

#### `/rag_source [source]`
Selects a PDF source to use for RAG context.

**Options:**
- `source`: Choose from the dropdown menu of available PDF files

**Example:**
```
/rag_source Heart_Core_Book_Delve_Edition_2024-07-23
```

**Response:**
```
✅ Successfully loaded **Heart_Core_Book_Delve_Edition_2024-07-23** as RAG source! The bot can now answer questions based on this document.
```

#### `/rag_clear`
Clears all RAG vector stores. Use this to reset the knowledge base.

**Example:**
```
/rag_clear
```

**Response:**
```
✅ All RAG vector stores have been cleared.
```

#### `/chat [message]`
Sends a message to the AI assistant. If a RAG source is active, the response will be based on that document.

**Example:**
```
/chat What does the book say about [topic]?
```

The bot will:
1. Search the vector store for relevant context
2. Include the context in the prompt to LM Studio
3. Return an AI-generated answer based on both the context and conversation history

## How It Works

### 1. PDF Processing
When you select a PDF source, the system:
- Reads the PDF file from disk
- Extracts text using `pdf-parse`
- Splits the text into manageable chunks (1000 characters with 200 overlap)
- Creates vector embeddings for each chunk
- Stores them in a memory-based vector store

### 2. Query Processing
When you ask a question:
- The system searches the vector store for relevant document chunks
- Retrieves the top 3 most similar chunks based on your query
- Includes this context in the prompt to LM Studio
- Returns an AI-generated answer that references the document content

### 3. Vector Store Management
- Each PDF source gets its own vector store
- Vector stores are cached in memory for fast retrieval
- You can clear all stores with `/rag_clear`
- Stores persist until cleared or the bot restarts

## Customization

### Adjusting Chunk Size
Modify the `RecursiveCharacterTextSplitter` settings in `rag.js`:

```javascript
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,      // Adjust chunk size
  chunkOverlap: 200,    // Adjust overlap between chunks
});
```

### Changing Number of Retrieved Documents
Modify the `k` parameter in queries:

```javascript
const docs = await queryVectorStore(sourceName, query, 5); // Get 5 results instead of 3
```

### Using Local Embeddings
To use local embeddings without OpenAI API, you can:
1. Use a local embedding model with LM Studio
2. Modify the `OpenAIEmbeddings` configuration in `rag.js`
3. Implement a custom embedding provider

## Troubleshooting

### "No vector store found for source"
This means the PDF hasn't been loaded yet. Use `/rag_source [source]` to load it first.

### Slow Response Times
- Large PDFs take longer to process initially
- Consider reducing chunk size or number of retrieved documents
- Ensure LM Studio is running and accessible

### Embedding Errors
If you see errors related to OpenAI API:
1. Check that `OPENAI_API_KEY` is set in your `.env` file
2. Or modify `rag.js` to use a different embedding provider
3. For testing, the system will still work but with reduced context quality

### Memory Issues
For very large PDFs, consider:
- Processing only specific sections
- Implementing persistent vector storage (e.g., using Pinecone or Chroma)
- Clearing unused vector stores with `/rag_clear`

## Future Enhancements

Potential improvements to consider:
1. **Persistent Vector Storage**: Use disk-based or cloud vector databases
2. **Multiple Source Queries**: Search across multiple PDFs simultaneously
3. **Source Metadata**: Track which documents answers are based on
4. **Document Updates**: Allow updating specific document sections
5. **Chunk Caching**: Cache processed chunks to avoid reprocessing

## License

MIT - See LICENSE file for details.
