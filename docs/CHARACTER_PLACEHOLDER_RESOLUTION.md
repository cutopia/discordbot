# Character Placeholder Resolution System

## Overview

This document describes the comprehensive system for resolving placeholders in RPG character sheets by consulting the RAG (Retrieval-Augmented Generation) source. The system ensures that each placeholder is resolved using specific, targeted queries to the RPG rulebook.

## Problem Statement

The previous implementation had several issues:

1. **Generic Placeholder Resolution**: All placeholders were treated the same way, without considering their type or required context
2. **Insufficient RAG Consultation**: The `refineCharacter` method only queried for "specific guidance" without targeting the exact information needed
3. **No Character Sheet Structure Extraction**: No systematic approach to understanding what sections and fields should be in a character sheet
4. **Missing Placeholder Type Classification**: Different placeholders require different types of RAG queries

## Solution Architecture

### 1. Placeholder Types

The system classifies placeholders into the following categories:

| Type | Pattern | Resolution Method |
|------|---------|-------------------|
| `NAME` | `[PLACEHOLDER: name]`, `[MISSING: character_name]` | Query for naming conventions, cultural naming patterns |
| `ATTRIBUTE` | `[PLACEHOLDER: strength]`, `[MISSING: attribute_name]` | Query for attribute system, creation methods, ranges |
| `SKILL` | `[PLACEHOLDER: skill_name]`, `[UNKNOWN: skill_level]` | Query for skill list, advancement rules, modifiers |
| `ABILITY` | `[PLACEHOLDER: ability_name]`, `[MISSING: ability_description]` | Query for ability mechanics, activation rules, costs |
| `BACKSTORY` | `[PLACEHOLDER: background]`, `[UNKNOWN: origin]` | Query for cultural backgrounds, character origins, motivations |
| `EQUIPMENT` | `[PLACEHOLDER: equipment_item]`, `[MISSING: gear]` | Query for available equipment, starting packages, pricing |
| `PROFICIENCY` | `[PLACEHOLDER: proficiency_name]` | Query for proficiency system, categories, levels |
| `FEATURE` | `[PLACEHOLDER: feature_name]`, `[UNKNOWN: feature_description]` | Query for class/feature mechanics, progression rules |

### 2. Character Sheet Structure Extraction

The system first extracts the expected character sheet structure from the RAG source:

```javascript
async extractCharacterSheetStructure() {
  const query = `What is the complete structure of a character sheet in this RPG system?
  
Include all sections, subsections, and required fields. For each section, list:
1. Section name
2. Required fields within that section
3. Optional fields
4. Any special formatting or rules for that section
  
Format your response as a structured outline that can be used to validate character sheets.`;
  
  const docs = await queryVectorStore(this.ragSource, query, 5);
  return this.formatStructureResponse(docs);
}
```

### 3. Targeted RAG Queries by Placeholder Type

Each placeholder type has dedicated RAG queries:

#### NAME Placeholders
```javascript
async resolveNamePlaceholder() {
  const queries = [
    'What are the naming conventions for characters in this RPG system?',
    'Are there cultural or regional naming patterns?',
    'Should character names follow any specific format or style?'
  ];
  
  return await this.queryAndResolve(queries, 'name');
}
```

#### ATTRIBUTE Placeholders
```javascript
async resolveAttributePlaceholder(attributeName) {
  const queries = [
    `What is the attribute system in this RPG? Specifically regarding ${attributeName}.`,
    'How are attributes created or determined?',
    'What are the typical ranges for attribute values?',
    'Are there any special rules for this attribute?'
  ];
  
  return await this.queryAndResolve(queries, 'attribute');
}
```

#### SKILL Placeholders
```javascript
async resolveSkillPlaceholder(skillName) {
  const queries = [
    `What is the skill system in this RPG? Specifically regarding ${skillName}.`,
    'How are skills ranked or leveled up?',
    'Are there any prerequisites for this skill?',
    'What modifiers affect this skill?'
  ];
  
  return await this.queryAndResolve(queries, 'skill');
}
```

### 4. Placeholder Resolver Class

```javascript
export class PlaceholderResolver {
  constructor(ragSource, vectorStores) {
    this.ragSource = ragSource;
    this.vectorStores = vectorStores;
    this.placeholderTypes = ['NAME', 'ATTRIBUTE', 'SKILL', 'ABILITY', 
                            'BACKSTORY', 'EQUIPMENT', 'PROFICIENCY', 'FEATURE'];
  }

  /**
   * Classify a placeholder into its type
   */
  classifyPlaceholder(placeholderText) {
    const lowerText = placeholderText.toLowerCase();
    
    if (lowerText.includes('name') || lowerText.includes('character')) {
      return 'NAME';
    } else if (lowerText.includes('attribute') || lowerText.includes('stat') || 
               lowerText.includes('ability_score')) {
      return 'ATTRIBUTE';
    } else if (lowerText.includes('skill')) {
      return 'SKILL';
    } else if (lowerText.includes('ability') || lowerText.includes('power')) {
      return 'ABILITY';
    } else if (lowerText.includes('background') || lowerText.includes('backstory') ||
               lowerText.includes('origin') || lowerText.includes('motivation')) {
      return 'BACKSTORY';
    } else if (lowerText.includes('equipment') || lowerText.includes('gear') ||
               lowerText.includes('item') || lowerText.includes('inventory')) {
      return 'EQUIPMENT';
    } else if (lowerText.includes('proficiency') || lowerText.includes('prof')) {
      return 'PROFICIENCY';
    } else if (lowerText.includes('feature') || lowerText.includes('ability')) {
      return 'FEATURE';
    }
    
    return 'UNKNOWN'; // Default fallback
  }

  /**
   * Generate targeted RAG queries for a placeholder
   */
  generateQueries(placeholderType, placeholderContext) {
    const baseQueries = this.getBaseQueries(placeholderType);
    
    // Add context-specific queries if available
    if (placeholderContext && placeholderContext.fieldName) {
      return baseQueries.map(query => 
        query.replace('{fieldName}', placeholderContext.fieldName)
      );
    }
    
    return baseQueries;
  }

  /**
   * Get base queries for a placeholder type
   */
  getBaseQueries(placeholderType) {
    const queries = {
      NAME: [
        'What are the naming conventions for characters in this RPG system?',
        'Are there cultural or regional naming patterns?',
        'Should character names follow any specific format or style?'
      ],
      ATTRIBUTE: [
        'What is the attribute system in this RPG?',
        'How are attributes created or determined?',
        'What are the typical ranges for attribute values?',
        'Are there any special rules for attribute creation?'
      ],
      SKILL: [
        'What is the skill system in this RPG?',
        'How are skills ranked or leveled up?',
        'Are there any prerequisites for skills?',
        'What modifiers affect skills?'
      ],
      // ... other types
    };
    
    return queries[placeholderType] || [];
  }

  /**
   * Query RAG and resolve a placeholder
   */
  async queryAndResolve(queries, placeholderType) {
    const allResults = [];
    
    for (const query of queries) {
      try {
        const docs = await queryVectorStore(this.ragSource, query, 3);
        
        if (docs.length > 0) {
          // Extract relevant information
          const content = docs.map(doc => doc.pageContent).join('\n---\n');
          allResults.push(content);
        }
      } catch (error) {
        console.error(`Error querying RAG for ${placeholderType}:`, error.message);
      }
    }
    
    return allResults.length > 0 
      ? allResults.join('\n\n')
      : 'No relevant information found in the rulebook.';
  }

  /**
   * Resolve a single placeholder
   */
  async resolvePlaceholder(placeholderText, placeholderContext = {}) {
    const placeholderType = this.classifyPlaceholder(placeholderText);
    const queries = this.generateQueries(placeholderType, placeholderContext);
    
    console.log(`Resolving ${placeholderType} placeholder: ${placeholderText}`);
    
    const resolvedContent = await this.queryAndResolve(queries, placeholderType);
    
    return {
      original: placeholderText,
      resolved: resolvedContent,
      type: placeholderType,
      queriesUsed: queries
    };
  }

  /**
   * Resolve all placeholders in a character sheet
   */
  async resolveAllPlaceholders(characterSheet) {
    const results = [];
    
    for (const placeholder of characterSheet.placeholders) {
      const result = await this.resolvePlaceholder(placeholder.text, {
        fieldName: placeholder.fieldName || null,
        section: placeholder.section || null
      });
      
      results.push(result);
    }
    
    return results;
  }
}
```

### 5. Updated refineCharacter Method

```javascript
async refineCharacter() {
  if (this.characterSheet.placeholders.length === 0) {
    return {
      success: true,
      message: 'No placeholders to fill.',
      completed: true
    };
  }

  // Initialize the placeholder resolver
  const resolver = new PlaceholderResolver(this.ragSource, vectorStores);
  
  // Get all placeholders that need resolution
  const unresolvedPlaceholders = this.characterSheet.placeholders.filter(
    p => !p.resolved
  );
  
  if (unresolvedPlaceholders.length === 0) {
    return {
      success: true,
      message: 'All placeholders have been resolved.',
      completed: true
    };
  }

  // Process each placeholder with targeted RAG queries
  const resolvedContent = await resolver.resolveAllPlaceholders({
    placeholders: unresolvedPlaceholders
  });

  // Update character sheet with resolved content
  let updatedSheet = this.characterSheet.rawContent;
  
  for (const result of resolvedContent) {
    if (result.resolved && result.resolved !== 'No relevant information found in the rulebook.') {
      // Replace placeholder with resolved content
      updatedSheet = updatedSheet.replace(
        result.original,
        result.resolved
      );
      
      // Mark as resolved
      const placeholderIndex = this.characterSheet.placeholders.findIndex(
        p => p.text === result.original
      );
      
      if (placeholderIndex !== -1) {
        this.characterSheet.placeholders[placeholderIndex].resolved = true;
        this.characterSheet.placeholders[placeholderIndex].resolutionMethod = result.type;
        this.characterSheet.placeholders[placeholderIndex].resolvedContent = result.resolved;
      }
    }
  }

  this.characterSheet.rawContent = updatedSheet;

  return {
    success: true,
    message: `Resolved ${resolvedContent.length} placeholder(s).`,
    remainingPlaceholders: unresolvedPlaceholders.filter(p => !p.resolved).length
  };
}
```

## Implementation Steps

### Phase 1: Extract Character Sheet Structure
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
  
  // Parse and structure the response
  return this.parseCharacterSheetStructure(docs);
}
```

### Phase 2: Classify Placeholders by Type
```javascript
classifyPlaceholder(placeholderText) {
  const lowerText = placeholderText.toLowerCase();
  
  if (lowerText.includes('name') || lowerText.includes('character')) {
    return 'NAME';
  } else if (lowerText.includes('attribute') || lowerText.includes('stat')) {
    return 'ATTRIBUTE';
  } else if (lowerText.includes('skill')) {
    return 'SKILL';
  } else if (lowerText.includes('ability') || lowerText.includes('power')) {
    return 'ABILITY';
  } else if (lowerText.includes('background') || lowerText.includes('backstory')) {
    return 'BACKSTORY';
  } else if (lowerText.includes('equipment') || lowerText.includes('gear')) {
    return 'EQUIPMENT';
  }
  
  return 'UNKNOWN';
}
```

### Phase 3: Generate Targeted Queries
```javascript
generateQueries(placeholderType, placeholderContext) {
  const baseQueries = this.getBaseQueries(placeholderType);
  
  // Add context-specific queries if available
  if (placeholderContext && placeholderContext.fieldName) {
    return baseQueries.map(query => 
      query.replace('{fieldName}', placeholderContext.fieldName)
    );
  }
  
  return baseQueries;
}
```

### Phase 4: Query RAG and Resolve
```javascript
async resolvePlaceholder(placeholderText, placeholderContext = {}) {
  const placeholderType = this.classifyPlaceholder(placeholderText);
  const queries = this.generateQueries(placeholderType, placeholderContext);
  
  console.log(`Resolving ${placeholderType} placeholder: ${placeholderText}`);
  
  const allResults = [];
  
  for (const query of queries) {
    try {
      const docs = await queryVectorStore(this.ragSource, query, 3);
      
      if (docs.length > 0) {
        const content = docs.map(doc => doc.pageContent).join('\n---\n');
        allResults.push(content);
      }
    } catch (error) {
      console.error(`Error querying RAG for ${placeholderType}:`, error.message);
    }
  }
  
  return allResults.length > 0 
    ? allResults.join('\n\n')
    : 'No relevant information found in the rulebook.';
}
```

## Testing Strategy

### Test Cases

1. **Placeholder Classification**
   - Verify NAME placeholders are classified correctly
   - Verify ATTRIBUTE placeholders are classified correctly
   - Verify SKILL placeholders are classified correctly
   - Handle UNKNOWN placeholder types gracefully

2. **Targeted Query Generation**
   - Generate appropriate queries for each placeholder type
   - Include context-specific queries when field names are available
   - Ensure query diversity for comprehensive RAG coverage

3. **RAG Consultation Quality**
   - Verify RAG queries return relevant information
   - Check that resolved placeholders match RPG system rules
   - Validate that no D&D/Pathfinder elements leak in

4. **End-to-End Resolution**
   - Test complete character sheet resolution
   - Verify all placeholder types are handled
   - Confirm final character sheet is consistent and valid

## Benefits of This System

1. **Systematic Approach**: Each placeholder type has dedicated resolution logic
2. **Targeted Queries**: More effective RAG queries lead to better results
3. **Extensible Design**: Easy to add new placeholder types or modify existing ones
4. **Traceability**: Track which method was used to resolve each placeholder
5. **Quality Assurance**: Better validation and error handling

## Future Enhancements

1. Add confidence scoring for resolved placeholders
2. Implement fallback resolution methods when RAG fails
3. Add user confirmation for creative elements (names, backstory)
4. Support multi-step placeholder resolution (e.g., attributes → modifiers → skills)
5. Integrate with dice system for randomized choices
