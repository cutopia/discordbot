import { getLMStudioResponse } from './lmstudio.js';
import { EnhancedRAGSystem, createEnhancedRAGFromAnalysis } from './rag-enhanced.js';
import { analyzeDocument } from './chapter-analyzer.js';
import { extractTextFromPDF } from './rag.js';

/**
 * Character generation stages for RPG character creation
 */
const CHARACTER_STAGES = [
  {
    id: 'characterCreationOverview',
    name: 'Character Creation Overview',
    description: 'Understand the overall process and steps for creating a character'
  },
  {
    id: 'coreIdentity',
    name: 'Core Identity',
    description: 'Select fundamental aspects like species/race, class/background'
  },
  {
    id: 'attributes',
    name: 'Attributes/Stats',
    description: 'Determine character attributes (strength, dexterity, etc.) using the system\'s method'
  },
  {
    id: 'skillsAndProficiencies',
    name: 'Skills and Proficiencies',
    description: 'Choose skills, abilities, and proficiencies for the character'
  },
  {
    id: 'equipment',
    name: 'Equipment',
    description: 'Select starting equipment based on class/background'
  },
  {
    id: 'backstory',
    name: 'Backstory',
    description: 'Create a brief character background that ties everything together'
  }
];

/**
 * Retry a function with up to maxRetries attempts
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise<any>} - Result from successful attempt or last error
 */
async function retryWithAttempts(fn, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}`);
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  throw lastError;
}

/**
 * Get character creation stages from the RAG system
 */
async function getCharacterCreationStages(ragSystem, sourceName) {
  try {
    const query = `What are the steps and stages involved in creating a new character? List all the decisions a player needs to make when building a character.`;
    
    const context = await ragSystem.getContext(sourceName, query, { aspects: ['characterCreation'] });
    
    // Ask LM Studio to extract the stages from the context
    const prompt = `Based on the following RPG rulebook context about character creation, identify all the distinct stages or steps that a player should follow when creating a new character.

Context:
${context}

Please provide your answer as a numbered list of character creation stages. For each stage, include:
1. A clear name for the stage
2. What decisions or actions are involved in this stage

Format your response as a structured list that I can use programmatically.`;
    
    const response = await getLMStudioResponse(prompt, []);
    return response;
  } catch (error) {
    console.error('Error getting character creation stages:', error);
    // Return default stages if RAG fails
    return CHARACTER_STAGES.map(s => `${s.id}: ${s.name}`).join('\n');
  }
}

/**
 * Generate a specific stage of the character using RAG context
 */
async function generateCharacterStage(ragSystem, sourceName, stageId, stageName, specifications, existingCharacter = {}) {
  try {
    // Build context query based on stage
    let query;
    switch (stageId) {
      case 'characterCreationOverview':
        query = `What are the steps and stages for character creation? What is the recommended order?`;
        break;
      case 'coreIdentity':
        query = `What species/race options are available? What classes or backgrounds can a character have?`;
        break;
      case 'attributes':
        query = `How are character attributes or stats determined? What methods does the system use?`;
        break;
      case 'skillsAndProficiencies':
        query = `What skills, abilities, and proficiencies can a character select? How do they work?`;
        break;
      case 'equipment':
        query = `What equipment options are available for characters? What starting gear should they have?`;
        break;
      case 'backstory':
        query = `How should a character's background be created? What elements make a good backstory?`;
        break;
      default:
        query = `What information is needed for ${stageName}?`;
    }
    
    // Get context from RAG system
    const context = await ragSystem.getContext(sourceName, query, { aspects: ['characterCreation'] });
    
    // Build the generation prompt
    const existingCharacterStr = Object.keys(existingCharacter).length > 0 
      ? `\n\nExisting Character Information:\n${JSON.stringify(existingCharacter, null, 2)}`
      : '';
    
    const specificationsStr = specifications 
      ? `\n\nUser Specifications:\n${specifications}`
      : '';
    
    const prompt = `You are generating a character for an RPG system. You are currently working on the "${stageName}" stage.

${existingCharacterStr}
${specificationsStr}

RPG Rulebook Context:
${context}

Your Task:
1. Use ONLY information from the provided context to make decisions
2. If the context doesn't specify something, use reasonable defaults that fit the RPG system
3. Be creative and original within the constraints of the system
4. Focus on this specific stage - don't generate other parts yet

Please provide your response in a clear, structured format that I can parse programmatically.`;
    
    const response = await getLMStudioResponse(prompt, []);
    return { success: true, data: response };
  } catch (error) {
    console.error(`Error generating character stage ${stageId}:`, error);
    return { 
      success: false, 
      error: `Failed to generate ${stageName}: ${error.message}` 
    };
  }
}

/**
 * Parse the generated character data and integrate it into the character object
 */
function parseCharacterStageResponse(stageId, responseText, existingCharacter = {}) {
  const character = { ...existingCharacter };
  
  // Try to extract structured information from the response
  try {
    switch (stageId) {
      case 'coreIdentity':
        // Look for species/race and class/background information
        if (responseText.toLowerCase().includes('species') || responseText.toLowerCase().includes('race')) {
          const speciesMatch = responseText.match(/(?:species|race)[^\n:]*[:\s]*(.+)/i);
          if (speciesMatch) character.species = speciesMatch[1].trim();
        }
        
        if (responseText.toLowerCase().includes('class') || responseText.toLowerCase().includes('background')) {
          const classMatch = responseText.match(/(?:class|background)[^\n:]*[:\s]*(.+)/i);
          if (classMatch) character.class = classMatch[1].trim();
        }
        
        // If no structured data found, store the raw response
        if (!character.species && !character.class) {
          character.coreIdentity = responseText;
        }
        break;
        
      case 'attributes':
        // Look for attribute values
        const attributeMatches = responseText.match(/(\w+)[^\d]*(\d+)/g);
        if (attributeMatches) {
          character.attributes = {};
          attributeMatches.forEach(match => {
            const parts = match.split(/\D+/).filter(Boolean);
            if (parts.length >= 2) {
              const name = parts[0];
              const value = parseInt(parts[1], 10);
              character.attributes[name] = value;
            }
          });
        }
        
        // If no structured data found, store the raw response
        if (!character.attributes) {
          character.attributeGeneration = responseText;
        }
        break;
        
      case 'skillsAndProficiencies':
        // Look for skill lists
        const skillMatches = responseText.match(/(?:skill|ability)[^\n]*[:\s]*(.+)/gi);
        if (skillMatches && skillMatches.length > 0) {
          character.skills = skillMatches.map(m => m.replace(/^(?:skill|ability)[^\n]*[:\s]*/i, '').trim());
        }
        
        // If no structured data found, store the raw response
        if (!character.skills) {
          character.skillSelection = responseText;
        }
        break;
        
      case 'equipment':
        // Look for equipment lists
        const equipmentMatches = responseText.match(/(?:equipment|item)[^\n]*[:\s]*(.+)/gi);
        if (equipmentMatches && equipmentMatches.length > 0) {
          character.equipment = equipmentMatches.map(m => m.replace(/^(?:equipment|item)[^\n]*[:\s]*/i, '').trim());
        }
        
        // If no structured data found, store the raw response
        if (!character.equipment) {
          character.equipmentSelection = responseText;
        }
        break;
        
      case 'backstory':
        // Store backstory directly
        character.backstory = responseText;
        break;
        
      default:
        // For other stages, store the raw response
        character[stageId] = responseText;
    }
  } catch (error) {
    console.error(`Error parsing ${stageId} response:`, error);
  }
  
  return character;
}

/**
 * Generate a complete character using the enhanced RAG system
 */
async function generateCharacterWithProgress(specifications, sourceName, channelId) {
  try {
    // Initialize progress tracking
    const progressMessages = [];
    
    // Step 1: Get or create the enhanced RAG system
    let ragSystem;
    try {
      console.log(`[Character] Setting up enhanced RAG system for ${sourceName}...`);
      
      // Check if we have pre-analyzed summaries
      const analysisPath = `./analysis-results/${sourceName}-analysis.json`;
      const fs = await import('fs');
      
      if (fs.existsSync(analysisPath)) {
        console.log(`[Character] Loading existing analysis for ${sourceName}...`);
        const analysisData = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
        ragSystem = createEnhancedRAGFromAnalysis(analysisData);
      } else {
        // Create a new RAG system from the PDF
        console.log(`[Character] Analyzing document for ${sourceName}...`);
        
        const pdfPath = `./ragsourcebooks/${sourceName}.pdf`;
        if (!fs.existsSync(pdfPath)) {
          throw new Error(`PDF file not found: ${pdfPath}`);
        }
        
        // Extract text and analyze
        const text = await extractTextFromPDF(pdfPath);
        const analysisResult = await analyzeDocument(text, sourceName);
        ragSystem = createEnhancedRAGFromAnalysis(analysisResult);
      }
      
      progressMessages.push('✅ RAG system initialized');
    } catch (error) {
      console.error('[Character] Error setting up RAG system:', error);
      return { 
        success: false, 
        error: `Failed to initialize RAG system: ${error.message}` 
      };
    }
    
    // Step 2: Get character creation stages
    let stages;
    try {
      progressMessages.push('🔍 Identifying character creation stages...');
      
      const stagesResponse = await retryWithAttempts(() => 
        getCharacterCreationStages(ragSystem, sourceName)
      );
      
      stages = stagesResponse;
      progressMessages.push(`📋 Character creation has ${stages.split('\n').filter(l => l.trim()).length} main stages`);
    } catch (error) {
      console.error('[Character] Error getting stages:', error);
      stages = CHARACTER_STAGES.map(s => `${s.id}: ${s.name}`).join('\n');
      progressMessages.push('⚠️ Using default character creation stages');
    }
    
    // Step 3: Generate each stage of the character
    const character = {};
    let completedStages = [];
    
    for (const stage of CHARACTER_STAGES) {
      try {
        progressMessages.push(`⏳ Generating ${stage.name}...`);
        
        const result = await retryWithAttempts(() => 
          generateCharacterStage(ragSystem, sourceName, stage.id, stage.name, specifications, character)
        );
        
        if (result.success) {
          // Parse and integrate the response
          parseCharacterStageResponse(stage.id, result.data, character);
          completedStages.push(stage.name);
          progressMessages.push(`✅ Completed ${stage.name}`);
        } else {
          console.warn(`[Character] Failed to complete stage: ${stage.name}`, result.error);
          progressMessages.push(`⚠️ Skipped ${stage.name} due to error`);
        }
      } catch (error) {
        console.error(`[Character] Error in stage ${stage.id}:`, error);
        progressMessages.push(`❌ Error in ${stage.name}: ${error.message}`);
      }
    }
    
    // Step 4: Generate the final character sheet
    try {
      progressMessages.push('📝 Formatting final character sheet...');
      
      const context = await ragSystem.getContext(sourceName, 'What is the proper format for a character sheet?', { aspects: ['characterCreation'] });
      
      const characterJson = JSON.stringify(character, null, 2);
      
      const prompt = `You have generated an RPG character using the enhanced RAG system. Now you need to format it as a final character sheet.

Character Data:
${characterJson}

RPG Rulebook Context for Formatting:
${context}

User Specifications (if any):
${specifications || 'None'}

Your Task:
1. Format the character information into a clean, readable markdown document
2. Include all the key sections: Core Identity, Attributes/Stats, Skills, Equipment, and Backstory
3. Use appropriate markdown formatting with headers, lists, and emphasis
4. Make it look like a proper RPG character sheet
5. Do NOT include any of the generation process or internal notes

Please output only the formatted character sheet in markdown format.`;
      
      const finalSheet = await getLMStudioResponse(prompt, []);
      
      progressMessages.push('✨ Character generation complete!');
      
      return {
        success: true,
        formattedSheet: finalSheet,
        completedStages,
        progressMessages
      };
    } catch (error) {
      console.error('[Character] Error formatting final sheet:', error);
      return {
        success: false,
        error: `Failed to format character sheet: ${error.message}`,
        completedStages,
        progressMessages
      };
    }
  } catch (error) {
    console.error('[Character] Unexpected error:', error);
    return { 
      success: false, 
      error: `Unexpected error during character generation: ${error.message}` 
    };
  }
}

/**
 * Export the main function for use in app.js
 */
export { generateCharacterWithProgress };

// For testing purposes
if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].includes('character-generator')) {
  console.log('Character generator module loaded');
}
