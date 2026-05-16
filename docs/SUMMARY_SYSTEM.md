# RPG Rulebook Summary System

## Overview

The RPG rulebook RAG system has been enhanced to use **chapter-by-chapter focused summaries** instead of simple chunking. This approach provides better context for the LLM and more relevant information retrieval.

## How It Works

### 1. Chapter Detection
The system automatically detects chapters in PDF documents using multiple patterns:
- `Chapter [0-9]+` (e.g., "Chapter 1", "Chapter IV")
- `Chapter [A-Z]` (e.g., "Chapter A")
- Section headers with underlines
- Numbered sections (e.g., "1. Introduction")

### 2. Four-Focused Summary Categories

For each chapter, the LLM generates summaries focused on these four critical RPG aspects:

#### Character Creation Rules
- Character creation process and steps
- Available options (races, classes, backgrounds)
- Stat generation methods
- Starting equipment and resources
- Restrictions and guidelines

#### Combat Rules
- Turn order and initiative system
- Attack actions and mechanics
- Defense and armor systems
- Movement and positioning
- Special combat maneuvers
- Damage types and resolution

#### Non-Combat Gameplay Rules
- Success determination outside combat (skill checks, rolls)
- Social interaction rules
- Exploration and travel mechanics
- Magic/spell systems (non-combat use)
- Resource management (food, time, money)
- Miscellaneous gameplay rules

#### Setting & Atmosphere
- World/location where the game takes place
- Key factions, organizations, and NPCs
- Overall tone and atmosphere
- Cultural norms and societal structures
- Notable locations and landmarks

### 3. Summary Caching
Summaries are cached to avoid regenerating them on every startup:
- Cached in `rag_summaries/` directory
- Cache includes checksum for invalidation when PDF changes
- Each source gets its own JSON file with all four summaries

## Usage

### Loading a Source with Summaries

```bash
# The /rag_source command now generates and caches summaries automatically
/rag_source Heart_Core_Book_Delve_Edition_2024-07-23
```

The bot will:
1. Extract text from the PDF
2. Detect chapters
3. Generate focused summaries for each chapter
4. Cache the summaries to disk
5. Create vector store with summary embeddings
6. Report summary sizes and context usage

### Checking Summary Status

```bash
# Show summary information for current source
/rag_summary

# Or specify a source
/rag_summary Heart_Core_Book_Delve_Edition_2024-07-23
```

This displays:
- Size of each summary category
- Percentage of 200k context window used
- Preview text from each summary

### Clearing Summaries

```bash
# Clear all vector stores and summaries
/rag_clear
```

## File Structure

```
project/
├── rag_summaries/          # Summary cache directory
│   ├── source1_summaries.json
│   └── source2_summaries.json
├── ragsourcebooks/         # PDF files
│   ├── source1.pdf
│   └── source2.pdf
└── rag_summarizer.js       # Summary generation module
```

## Cache File Format

```json
{
  "source": "source_name",
  "checksum": "md5_hash_of_pdf_text",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "summaries": {
    "characterCreation": "...",
    "combatRules": "...",
    "nonCombatRules": "...",
    "settingAtmosphere": "..."
  }
}
```

## Benefits Over Simple Chunking

1. **Better Context**: LLM understands the structure and focus of each section
2. **Faster Retrieval**: Summaries are shorter but more focused than raw chunks
3. **Reduced Token Usage**: 4 summaries ~50k chars vs hundreds of chunks ~200k+ chars
4. **Easier to Update**: When PDF changes, only regenerate changed chapters
5. **Better Search Results**: Vector store uses summary embeddings for more relevant results

## Configuration

### LM Studio Endpoint

The system uses your LM Studio instance for LLM-powered summarization:

```bash
# In .env file
LMSTUDIO_API_URL=http://localhost:1234/v1/chat/completions
OLLAMA_EMBEDDING_MODEL=all-minilm
OLLAMA_API_URL=http://localhost:11434/api
```

### Summary Size Limits

Each summary category is limited to 45,000 characters to stay within the 200k context window:
- Total maximum: ~180k characters (4 categories × 45k)
-留出空间 for conversation history and queries

## Troubleshooting

### Summaries Not Generating
- Ensure LM Studio is running and accessible
- Check that the model supports long context windows
- Verify PDF text extraction worked correctly

### Cache Issues
- Delete files in `rag_summaries/` to force regeneration
- The system will automatically detect checksum mismatches

### High Token Usage
- Reduce the number of chapters processed
- Adjust chunk sizes in `RecursiveCharacterTextSplitter`
- Consider using a model with larger context window

## Future Enhancements

Potential improvements:
1. **Selective Summary Generation**: Only generate summaries for relevant chapters
2. **Hierarchical Summaries**: Create summary-of-summary for quick overview
3. **Category-Specific Embeddings**: Different embedding models per category
4. **Interactive Summary Review**: Let users approve/reject generated summaries
5. **Multi-Language Support**: Generate summaries in different languages
