# Placeholder Resolution Guide

## Overview

This guide explains how the character generator resolves placeholders using targeted RAG (Retrieval-Augmented Generation) queries to the RPG rulebook. Each placeholder type has dedicated resolution logic that consults the appropriate sections of the rulebook.

## Placeholder Types and Their Resolution Methods

### 1. NAME Placeholders

**Pattern**: `[PLACEHOLDER: name]`, `[MISSING: character_name]`

**Resolution Method**:
- Query for naming conventions in the RPG system
- Look for cultural or regional naming patterns
- Find examples of proper name formats

**Example Queries**:
```
What are the naming conventions for characters in this RPG system?
Are there cultural or regional naming patterns?
Should character names follow any specific format or style?
```

**Expected Resolution**:
- System-appropriate names (e.g., "Kaelen" for a fantasy setting)
- Cultural naming patterns (e.g., "Smith, John" for modern settings)
- Format guidelines (e.g., "First Name Last Name")

### 2. ATTRIBUTE Placeholders

**Pattern**: `[PLACEHOLDER: strength]`, `[MISSING: attribute_name]`

**Resolution Method**:
- Query the attribute system in the RPG
- Find creation methods and typical ranges
- Identify special rules for attribute determination

**Example Queries**:
```
How are attributes created or determined in this RPG system?
What are the typical ranges for attribute values?
Are there any special rules for attribute creation?
What methods can be used to determine attribute scores?
```

**Expected Resolution**:
- Attribute names from the rulebook (e.g., "Might", "Agility")
- Creation method (e.g., "Point buy: 10 points distributed among attributes")
- Value ranges (e.g., "1-20" or "1d6+3")

### 3. SKILL Placeholders

**Pattern**: `[PLACEHOLDER: skill_name]`, `[UNKNOWN: skill_level]`

**Resolution Method**:
- Query the skill system in the RPG
- Find skill list and advancement rules
- Identify modifiers and prerequisites

**Example Queries**:
```
What is the skill system in this RPG?
How are skills ranked or leveled up?
Are there any prerequisites for skills?
What modifiers affect skills?
```

**Expected Resolution**:
- Skill names from the rulebook (e.g., "Stealth", "Persuasion")
- Skill levels or ranks
- Modifier rules (e.g., "Skill rank + attribute modifier")

### 4. ABILITY Placeholders

**Pattern**: `[PLACEHOLDER: ability_name]`, `[UNKNOWN: ability_description]`

**Resolution Method**:
- Query for abilities or special features in the RPG
- Find how abilities work and their effects
- Identify limitations or costs

**Example Queries**:
```
What abilities or special features exist in this RPG system?
How do abilities work and what are their effects?
Are there any limitations or costs associated with abilities?
How are abilities selected or acquired?
```

**Expected Resolution**:
- Ability names from the rulebook
- Effect descriptions
- Usage limits (e.g., "Once per day")
- Activation requirements

### 5. BACKSTORY Placeholders

**Pattern**: `[PLACEHOLDER: background]`, `[UNKNOWN: origin]`

**Resolution Method**:
- Query for background options in the RPG
- Find how background affects character creation
- Identify cultural or regional backgrounds

**Example Queries**:
```
What background options are available for characters?
How does background affect character creation?
Are there cultural or regional backgrounds in this setting?
What motivations and personality traits should characters have?
```

**Expected Resolution**:
- Background names (e.g., "Noble", "Soldier")
- Background benefits
- Cultural origins
- Personality trait suggestions

### 6. EQUIPMENT Placeholders

**Pattern**: `[PLACEHOLDER: equipment_item]`, `[MISSING: gear]`

**Resolution Method**:
- Query for available equipment in the RPG
- Find starting equipment packages
- Identify costs and weights

**Example Queries**:
```
What equipment is available in this RPG system?
Are there starting equipment packages?
How is equipment purchased or acquired?
What are the costs and weights of common items?
```

**Expected Resolution**:
- Equipment names from the rulebook
- Starting packages (e.g., "Adventurer's Kit")
- Cost information
- Weight information

### 7. PROFICIENCY Placeholders

**Pattern**: `[PLACEHOLDER: proficiency_name]`

**Resolution Method**:
- Query for the proficiency system in the RPG
- Find how characters gain proficiencies
- Identify different levels or ranks

**Example Queries**:
```
What is the proficiency system in this RPG?
How do characters gain proficiencies?
Are there different levels or ranks of proficiency?
What modifiers affect proficiency checks?
```

**Expected Resolution**:
- Proficiency names from the rulebook
- Proficiency levels (e.g., "Novice", "Expert")
- Modifier rules

### 8. FEATURE Placeholders

**Pattern**: `[PLACEHOLDER: feature_name]`, `[UNKNOWN: feature_description]`

**Resolution Method**:
- Query for features available to characters
- Find how features are selected or acquired
- Identify restrictions on feature selection

**Example Queries**:
```
What features are available to characters in this RPG?
How are features selected or acquired?
Are there any restrictions on feature selection?
How do features interact with other character elements?
```

**Expected Resolution**:
- Feature names from the rulebook
- Feature descriptions
- Selection rules
- Interaction guidelines

## Character Sheet Structure Extraction

Before resolving placeholders, the system extracts the expected character sheet structure:

```javascript
async extractCharacterSheetStructure() {
  const query = `What is the complete structure of a character sheet in this RPG system?

Include all sections, subsections, and required fields. For each section, list:
1. Section name
2. Required fields within that section
3. Optional fields
4. Any special formatting or rules for that section

Format your response as a structured outline.`;

  const docs = await queryVectorStore(this.ragSource, query, 5);
  
  if (docs.length === 0) {
    return null;
  }
  
  const content = docs.map(doc => doc.pageContent || doc.content || '').join('\n\n');
  this.characterSheetStructure = content;
  
  return content;
}
```

## Placeholder Resolution Workflow

### Step 1: Classification
```javascript
classifyPlaceholder(placeholderText) {
  const lowerText = placeholderText.toLowerCase();
  
  if (lowerText.includes('name') || lowerText.includes('character')) {
    return 'NAME';
  } else if (lowerText.includes('attribute') || lowerText.includes('stat')) {
    return 'ATTRIBUTE';
  } else if (lowerText.includes('skill')) {
    return 'SKILL';
  }
  // ... other types
  
  return 'UNKNOWN';
}
```

### Step 2: Query Generation
```javascript
generateQueries(placeholderType, placeholderContext) {
  const baseQueries = this.getBaseQueries(placeholderType);
  
  if (placeholderContext && placeholderContext.fieldName) {
    return baseQueries.map(query => 
      query.replace('{fieldName}', placeholderContext.fieldName)
    );
  }
  
  return baseQueries;
}
```

### Step 3: RAG Consultation
```javascript
async resolvePlaceholder(placeholderText, placeholderContext = {}) {
  const placeholderType = this.classifyPlaceholder(placeholderText);
  const queries = this.generateQueries(placeholderType, placeholderContext);
  
  const allResults = [];
  
  for (const query of queries) {
    try {
      const docs = await queryVectorStore(this.ragSource, query, 3);
      
      if (docs.length > 0) {
        const content = docs.map(doc => doc.pageContent || '').join('\n---\n');
        allResults.push(content);
      }
    } catch (error) {
      console.error(`Error querying RAG for ${placeholderType}:`, error.message);
    }
  }
  
  return {
    original: placeholderText,
    resolved: allResults.length > 0 
      ? allResults.join('\n\n')
      : 'No relevant information found in the rulebook.',
    type: placeholderType,
    queriesUsed: queries
  };
}
```

### Step 4: Character Sheet Update
```javascript
async refineCharacter() {
  const unresolvedPlaceholders = this.characterSheet.placeholders.filter(
    p => !p.resolved && p.text
  );
  
  if (unresolvedPlaceholders.length === 0) {
    return { success: true, message: 'All placeholders resolved.' };
  }
  
  // Resolve all placeholders systematically
  const resolvedResults = await this.placeholderResolver.resolveAllPlaceholders({
    placeholders: unresolvedPlaceholders
  });
  
  // Update character sheet with resolved content
  let updatedSheet = this.characterSheet.rawContent;
  
  for (const result of resolvedResults) {
    if (result.resolved && result.resolved !== 'No relevant information found in the rulebook.') {
      updatedSheet = updatedSheet.replace(
        result.original,
        `**Resolved:** ${result.resolved.substring(0, 100)}...`
      );
      
      // Mark as resolved
      const placeholderIndex = this.characterSheet.placeholders.findIndex(
        p => p.text === result.original
      );
      
      if (placeholderIndex !== -1) {
        this.characterSheet.placeholders[placeholderIndex].resolved = true;
        this.characterSheet.placeholders[placeholderIndex].resolutionMethod = result.type;
      }
    }
  }
  
  this.characterSheet.rawContent = updatedSheet;
  
  return {
    success: true,
    message: `Resolved ${resolvedResults.length} placeholder(s).`,
    remainingPlaceholders: unresolvedPlaceholders.filter(p => !p.resolved).length
  };
}
```

## Testing the Placeholder Resolution System

### Unit Tests
```javascript
// Test placeholder classification
const agent = new CharacterGenerationAgent('', 'test', 'test-channel');
const type = agent.placeholderResolver.classifyPlaceholder('[PLACEHOLDER: character_name]');
console.log(type); // Should output: NAME

// Test query generation
const queries = agent.placeholderResolver.generateQueries('ATTRIBUTE', { fieldName: 'strength' });
console.log(queries.length); // Should output: 4 (number of base queries)
```

### Integration Tests
```javascript
// Test with real PDF RAG source
await getOrCreateVectorStore('path/to/rpg-rulebook.pdf');

const agent = new CharacterGenerationAgent('', 'rpg-rulebook', 'test-channel');
const result = await agent.placeholderResolver.resolvePlaceholder(
  '[PLACEHOLDER: attribute_score]',
  { fieldName: 'core_attribute' }
);

console.log(result.resolved); // Should contain rulebook information
```

## Best Practices

1. **Always consult the RAG source**: Never use pre-existing knowledge from other RPG systems
2. **Use targeted queries**: Generate specific queries for each placeholder type
3. **Extract structure first**: Get character sheet structure before resolving placeholders
4. **Track resolution methods**: Keep track of how each placeholder was resolved
5. **Handle unknowns gracefully**: Provide fallback responses when RAG doesn't find information

## Troubleshooting

### Issue: Placeholders not being classified correctly
**Solution**: Check the classification logic and add more keywords if needed

### Issue: RAG queries returning no results
**Solution**: 
- Verify the PDF is properly loaded
- Increase the number of documents retrieved (k parameter)
- Use broader search terms

### Issue: Resolved content doesn't match RPG system
**Solution**:
- Review the RAG queries to ensure they're targeting the right information
- Add more specific context to placeholder resolution
- Verify the PDF contains the expected information

## Future Enhancements

1. **Confidence scoring**: Add confidence scores for resolved placeholders
2. **Fallback methods**: Implement multiple fallback resolution methods
3. **User confirmation**: Add user confirmation for creative elements
4. **Multi-step resolution**: Support complex placeholder resolution chains
5. **Dice integration**: Better integration with dice system for randomized choices
