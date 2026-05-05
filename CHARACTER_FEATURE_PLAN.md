# Character Creation Slash Command - Feature Plan

## Overview

This document outlines the implementation plan for a new `/character` slash command that creates RPG characters using the currently loaded PDF in the RAG system. The command will run as an agentic loop with step limits to prevent endless looping, use dice rolls when needed, and validate character choices against the RAG context.

## Current System State

### Existing Components
- **RAG System**: PDF-based knowledge base with vector embeddings (Ollama all-minilm model)
- **LM Studio Integration**: Local LLM API endpoint for AI responses
- **Dice Tool**: Dice notation parser and roller (e.g., "1d20+5", "2d6-3")
- **Slash Commands Framework**: Discord interaction handlers in `app.js`
- **Conversation History**: Channel-specific chat history management

### Key Files
- `commands.js` - Slash command definitions
- `app.js` - Discord interaction handler
- `rag.js` - RAG vector store and context retrieval
- `dice.js` - Dice rolling utilities
- `tools.js` - LLM-accessible tool definitions
- `chatbot.js` - Chat processing with RAG integration
- `lmstudio.js` - LM Studio API communication

## Feature Requirements

### Core Functionality
1. **Character Creation Command**: `/character [specifications]`
2. **Agentic Loop**: Multi-step character generation process with step limits
3. **RAG Integration**: Use current PDF context for world-building consistency
4. **Dice Integration**: Roll dice when rules specify random determination
5. **Validation**: Check character choices against RAG context
6. **Error Recovery**: Handle invalid choices and fix them

### User Experience
- Accept optional character specifications (race, class, background, etc.)
- Show step-by-step progress during generation
- Display dice rolls clearly with results
- Provide final character summary with all attributes
- Support iterative refinement based on user feedback

## Implementation Plan

### Phase 1: Command Definition and Infrastructure

#### 1.1 Add `/character` command to `commands.js`
```javascript
{
  name: 'character',
  description: 'Create a new RPG character using the current RAG system context',
  options: [
    {
      type: 3, // STRING
      name: 'specifications',
      description: 'Character specifications (race, class, background, etc.)',
      required: false
    }
  ]
}
```

#### 1.2 Create character generation state management
- Track active character creation sessions per channel
- Store intermediate character data during generation
- Manage step counters and loop limits

### Phase 2: Agentic Character Generation System

#### 2.1 Design the agentic loop architecture
```
CharacterGenerationAgent {
  - maxSteps: number (default: 8)
  - currentStep: number
  - characterData: object
  - ragContext: string[]
  - diceRolls: array
  
  methods:
    - initialize(specifications, ragSource)
    - generateNextStep()
    - validateCharacterChoice(choice, context)
    - useDiceRoll(notation)
    - finalizeCharacter()
}
```

#### 2.2 Implement step-based generation flow
1. **Step 1**: Determine character race (with dice if needed)
2. **Step 2**: Select class/background
3. **Step 3**: Calculate ability scores (dice rolls)
4. **Step 4**: Choose equipment
5. **Step 5**: Define personality traits
6. **Step 6**: Add backstory elements
7. **Step 7**: Review and validate against RAG context
8. **Step 8**: Finalize and present character

#### 2.3 Add step limit enforcement
- Track current step count
- Terminate loop after maxSteps (default: 8)
- Provide fallback if generation incomplete

### Phase 3: RAG Integration

#### 3.1 Context-aware character generation
- Retrieve relevant RAG context for each generation step
- Use context to guide choices (e.g., available races, cultural norms)
- Inject world-specific details into character creation

#### 3.2 Dynamic context retrieval
```javascript
async function getRagContextForStep(stepName, currentCharacterData) {
  const query = buildQueryForStep(stepName, currentCharacterData);
  return await queryVectorStore(activeRAGSource, query, k=4);
}
```

### Phase 4: Dice Integration

#### 4.1 Integrate dice tool into agent
- Use existing `processDiceRoll()` function
- Format dice results clearly for user display
- Handle dice roll errors gracefully

#### 4.2 Dice usage patterns
- **Ability scores**: Roll 4d6 drop lowest for each stat
- **Initiative**: Roll 1d20 + modifier
- **Skill checks**: Roll 1d20 + proficiency
- **Random choices**: Use dice to select from options

### Phase 5: Validation and Error Recovery

#### 5.1 Character validation system
```javascript
function validateCharacterChoice(choice, context) {
  // Check against RAG context
  // Verify consistency with existing character data
  // Validate numeric ranges (e.g., ability scores 3-18)
  // Return { valid: boolean, issues: string[] }
}
```

#### 5.2 Error recovery mechanisms
- Detect invalid choices during generation
- Suggest alternatives based on RAG context
- Allow user to override or refine choices
- Implement retry logic with different parameters

### Phase 6: User Interface and Feedback

#### 6.1 Progress reporting
- Send intermediate updates during generation
- Show dice rolls as they happen
- Display character data being built

#### 6.2 Final presentation
- Format complete character sheet
- Highlight key attributes and abilities
- Include RAG context references where applicable

## Technical Implementation Details

### New Files to Create

1. **`character-agent.js`**
   - Main agentic loop implementation
   - Step management and validation
   - Dice integration methods

2. **`character-generator.js`**
   - High-level character generation orchestration
   - RAG context integration
   - User feedback handling

3. **`tests/test-character.js`**
   - Unit tests for agent logic
   - Integration tests with RAG system
   - Dice roll validation tests

### Modified Files

1. **`commands.js`** - Add `/character` command definition
2. **`app.js`** - Handle `/character` slash command
3. **`tools.js`** - Add character generation tool (if needed)
4. **`chatbot.js`** - Integrate with conversation history

### Integration Points

#### In `app.js`
```javascript
// In the slash command handler
if (name === 'character') {
  const specifications = data.options?.[0]?.value || '';
  
  // Start character generation
  const result = await generateCharacter(
    specifications,
    req.body.channel_id
  );
  
  return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: result }
  });
}
```

#### In `character-agent.js`
```javascript
export async function generateCharacter(specifications, channelId) {
  const agent = new CharacterGenerationAgent();
  
  // Get active RAG source for this channel
  const ragSource = getRAGSource(channelId);
  
  if (!ragSource) {
    return "No RAG source loaded. Please use /rag_source first.";
  }
  
  // Initialize and run generation loop
  await agent.initialize(specifications, ragSource);
  
  while (agent.currentStep < agent.maxSteps) {
    const stepResult = await agent.generateNextStep();
    
    if (!stepResult.success) {
      return `Generation failed at step ${agent.currentStep}: ${stepResult.error}`;
    }
    
    // Send progress update
    await sendProgressUpdate(channelId, agent.getSnapshot());
  }
  
  return agent.finalizeCharacter();
}
```

## Step Limit Design

### Why Step Limits?
- Prevent infinite loops from circular reasoning
- Manage token usage and response time
- Provide predictable user experience
- Avoid overwhelming the LLM with complex multi-step tasks

### Implementation Strategy
1. **Default limit**: 8 steps (configurable)
2. **Step types**:
   - Generation steps (create character element)
   - Validation steps (check against context)
   - Dice roll steps (resolve randomness)
   - Review steps (consolidate information)

3. **Early termination conditions**:
   - All required fields filled
   - User-specified limit reached
   - Critical validation failure

## Dice Roll Integration

### Supported Notations
- `1d20` - Basic d20 roll
- `4d6dl1` - 4d6 drop lowest (for ability scores)
- `1d20+5` - With modifier
- `2d6+3` - Multiple dice with modifier

### Display Format
```
🎲 **Ability Score Roll**: 4d6dl1
   Rolls: [15, 12, 8, 6] → Dropped lowest (6)
   Sum: 15 + 12 + 8 = 35
   **Total: 35**
```

## Validation Framework

### Validation Rules
1. **Context consistency**: Character choices match RAG world rules
2. **Numeric validity**: Ability scores in valid range (3-18)
3. **Internal consistency**: Class/race combinations allowed
4. **Completeness**: All required character fields filled

### Recovery Strategies
- If choice invalid: Suggest alternatives from RAG context
- If dice roll fails: Retry with different parameters
- If generation incomplete: Fill missing fields with defaults

## Testing Strategy

### Unit Tests (`tests/test-character.js`)
1. Agent initialization and state management
2. Step limit enforcement
3. Dice roll parsing and execution
4. Validation logic for various scenarios

### Integration Tests
1. Full character generation with RAG context
2. Error recovery during generation
3. Multiple dice rolls in sequence
4. Context-aware choice validation

## Future Enhancements

1. **Character sheet export**: PDF or markdown format
2. **Stat block generation**: For combat-ready characters
3. **Multiple character creation**: Party generation
4. **Import/export**: Save/load character data
5. **Advanced validation**: Rulebook compliance checking
6. **Visual character sheets**: Rich Discord embeds

## Success Metrics

- ✅ Character generation completes within step limit (≤8 steps)
- ✅ Dice rolls work correctly and display clearly
- ✅ RAG context integration provides world-consistent characters
- ✅ Validation catches and fixes invalid choices
- ✅ User receives clear feedback throughout process
- ✅ No infinite loops or token exhaustion

## Implementation Checklist

### Phase 1: Infrastructure
- [ ] Add `/character` command to `commands.js`
- [ ] Create `character-agent.js` with core agent class
- [ ] Implement step counter and limit enforcement
- [ ] Set up character data storage structure

### Phase 2: Generation Logic
- [ ] Implement generation loop with steps 1-8
- [ ] Integrate RAG context retrieval per step
- [ ] Add dice roll integration
- [ ] Create validation framework

### Phase 3: User Experience
- [ ] Add progress updates during generation
- [ ] Format final character presentation
- [ ] Handle errors gracefully
- [ ] Support user feedback and refinement

### Phase 4: Testing
- [ ] Write unit tests for agent logic
- [ ] Create integration tests with RAG
- [ ] Test dice roll integration
- [ ] Validate error recovery scenarios

### Phase 5: Documentation
- [ ] Update `README.md` with new command
- [ ] Add usage examples
- [ ] Document step-by-step generation process
- [ ] Explain validation and error handling

## Conclusion

This feature will provide a robust, context-aware character creation system that leverages the existing RAG infrastructure while maintaining clear user feedback and preventing infinite loops through step limits. The integration with dice rolls and validation ensures both fun gameplay mechanics and world-consistent characters.
