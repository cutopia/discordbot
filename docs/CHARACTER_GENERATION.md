# Character Generation System

The `/character` slash command creates RPG characters using an agentic loop with step limits, dice rolls, and optional RAG integration for world-building consistency.

## Overview

The character generation system follows these key principles:

1. **Agentic Loop**: Multi-step character generation process with configurable step limits
2. **Dice Integration**: Uses 4d6 drop lowest method for ability score generation
3. **RAG Integration**: Optionally uses the currently loaded PDF context for world consistency
4. **Validation**: Checks character choices against available options and validates numeric ranges

## Command Usage

```
/character [specifications]
```

- `specifications` (optional): Character specifications like "Elf Wizard" or "Human Fighter"

### Examples

```
/character
/character Elf Wizard
/character Human Fighter with high strength
```

## Generation Steps

The character generation process follows these steps:

1. **Step 1**: Determine character race
2. **Step 2**: Select class/background
3. **Step 3**: Calculate ability scores (4d6 drop lowest)
4. **Step 4**: Choose equipment
5. **Step 5**: Define personality traits
6. **Step 6**: Add backstory elements
7. **Step 7**: Review and validate against RAG context
8. **Step 8**: Finalize and present character

## Step Limit

- **Default**: 8 steps
- **Configurable**: Can be adjusted via `maxSteps` option
- **Purpose**: Prevents infinite loops and manages token usage

## Dice Integration

### Ability Score Generation

Uses the standard D&D method: **4d6 drop lowest**

For each ability score:
1. Roll 4 six-sided dice (4d6)
2. Drop the lowest roll
3. Sum the remaining 3 dice
4. Result range: 3-18

### Example Output

```
🎲 **Ability Score Roll**: 4d6dl1
   Rolls: [15, 12, 8, 6] → Dropped lowest (6)
   Sum: 15 + 12 + 8 = 35
   **Total: 35**
```

## RAG Integration

### How It Works

When a RAG source is active for the channel:

1. **Context Retrieval**: For each generation step, retrieves relevant context from the PDF
2. **World Consistency**: Uses retrieved context to guide character choices
3. **Validation**: Validates character choices against world rules

### Example Flow

```
Step: Determine Race
├── Query RAG: "What races are available in this world?"
├── Retrieve 3 most relevant documents
├── Select race from available options
└── Validate choice against retrieved context
```

### Progress Reporting

When RAG is active, the character sheet includes progress updates:

```
### Character Generation Progress
ℹ️ **Step 1:** Retrieved 3 context documents for world consistency
✅ **Step 2:** Selected race: Human
✅ **Step 3:** Selected class: Wizard
...
```

## Validation

### What Gets Validated

1. **Required Fields**: All character fields must be filled
2. **Numeric Ranges**: Ability scores must be between 3-18
3. **Available Options**: Race, class, background from valid lists
4. **Dice Records**: Must have recorded dice rolls for ability scores

### Validation Errors

If validation fails, the system will:

1. Log the specific issues
2. Attempt to fix with alternatives
3. Report errors in the final output

## Error Handling

### Common Scenarios

| Scenario | Response |
|----------|----------|
| No RAG source active | Uses default world rules |
| RAG retrieval fails | Continues with defaults, logs warning |
| Generation incomplete | Fills missing fields with defaults |
| Validation failure | Reports issues, attempts recovery |

## Configuration Options

### CharacterGenerationAgent Options

```javascript
{
  maxSteps: 8,           // Maximum steps in generation loop
  // ... other agent options
}
```

### generateCharacterWithProgress Options

```javascript
await generateCharacterWithProgress(
  specifications = '',   // User-provided specs
  ragSource = null,      // RAG PDF path (null for no RAG)
  options = {}           // Agent configuration
);
```

## API Reference

### Main Functions

#### `generateCharacterWithProgress(specifications, ragSource, options)`

Generates a character with progress reporting.

**Returns**: 
```javascript
{
  success: boolean,
  characterData: object,
  formattedSheet: string,
  progressUpdates: array,
  completedSteps: number,
  maxSteps: number
}
```

#### `formatProgressReport(progressUpdates)`

Formats progress updates for Discord display.

**Parameters**:
- `progressUpdates`: Array of step result objects

**Returns**: Formatted string with status icons

### Character Data Structure

```javascript
{
  race: string,                    // Character's race
  class: string,                   // Character's class
  background: string,              // Character's background
  abilityScores: {
    strength: number,
    dexterity: number,
    constitution: number,
    intelligence: number,
    wisdom: number,
    charisma: number
  },
  skills: array,
  equipment: array,
  personalityTraits: array,
  backstory: string,
  otherNotes: array,               // User specifications and notes
  diceRolls: array                 // History of dice rolls
}
```

## Testing

### Unit Tests

```bash
node --test tests/test-character.js           # Core agent logic
node --test tests/test-character-dice-integration.js  # Dice integration
node --test tests/test-character-rag-integration.js   # RAG integration
```

### Test Coverage

- Agent initialization and state management
- Step limit enforcement
- Dice roll parsing and execution
- Validation logic for various scenarios
- RAG context retrieval and validation
- Progress reporting formatting

## Implementation Details

### Key Files

| File | Purpose |
|------|---------|
| `character-agent.js` | Core agent class with generation steps |
| `character-generator.js` | High-level orchestration with RAG integration |
| `dice.js` | Dice notation parser and roller |
| `rag.js` | Vector store and context retrieval |

### Integration Points

- **app.js**: Handles slash command, sends progress updates
- **chatbot.js**: Provides active RAG source per channel
- **lmstudio.js**: Optional LLM validation (when available)

## Future Enhancements

1. **Custom Step Limits**: Allow users to specify max steps via command options
2. **Advanced Validation**: Use LLM for more sophisticated world consistency checks
3. **Character Sheet Export**: PDF or markdown export options
4. **Multiple Characters**: Party generation support
5. **Import/Export**: Save/load character data

## Troubleshooting

### Character Generation Fails

1. Check if LM Studio is running (for optional LLM validation)
2. Verify RAG source is active if using context
3. Review error messages in bot logs

### Progress Updates Not Showing

- Progress updates only appear when RAG context is retrieved
- Default generation still works without progress reporting

### Invalid Character Data

- All generated characters are validated before finalization
- If validation fails, defaults are used to ensure completion
