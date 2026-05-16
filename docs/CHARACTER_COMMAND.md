# /character Command Documentation

## Overview

The `/character` command generates RPG characters using the enhanced RAG system. It analyzes the selected RPG rulebook PDF and creates a character following the specific rules and procedures of that system.

## How It Works

### 1. Enhanced RAG System Setup

When you use `/character`, the bot:
- Loads or creates an enhanced RAG system for your selected rulebook
- Uses chapter-by-chapter analysis to understand character creation stages
- Indexes content by aspect (character creation, combat, gameplay, setting)

### 2. Character Creation Process

The character generator follows these stages:

1. **Character Creation Overview** - Identifies the steps and recommended order for creating a character in your RPG system

2. **Core Identity** - Selects species/race and class/background based on available options in the rulebook

3. **Attributes/Stats** - Determines character attributes using the system's specific method (dice rolls, point buy, etc.)

4. **Skills and Proficiencies** - Chooses skills, abilities, and proficiencies according to the character's background

5. **Equipment** - Selects starting equipment based on class/background choices

6. **Backstory** - Creates a brief character background that ties everything together

### 3. Retry Mechanism

Each stage attempts up to 3 times before giving up. If a stage fails, the generator continues with other stages and includes an error message in the final output.

### 4. Output Format

The final character sheet is formatted as markdown with:
- Clear section headers
- Organized lists of choices
- Proper emphasis on important rules
- All information sourced from your RPG rulebook

## Usage

```
/character specifications: "I want a stealthy character who excels in social interactions"
```

The `specifications` parameter is optional and can include:
- Desired traits or abilities
- Preferred playstyle
- Character concept or theme
- Any specific requirements you have

## Requirements

1. **RAG Source Selected** - You must use `/rag_source` to select a PDF before using `/character`
2. **LM Studio Running** - The AI model must be accessible at `http://localhost:1234/v1/chat/completions`
3. **Ollama Available** - For embeddings, Ollama should be running with the all-minilm model

## Example Flow

```
User: /rag_source Heart_Core_Book_Delve_Edition
Bot: ✅ Successfully loaded Heart_Core_Book_Delve_Edition as RAG source!

User: /character specifications: "I want a character who is good at solving puzzles and has strong magical abilities"
Bot: ⏳ Creating your character...
Bot: [follow-up message with character sheet in markdown format]
```

## Technical Details

### Files Involved

- `character-generator.js` - Main character generation logic
- `rag-enhanced.js` - Enhanced RAG system with aspect-based retrieval
- `chapter-analyzer.js` - Analyzes PDF chapters and generates summaries
- `lmstudio.js` - LM Studio API integration for AI responses

### Key Features

- **Aspect-aware retrieval**: Queries are routed to the most relevant content (character creation, combat, etc.)
- **Retry mechanism**: Each stage retries up to 3 times on failure
- **Progress tracking**: Shows which stages have been completed
- **Error handling**: Gracefully handles failures and continues with other stages

### Character Data Structure

The generator builds a character object with these potential fields:
- `species` - The character's race/species
- `class` - The character's class or background
- `attributes` - Object mapping attribute names to values
- `skills` - Array of selected skills/abilities
- `equipment` - Array of selected equipment items
- `backstory` - Character background story

## Limitations

- Characters are generated based on the information available in your rulebook PDF
- If a rulebook doesn't specify certain details, reasonable defaults are used
- The character sheet format depends on what's described in the rulebook
