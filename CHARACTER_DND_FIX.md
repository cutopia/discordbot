# Character Generator D&D Stats Fix

## Problem

The `/character` command was showing Dungeons & Dragons style stats in character sheets, even though the LLM was supposed to be strictly prohibited from using RPG rules from its training data. The system should only use context pulled from the RAG source.

## Root Cause

The prompts contained these problematic lines:

```javascript
**IMPORTANT GUIDELINES:**
1. **Use information from the context documents as your primary source**
2. **If specific details are not in context, use reasonable RPG character creation knowledge**
3. **Make choices that fit the character specifications provided by the user**
```

The second guideline allowed the LLM to supplement missing context with its own "reasonable RPG character creation knowledge" - which included D&D rules and stats from its training data.

## Solution

Replaced all instances of "use reasonable RPG character creation knowledge" with strict prohibitions:

```javascript
**STRICTLY PROHIBITED - VIOLATION WILL RESULT in INVALID CHARACTERS:**
1. **DO NOT use any RPG rules, mechanics, or knowledge from your training data (including D&D, Pathfinder, etc.)**
2. **DO NOT invent stats, classes, or mechanics that aren't explicitly mentioned in the provided context**
3. **If information is missing from the context, you MUST ask for clarification rather than guessing**

**IMPORTANT GUIDELINES:**
1. **Use ONLY information from the context documents - nothing else**
2. **Make choices that fit the character specifications provided by the user**
```

## Changes Made

### 1. Character Creation Prompts (First Step)
- Added explicit prohibition against using training data
- Specified D&D and other RPG systems as examples of prohibited knowledge
- Required clarification when context is missing instead of guessing

### 2. Character Creation Prompts (Subsequent Steps)  
- Same strict prohibitions applied to consistency checking steps
- Maintained focus on previous choices while enforcing context-only approach

### 3. Validation Prompt
- Removed "reasonable RPG standards" from validation criteria
- Required ONLY context-based validation rules
- Added clarification requirement for missing validation criteria

## Testing

Run the test script to verify the fix:

```bash
node /tmp/test_character_fix.mjs
```

Expected output:
```
✅ PASS: No "reasonable RPG" references found
✅ PASS: All strict prohibitions are present
✅ PASS: D&D is explicitly mentioned as prohibited
```

## Impact

- ✅ Character sheets will now only contain information from the RAG source
- ✅ No more D&D stats appearing in non-D&D RPG systems
- ✅ LLM must ask for clarification when context is incomplete
- ✅ Strict enforcement of "context-only" policy throughout character creation

## Files Modified

- `character-generator.js` - All prompts now contain strict prohibitions against using training data
