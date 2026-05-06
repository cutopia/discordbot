# Character Attribute System Quick Reference

## What Changed?

The `/character` command no longer uses hardcoded D&D-style attributes. Instead, it dynamically determines the attribute system from your RAG source or uses a generic fallback.

## How It Works

1. **With RAG Source**: The agent queries your PDF to extract:
   - Attribute names (e.g., strength, dexterity, charisma)
   - Dice method (4d6dl1, 3d6, direct assignment, etc.)
   - System name (D&D 5e, CASE File, custom system)

2. **Without RAG Source**: Uses a generic fallback with 3 attributes

## Supported Systems

### D&D 5e
- Attributes: strength, dexterity, constitution, intelligence, wisdom, charisma
- Dice method: 4d6 drop lowest (default)
- Modifier calculation: (score - 10) / 2

### CASE File
- Attributes: CHARISMA, AGILITY, STRENGTH, EDUCATION
- Dice method: direct assignment (1-4 scale)
- No modifier calculation

### Generic System
- Attributes: Attribute 1, Attribute 2, Attribute 3
- Dice method: 4d6 drop lowest
- Modifier calculation: (score - 10) / 2

## Character Sheet Output

The character sheet will now display the correct attribute names for your system:

```
# 🎲 Character Sheet

## Human Fighter
**Background:** Soldier

### D&D 5e Attributes
- **strength:** 16 (+3)
- **dexterity:** 14 (+2)
- **constitution:** 15 (+2)
- **intelligence:** 10 (+0)
- **wisdom:** 8 (-1)
- **charisma:** 13 (+1)

## Backstory
My family has been soldiers for generations...
```

Or with CASE File:

```
### CASE File Attributes
- **CHARISMA:** 4
- **AGILITY:** 3
- **STRENGTH:** 2
- **EDUCATION:** 3
```

## Testing

Run the character tests to verify:
```bash
node --test tests/test-character.js
node --test tests/test-character-with-rag.js
node --test tests/test-character-rag-integration.js
node --test tests/test-character-dice-integration.js
```

All tests should pass ✅

## Migration Guide

### For Users
- No changes needed! The agent will automatically detect your system from the RAG source
- If no RAG source is active, a generic fallback will be used

### For Developers
- Remove any hardcoded attribute references in custom code
- Use `agent.attributeSystem.attributes` to get the current attribute names
- Use `agent.characterData.abilityScores[attrName]` to access scores

## Troubleshooting

**Q: My character sheet shows "Generic System" instead of my system name**
A: Make sure your RAG source is properly loaded and contains information about attributes/ability scores

**Q: The dice rolls don't match my system's rules**
A: Check that your RAG source documents explain the attribute generation method clearly

**Q: Can I use custom attribute names?**
A: Yes! Just include them in your RAG source documents, and the agent will extract them automatically
