# RAG Feature Installation Guide

This guide will help you set up the RAG (Retrieval-Augmented Generation) feature for your Discord bot.

## Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Discord bot with slash commands enabled
- LM Studio running locally (for AI responses)
- PDF files to use as knowledge sources

## Step-by-Step Installation

### 1. Update Dependencies

Run the following command to install all required packages:

```bash
npm install
```

This will install:
- `pdf-parse` - PDF text extraction
- `@langchain/openai` and `@langchain/textsplitters` - Vector embeddings
- `langchain` - Core RAG functionality

### 2. Verify PDF Files

Check that your PDF files are in the `ragsourcebooks/` directory:

```bash
ls ragsourcebooks/
```

You should see:
- Heart_Core_Book_Delve_Edition_2024-07-23.pdf
- Those_Dark_Places.pdf

### 3. Configure Environment Variables

Create or update your `.env` file with the following variables:

```env
# Discord Configuration (required)
DISCORD_APP_ID=your_discord_application_id
DISCORD_TOKEN=your_bot_token
PUBLIC_KEY=your_public_key

# LM Studio API (required for AI responses)
LM_STUDIO_API_URL=http://localhost:1234/v1/chat/completions
LM_STUDIO_API_KEY=
DEFAULT_MODEL=

# OpenAI API (optional, for embeddings)
OPENAI_API_KEY=sk-your_openai_api_key_here

# Optional: Guild ID for server-specific commands
GUILD_ID=your_server_id
```

**Important Notes:**
- If you don't have an OpenAI API key yet, the system will use a fallback embedding approach (may be less accurate)
- Make sure LM Studio is running and accessible at the configured URL

### 4. Register Slash Commands

Register the new slash commands with Discord:

```bash
npm run register
```

You should see output like:
```
✅ Global commands installed successfully
Commands installed globally. Add GUILD_ID to .env for server-specific installation.
```

### 5. Test RAG Functionality

Run the test script to verify everything is working:

```bash
node tests/test-rag.js
```

Expected output:
```
=== Testing RAG Functionality ===

1. Checking available PDF sources...
Found 2 PDF(s):
   - Heart_Core_Book_Delve_Edition_2024-07-23: ./ragsourcebooks/Heart_Core_Book_Delve_Edition_2024-07-23.pdf
   - Those_Dark_Places: ./ragsourcebooks/Those_Dark_Places.pdf

2. Testing text extraction from Heart_Core_Book_Delve_Edition_2024-07-23...
   ✓ Successfully extracted 123456 characters in 2.34s
   First 500 chars: "..."

3. Creating vector store...
   ✓ Vector store created in 1.23s

4. Testing query functionality...
   ✓ Found 3 relevant document(s) for query: "What is this document about?"
   Document 1: "..."
   Document 2: "..."
   Document 3: "..."

=== All RAG tests completed successfully! ===
```

### 6. Start the Bot

Start your Discord bot:

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

## Usage Examples

Once the bot is running, you can use the following slash commands in Discord:

### List Available Sources
```
/rag_list
```

### Select a PDF Source
```
/rag_source Heart_Core_Book_Delve_Edition_2024-07-23
```

### Ask Questions Based on the Document
```
/chat What does this book say about [topic]?
```

### Clear RAG Stores
```
/rag_clear
```

## Troubleshooting

### "npm install" fails with module not found errors

Make sure you're in the project root directory and have internet connectivity for package installation.

### PDF extraction fails

- Verify the PDF files exist in `ragsourcebooks/` directory
- Check that the files are valid PDFs (not corrupted)
- Ensure you have read permissions on the PDF files

### Vector store creation fails

This is likely due to missing OpenAI API key. Options:
1. Add your OpenAI API key to `.env`
2. Modify `rag.js` to use a different embedding provider
3. For testing, the system will still work but with reduced context quality

### Bot doesn't respond to slash commands

- Make sure you registered the commands: `npm run register`
- Check that your bot has the `applications.commands` scope
- Verify the bot is in your server and has permission to use slash commands

## Next Steps

After installation:
1. Test with `/rag_list` to see available sources
2. Select a source with `/rag_source [name]`
3. Ask questions using `/chat [question]`
4. Check `RAG_FEATURE.md` for detailed usage information

## Support

For issues or questions:
- Check the troubleshooting section in `RAG_FEATURE.md`
- Review error logs from your bot
- Verify all environment variables are set correctly
