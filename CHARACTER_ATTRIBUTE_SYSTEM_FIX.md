# Character Attribute System Fix

## Problem

The `/character` command was implemented with hardcoded D&D-style statistics (strength, dexterity, constitution, intelligence, wisdom, charisma). This prevented it from working with other RPG systems that use different attribute systems.

## Solution

The character generation agent now:

1. **Removes hardcoded ability scores** - The `abilityScores` object is initialized as empty instead of being pre-filled with D&D attributes
2. **Extracts attribute system from RAG context** - When a RAG source is provided, the agent queries the PDF to determine what attribute/ability score system it uses
3. **Uses generic fallback for no RAG** - If no RAG source is available, it uses a minimal generic system with 3 attributes that can work with any dice method

## Key Changes

### character-agent.js

1. **Constructor**: Changed `abilityScores` from hardcoded D&D attributes to empty object
   ```javascript
   // Before:
   abilityScores: {
     strength: null,
     dexterity: null,
     constitution: null,
     intelligence: null,
     wisdom: null,
     charisma: null
   }
   
   // After:
   abilityScores: {} // Will be populated from RAG context or defaults
   ```

2. **Attribute System Extraction**: Added `extractAttributeSystem()` method that:
   - Queries the RAG source for attribute names
   - Determines the dice method (4d6dl1, 3d6, direct assignment, etc.)
   - Returns a structured object with name, attributes array, and dice method

3. **Initialize Method**: Now properly handles attribute system extraction before populating ability scores:
   ```javascript
   // Extracts attribute system from RAG context
   const attributeSystem = await this.extractAttributeSystem(sourceName);
   
   if (attributeSystem && attributeSystem.attributes.length > 0) {
     // Initialize with extracted attributes
     for (const attr of attributeSystem.attributes) {
       this.characterData.abilityScores[attr] = null;
     }
   } else {
     // Fallback to generic system
     this.attributeSystem = {
       name: 'Generic System',
       attributes: ['Attribute 1', 'Attribute 2', 'Attribute 3'],
       diceMethod: '4d6dl1'
     };
   }
   ```

4. **Calculate Ability Scores**: Simplified to use the extracted attribute system directly
5. **Validate Character**: Updated to handle different attribute systems (CASE File, direct assignment, generic)
6. **Format Character Sheet**: Now displays the correct attribute system name

## Benefits

1. **Works with any RPG system** - Can now work with D&D 5e, Pathfinder, CASE File, or custom systems
2. **No hardcoded assumptions** - The agent adapts to whatever attribute system is in the RAG source
3. **Backward compatible** - Falls back to generic system when no RAG context available
4. **Flexible dice methods** - Supports 4d6dl1, 3d6, direct assignment (1-4 scale), point buy, etc.

## Testing

All tests have been updated to work with the new attribute system:

- `test-character.js` - Updated to expect empty ability scores initially
- `test-character-with-rag.js` - Updated dice roll count expectations
- `test-character-rag-integration.js` - Updated dice roll validation
- `test-character-dice-integration.js` - Updated to use generic attribute names

## Example Attribute Systems

The agent can now handle:

1. **D&D 5e**: strength, dexterity, constitution, intelligence, wisdom, charisma (4d6dl1)
2. **CASE File**: charisma, agility, strength, education (1-4 direct assignment)
3. **Pathfinder**: same as D&D but with different rules
4. **Custom systems**: Any attribute names and dice methods supported

## Migration Notes

If you have existing RAG sources:

1. The agent will automatically detect the attribute system from your PDF
2. No changes needed to existing PDF files
3. Character sheets will display the correct attribute names for your system
