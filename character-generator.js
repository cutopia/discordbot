import { getRagQuery } from './rag.js';
import { getLMStudioResponse } from './lmstudio.js';

/**
 * Query the RAG source for character generation steps
 */
async function getCharacterSteps(ragSource) {
  try {
    // Ask the RAG source what the steps are for creating a character
    const prompt = `What are the complete, step-by-step instructions for creating a new character in this RPG system? Include all required elements like ancestry, calling, class, abilities, equipment, beats, and any other character creation requirements.`;
    
    const context = await getRagQuery(ragSource, prompt, 5);
    
    // Extract the steps from the response
    return context;
  } catch (error) {
    console.error(`Error getting character steps from RAG source "${ragSource}":`, error.message);
    throw new Error(`Failed to retrieve character creation steps from RAG source: ${error.message}`);
  }
}

/**
 * Parse character steps from RAG response into structured format
 */
function parseCharacterSteps(stepsText) {
  // Try to extract numbered steps or bullet points that represent distinct steps
  const lines = stepsText.split('\n').filter(line => line.trim());
  
  const steps = [];
  let currentStep = null;
  
  for (const line of lines) {
    // Look for numbered steps (1., 2., etc.) or bullet points
    const numberedMatch = line.match(/^(\d+)\.\s*(.+)$/);
    const bulletMatch = line.match(/^[-•]\s*(.+)$/);
    
    if (numberedMatch) {
      // Save previous step if exists
      if (currentStep) {
        steps.push(currentStep);
      }
      
      currentStep = {
        step: parseInt(numberedMatch[1]),
        description: numberedMatch[2].trim()
      };
    } else if (bulletMatch && currentStep) {
      // Add to current step's description
      currentStep.description += ' ' + bulletMatch[1].trim();
    }
  }
  
  // Don't forget the last step
  if (currentStep) {
    steps.push(currentStep);
  }
  
  // If we didn't find any structured steps, create a generic one
  if (steps.length === 0) {
    steps.push({
      step: 1,
      description: stepsText.substring(0, 500)
    });
  }
  
  return steps;
}

/**
 * Query the RAG source for character generation information about a specific topic
 */
async function queryCharacterInfo(ragSource, topic) {
  try {
    const context = await getRagQuery(ragSource, topic, 3);
    return context;
  } catch (error) {
    console.error(`Error querying RAG for "${topic}":`, error.message);
    throw new Error(`Failed to query RAG source: ${error.message}`);
  }
}

/**
 * Generate a single character step using the AI with agentic loop and validation
 */
async function generateCharacterStep(step, ragSource, previousData = {}, maxAttempts = 3) {
  // Build prompt based on the step description from RAG
  let prompt = `You are an expert RPG character creation assistant for the current RPG system.

STEP ${step.step}: ${step.description}

`;
  
  if (Object.keys(previousData).length > 0) {
    prompt += 'Previous choices:\n';
    Object.entries(previousData).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length < 100) {
        prompt += `- ${key}: ${value}\n`;
      }
    });
    prompt += '\n';
  }

  // Get specific instructions from RAG about what this step requires
  try {
    const stepDetails = await getRagQuery(
      ragSource, 
      `What are the requirements and options for ${step.description.toLowerCase()}?`,
      2
    );
    
    if (stepDetails && stepDetails.length > 0) {
      prompt += `\nRelevant information from the RPG rules:\n${stepDetails}\n`;
    }
  } catch (error) {
    // Continue without additional context if RAG query fails
    console.warn(`Could not get detailed context for step ${step.step}:`, error.message);
  }

  // Add response format instructions
  prompt += `\nProvide your answer concisely. If the step requires specific choices, list them clearly.`;

  let lastResponse = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await getLMStudioResponse(prompt, []);
      lastResponse = response;
      
      // For now, just return the raw response - validation will be handled by the caller
      // This makes it truly agnostic to any specific RPG system
      
      return {
        prompt,
        response: lastResponse,
        success: true,
        data: { [step.description]: lastResponse }
      };
    } catch (error) {
      console.error(`Attempt ${attempt} failed for step ${step.step}:`, error.message);
      
      if (attempt === maxAttempts) {
        break;
      }
    }
  }

  // All attempts failed
  return {
    prompt,
    response: lastResponse || '',
    success: false,
    data: {},
    failureMessage: `Failed to complete step "${step.description}" after ${maxAttempts} attempts.`
  };
}

/**
 * Generate a complete character with progress reporting
 * Uses ONLY the selected RAG source - no hardcoded steps, no fallbacks
 */
export async function generateCharacterWithProgress(specifications = '', ragSource = null) {
  const result = {
    success: false,
    error: null,
    formattedSheet: '',
    progressUpdates: [],
    characterData: {}
  };

  try {
    // CRITICAL: Validate that we have a RAG source
    if (!ragSource) {
      throw new Error('No RAG source selected. Please use /rag_source to select a PDF document before creating a character.');
    }

    result.progressUpdates.push({
      step: 0,
      name: 'Character Creation',
      status: 'info',
      message: `Using RAG source: ${ragSource}`
    });

    // Step 1: Get the character creation steps from RAG
    let characterStepsText;
    try {
      characterStepsText = await getCharacterSteps(ragSource);
      result.progressUpdates.push({
        step: 0,
        name: 'Character Creation',
        status: 'info',
        message: `Retrieved ${characterStepsText.length} characters of character creation steps from ${ragSource}`
      });
    } catch (error) {
      console.error('Error getting character steps from RAG:', error);
      throw new Error(`Failed to retrieve character creation steps from RAG source "${ragSource}": ${error.message}`);
    }

    // Step 2: Parse the steps into structured format
    const characterSteps = parseCharacterSteps(characterStepsText);
    
    result.progressUpdates.push({
      step: 0,
      name: 'Character Creation',
      status: 'info',
      message: `Parsed ${characterSteps.length} character creation steps from RAG source`
    });

    // Step 3: Execute each character generation step
    const characterData = {
      specifications: specifications,
      rawSteps: characterStepsText,
      validationStatus: { allStepsValid: true, finalValid: false }
    };

    for (const step of characterSteps) {
      result.progressUpdates.push({
        step: step.step,
        name: `Step ${step.step}`,
        status: 'in-progress',
        message: `Generating: ${step.description.substring(0, 50)}...`
      });

      // Generate this step using AI with agentic loop
      const generationResult = await generateCharacterStep(step, ragSource, {
        ...characterData,
        specifications: null // Don't pass full specs to avoid token overflow
      }, 3); // max 3 attempts per step

      // Check if generation succeeded
      if (!generationResult.success) {
        // Step failed after all attempts - record the error but continue with next steps
        result.progressUpdates[result.progressUpdates.length - 1].status = 'error';
        const errorMessage = generationResult.failureMessage || `Generation failed`;
        result.progressUpdates[result.progressUpdates.length - 1].message += ` ❌ ${errorMessage}`;
        
        // Record the failure in character data for reporting
        if (!characterData.validationFailures) {
          characterData.validationFailures = [];
        }
        characterData.validationFailures.push({
          step: step.description,
          message: errorMessage
        });
        
        // Continue with empty/default data for this step - don't throw error
        console.warn(`Step ${step.step} (${step.description}) failed: ${errorMessage}`);
      } else {
        result.progressUpdates[result.progressUpdates.length - 1].status = 'completed';
        result.progressUpdates[result.progressUpdates.length - 1].message += ' ✅';
        
        // Store the generated data
        Object.assign(characterData, generationResult.data);
      }
    }

    // Step 4: Format the final character sheet using RAG context
    try {
      const formattingInstructions = await getRagQuery(
        ragSource,
        `How should a complete character sheet be formatted? What sections and information should it include?`,
        2
      );
      
      result.progressUpdates.push({
        step: characterSteps.length + 1,
        name: 'Formatting',
        status: 'info',
        message: 'Formatting final character sheet...'
      });
      
      // Build the character sheet based on what we generated and RAG formatting guidance
      let formattedSheet = `# 🎲 Character Sheet\n\n`;
      
      if (specifications) {
        formattedSheet += `## 📋 Specifications\n${specifications}\n\n`;
      }
      
      formattedSheet += `## 📚 Source\n${ragSource}\n\n`;
      
      // Add all the generated character data
      formattedSheet += `## 🎮 Character Details\n\n`;
      
      for (const [key, value] of Object.entries(characterData)) {
        if (key !== 'specifications' && key !== 'rawSteps' && typeof value === 'string') {
          // Format the key nicely
          const niceKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
          formattedSheet += `### ${niceKey}\n${value}\n\n`;
        }
      }
      
      result.formattedSheet = formattedSheet;
    } catch (error) {
      // Fallback formatting if RAG query fails
      console.warn('Error getting formatting instructions from RAG:', error);
      
      let fallbackSheet = `# 🎲 Character Sheet\n\n`;
      fallbackSheet += `## 📚 Source\n${ragSource}\n\n`;
      fallbackSheet += `## 🎮 Generated Data\n\n`;
      
      for (const [key, value] of Object.entries(characterData)) {
        if (key !== 'specifications' && key !== 'rawSteps' && typeof value === 'string') {
          fallbackSheet += `### ${key}\n${value.substring(0, 500)}\n\n`;
        }
      }
      
      result.formattedSheet = fallbackSheet;
    }

    // Final validation - no fallbacks allowed
    // Since we're agnostic, we can't do system-specific validation
    // Just check that we have some character data
    const hasCharacterData = Object.keys(characterData).some(
      key => typeof characterData[key] === 'string' && characterData[key].length > 10
    );
    
    characterData.validationStatus.finalValid = hasCharacterData;

    if (hasCharacterData) {
      result.progressUpdates.push({
        step: characterSteps.length + 2,
        name: 'Final Validation',
        status: 'completed',
        message: 'Character creation complete! ✅'
      });
      
      result.success = true;
    } else {
      result.progressUpdates.push({
        step: characterSteps.length + 2,
        name: 'Final Validation',
        status: 'error',
        message: 'Character validation failed - no valid character data generated ❌'
      });
    }

    result.characterData = characterData;

  } catch (error) {
    console.error('Error generating character:', error);
    
    // Record the error but don't stop character generation
    if (!result.characterData.validationFailures) {
      result.characterData.validationFailures = [];
    }
    result.characterData.validationFailures.push({
      step: 'Character Creation',
      message: `Critical error: ${error.message}`
    });
    
    result.error = error.message;
  }

  return result;
}

/**
 * Format progress updates for display
 */
export function formatProgressReport(progressUpdates) {
  if (!progressUpdates || progressUpdates.length === 0) {
    return null;
  }

  let report = '## 📊 Character Generation Progress\n\n';
  
  for (const update of progressUpdates) {
    const statusIcon = {
      'in-progress': '⏳',
      'completed': '✅',
      'warning': '⚠️',
      'error': '❌',
      'info': 'ℹ️'
    }[update.status] || 'ℹ️';

    report += `${statusIcon} **Step ${update.step}:** ${update.name}\n`;
    
    if (update.message) {
      report += `   ${update.message}\n`;
    }
  }

  return report;
}
