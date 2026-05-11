import { getLMStudioResponse } from './lmstudio.js';
import { queryVectorStore, vectorStores } from './rag.js';

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

Extract the step-by-step character creation instructions from the following text. 
For EACH step found, identify:
1. What CHOICE needs to be made
2. What OPTIONS are available for that choice  
3. How the choice is to be MADE (dice roll method, pick favorite, random selection, etc.)

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
        if (stepInfo) {
          this.steps.push(stepInfo);
        }
      }
      
      // Fallback: If structured parsing didn't work, try to extract simple steps
      if (this.steps.length === 0) {
        console.log('Structured step parsing failed, falling back to simple step extraction');
        
        const simpleSteps = response.split('\n')
          .map(line => line.trim())
          .filter(line => {
            // Filter out empty lines and non-step lines
            if (!line) return false;
            // Check for numbered steps (1., 2., etc.)
            if (line.match(/^\d+\.\s+/)) return true;
            // Check for step headers (Step 1:, STEP 1:, etc.)
            if (line.match(/^step\s+\d+[:\s]/i)) return true;
            // Check for bold steps (**Step X:**)
            if (line.match(/\*\*Step\s+\d+:.*\*\*/)) return true;
            // Check for sentences that look like instructions
            if (line.length > 10 && line.length < 200) {
              const lowerLine = line.toLowerCase();
              if (lowerLine.includes('create') || lowerLine.includes('choose') || 
                  lowerLine.includes('determine') || lowerLine.includes('select')) {
                return true;
              }
            }
            return false;
          })
          .map(line => {
            // Clean up the step text
            let cleaned = line.replace(/^\d+\.\s*/, '');
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
            return {
              stepName: parts[1] ? parts[1].trim() : 'Unknown Step',
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
${context}

Instructions:
1. Read the context carefully
2. Make appropriate choices based on the step instructions and user specifications
3. If dice rolls are needed, use standard dice notation (e.g., "1d20", "4d6dl1")
4. Update your character sheet with the results

Return your response in this format:
## Step ${stepIndex + 1}: [Step Name]
[Your actions and decisions]

Character Sheet State:
- [Any updated fields]`;
      } else {
        // Subsequent steps: Continue building on existing character sheet
        const structuredStep = typeof step === 'object' ? step : { stepName: step, choice: null, options: [], method: 'player_choice' };
        
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
${context}

Instructions:
1. Read the context carefully
2. Make appropriate choices based on the step instructions and user specifications
3. If dice rolls are needed, use standard dice notation (e.g., "1d20", "4d6dl1")
4. Update your character sheet with the results

Return your response in this format:
## Step ${stepIndex + 1}: [Step Name]
[Your actions and decisions]

Character Sheet State:
- [Any updated fields]`;
      }
      
      const response = await getLMStudioResponse(executionPrompt, []);
      
      // Parse the response to extract character sheet updates
      const stepResult = this.parseStepResult(response, stepIndex);
      
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
    
    for (const line of lines) {
      if (line.startsWith('## Step')) {
        result.stepName = line.replace('## Step', '').trim();
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        // Character sheet update
        const content = line.substring(2).trim();
        if (content.includes(':') || content.includes('=')) {
          const [key, value] = content.split(/[:=]/).map(s => s.trim());
          result.characterSheetUpdates[key] = value;
        } else {
          result.actions.push(content);
        }
      } else if (line.trim().length > 0) {
        // Regular action or description
        result.actions.push(line.trim());
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
      
      // Extract step name
      const stepMatch = line.match(/^STEP\s+\d+[:\s]+(.+)$/i);
      if (stepMatch) {
        stepInfo.stepName = stepMatch[1].trim();
        continue;
      }
      
      // Extract choice description
      const choiceMatch = line.match(/^(?:CHOICE|WHAT TO CHOOSE)[:\s]+(.+)$/i);
      if (choiceMatch) {
        stepInfo.choice = choiceMatch[1].trim();
        continue;
      }
      
      // Extract options list
      const optionsMatch = line.match(/^(?:OPTIONS|AVAILABLE OPTIONS|SELECT FROM)[:\s]*(.+)$/i);
      if (optionsMatch) {
        // Parse comma-separated or bullet-pointed options
        const optionsText = optionsMatch[1].trim();
        stepInfo.options = this.parseOptions(optionsText);
        continue;
      }
      
      // Extract method
      const methodMatch = line.match(/^(?:METHOD|HOW TO CHOOSE|DECISION METHOD)[:\s]+(.+)$/i);
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
      return stepInfo;
    }
    
    return null;
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
        throw new Error(`Character sheet validation failed: ${response}`);
      }
    } catch (error) {
      console.error("Error validating character sheet:", error);
      // Don't fail the entire process due to validation errors
      return { success: true, message: `Character sheet created with warnings: ${error.message}` };
    }
  }

  /**
   * Format the final character sheet for display
   */
  formatCharacterSheet() {
    let output = "## 🎲 Character Creation Complete!\n\n";
    
    if (Object.keys(this.characterSheet).length === 0) {
      // If no structured data, use the last step's result
      const lastStep = this.progressUpdates[this.progressUpdates.length - 1];
      if (lastStep && lastStep.result) {
        output += `**Character Sheet:**\n${JSON.stringify(lastStep.result.characterSheetUpdates, null, 2)}\n`;
      }
    } else {
      output += `**Character Sheet:**\n${JSON.stringify(this.characterSheet, null, 2)}\n`;
    }
    
    // Add progress report
    if (this.progressUpdates.length > 0) {
      output += "\n## 📋 Progress Report:\n";
      this.progressUpdates.forEach((update, i) => {
        output += `${i + 1}. **${update.step}**: ${update.status}\n`;
        if (update.details) {
          output += `   - ${update.details}\n`;
        }
      });
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
        formattedSheet: this.formatCharacterSheet(),
        progressUpdates: this.progressUpdates,
        characterSheet: this.characterSheet
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
