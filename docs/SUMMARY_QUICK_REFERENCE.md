# RPG Summary System - Quick Reference

## Commands

| Command | Description |
|---------|-------------|
| `/rag_source <source>` | Load a PDF and generate focused summaries |
| `/rag_summary` | Show summary information for current source |
| `/rag_list` | List all available PDF sources |
| `/rag_clear` | Clear all vector stores and summaries |

## Summary Categories

### 1. Character Creation
- Process and steps for creating characters
- Available options (races, classes, backgrounds)
- Stat generation methods
- Starting equipment and resources
- Restrictions and guidelines

### 2. Combat Rules
- Turn order and initiative system
- Attack actions and mechanics
- Defense and armor systems
- Movement and positioning
- Special combat maneuvers
- Damage types and resolution

### 3. Non-Combat Gameplay
- Success determination outside combat (skill checks, rolls)
- Social interaction rules
- Exploration and travel mechanics
- Magic/spell systems (non-combat use)
- Resource management (food, time, money)
- Miscellaneous gameplay rules

### 4. Setting & Atmosphere
- World/location where the game takes place
- Key factions, organizations, and NPCs
- Overall tone and atmosphere
- Cultural norms and societal structures
- Notable locations and landmarks

## File Locations

| Path | Purpose |
|------|---------|
| `rag_summaries/` | Cache directory for generated summaries |
| `ragsourcebooks/` | PDF files to process |

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

## Size Limits

| Limit | Value |
|-------|-------|
| Per category | 45,000 characters |
| Total maximum | ~180,000 characters |
| Context window | 200,000 characters (90% usage) |

## Troubleshooting

### Summaries Not Generating
- Ensure LM Studio is running and accessible
- Check that the model supports long context windows
- Verify PDF text extraction worked correctly

### Cache Issues
- Delete files in `rag_summaries/` to force regeneration
- The system automatically detects checksum mismatches

### High Token Usage
- Reduce the number of chapters processed
- Adjust chunk sizes in `RecursiveCharacterTextSplitter`
- Consider using a model with larger context window

## Environment Variables

```bash
LMSTUDIO_API_URL=http://localhost:1234/v1/chat/completions
OLLAMA_EMBEDDING_MODEL=all-minilm
OLLAMA_API_URL=http://localhost:11434/api
```
