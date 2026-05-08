import { getRagQuery } from './rag.js';
import { getLMStudioResponse } from './lmstudio.js';

// Character generation steps based on Heart RPG rules
const CHARACTER_STEPS = [
  {
    step: 1,
    name: 'Select an ancestry',
    description: 'Choose a character ancestry (drow, aelfir, human, or gnoll)',
    validation: (data) => ['drow', 'aelfir', 'human', 'gnoll'].includes(data.ancestry?.toLowerCase())
  },
  {
    step: 2,
    name: 'Choose a calling',
    description: 'Select a character calling (Adventure, Enlightenment, Forced, Heartsong, or Penitent)',
    validation: (data) => ['adventure', 'enlightenment', 'forced', 'heartsong', 'penitent'].includes(data.calling?.toLowerCase())
  },
  {
    step: 3,
    name: 'Choose a class',
    description: 'Select a character class (Cleaver, Deadwalker, Deep Apiarist, Heretic, Hound, Incarnadine, Junk Mage, Vermissian Knight, or Witch)',
    validation: (data) => ['cleaver', 'deadwalker', 'deep apiarist', 'heretic', 'hound', 'incarnadine', 'junk mage', 'vermissian knight', 'witch'].includes(data.class?.toLowerCase())
  },
  {
    step: 4,
    name: 'Select abilities',
    description: 'Choose one major and three minor abilities from your class',
    validation: (data) => data.majorAbility && data.minorAbilities && data.minorAbilities.length >= 3
  },
  {
    step: 5,
    name: 'Choose equipment',
    description: 'Select starting equipment for your character',
    validation: (data) => data.equipment && Array.isArray(data.equipment) && data.equipment.length > 0
  },
  {
    step: 6,
    name: 'Select beats',
    description: 'Choose two beats for your first session from your calling',
    validation: (data) => data.beats && Array.isArray(data.beats) && data.beats.length >= 2
  },
  {
    step: 7,
    name: 'Answer calling questions',
    description: 'Answer the questions specific to your chosen calling',
    validation: (data) => data.callingQuestions && Object.keys(data.callingQuestions).length > 0
  },
  {
    step: 8,
    name: 'Add finishing details',
    description: 'Add final touches like appearance, personality traits, and background details',
    validation: (data) => data.name && data.appearance && data.personality
  }
];

/**
 * Query the RAG source for character generation information
 */
async function queryCharacterInfo(ragSource, topic) {
  try {
    const context = await getRagQuery(ragSource, topic, 3);
    return context;
  } catch (error) {
    console.error(`Error querying RAG for "${topic}":`, error.message);
    return null;
  }
}

/**
 * Generate a single character step using the AI
 */
async function generateCharacterStep(step, ragSource, previousData = {}) {
  // Build a more concise prompt to reduce token usage
  let prompt = `You are an expert RPG character creation assistant for the Heart RPG system.

STEP ${step.step}: ${step.name}
${step.description}

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

  // Add specific instructions based on step
  switch (step.step) {
    case 1: // Ancestry - just pick one
      prompt += 'Return ONLY the ancestry name (drow, aelfir, human, or gnoll). No other text.';
      break;
    case 2: // Calling - just pick one
      prompt += 'Return ONLY the calling name (Adventure, Enlightenment, Forced, Heartsong, or Penitent). No other text.';
      break;
    case 3: // Class - just pick one
      prompt += 'Return ONLY the class name. No other text.';
      break;
    case 4: // Abilities - list them briefly
      prompt += 'Return a major ability and 3 minor abilities in JSON format with keys "majorAbility" and "minorAbilities".';
      break;
    case 5: // Equipment - list items briefly
      prompt += 'Return equipment as a JSON array of strings.';
      break;
    case 6: // Beats - list them briefly
      prompt += 'Return 2 beats as a JSON array of strings.';
      break;
    case 7: // Calling questions - brief answers
      prompt += 'Return calling questions and answers in JSON format with "callingQuestions" key.';
      break;
    case 8: // Finishing details - brief
      prompt += 'Return name, appearance, personality as a JSON object with keys "name", "appearance", "personality".';
      break;
    default:
      prompt += 'Provide the information concisely.';
  }

  const response = await getLMStudioResponse(prompt, []);

  return {
    prompt,
    response
  };
}

/**
 * Validate character data against a step's validation rules
 * Returns an object with isValid boolean and optional failureMessage from LLM
 */
export async function validateStep(step, data, ragSource = null) {
  if (step.validation) {
    const isValid = step.validation(data);
    
    // If validation passed, return success
    if (isValid) {
      return { isValid: true };
    }
    
    // Validation failed - try to get LLM-generated failure message
    if (ragSource) {
      try {
        // Query the RAG source for validation guidance
        const validationGuidance = await getRagQuery(
          ragSource,
          `What are common validation failures for ${step.name} and how can they be fixed?`,
          2
        );
        
        // If we got validation guidance, use it to generate a specific failure message
        if (validationGuidance) {
          const failurePrompt = `
You are an expert RPG character creation assistant. The following character data failed validation for step: ${step.name}

Step description: ${step.description}
Validation rules: ${step.validation.toString()}

Character data that failed:
${JSON.stringify(data, null, 2)}

Available reference material:
${validationGuidance.substring(0, 1500)}

Please explain why the validation failed and what needs to be corrected. Keep your explanation concise (under 100 words).
`;
          
          const failureMessage = await getLMStudioResponse(failurePrompt, []);
          return {
            isValid: false,
            failureMessage: `Validation failed for ${step.name}:\n${failureMessage.trim()}`,
            validationGuidance
          };
        }
      } catch (error) {
        console.log('Failed to get LLM validation message:', error);
      }
    }
    
    // Fallback: return generic failure message
    return {
      isValid: false,
      failureMessage: `Validation failed for ${step.name}. Please review the character data and ensure it meets all requirements.`
    };
  }
  
  return { isValid: true };
}

/**
 * Format the final character sheet with proper markdown formatting
 */
export function formatCharacterSheet(characterData) {
  let output = `# 🎲 Character Sheet: ${characterData.name}\n\n`;
  
  // Basic info
  output += `## 📋 Basic Information\n`;
  output += `- **Name:** ${characterData.name}\n`;
  output += `- **Ancestry:** ${characterData.ancestry || 'N/A'}\n`;
  output += `- **Calling:** ${characterData.calling || 'N/A'}\n`;
  output += `- **Class:** ${characterData.class || 'N/A'}\n\n`;
  
  // Abilities
  if (characterData.majorAbility) {
    output += `## ⚔️ Abilities\n`;
    output += `- **Major Ability:** ${characterData.majorAbility}\n`;
    output += `- **Minor Abilities:**\n${characterData.minorAbilities?.map(a => `  - ${a}`).join('\n') || 'N/A'}\n\n`;
  }
  
  // Equipment
  if (characterData.equipment && characterData.equipment.length > 0) {
    output += `## 🎒 Equipment\n${characterData.equipment.map(item => `- ${item}`).join('\n')}\n\n`;
  }
  
  // Beats
  if (characterData.beats && characterData.beats.length > 0) {
    output += `## 🎯 Active Beats\n${characterData.beats.map(beat => `- ${beat}`).join('\n')}\n\n`;
  }
  
  // Calling questions
  if (characterData.callingQuestions && Object.keys(characterData.callingQuestions).length > 0) {
    output += `## ❓ Calling Questions\n${Object.entries(characterData.callingQuestions)
      .filter(([question, answer]) => typeof question === 'string' && typeof answer === 'string')
      .map(([question, answer]) => `- **Q:** ${question}\n  **A:** ${answer}`)
      .join('\n')}\n\n`;
  }
  
  // Finishing details
  if (characterData.appearance) {
    output += `## 👤 Appearance\n${characterData.appearance}\n\n`;
  }
  
  if (characterData.personality) {
    output += `## 🧠 Personality\n${characterData.personality}\n\n`;
  }
  
  if (characterData.background) {
    output += `## 📖 Background\n${characterData.background}\n\n`;
  }
  
  // Validation status
  output += `## ✅ Validation Status\n`;
  output += `- **Step-by-step validation:** ${characterData.validationStatus?.allStepsValid ? '✅ Passed' : '❌ Failed'}\n`;
  output += `- **Final validation:** ${characterData.validationStatus?.finalValid ? '✅ Passed' : '❌ Failed'}\n`;
  
  // Validation failure messages from LLM
  if (characterData.validationFailures && characterData.validationFailures.length > 0) {
    output += `\n## ❗ Validation Failure Messages\n`;
    
    for (const failure of characterData.validationFailures) {
      output += `### ${failure.step}\n${failure.message}\n\n`;
    }
  }
  
  return output;
}

/**
 * Generate a complete character with progress reporting
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
    // Step 1: Get the character creation steps from RAG
    let stepsPrompt;
    if (ragSource) {
      stepsPrompt = await getRagQuery(ragSource, 'What are the steps for creating a character in this RPG system?', 3);
    } else {
      stepsPrompt = `The standard Heart RPG character creation steps are:
1. Select an ancestry
2. Choose a calling
3. Choose a class
4. Select one major and three minor abilities from your class
5. Choose equipment
6. Select two beats for your first session
7. Answer the questions from your calling
8. Add finishing details`;
    }

    result.progressUpdates.push({
      step: 0,
      name: 'Character Creation',
      status: 'info',
      message: `Using RAG source: ${ragSource || 'default rules'}`
    });

    // Step 2-9: Execute each character generation step
    const characterData = {
      specifications: specifications,
      validationStatus: { allStepsValid: true, finalValid: false }
    };

    for (const step of CHARACTER_STEPS) {
      result.progressUpdates.push({
        step: step.step,
        name: step.name,
        status: 'in-progress',
        message: `Generating ${step.name.toLowerCase()}...`
      });

      // Query RAG for specific information about this step
      let stepContext = null;
      if (ragSource) {
        const topicMap = {
          1: 'What are the available ancestries and their descriptions?',
          2: 'What are the available callings and their beats?',
          3: 'What are the available classes and their core abilities?',
          4: 'How do I select major and minor abilities from my class?',
          5: 'What equipment options are available for starting characters?',
          6: 'How do I choose beats for character advancement?',
          7: `What questions should I answer for the ${characterData.calling || 'selected'} calling?`,
          8: 'What finishing details should I add to complete my character?'
        };
        
        stepContext = await getRagQuery(ragSource, topicMap[step.step] || step.description, 3);
      }

      // Generate this step using AI
      const generationResult = await generateCharacterStep(step, ragSource, {
        ...characterData,
        specifications: null // Don't pass full specs to avoid token overflow
      });

      // Parse the response and extract relevant data
      let stepData = {};
      
      try {
        // Try to parse JSON from response
        const jsonMatch = generationResult.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          stepData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // If JSON parsing fails, use the raw response as text
        console.log('Could not parse JSON from AI response');
      }

      // Extract data based on step type - simplified extraction for faster processing
      switch (step.step) {
        case 1: // Ancestry
          characterData.ancestry = stepData.ancestry || 
            generationResult.response.split('\n')[0].trim().toLowerCase() ||
            'human';
          break;
        case 2: // Calling
          characterData.calling = stepData.calling || 
            generationResult.response.split('\n')[0].trim() ||
            'Adventure';
          break;
        case 3: // Class
          characterData.class = stepData.class || 
            generationResult.response.split('\n')[0].trim() ||
            'Cleaver';
          break;
        case 4: // Abilities
          if (stepData.majorAbility) {
            characterData.majorAbility = stepData.majorAbility;
          }
          if (stepData.minorAbilities && Array.isArray(stepData.minorAbilities)) {
            characterData.minorAbilities = stepData.minorAbilities.slice(0, 3);
          } else {
            characterData.minorAbilities = ['Combat Training', 'Survival Instincts', 'Specialized Knowledge'];
          }
          break;
        case 5: // Equipment
          if (stepData.equipment && Array.isArray(stepData.equipment)) {
            characterData.equipment = stepData.equipment.slice(0, 10);
          } else {
            characterData.equipment = ['Basic gear', 'Weapon', 'Armor'];
          }
          break;
        case 6: // Beats
          if (stepData.beats && Array.isArray(stepData.beats)) {
            characterData.beats = stepData.beats.slice(0, 2);
          } else {
            characterData.beats = ['Survive first delve', 'Find a valuable item'];
          }
          break;
        case 7: // Calling questions
          if (stepData.callingQuestions && typeof stepData.callingQuestions === 'object') {
            characterData.callingQuestions = {};
            Object.entries(stepData.callingQuestions).forEach(([key, value]) => {
              if (typeof key === 'string' && typeof value === 'string') {
                characterData.callingQuestions[key] = value;
              }
            });
          } else {
            characterData.callingQuestions = { 
              'Why are you in the Heart?': 'Seeking something valuable',
              'What do you fear?': 'The darkness'
            };
          }
          break;
        case 8: // Finishing details
          if (stepData.name) characterData.name = stepData.name.trim();
          if (!characterData.name) {
            characterData.name = 'Unnamed Delver';
          }
          
          if (stepData.appearance) characterData.appearance = stepData.appearance.trim();
          if (!characterData.appearance) {
            characterData.appearance = 'A mysterious figure with unknown origins';
          }
          
          if (stepData.personality) characterData.personality = stepData.personality.trim();
          if (!characterData.personality) {
            characterData.personality = 'Driven and determined';
          }
          
          if (stepData.background) characterData.background = stepData.background.trim();
          break;
      }

      // Validate this step
      const validationResult = await validateStep(step, characterData, ragSource);
      const isValid = validationResult.isValid;
      
      characterData.validationStatus.allStepsValid = characterData.validationStatus.allStepsValid && isValid;

      result.progressUpdates[result.progressUpdates.length - 1].status = isValid ? 'completed' : 'warning';
      result.progressUpdates[result.progressUpdates.length - 1].message += isValid ? ' ✅' : ` ⚠️ (${validationResult.failureMessage || 'requires review'})`;

      // Store validation failure messages for the final character sheet
      if (!isValid && validationResult.failureMessage) {
        if (!characterData.validationFailures) {
          characterData.validationFailures = [];
        }
        characterData.validationFailures.push({
          step: step.name,
          message: validationResult.failureMessage
        });
      }

      // Add context to progress updates
      if (stepContext && step.step <= 3) {
        result.progressUpdates.push({
          step: step.step,
          name: `${step.name} Context`,
          status: 'info',
          message: `Retrieved ${stepContext.substring(0, 150)}...`
        });
      }
    }

    // Final validation
    const finalValidationResult = await validateStep(
      { 
        validation: (data) => data.ancestry && data.calling && data.class,
        name: 'Final Validation' 
      },
      characterData,
      ragSource
    );
    
    characterData.validationStatus.finalValid = finalValidationResult.isValid;

    if (!characterData.validationStatus.finalValid) {
      result.progressUpdates.push({
        step: 9,
        name: 'Final Validation',
        status: 'warning',
        message: `Character validation warnings detected - ${finalValidationResult.failureMessage || 'please review'}`
      });
      
      // Add final validation failure to the list
      if (finalValidationResult.failureMessage) {
        if (!characterData.validationFailures) {
          characterData.validationFailures = [];
        }
        characterData.validationFailures.push({
          step: 'Final Validation',
          message: finalValidationResult.failureMessage
        });
      }
    } else {
      result.progressUpdates.push({
        step: 9,
        name: 'Final Validation',
        status: 'completed',
        message: 'Character creation complete! ✅'
      });
    }

    // Format the final character sheet
    const formattedSheet = formatCharacterSheet(characterData);

    result.success = true;
    result.formattedSheet = formattedSheet;
    result.characterData = characterData;

  } catch (error) {
    console.error('Error generating character:', error);
    result.success = false;
    result.error = error.message;
    result.progressUpdates.push({
      step: -1,
      name: 'Character Creation',
      status: 'error',
      message: `Error: ${error.message}`
    });
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
      'error': '❌'
    }[update.status] || 'ℹ️';

    report += `${statusIcon} **Step ${update.step}:** ${update.name}\n`;
    
    if (update.message) {
      report += `   ${update.message}\n`;
    }
  }

  return report;
}
