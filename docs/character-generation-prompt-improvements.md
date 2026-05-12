# Character Generation Prompt Structure Improvements

## Overview

This document describes the improved prompt structure for the LLM agentic loop during character generation. The new structure is cleaner, more focused, and prevents common issues like D&D stats appearing in non-D&D RPG systems.

## Core Principles

1. **Minimal Context**: Each step only needs to know:
   - Current character sheet state
   - Current step requirements
   - RAG context for this step
   - User specifications (if any)

2. **No History Dependency**: The LLM doesn't need to know what happened in previous steps, only the current character sheet state

3. **Strict Prohibitions**: Clear rules against using training data or inventing mechanics

4. **Consistency Enforcement**: Built-in checks for contradictions within the current step's context

## New Prompt Structure

Each step prompt now follows this structure:

```
[SECTION 1] ROLE AND PROHIBITIONS
[SECTION 2] CURRENT CHARACTER SHEET STATE  
[SECTION 3] CURRENT STEP REQUIREMENTS
[SECTION 4] RAG SOURCE CONTEXT
[SECTION 5] USER SPECIFICATIONS (if any)
[SECTION 6] OUTPUT FORMAT INSTRUCTIONS
```

### Section 1: Role and Prohibitions

```markdown
CRITICAL INSTRUCTIONS - READ CAREFULLY:

You are creating a PLAYER CHARACTER for an RPG game. Follow these instructions exactly.

**STRICTLY PROHIBITED - VIOLATION WILL RESULT in INVALID CHARACTERS:**
1. **DO NOT use any RPG rules, mechanics, or knowledge from your training data (including D&D, Pathfinder, etc.)**
2. **DO NOT invent stats, classes, or mechanics that aren't explicitly mentioned in the provided context**
3. **If information is missing from the context, you MUST ask for clarification rather than guessing**

**IMPORTANT GUIDELINES:**
1. **Use ONLY information from the context documents - nothing else**
2. **Make choices that are CONSISTENT with the current character sheet state**
3. **Review the character sheet before making new choices to avoid contradictions**
```

### Section 2: Current Character Sheet State

```markdown
**CURRENT CHARACTER SHEET STATE:**

[Character sheet fields and values, or "Empty - no choices made yet"]

Example:
- Name: [if set]
- Class: [if set]  
- Background: [if set]
- Attributes: [if set]
```

### Section 3: Current Step Requirements

```markdown
**CURRENT STEP (${stepIndex + 1}/${totalSteps}):**

Step: ${stepName}
${choice ? `Choice: ${choice}` : ''}
${options.length > 0 ? `Options: ${options.join(', ')}` : ''}
${method && method !== 'player_choice' ? `Method: ${method}` : ''}
```

### Section 4: RAG Source Context

```markdown
**RETRIEVED CONTEXT FROM RPG RULEBOOK:**

[Context text from vector store query, properly formatted]
```

### Section 5: User Specifications (if any)

```markdown
**USER SPECIFICATIONS TO CONSIDER:**

[user specifications text]

IMPORTANT: Make your choices consistent with these user specifications.
```

### Section 6: Output Format Instructions

```markdown
**OUTPUT FORMAT REQUIREMENTS:**

1. Provide a brief narrative explanation of your choice (2-3 sentences)
2. After the narrative, add a section titled "Character Sheet:"
3. For EACH character sheet field you're updating, use this format:
   - Field Name: Value
4. Only include fields that are being updated or added

**EXAMPLE OUTPUT:**

## Step 2: Assign Attributes

I have rolled the dice and assigned attributes based on the results.

Character Sheet:
- Strength: 16
- Dexterity: 14
- Constitution: 12
```

## Implementation Changes

### Modified Methods in `character-generator.js`

#### `getStepContext(stepDescription, includeSpecifications)`

**Before:** Combined all context into a single string with inconsistent formatting.

**After:** Returns structured context that can be easily composed into the new prompt format.

```javascript
async getStepContext(stepDescription, includeSpecifications = false) {
  // Query RAG source for step-specific context
  const docs = await queryVectorStore(this.ragSource, query, 5);
  
  return {
    ragContext: docs.map(d => d.content).join("\n\n---\n\n"),
    stepDetails: structuredStep,
    specifications: includeSpecifications ? this.specifications : null
  };
}
```

#### `executeStep(stepIndex, retryCount)`

**Before:** Built prompts with inconsistent sections and redundant information.

**After:** Uses the new structured context to build clean, focused prompts:

```javascript
async executeStep(stepIndex, retryCount = 0) {
  const stepContext = await this.getStepContext(step, true);
  
  // Build prompt from structured components
  let executionPrompt = `
${this.buildProhibitionSection()}
${this.buildCharacterSheetSection()}
${this.buildCurrentStepSection(stepContext.stepDetails)}
${this.buildRagContextSection(stepContext.ragContext)}
${stepContext.specifications ? this.buildSpecificationsSection(stepContext.specifications) : ''}
${this.buildOutputFormatSection()}
`;
  
  // Execute with LLM...
}
```

### New Helper Methods

#### `buildProhibitionSection()`

Returns the strict prohibitions section.

```javascript
buildProhibitionSection() {
  return `
CRITICAL INSTRUCTIONS - READ CAREFULLY:

You are creating a PLAYER CHARACTER for an RPG game. Follow these instructions exactly.

**STRICTLY PROHIBITED - VIOLATION WILL RESULT in INVALID CHARACTERS:**
1. **DO NOT use any RPG rules, mechanics, or knowledge from your training data (including D&D, Pathfinder, etc.)**
2. **DO NOT invent stats, classes, or mechanics that aren't explicitly mentioned in the provided context**
3. **If information is missing from the context, you MUST ask for clarification rather than guessing**

**IMPORTANT GUIDELINES:**
1. **Use ONLY information from the context documents - nothing else**
2. **Make choices that are CONSISTENT with the current character sheet state**
3. **Review the character sheet before making new choices to avoid contradictions`;
}
```

#### `buildCharacterSheetSection()`

Returns the current character sheet state.

```javascript
buildCharacterSheetSection() {
  const sheetFields = Object.entries(this.characterSheet)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');
  
  return `
**CURRENT CHARACTER SHEET STATE:**

${sheetFields || 'Empty - no choices made yet'}`;
}
```

#### `buildCurrentStepSection(stepDetails)`

Returns the current step requirements.

```javascript
buildCurrentStepSection(stepDetails) {
  const { stepName, choice, options, method } = stepDetails;
  
  return `
**CURRENT STEP (${this.currentStepIndex + 1}/${this.steps.length}):**

Step: ${stepName}
${choice ? `Choice: ${choice}` : ''}
${options.length > 0 ? `Options: ${options.join(', ')}` : ''}
${method && method !== 'player_choice' ? `Method: ${method}` : ''}`;
}
```

#### `buildRagContextSection(ragContext)`

Returns the RAG source context.

```javascript
buildRagContextSection(ragContext) {
  return `
**RETRIEVED CONTEXT FROM RPG RULEBOOK:**

${ragContext}`;
}
```

#### `buildSpecificationsSection(specifications)`

Returns user specifications if provided.

```javascript
buildSpecificationsSection(specifications) {
  return `
**USER SPECIFICATIONS TO CONSIDER:**

${specifications}

IMPORTANT: Make your choices consistent with these user specifications.`;
}
```

#### `buildOutputFormatSection()`

Returns output format instructions.

```javascript
buildOutputFormatSection() {
  return `
**OUTPUT FORMAT REQUIREMENTS:**

1. Provide a brief narrative explanation of your choice (2-3 sentences)
2. After the narrative, add a section titled "Character Sheet:"
3. For EACH character sheet field you're updating, use this format:
   - Field Name: Value
4. Only include fields that are being updated or added

**EXAMPLE OUTPUT:**

## Step ${this.currentStepIndex + 1}: [Step Name]

[Your narrative explanation here]

Character Sheet:
- Field1: value1
- Field2: value2`;
}
```

## Benefits of the New Structure

### 1. **Cleaner Prompts**
- Each section has a clear purpose and is easy to understand
- No redundant information or overlapping sections
- Consistent formatting across all steps

### 2. **Better Focus**
- LLM only sees what it needs for the current step
- Reduced cognitive load leads to better decision-making
- Less chance of confusion from historical context

### 3. **Improved Consistency**
- Current character sheet state is always visible
- Explicit consistency check instructions
- No need to parse through previous choices history

### 4. **Easier Maintenance**
- Each section can be modified independently
- Clear separation of concerns
- Easier to test individual components

## Migration Guide

### For Existing Code

1. Replace the old `getStepContext()` method with the new structured version
2. Update `executeStep()` to use the new helper methods for building prompts
3. Remove any code that builds previous choices history (no longer needed)
4. Update validation logic to work with the new prompt structure

### Testing Checklist

- [ ] First step prompt contains all required sections
- [ ] Subsequent steps show current character sheet state
- [ ] No D&D or training data references in prohibitions section
- [ ] RAG context is properly formatted and accessible
- [ ] User specifications appear when provided
- [ ] Output format instructions are clear and consistent

## Future Enhancements

Potential improvements to consider:

1. **Confidence Scoring**: Have the LLM rate its confidence in each choice
2. **Choice Revisions**: Allow automatic revision of inconsistent choices
3. **Step-Specific Prohibitions**: Add prohibitions specific to each step type
4. **Validation Integration**: Integrate validation directly into the prompt

## Related Documentation

- `CHARACTER_DND_FIX.md` - Original D&D stats fix
- `CHARACTER_GENERATION_FIXES.md` - Previous consistency improvements
- `AGENTS.md` - Project structure and guidelines
