# Character Generation Quick Reference

## Basic Usage

```bash
/character                    # Generate random character
/character Elf Wizard         # Specify race and class
```

## What Gets Generated

- **Race**: From available world races (Human, Elf, Dwarf, etc.)
- **Class**: From available classes (Fighter, Wizard, Rogue, etc.)
- **Background**: Character background (Soldier, Sage, etc.)
- **Ability Scores**: 4d6 drop lowest for each stat
- **Skills**: Based on class and background
- **Equipment**: Starting gear for the class
- **Personality Traits**: 2-4 defining characteristics
- **Backstory**: Brief character history

## Dice System

### Ability Score Generation

```
4d6dl1 = Roll 4 dice, drop lowest 1
Example: [15, 12, 8, 6] → Sum of highest 3 = 35
Range: 3-18 (average ~12.2)
```

### Other Dice Notations

| Notation | Meaning |
|----------|---------|
| `1d20` | Single d20 roll |
| `2d6+3` | 2d6 plus modifier +3 |
| `4d6dl1` | 4d6 drop lowest (ability scores) |

## Step Limit

- **Default**: 8 steps
- **Purpose**: Prevents infinite loops
- **Typical completion**: 6-7 steps for full character

## RAG Integration

### Enable RAG Context

```bash
/rag_source path/to/document.pdf
```

When active, the system will:

1. Retrieve world context for each generation step
2. Validate choices against retrieved information
3. Include progress updates in output

### Progress Report Example

```
### Character Generation Progress
ℹ️ **Step 1:** Retrieved 3 context documents for world consistency
✅ **Step 2:** Selected race: Human
✅ **Step 3:** Selected class: Wizard
✅ **Step 4:** Ability scores calculated using 4d6 drop lowest method
✅ **Step 5:** Generated personality traits
✅ **Step 6:** Generated character backstory
✅ **Step 7:** Character generation complete
```

## Validation Rules

### Required Fields

- ✅ Race (from available options)
- ✅ Class (from available options)
- ✅ Background (from available options)
- ✅ All 6 ability scores (3-18 range)

### Numeric Validation

| Field | Valid Range |
|-------|-------------|
| Ability Scores | 3-18 |
| Dice Rolls | 1 to number of sides |

## Error Handling

| Issue | Resolution |
|-------|------------|
| No RAG source | Uses default world rules |
| Generation incomplete | Fills missing fields with defaults |
| Validation failure | Reports issues, uses alternatives |

## API Usage (Developer)

```javascript
import { generateCharacterWithProgress } from './character-generator.js';

// Basic usage
const result = await generateCharacterWithProgress('', null);

// With specifications
const result = await generateCharacterWithProgress('Elf Wizard', 'path/to/rpg.pdf');

// Custom step limit
const result = await generateCharacterWithProgress('', null, { maxSteps: 12 });
```

## Test Commands

```bash
# Run all character tests
node --test tests/test-character.js
node --test tests/test-character-dice-integration.js
node --test tests/test-character-rag-integration.js

# Run specific test file
node --test tests/test-character-rag-integration.js
```

## Key Files

| File | Description |
|------|-------------|
| `character-agent.js` | Core agent with generation steps |
| `character-generator.js` | RAG integration and orchestration |
| `dice.js` | Dice notation parser and roller |
| `rag.js` | Vector store and context retrieval |

## Character Sheet Output

```
# 🎲 Character Sheet

## Human Fighter
**Background:** Soldier

### Ability Scores
- **strength:** 16 (+3)
- **dexterity:** 12 (+1)
- **constitution:** 14 (+2)
- **intelligence:** 10 (+0)
- **wisdom:** 8 (-1)
- **charisma:** 13 (+1)

### Skills
- Athletics
- Perception

### Equipment
- Chain mail
- Sword
- Shield
- Dungeoneer's pack

### Personality Traits
- I idolize a particular hero of my class and constantly try to imitate their deeds.
- I am always calm, no matter what the situation.

## Backstory
As a Human Fighter, I grew up in a small village where I always felt out of place. 
My desire for adventure led me to strike out on my own.

---
*Generated in 7 steps using 6 dice rolls*
```

## Troubleshooting

### "No RAG source loaded"

This is normal if you haven't set up a PDF context. The system will use default world rules.

### "Generation incomplete"

The system has a step limit (default: 8). If generation doesn't complete, it will fill missing fields with defaults.

### "Validation failed"

The system will attempt to fix issues automatically. Check the error message for details.

## Performance Notes

- **Typical generation time**: 1-3 seconds
- **Token usage**: ~500-2000 tokens per character
- **Dice rolls**: Instant (local calculation)
- **RAG retrieval**: ~0.5-2 seconds if active
