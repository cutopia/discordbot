import { getLMStudioResponse } from './lmstudio.js';
import { queryVectorStore, vectorStores } from './rag.js';
import { 
  availableClarifyTools, 
  executeClarifyTool,
  generateClarifyPrompt,
  analyzeStepForClarification
} from './clarify.js';

/**
 * Character generation agent state
 */
class CharacterGenerationAgent {
  constructor(specifications, ragSource) {
    this.specifications = specifications;
    this.ragSource = ragSource;
    this.characterSheet = {};
    this.steps = [];
    this.currentStepIndex = 0;
    this.progressUpdates = [];
    this.maxRetries = 3;
  }

  /**
   * Get the character creation steps from the RAG source
   */
  async getCharacterCreationSteps() {
    try {
      // Query for character creation steps with improved prompt
      // Use multiple targeted queries to get comprehensive information about choices, options, and methods
      
      const primaryQuery = "What are the step-by-step instructions for creating a player character in this RPG system?";
      
      // Query the vector store for character creation steps with expanded results
      const docs = await queryVectorStore(this.ragSource, primaryQuery, 10);
      
      if (docs.length === 0) {
        throw new Error("Could not retrieve character creation steps from the RAG source");
      }
      
      // Extract and parse the steps from the retrieved context
      const contextText = docs.map(d => d.content).join("\n\n---\n\n");
      
      // Use LM Studio to extract structured steps with choice information
      const extractionPrompt = `CRITICAL INSTRUCTIONS - READ CAREFULLY:

You are an expert RPG character creation assistant. Your task is to extract character creation instructions from the provided context.

**IMPORTANT GUIDELINES:**
1. **Extract ALL character creation steps that appear in the context**
2. **For EACH step, identify what CHOICE needs to be made, available OPTIONS, and how to make the choice**
3. **If a step mentions choices or options, extract them explicitly**
4. **Use your knowledge of RPG character creation structure to help organize the information**
5. **Return as many complete steps as you can find in the context**

**STEP FORMAT REQUIREMENTS:**
- STEP N: [Step Name] - This should be a clear description of what needs to be done
- CHOICE: [What decision needs to be made] - Only include if there's an explicit choice
- OPTIONS: [List of available options] - Only include if specific options are listed
- METHOD: [How to make the choice] - Only include if a specific method is mentioned

**IMPORTANT:** If a step doesn't have a CHOICE, OPTIONS, or METHOD, just provide what information is available.

Return them in this format:

STEP 1: [Step Name]
CHOICE: [What decision needs to be made]
OPTIONS: [List of available options]
METHOD: [How to make the choice - dice roll, pick favorite, etc.]

STEP 2: [Step Name]
...

Context:
${contextText}

Steps:`;

      const response = await getLMStudioResponse(extractionPrompt, []);
      
      // Parse the response into structured steps with choice information
      this.steps = [];
      
      // Split by "STEP N:" to get individual step blocks
      const stepBlocks = response.split(/STEP\s+\d+/i);
      
      for (const block of stepBlocks) {
        if (!block.trim()) continue;
        
        const stepInfo = this.parseStepBlock(block.trim());
        if (stepInfo && stepInfo.stepName) {
          // Clean up the step name
          stepInfo.stepName = this.cleanStepLine(stepInfo.stepName);
          
          // If step name is still malformed, try to extract meaningful content
          if (!stepInfo.stepName || stepInfo.stepName.length < 5) {
            continue;
          }
          
          this.steps.push(stepInfo);
        }
      }
      
      // Fallback: If structured parsing didn't work, try to extract simple steps
      if (this.steps.length === 0) {
        console.log('Structured step parsing failed, falling back to simple step extraction');
        
        const simpleSteps = response.split('\n')
          .map(line => line.trim())
          .filter(line => {
            // Clean the line first
            const cleanedLine = this.cleanStepLine(line);
            
            // Filter out empty lines and non-step lines
            if (!cleanedLine) return false;
            
            // Check for numbered steps (1., 2., etc.)
            if (cleanedLine.match(/^\d+\.\s+/)) return true;
            
            // Check for step headers (Step 1:, STEP 1:, etc.)
            if (cleanedLine.match(/^step\s+\d+[:\s]/i)) return true;
            
            // Check for bold steps (**Step X:**)
            if (cleanedLine.match(/\*\*Step\s+\d+:.*\*\*/)) return true;
            
            // Check for sentences that look like instructions
            if (cleanedLine.length > 10 && cleanedLine.length < 250) {
              const lowerLine = cleanedLine.toLowerCase();
              if (lowerLine.includes('create') || lowerLine.includes('choose') || 
                  lowerLine.includes('determine') || lowerLine.includes('select') ||
                  lowerLine.includes('step') || lowerLine.includes('character')) {
                return true;
              }
            }
            
            // Also check for lines that contain step-like patterns
            if (cleanedLine.length > 5 && cleanedLine.length < 200) {
              const hasStepPattern = cleanedLine.match(/^(?:[1-9]\d?\.|step\s+\d+[:\s])/i);
              return !!hasStepPattern;
            }
            
            return false;
          })
          .map(line => {
            // Clean up the step text
            let cleaned = this.cleanStepLine(line);
            cleaned = cleaned.replace(/^\d+\.\s*/, '');
            cleaned = cleaned.replace(/^step\s+\d+[:\s]+/i, '');
            cleaned = cleaned.replace(/\*\*Step\s+\d+:.*\*\*/i, '');
            return cleaned.trim();
          })
          .filter(step => step.length > 0);
        
        // Convert simple steps to structured format
        this.steps = simpleSteps.map(step => ({
          stepName: step,
          choice: null,
          options: [],
          method: 'player_choice'
        }));
      }
      
      // If still no steps found, try a more aggressive fallback
      if (this.steps.length === 0) {
        console.log('Simple step extraction also failed, trying aggressive fallback');
        
        // Try to find any numbered sections in the response
        const sectionMatches = response.match(/^(?:step\s+)?(\d+)\.\s*(.+)$/gm);
        if (sectionMatches) {
          this.steps = sectionMatches.map(match => {
            const parts = match.split(/\.\s*/, 2);
            let stepName = parts[1] ? parts[1].trim() : 'Unknown Step';
            
            // Clean up the step name
            stepName = this.cleanStepLine(stepName);
            
            return {
              stepName: stepName,
              choice: null,
              options: [],
              method: 'player_choice'
            };
          });
        }
      }
      
      console.log(`Character generation agent: Found ${this.steps.length} steps`);
      
      if (this.steps.length === 0) {
        throw new Error("Could not parse character creation steps from the RAG source");
      }
      
      this.progressUpdates.push({
        step: "initialization",
        status: "completed",
        details: `Retrieved ${this.steps.length} character creation steps`
      });
      
      return this.steps;
    } catch (error) {
      console.error("Error getting character creation steps:", error);
      throw new Error(`Failed to retrieve character creation steps from RAG source: ${error.message}`);
    }
  }

  /**
   * Get context for a specific step from the RAG source with choice information
   */
  async getStepContext(stepDescription) {
    try {
      // Extract structured step info if available
      const structuredStep = typeof stepDescription === 'object' ? stepDescription : { 
        stepName: stepDescription, 
        choice: null, 
        options: [], 
        method: 'player_choice' 
      };
      
      // Build a targeted query that focuses on choices, options, and methods
      let query;
      if (structuredStep.choice) {
        query = `How do I ${structuredStep.stepName.toLowerCase()}? What choices need to be made? What options are available? How should the choice be made?`;
      } else {
        query = `How do I ${structuredStep.stepName.toLowerCase()}? Provide detailed instructions about what needs to be chosen, available options, and how to make the selection.`;
      }
      
      // Query the vector store for context about this step
      const docs = await queryVectorStore(this.ragSource, query, 5);
      
      if (docs.length === 0) {
        throw new Error(`Could not retrieve context for step: ${stepDescription}`);
      }
      
      const contextText = docs.map(d => d.content).join("\n\n---\n\n");
      
      // Build comprehensive context with choice information
      let contextBuilder = `CONTEXT INSTRUCTIONS:
1. This is the ONLY information you should use for this step
2. Do NOT supplement with your own knowledge about RPG character creation
3. If information is incomplete, work within these constraints

STEP DETAILS:
Step: ${structuredStep.stepName}
${structuredStep.choice ? `Choice: ${structuredStep.choice}` : ''}
${structuredStep.options.length > 0 ? `Options: ${structuredStep.options.join(', ')}` : ''}
${structuredStep.method && structuredStep.method !== 'player_choice' ? `Method: ${structuredStep.method}` : ''}

RETRIEVED CONTEXT:
${contextText}`;
      
      return contextBuilder;
    } catch (error) {
      console.error(`Error getting context for step "${stepDescription}":`, error);
      throw error;
    }
  }

  /**
   * Execute a single character creation step
   */
  async executeStep(stepIndex, retryCount = 0) {
    const step = this.steps[stepIndex];
    
    try {
      console.log(`Executing step ${stepIndex + 1}/${this.steps.length}: ${step}`);
      
      // Get context for this step from the RAG source
      const context = await this.getStepContext(step);
      
      // Build the prompt for executing this step
      let executionPrompt;
      
      if (stepIndex === 0) {
        // First step: Initialize character sheet with specifications
        const structuredStep = typeof step === 'object' ? step : { stepName: step, choice: null, options: [], method: 'player_choice' };
        
        // Clean up the step name for display
        if (structuredStep.stepName) {
          structuredStep.stepName = this.cleanStepLine(structuredStep.stepName);
        }
        
        // Analyze if this step needs clarification
        const clarificationAnalysis = analyzeStepForClarification(structuredStep);
        
        executionPrompt = `CRITICAL INSTRUCTIONS - READ CAREFULLY:

You are creating a PLAYER CHARACTER for an RPG game. Follow these instructions to create a character.

**IMPORTANT GUIDELINES:**
1. **Use information from the context documents as your primary source**
2. **If specific details are not in context, use reasonable RPG character creation knowledge**
3. **Make choices that fit the character specifications provided by the user**
4. **If the user hasn't specified a name or backstory for the character, be as creative as possible while matching the flavor and feel of the RPG's setting.**

Character Specifications from user:
${this.specifications || 'No specific requirements provided'}

Current Step (${stepIndex + 1}/${this.steps.length}):
Step: ${structuredStep.stepName}
${structuredStep.choice ? `Choice: ${structuredStep.choice}` : ''}
${structuredStep.options.length > 0 ? `Options: ${structuredStep.options.join(', ')}` : ''}
${structuredStep.method && structuredStep.method !== 'player_choice' ? `Method: ${structuredStep.method}` : ''}

Context from RPG rulebook:
${context}`;

        // Add clarification capabilities if needed
        if (clarificationAnalysis.needsClarification) {
          executionPrompt += `\n\n## 🤔 Clarification Required

I've analyzed this step and found that it needs additional clarification:

**Issues Found:**
${clarificationAnalysis.reasons.map(reason => `- ${reason}`).join('\n')}

To proceed, I need to request additional information. Here are the available clarification tools:

\`\`\`json
${JSON.stringify(availableClarifyTools, null, 2)}
\`\`\`

### How to Use Clarification Tools:
1. **Identify what information is missing or ambiguous**
2. **Formulate a clear, specific question** that addresses the gap
3. **Call the request_clarification tool** with your question

Example usage when clarification is needed:

\`\`\`json
{
  "tool": "request_clarification",
  "arguments": {
    "question": "What are the available character classes for drow characters in this RPG system?",
    "context": "The context mentions character classes but doesn't list specific options"
  }
}
\`\`\`

### Important Guidelines:
- **Use clarification tools proactively** when you encounter ambiguity
- **Ask specific questions** to get useful answers
- **Don't guess** when the information is critical - ask for clarification instead
- **Provide context** in your question to help get more accurate responses

After receiving clarification, continue with the character creation process.`;
        }
        
        executionPrompt += `\n\nCRITICAL INSTRUCTIONS FOR CHARACTER SHEET OUTPUT:

**YOU MUST FOLLOW THIS EXACT FORMAT FOR CHARACTER SHEET DATA:**

1. After your narrative response, add a section titled "Character Sheet:"
2. For EACH character sheet field you're updating, use this format:
   - Field Name: Value
3. Make sure to include ALL relevant fields (Name, Class, Background, Attributes, etc.)

EXAMPLE OUTPUT:

## Step ${stepIndex + 1}: Determine Character Role/Archetype

I have analyzed the military setting and decided to create a disciplined soldier character with strong leadership qualities.

Character Sheet:
- Name: Captain John Smith
- Class: Soldier
- Background: Military Veteran  
- Alignment: Lawful Good
- Strength: 16
- Dexterity: 14

**IMPORTANT:** Do NOT use JSON format. Use the bullet point format shown above.`;
      } else {
        // Subsequent steps: Continue building on existing character sheet
        const structuredStep = typeof step === 'object' ? step : { stepName: step, choice: null, options: [], method: 'player_choice' };
        
        // Clean up the step name for display
        if (structuredStep.stepName) {
          structuredStep.stepName = this.cleanStepLine(structuredStep.stepName);
        }
        
        // Analyze if this step needs clarification
        const clarificationAnalysis = analyzeStepForClarification(structuredStep);
        
        executionPrompt = `CRITICAL INSTRUCTIONS - READ CAREFULLY:

You are creating a PLAYER CHARACTER for an RPG game. Follow these instructions to create a character.

**IMPORTANT GUIDELINES:**
1. **Use information from the context documents as your primary source**
2. **If specific details are not in context, use reasonable RPG character creation knowledge**
3. **Make choices that fit the character specifications and previous steps**
4. **Focus on creating an engaging and balanced character**

Current Step (${stepIndex + 1}/${this.steps.length}):
Step: ${structuredStep.stepName}
${structuredStep.choice ? `Choice: ${structuredStep.choice}` : ''}
${structuredStep.options.length > 0 ? `Options: ${structuredStep.options.join(', ')}` : ''}
${structuredStep.method && structuredStep.method !== 'player_choice' ? `Method: ${structuredStep.method}` : ''}

Previous Steps Completed:
${this.steps.slice(0, stepIndex).map((s, i) => `${i + 1}. ${typeof s === 'object' ? s.stepName : s}`).join('\n')}

Context from RPG rulebook:
${context}`;

        // Add clarification capabilities if needed
        if (clarificationAnalysis.needsClarification) {
          executionPrompt += `\n\n## 🤔 Clarification Required

I've analyzed this step and found that it needs additional clarification:

**Issues Found:**
${clarificationAnalysis.reasons.map(reason => `- ${reason}`).join('\n')}

To proceed, I need to request additional information. Here are the available clarification tools:

\`\`\`json
${JSON.stringify(availableClarifyTools, null, 2)}
\`\`\`

### How to Use Clarification Tools:
1. **Identify what information is missing or ambiguous**
2. **Formulate a clear, specific question** that addresses the gap
3. **Call the request_clarification tool** with your question

Example usage when clarification is needed:

\`\`\`json
{
  "tool": "request_clarification",
  "arguments": {
    "question": "What are the available character classes for drow characters in this RPG system?",
    "context": "The context mentions character classes but doesn't list specific options"
  }
}
\`\`\`

### Important Guidelines:
- **Use clarification tools proactively** when you encounter ambiguity
- **Ask specific questions** to get useful answers
- **Don't guess** when the information is critical - ask for clarification instead
- **Provide context** in your question to help get more accurate responses

After receiving clarification, continue with the character creation process.`;
        }
        
        executionPrompt += `\n\nCRITICAL INSTRUCTIONS FOR CHARACTER SHEET OUTPUT:

**YOU MUST FOLLOW THIS EXACT FORMAT FOR CHARACTER SHEET DATA:**

1. After your narrative response, add a section titled "Character Sheet:"
2. For EACH character sheet field you're updating, use this format:
   - Field Name: Value
3. Make sure to include ALL relevant fields (Name, Class, Background, Attributes, etc.)

EXAMPLE OUTPUT:

## Step ${stepIndex + 1}: Assign Attributes

I have rolled the dice and assigned attributes based on the results.

Character Sheet:
- Strength: 16
- Dexterity: 14
- Constitution: 12
- Intelligence: 10
- Wisdom: 8
- Charisma: 13

**IMPORTANT:** Do NOT use JSON format. Use the bullet point format shown above.`;
      }
      
      // Execute the step with possible clarification tool calls
      const stepResult = await this.executeStepWithClarification(executionPrompt, stepIndex);
      
      // Convert step to string representation for Discord display
      const stepDetails = typeof step === 'object' ? step.stepName || JSON.stringify(step) : step;
      
      this.progressUpdates.push({
        step: `step_${stepIndex + 1}`,
        status: "completed",
        details: stepDetails,
        result: stepResult
      });
      
      return { success: true, result: stepResult };
    } catch (error) {
      console.error(`Error executing step ${stepIndex + 1}:`, error);
      
      if (retryCount < this.maxRetries) {
        console.log(`Retrying step ${stepIndex + 1} (attempt ${retryCount + 2}/${this.maxRetries})...`);
        return await this.executeStep(stepIndex, retryCount + 1);
      } else {
        throw new Error(`Failed to complete step ${stepIndex + 1}: "${step}" after ${this.maxRetries} attempts. Error: ${error.message}`);
      }
    }
  }

  /**
   * Execute a step with clarification tool support
   * @param {string} prompt - The prompt to send to the LLM
   * @param {number} stepIndex - Index of the current step
   * @returns {Promise<object>} Step result with character sheet updates
   */
  async executeStepWithClarification(prompt, stepIndex) {
    try {
      // First attempt: Try to get a direct response
      let response = await getLMStudioResponse(prompt, []);
      
      // Check if the response indicates a need for clarification
      const needsClarification = this.detectClarificationNeed(response);
      
      if (needsClarification && stepIndex < this.maxRetries) {
        console.log(`Step ${stepIndex + 1} needs clarification. Attempting to request additional information...`);
        
        // Extract the specific question from the response
        const clarificationQuestion = this.extractClarificationQuestion(response);
        
        if (clarificationQuestion) {
          // Request clarification using the tool
          const clarificationResult = await executeClarifyTool('request_clarification', {
            question: clarificationQuestion,
            context: `Step ${stepIndex + 1}: ${this.steps[stepIndex].stepName || 'Unknown step'}`
          });
          
          if (clarificationResult.success) {
            // Add the clarification to the prompt and try again
            const updatedPrompt = `${prompt}\n\n## Clarification Received:\n${clarificationResult.message}`;
            
            console.log(`Received clarification, retrying with updated context...`);
            response = await getLMStudioResponse(updatedPrompt, []);
          }
        }
      }
      
      // Parse the response to extract character sheet updates
      const stepResult = this.parseStepResult(response, stepIndex);
      
      return stepResult;
    } catch (error) {
      console.error(`Error in executeStepWithClarification:`, error);
      throw error;
    }
  }

  /**
   * Detect if a response indicates a need for clarification
   * @param {string} response - The LLM response to analyze
   * @returns {boolean} True if clarification is needed
   */
  detectClarificationNeed(response) {
    const lowerResponse = response.toLowerCase();
    
    // Check for common phrases indicating missing information
    const clarificationIndicators = [
      'need more information',
      'could not find',
      'not specified in context',
      'unclear what',
      'missing details',
      'please clarify',
      'i need to know',
      'require additional'
    ];
    
    return clarificationIndicators.some(indicator => 
      lowerResponse.includes(indicator)
    );
  }

  /**
   * Extract a clarification question from an LLM response
   * @param {string} response - The LLM response to analyze
   * @returns {string|null} The extracted question or null if not found
   */
  extractClarificationQuestion(response) {
    // Try to find questions in the response
    const questionMatches = response.match(/(?:question|clarification|need to know)\s*[:\s]+(.+?)(?:\.|$)/i);
    
    if (questionMatches && questionMatches[1]) {
      return questionMatches[1].trim();
    }
    
    // Try to find any sentence ending with a question mark
    const questionSentences = response.match(/[^.!?]+\?/g);
    
    if (questionSentences && questionSentences.length > 0) {
      // Return the first question found
      return questionSentences[0].trim();
    }
    
    // If no clear questions, try to find sentences that sound like they need clarification
    const ambiguousPhrases = [
      'I am unsure',
      'cannot determine',
      'need more context',
      'require additional information'
    ];
    
    for (const phrase of ambiguousPhrases) {
      if (response.toLowerCase().includes(phrase)) {
        // Extract the sentence containing this phrase
        const sentences = response.split(/[.!?]/);
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(phrase)) {
            return sentence.trim();
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Parse the LLM response to extract character sheet updates
   */
  parseStepResult(response, stepIndex) {
    // Extract key information from the response
    const lines = response.split('\n');
    
    let result = {
      stepName: `Step ${stepIndex + 1}`,
      actions: [],
      characterSheetUpdates: {}
    };
    
    let inCharacterSheetSection = false;
    
    for (const line of lines) {
      // Check if we're entering a Character Sheet section
      if (line.toLowerCase().includes('character sheet')) {
        inCharacterSheetSection = true;
        continue;
      }
      
      // If we're not in the character sheet section, skip this line
      if (!inCharacterSheetSection) {
        result.actions.push(line.trim());
        continue;
      }
      
      // Now process lines that are inside the Character Sheet section
      if (line.startsWith('## Step')) {
        result.stepName = line.replace('## Step', '').trim();
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        // Character sheet update - only extract these in the character sheet section
        const content = line.substring(2).trim();
        
        // Only process lines that look like character attributes (short key-value pairs)
        if (content.includes(':') && !content.toLowerCase().includes('context')) {
          const parts = content.split(/:\s*/, 2);
          const key = parts[0].trim();
          const value = parts[1] ? parts[1].trim() : '';
          
          // Validate that this looks like a character attribute
          // Skip lines with too much text or that seem like instructions
          if (key.length < 30 && value.length < 200) {
            result.characterSheetUpdates[key] = value;
          } else {
            result.actions.push(content);
          }
        } else {
          result.actions.push(content);
        }
      } else if (line.trim().length > 0) {
        // Try to extract character sheet data from regular lines
        // Look for patterns like "Name: John", "Class: Fighter", etc.
        const sheetDataMatch = line.match(/^([A-Za-z][A-Za-z0-9_ ]*[A-Za-z0-9_]):\s*(.+)$/);
        
        if (sheetDataMatch) {
          const key = sheetDataMatch[1].trim();
          const value = sheetDataMatch[2].trim();
          
          // Only add to character sheet if it looks like meaningful data
          // Skip lines that are too long or seem like general text
          if (key.length < 30 && value.length < 200) {
            result.characterSheetUpdates[key] = value;
          } else {
            result.actions.push(line.trim());
          }
        } else {
          result.actions.push(line.trim());
        }
      }
    }
    
    return result;
  }

  /**
   * Parse a step block to extract choice information
   */
  parseStepBlock(block) {
    const lines = block.split('\n').map(line => line.trim());
    
    let stepInfo = {
      stepName: '',
      choice: null,
      options: [],
      method: 'player_choice'
    };
    
    for (const line of lines) {
      if (!line) continue;
      
      // Clean up the line - remove blockquote markers and other formatting
      const cleanLine = this.cleanStepLine(line);
      
      // Skip lines that are clearly not step information
      if (cleanLine.startsWith('---') || cleanLine === 'Context:' || 
          cleanLine.toLowerCase().includes('character sheet')) {
        continue;
      }
      
      // Extract step name - look for STEP N: pattern at the beginning
      const stepMatch = cleanLine.match(/^STEP\s+\d+[:\s]+(.+)$/i);
      if (stepMatch) {
        stepInfo.stepName = stepMatch[1].trim();
        continue;
      }
      
      // If we don't have a step name yet, try to extract it from the first meaningful line
      if (!stepInfo.stepName && cleanLine.length > 5 && cleanLine.length < 200) {
        // Check if this looks like a step description (not CHOICE/OPTIONS/METHOD)
        const isChoiceOptionsMethod = cleanLine.match(/^(?:CHOICE|OPTIONS|METHOD|WHAT TO CHOOSE|SELECT FROM)[:\s]/i);
        if (!isChoiceOptionsMethod) {
          stepInfo.stepName = cleanLine;
          continue;
        }
      }
      
      // Extract choice description
      const choiceMatch = cleanLine.match(/^(?:CHOICE|WHAT TO CHOOSE)[:\s]+(.+)$/i);
      if (choiceMatch) {
        stepInfo.choice = choiceMatch[1].trim();
        continue;
      }
      
      // Extract options list
      const optionsMatch = cleanLine.match(/^(?:OPTIONS|AVAILABLE OPTIONS|SELECT FROM)[:\s]*(.+)$/i);
      if (optionsMatch) {
        // Parse comma-separated or bullet-pointed options
        const optionsText = optionsMatch[1].trim();
        stepInfo.options = this.parseOptions(optionsText);
        continue;
      }
      
      // Extract method
      const methodMatch = cleanLine.match(/^(?:METHOD|HOW TO CHOOSE|DECISION METHOD)[:\s]+(.+)$/i);
      if (methodMatch) {
        stepInfo.method = methodMatch[1].trim().toLowerCase();
        
        // Normalize method descriptions to standard values
        if (stepInfo.method.includes('roll') || stepInfo.method.includes('dice')) {
          stepInfo.method = 'dice_roll';
        } else if (stepInfo.method.includes('pick') || stepInfo.method.includes('choose') || 
                   stepInfo.method.includes('select') || stepInfo.method.includes('favorite')) {
          stepInfo.method = 'player_choice';
        } else if (stepInfo.method.includes('random') || stepInfo.method.includes('table')) {
          stepInfo.method = 'random_selection';
        }
        continue;
      }
    }
    
    // If we have a valid step name, return the structured info
    if (stepInfo.stepName) {
      // Clean up the step name one more time
      stepInfo.stepName = this.cleanStepLine(stepInfo.stepName);
      
      // Remove common prefixes that indicate non-step content
      const prefixesToRemove = ['METHOD:', 'CHOICE:', 'OPTIONS:'];
      for (const prefix of prefixesToRemove) {
        if (stepInfo.stepName.toUpperCase().startsWith(prefix)) {
          stepInfo.stepName = stepInfo.stepName.substring(prefix.length).trim();
          break;
        }
      }
      
      return stepInfo;
    }
    
    return null;
  }
  
  /**
   * Clean up a step line by removing formatting artifacts
   */
  cleanStepLine(line) {
    let cleaned = line;
    
    // Remove blockquote markers (>)
    cleaned = cleaned.replace(/^>\s*/g, '');
    
    // Remove markdown quote formatting ("...")
    cleaned = cleaned.replace(/^["']|["']$/g, '');
    
    // Remove asterisks used for emphasis
    cleaned = cleaned.replace(/\*/g, '');
    
    // Remove leading/trailing whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Parse options text into an array
   */
  parseOptions(optionsText) {
    const options = [];
    
    // Split by common separators
    const rawOptions = optionsText.split(/[,;]|(?:\n\s*[-•]\s+)/);
    
    for (const option of rawOptions) {
      const trimmed = option.trim();
      if (trimmed && !trimmed.match(/^OPTIONS/i)) {
        options.push(trimmed);
      }
    }
    
    return options;
  }

  /**
   * Validate the character sheet after all steps are complete
   */
  async validateCharacterSheet() {
    try {
      // Check if character sheet is empty before validating
      const isEmpty = Object.keys(this.characterSheet).length === 0;
      
      if (isEmpty) {
        console.warn("Skipping validation - character sheet is empty");
        return { 
          success: true, 
          message: 'Character sheet created but no structured data was generated. Validation could not be performed.',
          warnings: ['Empty character sheet - no structured data to validate']
        };
      }
      
      const validationPrompt = `CRITICAL INSTRUCTIONS - READ CAREFULLY:

You are validating a character sheet against RPG rulebook guidelines.

**IMPORTANT GUIDELINES:**
1. **Use context documents as your primary source for validation rules**
2. **If specific validation criteria are not in context, use reasonable RPG character creation knowledge**
3. **Focus on creating a balanced and engaging character**

Character Sheet:
${JSON.stringify(this.characterSheet, null, 2)}

Instructions:
1. Check if all required fields are present (based on context or reasonable RPG standards)
2. Verify that values are within acceptable ranges
3. Ensure consistency between different parts of the character

Return your validation result in this format:
## Validation Result: [PASS/FAIL]
[Your validation notes]`;

      const response = await getLMStudioResponse(validationPrompt, []);
      
      // Parse validation result
      if (response.includes('Validation Result: PASS')) {
        return { success: true, message: 'Character sheet validated successfully' };
      } else {
        // Validation failed but don't throw - just return with warnings
        return { 
          success: true, 
          message: `Character sheet created with validation warnings`,
          warnings: [response]
        };
      }
    } catch (error) {
      console.error("Error validating character sheet:", error);
      // Don't fail the entire process due to validation errors
      return { 
        success: true, 
        message: `Character sheet created but validation encountered an error`,
        warnings: [error.message]
      };
    }
  }

  /**
   * Format the final character sheet for display
   * @param {Object} validationResult - Optional validation result object with warnings
   */
  formatCharacterSheet(validationResult) {
    let output = "## 🎲 Character Creation Complete!\n\n";
    
    // Add validation status if available
    if (validationResult) {
      const hasWarnings = validationResult.warnings && validationResult.warnings.length > 0;
      if (hasWarnings || !validationResult.message.includes('validated successfully')) {
        output += `**Validation Status:** ⚠️ ${validationResult.message}\n\n`;
      } else {
        output += `**Validation Status:** ✅ ${validationResult.message}\n\n`;
      }
      
      // Add warnings section if present
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        output += "### ⚠️ Validation Warnings:\n";
        validationResult.warnings.forEach((warning, i) => {
          output += `${i + 1}. ${warning}\n`;
        });
        output += "\n";
      }
    }
    
    // Build character sheet from all collected updates
    const allUpdates = { ...this.characterSheet };
    
    // Also collect any updates from progress updates that might have been missed
    for (const update of this.progressUpdates) {
      if (update.result && update.result.characterSheetUpdates) {
        Object.assign(allUpdates, update.result.characterSheetUpdates);
      }
    }
    
    if (Object.keys(allUpdates).length > 0) {
      output += `**Character Sheet:**\n${JSON.stringify(allUpdates, null, 2)}\n`;
    } else {
      // If still no structured data, provide a clear message
      output += "**Character Sheet:** No structured character data was generated.\n";
      output += "This may indicate that the LLM did not produce character sheet updates in the expected format.\n\n";
      
      // Add a summary of steps instead of using step details as character data
      if (this.progressUpdates.length > 0) {
        output += "### Steps Completed:\n";
        this.progressUpdates.forEach((update, i) => {
          const statusIcon = update.status === 'completed' ? '✅' : '❌';
          let stepName = update.step;
          
          // Extract step name from structured result if available
          if (update.result && update.result.stepName) {
            stepName = update.result.stepName;
          } else if (typeof update.details === 'string') {
            stepName = update.details.split('\n')[0];
          }
          
          output += `${i + 1}. ${statusIcon} **${stepName}**\n`;
          if (update.details && update.details !== stepName) {
            output += `   - ${update.details}\n`;
          }
        });
      }
      
      // Add a note about what the character sheet should contain
      output += "\n### Expected Character Sheet Fields:\n";
      output += "- Name: Character's name\n";
      output += "- Ancestry: Character's race/ancestry (e.g., Drow)\n";
      output += "- Calling: Character's class or role\n";
      output += "- Skills: Key skills and abilities\n";
      output += "- Background: Brief background story elements\n";
    }
    
    return output;
  }

  /**
   * Run the complete character generation process
   */
  async generateCharacter() {
    try {
      // Step 1: Get character creation steps from RAG source
      await this.getCharacterCreationSteps();
      
      if (this.steps.length === 0) {
        throw new Error("No character creation steps were retrieved from the RAG source");
      }
      
      console.log(`Starting character generation with ${this.steps.length} steps`);
      
      // Step 2: Execute each step in sequence
      for (let i = 0; i < this.steps.length; i++) {
        const result = await this.executeStep(i);
        
        if (!result.success) {
          throw new Error(`Failed to complete step ${i + 1}: ${this.steps[i]}`);
        }
        
        // Update character sheet with results from this step
        if (result.result && result.result.characterSheetUpdates) {
          Object.assign(this.characterSheet, result.result.characterSheetUpdates);
        }
      }
      
      // Step 3: Validate the final character sheet
      const validation = await this.validateCharacterSheet();
      
      console.log("Character generation completed successfully");
      
      return {
        success: true,
        formattedSheet: this.formatCharacterSheet(validation),
        progressUpdates: this.progressUpdates,
        characterSheet: this.characterSheet,
        validation: validation
      };
    } catch (error) {
      console.error("Error in character generation:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Generate a character with progress reporting
 * @param {string} specifications - User-provided character specifications
 * @param {string} ragSource - Name of the RAG source to use
 * @returns {Promise<object>} Character generation result
 */
export async function generateCharacterWithProgress(specifications, ragSource) {
  console.log(`Starting character generation for source: ${ragSource}`);
  
  // Check if vector store exists for this source
  if (!vectorStores.has(ragSource)) {
    return {
      success: false,
      error: `No RAG vector store found for source: "${ragSource}". Please use /rag_source to select a PDF document first.`
    };
  }
  
  // Create and run the character generation agent
  const agent = new CharacterGenerationAgent(specifications, ragSource);
  return await agent.generateCharacter();
}

/**
 * Format progress updates into a readable report
 * @param {Array} progressUpdates - Array of progress update objects
 * @returns {string} Formatted progress report
 */
export function formatProgressReport(progressUpdates) {
  if (!progressUpdates || progressUpdates.length === 0) {
    return '';
  }
  
  let report = "## 📋 Character Generation Progress:\n";
  
  progressUpdates.forEach((update, i) => {
    const statusIcon = update.status === 'completed' ? '✅' : '❌';
    
    // Extract step name from structured or simple format
    let stepName = update.step;
    if (update.result && update.result.stepName) {
      stepName = update.result.stepName;
    } else if (typeof update.details === 'string') {
      stepName = update.details.split('\n')[0];
    }
    
    report += `${i + 1}. ${statusIcon} **${stepName}**\n`;
    
    if (update.details) {
      report += `   - ${update.details}\n`;
    }
    
    if (update.result && update.result.characterSheetUpdates) {
      const updates = Object.entries(update.result.characterSheetUpdates)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      
      if (updates) {
        report += `   - Updated: ${updates}\n`;
      }
    }
  });
  
  return report;
}

// Export for testing
export { CharacterGenerationAgent };
