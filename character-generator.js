/**
 * Character Generator Module
 * High-level orchestration for RPG character creation with RAG integration,
 * step-by-step progress reporting, and validation against world rules.
 */

import { queryVectorStore, getOrCreateVectorStore } from './rag.js';
import { getLMStudioResponse } from './lmstudio.js';

// Import the core agent class
import { CharacterGenerationAgent } from './character-agent.js';

/**
 * Build a context-aware query for character generation step
 * @param {string} stepName - Name of the current generation step
 * @param {object} currentCharacterData - Partial character data so far
 * @returns {string} Query string for RAG retrieval
 */
function buildRagQueryForStep(stepName, currentCharacterData) {
  const queries = {
    'race': `What races are available in this world? List all playable races with their key characteristics.`,
    'class': `What classes are available in this world? List all playable classes with their key features.`,
    'background': `What backgrounds are available for characters in this setting?`,
    'ability_scores': `How do ability scores work in this system? What is the standard method for generating them?`,
    'equipment': `What equipment is typical for ${currentCharacterData.class} characters?`,
    'skills': `What skills are available and how do they relate to different classes and backgrounds?`,
    'personality': `What personality traits would be appropriate for a ${currentCharacterData.race} ${currentCharacterData.class}?`,
    'backstory': `What kinds of backstories are common in this world setting?`
  };
  
  return queries[stepName] || 'Generate character details based on the world context.';
}

/**
 * Validate character choice against RAG context
 * @param {string} stepName - Name of the generation step
 * @param {string} choice - The character choice to validate (race, class, etc.)
 * @param {object} ragContext - Retrieved RAG documents for this step
 * @returns {Promise<object>} Validation result with validity status and issues
 */
async function validateCharacterChoice(stepName, choice, ragContext) {
  // If no context available, assume valid (will be validated later)
  if (!ragContext || ragContext.length === 0) {
    return {
      valid: true,
      issues: [],
      warning: 'No RAG context available for validation'
    };
  }
  
  const issues = [];
  
  try {
    // Build validation prompt
    const contextText = ragContext.map(doc => doc.content).join('\n\n');
    
    let validationPrompt;
    switch (stepName) {
      case 'race':
        validationPrompt = `Is "${choice}" a valid race in this world? Check the provided context for available races. Answer with "VALID" or "INVALID" and explain why.`;
        break;
      case 'class':
        validationPrompt = `Is "${choice}" a valid class in this world? Check the provided context for available classes. Answer with "VALID" or "INVALID" and explain why.`;
        break;
      case 'background':
        validationPrompt = `Is "${choice}" a valid background in this setting? Check the provided context for available backgrounds. Answer with "VALID" or "INVALID" and explain why.`;
        break;
      default:
        // For other steps, use general validation
        validationPrompt = `Based on the following world context, is "${choice}" an appropriate choice? Provide a brief explanation.`;
    }
    
    const fullPrompt = `World Context:\n${contextText}\n\nQuestion: ${validationPrompt}`;
    
    // Get LLM validation response
    const response = await getLMStudioResponse(fullPrompt);
    
    // Simple validation - check if response contains "VALID"
    const isValid = response.toUpperCase().includes('VALID') || 
                    !response.toUpperCase().includes('INVALID');
    
    if (!isValid) {
      issues.push(`Choice "${choice}" may be invalid: ${response}`);
    }
    
    return {
      valid: isValid,
      issues,
      llmValidation: response
    };
  } catch (error) {
    console.error('Error during character choice validation:', error);
    return {
      valid: true, // Fail open if validation fails
      issues: [`Validation error: ${error.message}`],
      warning: 'Using default validation due to LLM error'
    };
  }
}

/**
 * Get RAG context for a generation step with fallback handling
 * @param {string} ragSource - Path to active RAG PDF document
 * @param {string} stepName - Name of the current generation step
 * @param {object} currentCharacterData - Partial character data so far
 * @returns {Promise<object>} Context retrieval result
 */
async function getStepContext(ragSource, stepName, currentCharacterData) {
  try {
    if (!ragSource) {
      console.log('[Character Generator] No RAG source specified, using default generation');
      return { context: [], hasContext: false };
    }
    
    // Ensure vector store exists for this source
    await getOrCreateVectorStore(ragSource);
    
    // Use the correct source name (filename without path and extension)
    const sourceName = ragSource.replace(/^.*[\\/]/, '').replace(/\.pdf$/, '');
    
    const query = buildRagQueryForStep(stepName, currentCharacterData);
    const docs = await queryVectorStore(sourceName, query, 3);
    
    console.log(`[Character Generator] Retrieved ${docs.length} documents for step "${stepName}"`);
    
    return {
      context: docs,
      hasContext: docs.length > 0
    };
  } catch (error) {
    console.error('[Character Generator] Error retrieving RAG context:', error);
    return {
      context: [],
      hasContext: false,
      error: error.message
    };
  }
}

/**
 * Generate character with step-by-step progress reporting and RAG integration
 * @param {string} specifications - User-provided character specs (race, class, etc.)
 * @param {string|null} ragSource - Path to active RAG PDF document (null for no RAG)
 * @param {object} options - Agent configuration options
 * @returns {Promise<object>} Complete character generation result with progress updates
 */
export async function generateCharacterWithProgress(specifications = '', ragSource, options = {}) {
  const agent = new CharacterGenerationAgent(options);
  
  // Initialize the agent
  await agent.initialize(specifications, ragSource);
  
  // Track progress for reporting
  const progressUpdates = [];
  
  // Run generation loop with step limit
  let stepResult;
  while (agent.currentStep < agent.maxSteps) {
    // Determine what step we're on
    let currentStepName;
    if (!agent.characterData.race) {
      currentStepName = 'race';
    } else if (!agent.characterData.class) {
      currentStepName = 'class';
    } else if (agent.abilityScoresUnfilled()) {
      currentStepName = 'ability_scores';
    } else if (!agent.characterData.background) {
      currentStepName = 'background';
    } else if (agent.characterData.personalityTraits.length === 0) {
      currentStepName = 'personality';
    } else if (!agent.characterData.backstory) {
      currentStepName = 'backstory';
    } else {
      currentStepName = 'final';
    }
    
    // Get RAG context for this step
    const contextResult = await getStepContext(ragSource, currentStepName, agent.characterData);
    
    if (contextResult.error) {
      progressUpdates.push({
        step: agent.currentStep + 1,
        action: `step_${currentStepName}`,
        status: 'warning',
        message: `RAG context retrieval failed: ${contextResult.error}`
      });
    } else if (contextResult.hasContext) {
      progressUpdates.push({
        step: agent.currentStep + 1,
        action: `step_${currentStepName}`,
        status: 'info',
        message: `Retrieved ${contextResult.context.length} context documents for world consistency`
      });
    }
    
    // Execute the generation step
    stepResult = await agent.generateNextStep();
    
    if (!stepResult.success && !stepResult.completed) {
      progressUpdates.push({
        step: agent.currentStep,
        action: `step_${currentStepName}`,
        status: 'error',
        message: `Generation failed: ${stepResult.error}`
      });
      
      return {
        success: false,
        error: `Generation failed at step ${agent.currentStep}: ${stepResult.error}`,
        progressUpdates
      };
    }
    
    // Record the step result in progress updates
    if (stepResult.action) {
      progressUpdates.push({
        step: agent.currentStep,
        action: stepResult.action,
        status: 'success',
        message: stepResult.result || `Completed step ${agent.currentStep}`
      });
    }
    
    // Check if generation is complete
    if (stepResult.completed) {
      break;
    }
  }
  
  // Perform final validation against RAG context if available
  if (ragSource && agent.characterData.race && agent.characterData.class) {
    try {
      const raceContext = await getStepContext(ragSource, 'race', agent.characterData);
      const classContext = await getStepContext(ragSource, 'class', agent.characterData);
      
      // Validate race
      if (agent.characterData.race) {
        const raceValidation = await validateCharacterChoice('race', agent.characterData.race, raceContext.context);
        
        if (!raceValidation.valid) {
          progressUpdates.push({
            step: agent.currentStep,
            action: 'validate_race',
            status: 'warning',
            message: `Race validation issue: ${raceValidation.issues.join(', ')}`
          });
        }
      }
      
      // Validate class
      if (agent.characterData.class) {
        const classValidation = await validateCharacterChoice('class', agent.characterData.class, classContext.context);
        
        if (!classValidation.valid) {
          progressUpdates.push({
            step: agent.currentStep,
            action: 'validate_class',
            status: 'warning',
            message: `Class validation issue: ${classValidation.issues.join(', ')}`
          });
        }
      }
    } catch (error) {
      console.error('Error during final validation:', error);
    }
  }
  
  // Return final character data with all progress updates
  return {
    success: true,
    characterData: agent.getCharacterSnapshot(),
    formattedSheet: agent.formatCharacterSheet(),
    progressUpdates,
    completedSteps: agent.currentStep,
    maxSteps: agent.maxSteps
  };
}

/**
 * Generate a complete character (legacy function, uses default options)
 * @param {string} specifications - User-provided character specs
 * @param {string|null} ragSource - Path to active RAG PDF document
 * @param {object} options - Agent configuration options
 * @returns {Promise<object>} Complete character generation result
 */
export async function generateCharacter(specifications = '', ragSource, options = {}) {
  return await generateCharacterWithProgress(specifications, ragSource, options);
}

/**
 * Format progress updates for Discord display
 * @param {Array} progressUpdates - Array of progress update objects
 * @returns {string} Formatted progress report
 */
export function formatProgressReport(progressUpdates) {
  if (!progressUpdates || progressUpdates.length === 0) {
    return '';
  }
  
  const lines = ['### Character Generation Progress'];
  
  for (const update of progressUpdates) {
    let statusIcon;
    switch (update.status) {
      case 'error':
        statusIcon = '❌';
        break;
      case 'warning':
        statusIcon = '⚠️';
        break;
      case 'info':
        statusIcon = 'ℹ️';
        break;
      default:
        statusIcon = '✅';
    }
    
    lines.push(`${statusIcon} **Step ${update.step}:** ${update.message}`);
  }
  
  return lines.join('\n');
}
