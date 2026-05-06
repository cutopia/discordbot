/**
 * Character Generation Agent Module
 * Manages the agentic loop for RPG character creation with step limits,
 * RAG integration, dice rolls, and validation.
 */

// Import dice module for proper dice roll handling
import { processDiceRoll } from './dice.js';

// Import RAG functions
import { queryVectorStore, getOrCreateVectorStore } from './rag.js';

// Maximum steps in the generation loop to prevent infinite loops
const DEFAULT_MAX_STEPS = 8;

/**
 * Character Generation Agent Class
 * Handles the multi-step character creation process with state management
 */
export class CharacterGenerationAgent {
  /**
   * Create a new character generation agent
   * @param {object} options - Configuration options
   * @param {number} options.maxSteps - Maximum steps in generation loop (default: 8)
   */
  constructor(options = {}) {
    this.maxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
    this.currentStep = 0;
    
    // Character data being built during generation
    this.characterData = {
      race: null,
      class: null,
      background: null,
      abilityScores: {}, // Will be populated from RAG context or defaults
      skills: [],
      equipment: [],
      personalityTraits: [],
      backstory: '',
      otherNotes: []
    };
    
    // Attribute system information (extracted from RAG context)
    this.attributeSystem = null;
    
    // RAG context for world-building consistency
    this.ragContext = [];
    
    // Dice rolls made during generation (for history and validation)
    this.diceRolls = [];
    
    // Step execution history
    this.stepHistory = [];
    
    // Error tracking
    this.errors = [];
  }
  
  /**
   * Initialize the agent with specifications and RAG source
   * @param {string} specifications - User-provided character specs (race, class, etc.)
   * @param {string|null} ragSource - Path to active RAG PDF document (null for no RAG)
   */
  async initialize(specifications = '', ragSource) {
    this.currentStep = 0;
    // Reset character data with empty abilityScores (will be populated from RAG context)
    this.characterData = {
      race: null,
      class: null,
      background: null,
      abilityScores: {},
      skills: [],
      equipment: [],
      personalityTraits: [],
      backstory: '',
      otherNotes: []
    };
    // Reset attribute system (will be extracted from RAG context)
    this.attributeSystem = null;
    this.ragContext = [];
    this.diceRolls = [];
    this.stepHistory = [];
    this.errors = [];
    
    // Parse user specifications if provided
    if (specifications.trim()) {
      this.characterData.otherNotes.push(`User request: ${specifications}`);
    }
    
    // Retrieve RAG context for world-building consistency
    if (ragSource) {
      try {
        console.log(`[Agent] Retrieving RAG context for "${ragSource}"...`);
        
        // Ensure vector store exists for this source
        await getOrCreateVectorStore(ragSource);
        
        // Use the correct source name (filename without path and extension)
        const sourceName = ragSource.replace(/^.*[\\/]/, '').replace(/\.pdf$/, '');
        
        // Get all available races in this world
        const raceContext = await queryVectorStore(sourceName, 'What races are available in this world? List all playable races with their key characteristics.', 3);
        if (raceContext.length > 0) {
          this.ragContext.push({
            type: 'races',
            documents: raceContext
          });
          console.log(`[Agent] Retrieved ${raceContext.length} race context document(s)`);
        }
        
        // Get all available classes in this world
        const classContext = await queryVectorStore(sourceName, 'What classes are available in this world? List all playable classes with their key features.', 3);
        if (classContext.length > 0) {
          this.ragContext.push({
            type: 'classes',
            documents: classContext
          });
          console.log(`[Agent] Retrieved ${classContext.length} class context document(s)`);
        }
        
        // Get all available backgrounds in this world
        const backgroundContext = await queryVectorStore(sourceName, 'What backgrounds are available for characters in this setting?', 3);
        if (backgroundContext.length > 0) {
          this.ragContext.push({
            type: 'backgrounds',
            documents: backgroundContext
          });
          console.log(`[Agent] Retrieved ${backgroundContext.length} background context document(s)`);
        }
        
        // Get attribute/ability score system from RAG context (MUST be done before ability scores are filled)
        const attributeSystem = await this.extractAttributeSystem(sourceName);
        if (attributeSystem && attributeSystem.attributes && attributeSystem.attributes.length > 0) {
          // Initialize abilityScores with the extracted attributes
          this.characterData.abilityScores = {};
          for (const attr of attributeSystem.attributes) {
            this.characterData.abilityScores[attr] = null;
          }
          this.attributeSystem = attributeSystem;
          console.log(`[Agent] Using ${attributeSystem.name} attribute system: ${Object.keys(this.characterData.abilityScores).join(', ')}`);
        } else {
          // Fallback to a minimal default if no RAG context available
          // Use a simple generic system that can work with any dice method
          this.attributeSystem = {
            name: 'Generic System',
            attributes: ['Attribute 1', 'Attribute 2', 'Attribute 3'],
            diceMethod: '4d6dl1'
          };
          this.characterData.abilityScores = {};
          for (const attr of this.attributeSystem.attributes) {
            this.characterData.abilityScores[attr] = null;
          }
          console.log(`[Agent] No attribute system found in RAG context, using generic fallback with ${this.attributeSystem.attributes.length} attributes`);
        }
        
        // Get ability score generation rules (for dice method)
        const abilityContext = await queryVectorStore(sourceName, 'How do ability scores work in this system? What is the standard method for generating them?', 2);
        if (abilityContext.length > 0) {
          this.ragContext.push({
            type: 'ability_scores',
            documents: abilityContext
          });
          console.log(`[Agent] Retrieved ${abilityContext.length} ability score context document(s)`);
        }
        
        // Get personality trait guidelines for this world
        const personalityContext = await queryVectorStore(sourceName, 'What personality traits would be appropriate for characters in this setting?', 2);
        if (personalityContext.length > 0) {
          this.ragContext.push({
            type: 'personality',
            documents: personalityContext
          });
          console.log(`[Agent] Retrieved ${personalityContext.length} personality context document(s)`);
        }
        
        // Get backstory guidelines for this world
        const backstoryContext = await queryVectorStore(sourceName, 'What kinds of backstories are common in this world setting?', 2);
        if (backstoryContext.length > 0) {
          this.ragContext.push({
            type: 'backstories',
            documents: backstoryContext
          });
          console.log(`[Agent] Retrieved ${backstoryContext.length} backstory context document(s)`);
        }
        
      } catch (error) {
        console.error('[Agent] Error retrieving RAG context:', error);
        // Fallback to generic system if RAG fails
        this.attributeSystem = {
          name: 'Generic System',
          attributes: ['Attribute 1', 'Attribute 2', 'Attribute 3'],
          diceMethod: '4d6dl1'
        };
        this.characterData.abilityScores = {};
        for (const attr of this.attributeSystem.attributes) {
          this.characterData.abilityScores[attr] = null;
        }
      }
    } else {
      console.log('[Agent] No RAG source specified, using generic fallback system');
      // Fallback to a minimal default if no RAG source provided
      this.attributeSystem = {
        name: 'Generic System',
        attributes: ['Attribute 1', 'Attribute 2', 'Attribute 3'],
        diceMethod: '4d6dl1'
      };
      this.characterData.abilityScores = {};
      for (const attr of this.attributeSystem.attributes) {
        this.characterData.abilityScores[attr] = null;
      }
    }
    
    console.log('Character generation agent initialized');
  }
  
  /**
   * Generate the next step in character creation
   * @returns {Promise<object>} Result of the generation step
   */
  async generateNextStep() {
    this.currentStep++;
    
    if (this.currentStep > this.maxSteps) {
      return {
        success: false,
        error: `Maximum steps (${this.maxSteps}) reached. Generation incomplete.`,
        completed: true
      };
    }
    
    // Determine what step to execute based on current state
    const stepResult = await this.executeGenerationStep();
    
    if (stepResult.success) {
      this.stepHistory.push({
        step: this.currentStep,
        action: stepResult.action,
        result: stepResult.result
      });
    } else {
      this.errors.push({
        step: this.currentStep,
        error: stepResult.error
      });
    }
    
    return stepResult;
  }
  
  /**
   * Execute a specific generation step based on current state
   * @returns {Promise<object>} Result of the generation step
   */
  async executeGenerationStep() {
    // Step 1-2: Determine race and class if not specified
    if (!this.characterData.race) {
      return await this.determineRace();
    }
    
    if (!this.characterData.class) {
      return await this.determineClass();
    }
    
    // Step 3: Calculate ability scores (always use dice)
    if (this.abilityScoresUnfilled()) {
      return await this.calculateAbilityScores();
    }
    
    // Step 4-5: Background, skills, equipment
    if (!this.characterData.background) {
      return await this.determineBackground();
    }
    
    // Step 6-7: Personality traits and backstory
    if (this.characterData.personalityTraits.length === 0) {
      return await this.generatePersonalityTraits();
    }
    
    if (!this.characterData.backstory) {
      return await this.generateBackstory();
    }
    
    // Step 8: Final review and validation
    if (this.currentStep >= this.maxSteps - 1) {
      return await this.finalizeCharacter();
    }
    
    // Default: Generate additional details
    return await this.generateAdditionalDetails();
  }
  
  /**
   * Extract attribute system from RAG context
   * @param {string} sourceName - Name of the RAG source
   * @returns {Promise<object|null>} Attribute system information or null if not found
   */
  async extractAttributeSystem(sourceName) {
    try {
      // Query for attribute/ability score system
      const query = 'What are the attributes or ability scores in this system? List all attribute names and their descriptions.';
      const docs = await queryVectorStore(sourceName, query, 3);
      
      if (docs.length === 0) {
        console.log('[Agent] No attribute system found in RAG context');
        return null;
      }
      
      // Build a prompt for the LLM to extract attributes from context
      const contextText = docs.map(doc => doc.content).join('\n\n');
      const prompt = `Based on the following world context, identify all attributes or ability scores used in this system. 
Return only the attribute names as a comma-separated list (e.g., "CHARISMA, AGILITY, STRENGTH, EDUCATION").
Do not include any descriptions or explanations.

World Context:
${contextText}

Attributes:`;
      
      // Import getLMStudioResponse for LLM-based extraction
      const { getLMStudioResponse } = await import('./lmstudio.js');
      const response = await getLMStudioResponse(prompt);
      
      // Parse the response to extract attribute names
      const attributes = response.split(',')
        .map(attr => attr.trim().toUpperCase())
        .filter(attr => {
          // Filter out empty strings and common non-attribute words
          return attr.length > 2 && 
                 !attr.toLowerCase().includes('not found') && 
                 !attr.toLowerCase().includes('no attributes') &&
                 !attr.toLowerCase().includes('attributes are') &&
                 !attr.toLowerCase().includes('the attributes');
        });
      
      if (attributes.length === 0) {
        console.log('[Agent] Could not parse attributes from LLM response, using defaults');
        return null;
      }
      
      console.log(`[Agent] Extracted ${attributes.length} attributes from RAG context: ${attributes.join(', ')}`);
      
      // Determine dice method for this attribute system
      const diceMethodQuery = 'What is the standard method for generating attribute scores in this system? Answer with dice notation like "4d6dl1", "3d6", etc. If attributes are assigned directly (like 1-4), say "direct assignment".';
      const diceDocs = await queryVectorStore(sourceName, diceMethodQuery, 2);
      
      let diceMethod = '4d6dl1'; // Default
      if (diceDocs.length > 0) {
        const diceContext = diceDocs.map(doc => doc.content).join('\n\n');
        
        // Check for direct assignment indicators in the context itself first
        const hasDirectAssignmentIndicators = 
          diceContext.toLowerCase().includes('assign') ||
          diceContext.toLowerCase().includes('put one of these numbers into each') ||
          diceContext.toLowerCase().includes('1, 2, 3, and 4') ||
          diceContext.toLowerCase().includes('score between 1 and');
        
        if (hasDirectAssignmentIndicators) {
          diceMethod = 'direct';
          console.log(`[Agent] Using attribute generation method: direct assignment (detected from context)`);
        } else {
          const dicePrompt = `Based on the following context, what is the standard method for generating attribute scores? 
Answer with:
- Dice notation like "4d6dl1", "3d6" if rolling dice
- "direct assignment" if players assign values directly (like 1-4 scale)
- "point buy" if using point buy system

Context:
${diceContext}

Dice method:`;
          
          try {
            const diceResponse = await getLMStudioResponse(dicePrompt);
            
            // Check for direct assignment
            if (diceResponse.toLowerCase().includes('direct assignment') || 
                diceResponse.toLowerCase().includes('assign')) {
              diceMethod = 'direct';
              console.log(`[Agent] Using attribute generation method: direct assignment`);
            } else {
              const parsedMethod = diceResponse.match(/(\d+d\d+(dl\d+)?)/i);
              if (parsedMethod) {
                diceMethod = parsedMethod[0];
                console.log(`[Agent] Using attribute generation method: ${diceMethod}`);
              }
            }
          } catch (error) {
            console.error('[Agent] Error determining dice method:', error);
          }
        }
      }
      
      // Determine system name based on attributes
      let systemName = 'Custom';
      if (attributes.length === 4 && 
          attributes.includes('CHARISMA') && 
          attributes.includes('AGILITY') && 
          attributes.includes('STRENGTH') && 
          attributes.includes('EDUCATION')) {
        systemName = 'CASE File';
      }
      
      return {
        name: systemName,
        attributes,
        diceMethod
      };
    } catch (error) {
      console.error('[Agent] Error extracting attribute system from RAG context:', error);
      // Return null to indicate extraction failed - caller should handle fallback
      return null;
    }
  }
  
  /**
   * Check if ability scores are unfilled
   * @returns {boolean} True if any ability score is null
   */
  abilityScoresUnfilled() {
    const scores = this.characterData.abilityScores;
    return Object.values(scores).some(score => score === null);
  }
  
  /**
   * Determine character race (Step 1)
   * @returns {Promise<object>} Result of race determination
   */
  async determineRace() {
    // Extract available races from RAG context if available
    let availableRaces = [];
    
    const raceContext = this.ragContext.find(ctx => ctx.type === 'races');
    if (raceContext && raceContext.documents.length > 0) {
      console.log('[Agent] Using RAG context to determine available races');
      
      // Build a prompt for the LLM to extract races from context
      const contextText = raceContext.documents.map(doc => doc.content).join('\n\n');
      const prompt = `Based on the following world context, list all playable races. Return only the race names as a comma-separated list.
      
World Context:
${contextText}

Available races:`;
      
      try {
        // Import getLMStudioResponse for LLM-based extraction
        const { getLMStudioResponse } = await import('./lmstudio.js');
        const response = await getLMStudioResponse(prompt);
        
        // Parse the response to extract race names
        availableRaces = response.split(',').map(r => r.trim()).filter(r => r.length > 0 && !r.toLowerCase().includes('not found') && !r.toLowerCase().includes('no races'));
        
        if (availableRaces.length === 0) {
          // Fallback to default if parsing fails
          availableRaces = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Tiefling'];
          console.log('[Agent] Could not parse races from LLM response, using defaults');
        } else {
          console.log(`[Agent] Extracted ${availableRaces.length} races from RAG context: ${availableRaces.join(', ')}`);
        }
      } catch (error) {
        console.error('[Agent] Error extracting races from RAG context:', error);
        // Fallback to default if LLM fails
        availableRaces = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Tiefling'];
      }
    } else {
      console.log('[Agent] No RAG race context available, using defaults');
      availableRaces = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Tiefling'];
    }
    
    // Select a random race from the available options
    const race = availableRaces[Math.floor(Math.random() * availableRaces.length)];
    
    this.characterData.race = race;
    
    return {
      success: true,
      action: 'determine_race',
      result: `Selected race: ${race}`
    };
  }
  
  /**
   * Determine character class (Step 2)
   * @returns {Promise<object>} Result of class determination
   */
  async determineClass() {
    // Extract available classes from RAG context if available
    let availableClasses = [];
    
    const classContext = this.ragContext.find(ctx => ctx.type === 'classes');
    if (classContext && classContext.documents.length > 0) {
      console.log('[Agent] Using RAG context to determine available classes');
      
      // Build a prompt for the LLM to extract classes from context
      const contextText = classContext.documents.map(doc => doc.content).join('\n\n');
      const prompt = `Based on the following world context, list all playable classes. Return only the class names as a comma-separated list.
      
World Context:
${contextText}

Available classes:`;
      
      try {
        // Import getLMStudioResponse for LLM-based extraction
        const { getLMStudioResponse } = await import('./lmstudio.js');
        const response = await getLMStudioResponse(prompt);
        
        // Parse the response to extract class names
        availableClasses = response.split(',').map(c => c.trim()).filter(c => c.length > 0 && !c.toLowerCase().includes('not found') && !c.toLowerCase().includes('no classes'));
        
        if (availableClasses.length === 0) {
          // Fallback to default if parsing fails
          availableClasses = ['Fighter', 'Wizard', 'Cleric', 'Rogue', 'Barbarian', 'Bard', 'Paladin', 'Ranger'];
          console.log('[Agent] Could not parse classes from LLM response, using defaults');
        } else {
          console.log(`[Agent] Extracted ${availableClasses.length} classes from RAG context: ${availableClasses.join(', ')}`);
        }
      } catch (error) {
        console.error('[Agent] Error extracting classes from RAG context:', error);
        // Fallback to default if LLM fails
        availableClasses = ['Fighter', 'Wizard', 'Cleric', 'Rogue', 'Barbarian', 'Bard', 'Paladin', 'Ranger'];
      }
    } else {
      console.log('[Agent] No RAG class context available, using defaults');
      availableClasses = ['Fighter', 'Wizard', 'Cleric', 'Rogue', 'Barbarian', 'Bard', 'Paladin', 'Ranger'];
    }
    
    // Select a random class from the available options
    const charClass = availableClasses[Math.floor(Math.random() * availableClasses.length)];
    
    this.characterData.class = charClass;
    
    return {
      success: true,
      action: 'determine_class',
      result: `Selected class: ${charClass}`
    };
  }
  
  /**
   * Calculate ability scores using dice rolls (Step 3)
   * Uses RAG context to determine the correct method for this world
   * @returns {Promise<object>} Result of ability score calculation
   */
  async calculateAbilityScores() {
    const scores = {};
    
    // Verify we have an attribute system - it should be set during initialization
    if (!this.attributeSystem || !this.attributeSystem.diceMethod) {
      console.warn('[Agent] No attribute system found, using generic fallback');
      this.attributeSystem = {
        name: 'Generic System',
        attributes: Object.keys(this.characterData.abilityScores),
        diceMethod: '4d6dl1'
      };
    }
    
    const method = this.attributeSystem.diceMethod;
    console.log(`[Agent] Using ${this.attributeSystem.name} attribute system with method: ${method}`);
    
    // Roll dice for each attribute in the system (or use direct assignment)
    const attributes = this.attributeSystem.attributes;
    
    if (method === 'direct') {
      console.log('[Agent] Using direct assignment for attribute scores');
      
      // For direct assignment systems, generate random values within the valid range
      // CASE File uses 1-4 scale
      const minScore = this.attributeSystem && this.attributeSystem.name === 'CASE File' ? 1 : 3;
      const maxScore = this.attributeSystem && this.attributeSystem.name === 'CASE File' ? 4 : 18;
      
      for (const attrName of attributes) {
        // Generate a random score within the valid range
        const score = Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore;
        scores[attrName] = score;
        
        this.diceRolls.push({
          notation: 'direct',
          result: { total: score, rolls: [], dropped: 0 }
        });
      }
    } else {
      // Use dice rolling for other systems
      for (const attrName of attributes) {
        const rollResult = this.rollDiceForAbilityScore(method);
        
        if (rollResult.error) {
          return {
            success: false,
            error: `Failed to calculate ${attrName}: ${rollResult.error}`
          };
        }
        
        scores[attrName] = rollResult.total;
        this.diceRolls.push({
          notation: method,
          result: rollResult
        });
      }
    }
    
    this.characterData.abilityScores = scores;
    
    return {
      success: true,
      action: 'calculate_ability_scores',
      result: `Attribute scores calculated using ${method} method`,
      details: {
        scores,
        diceRolls: this.diceRolls.length
      }
    };
  }
  
  /**
   * Roll dice for a single ability score
   * Uses the enhanced dice.js module for proper dice roll handling
   * @param {string} notation - Dice notation (default: '4d6dl1')
   * @returns {object} Roll results including total after dropping lowest
   */
  rollDiceForAbilityScore(notation = '4d6dl1') {
    // Use processDiceRoll with the specified notation
    const result = processDiceRoll(notation);
    
    if (!result.success) {
      console.error('Dice roll failed:', result.error);
      
      return {
        rolls: [],
        dropped: 0,
        total: null,
        error: result.error
      };
    }
    
    // Return the detailed results from dice module
    return {
      rolls: result.details.allRolls || [], // All rolled values
      keptRolls: result.details.keptRolls || [], // Values after dropping lowest
      dropped: result.details.droppedLowest[0] || 0, // The lowest value that was dropped
      total: result.details.total,
      notation: notation,
      processedByDiceModule: true
    };
  }
  
  /**
   * Determine character background (Step 4)
   * @returns {Promise<object>} Result of background determination
   */
  async determineBackground() {
    // Extract available backgrounds from RAG context if available
    let availableBackgrounds = [];
    
    const backgroundContext = this.ragContext.find(ctx => ctx.type === 'backgrounds');
    if (backgroundContext && backgroundContext.documents.length > 0) {
      console.log('[Agent] Using RAG context to determine available backgrounds');
      
      // Build a prompt for the LLM to extract backgrounds from context
      const contextText = backgroundContext.documents.map(doc => doc.content).join('\n\n');
      const prompt = `Based on the following world context, list all available backgrounds. Return only the background names as a comma-separated list.
      
World Context:
${contextText}

Available backgrounds:`;
      
      try {
        // Import getLMStudioResponse for LLM-based extraction
        const { getLMStudioResponse } = await import('./lmstudio.js');
        const response = await getLMStudioResponse(prompt);
        
        // Parse the response to extract background names
        availableBackgrounds = response.split(',').map(b => b.trim()).filter(b => b.length > 0 && !b.toLowerCase().includes('not found') && !b.toLowerCase().includes('no backgrounds'));
        
        if (availableBackgrounds.length === 0) {
          // Fallback to default if parsing fails
          availableBackgrounds = [
            'Acolyte',
            'Charlatan',
            'Criminal',
            'Entertainer',
            'Folk Hero',
            'Guild Artisan',
            'Hermit',
            'Noble',
            'Outlander',
            'Sage',
            'Sailor',
            'Soldier',
            'Urchin'
          ];
          console.log('[Agent] Could not parse backgrounds from LLM response, using defaults');
        } else {
          console.log(`[Agent] Extracted ${availableBackgrounds.length} backgrounds from RAG context: ${availableBackgrounds.join(', ')}`);
        }
      } catch (error) {
        console.error('[Agent] Error extracting backgrounds from RAG context:', error);
        // Fallback to default if LLM fails
        availableBackgrounds = [
          'Acolyte',
          'Charlatan',
          'Criminal',
          'Entertainer',
          'Folk Hero',
          'Guild Artisan',
          'Hermit',
          'Noble',
          'Outlander',
          'Sage',
          'Sailor',
          'Soldier',
          'Urchin'
        ];
      }
    } else {
      console.log('[Agent] No RAG background context available, using defaults');
      availableBackgrounds = [
        'Acolyte',
        'Charlatan',
        'Criminal',
        'Entertainer',
        'Folk Hero',
        'Guild Artisan',
        'Hermit',
        'Noble',
        'Outlander',
        'Sage',
        'Sailor',
        'Soldier',
        'Urchin'
      ];
    }
    
    // Select a random background from the available options
    const background = availableBackgrounds[Math.floor(Math.random() * availableBackgrounds.length)];
    
    this.characterData.background = background;
    
    return {
      success: true,
      action: 'determine_background',
      result: `Selected background: ${background}`
    };
  }
  
  /**
   * Generate personality traits (Step 5)
   * @returns {Promise<object>} Result of personality trait generation
   */
  async generatePersonalityTraits() {
    // Use RAG context to generate world-appropriate personality traits if available
    const personalityContext = this.ragContext.find(ctx => ctx.type === 'personality');
    
    if (personalityContext && personalityContext.documents.length > 0) {
      console.log('[Agent] Using RAG context to generate personality traits');
      
      // Build a prompt for the LLM to generate personality traits
      const contextText = personalityContext.documents.map(doc => doc.content).join('\n\n');
      const prompt = `Based on the following world context, generate 2-4 personality traits that would be appropriate for characters in this setting. Each trait should be a short phrase (10-20 words) describing a character's behavior or outlook.

World Context:
${contextText}

Personality Traits (return as numbered list):`;
      
      try {
        // Import getLMStudioResponse for LLM-based generation
        const { getLMStudioResponse } = await import('./lmstudio.js');
        const response = await getLMStudioResponse(prompt);
        
        // Parse the response to extract personality traits
        this.characterData.personalityTraits = response.split('\n')
          .map(line => line.trim())
          .filter(line => {
            // Filter out lines that don't look like traits
            return line.length > 10 && 
                   !line.toLowerCase().includes('based on') &&
                   !line.toLowerCase().includes('world context') &&
                   !line.toLowerCase().includes('personality traits');
          })
          .slice(0, 4); // Limit to 4 traits
        
        if (this.characterData.personalityTraits.length === 0) {
          // Fallback to default if parsing fails
          this.characterData.personalityTraits = [
            'I idolize a particular hero of my class and constantly try to imitate their deeds.',
            'I am always calm, no matter what the situation. I never raise my voice or lose my temper.'
          ];
          console.log('[Agent] Could not parse personality traits from LLM response, using defaults');
        } else {
          console.log(`[Agent] Generated ${this.characterData.personalityTraits.length} personality traits from RAG context`);
        }
      } catch (error) {
        console.error('[Agent] Error generating personality traits from RAG context:', error);
        // Fallback to default if LLM fails
        this.characterData.personalityTraits = [
          'I idolize a particular hero of my class and constantly try to imitate their deeds.',
          'I am always calm, no matter what the situation. I never raise my voice or lose my temper.'
        ];
      }
    } else {
      console.log('[Agent] No RAG personality context available, using defaults');
      // Fallback to default traits
      this.characterData.personalityTraits = [
        'I idolize a particular hero of my class and constantly try to imitate their deeds.',
        'I am always calm, no matter what the situation. I never raise my voice or lose my temper.'
      ];
    }
    
    return {
      success: true,
      action: 'generate_personality_traits',
      result: `Generated ${this.characterData.personalityTraits.length} personality traits`
    };
  }
  
  /**
   * Generate character backstory (Step 6)
   * @returns {Promise<object>} Result of backstory generation
   */
  async generateBackstory() {
    // Use RAG context to generate world-appropriate backstory if available
    const backstoryContext = this.ragContext.find(ctx => ctx.type === 'backstories');
    
    if (backstoryContext && backstoryContext.documents.length > 0) {
      console.log('[Agent] Using RAG context to generate backstory');
      
      // Build a prompt for the LLM to generate a backstory
      const contextText = backstoryContext.documents.map(doc => doc.content).join('\n\n');
      const prompt = `Based on the following world context, generate a short (2-3 sentence) character backstory that fits this setting. The character is a ${this.characterData.race} ${this.characterData.class} with a background as a ${this.characterData.background}. Make the backstory unique and appropriate for this world.

World Context:
${contextText}

Character Backstory:`;
      
      try {
        // Import getLMStudioResponse for LLM-based generation
        const { getLMStudioResponse } = await import('./lmstudio.js');
        const response = await getLMStudioResponse(prompt);
        
        // Clean up the response to get a clean backstory
        this.characterData.backstory = response.trim()
          .split('\n')[0] // Take first line as main backstory
          .replace(/^Character Backstory:\s*/i, '') // Remove prompt prefix if present
          .trim();
        
        if (!this.characterData.backstory || this.characterData.backstory.length < 20) {
          // Fallback to default if parsing fails
          this.characterData.backstory = `My family has been ${this.characterData.background}s for generations, but I chose a different path. Now I seek fortune and glory as an adventurer.`;
          console.log('[Agent] Could not parse backstory from LLM response, using defaults');
        } else {
          console.log(`[Agent] Generated backstory from RAG context (${this.characterData.backstory.length} chars)`);
        }
      } catch (error) {
        console.error('[Agent] Error generating backstory from RAG context:', error);
        // Fallback to default if LLM fails
        this.characterData.backstory = `My family has been ${this.characterData.background}s for generations, but I chose a different path. Now I seek fortune and glory as an adventurer.`;
      }
    } else {
      console.log('[Agent] No RAG backstory context available, using defaults');
      // Fallback to default backstories
      this.characterData.backstory = `My family has been ${this.characterData.background}s for generations, but I chose a different path. Now I seek fortune and glory as an adventurer.`;
    }
    
    return {
      success: true,
      action: 'generate_backstory',
      result: 'Generated character backstory'
    };
  }
  
  /**
   * Generate additional details (Step 7)
   * @returns {Promise<object>} Result of additional detail generation
   */
  async generateAdditionalDetails() {
    // TODO: Use RAG context to add world-specific equipment and skills
    
    // Add some default equipment based on class
    const defaultEquipment = {
      Fighter: ['Chain mail', 'Sword', 'Shield', 'Dungeoneer\'s pack'],
      Wizard: ['Spellbook', 'Staff', 'Component pouch', 'Scholar\'s pack'],
      Rogue: ['Leather armor', 'Shortsword', 'Thieves\' tools', 'Burglar\'s pack']
    };
    
    const classEquipment = defaultEquipment[this.characterData.class] || ['Basic clothes', 'Common gear'];
    this.characterData.equipment = classEquipment;
    
    // Add some skills based on class and background
    const defaultSkills = {
      Fighter: ['Athletics', 'Perception'],
      Wizard: ['Arcana', 'History'],
      Rogue: ['Stealth', 'Thievery']
    };
    
    this.characterData.skills = defaultSkills[this.characterData.class] || ['General knowledge'];
    
    return {
      success: true,
      action: 'generate_additional_details',
      result: 'Generated equipment and skills'
    };
  }
  
  /**
   * Finalize character and perform validation (Step 8)
   * @returns {Promise<object>} Result of finalization
   */
  async finalizeCharacter() {
    // Validate character data
    const validation = this.validateCharacter();
    
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.issues.join(', ')}`,
        completed: true
      };
    }
    
    return {
      success: true,
      action: 'finalize_character',
      result: 'Character generation complete',
      characterData: this.getCharacterSnapshot(),
      completed: true
    };
  }
  
  /**
   * Validate the generated character data
   * @returns {object} Validation result with validity status and issues
   */
  validateCharacter() {
    const issues = [];
    
    // Check required fields are filled
    if (!this.characterData.race) issues.push('Missing race');
    if (!this.characterData.class) issues.push('Missing class');
    if (!this.characterData.background) issues.push('Missing background');
    
    // Validate attribute/ability scores based on the system being used
    const scores = this.characterData.abilityScores;
    const attributes = this.attributeSystem ? this.attributeSystem.attributes : Object.keys(scores);
    
    for (const attrName of attributes) {
      const score = scores[attrName];
      
      if (score === null || score === undefined) {
        issues.push(`${attrName} score is missing`);
        continue;
      }
      
      // Validate based on attribute system
      let isValid = true;
      let validRange = '';
      
      if (this.attributeSystem && this.attributeSystem.name === 'CASE File') {
        // CASE file uses 1-4 scale
        if (score < 1 || score > 4) {
          isValid = false;
          validRange = '(1-4)';
        }
      } else if (this.attributeSystem && this.attributeSystem.diceMethod === 'direct') {
        // Direct assignment systems - check for reasonable range
        // Most direct assignment systems use small integer ranges like 1-5 or 1-10
        if (score < 1 || score > 20) {
          isValid = false;
          validRange = '(1-20)';
        }
      } else {
        // Default: assume dice-generated scores in 3-18 range
        if (score < 3 || score > 18) {
          isValid = false;
          validRange = '(3-18)';
        }
      }
      
      if (!isValid) {
        issues.push(`${attrName} score ${score} is outside valid range ${validRange}`);
      }
    }
    
    // Check dice rolls are recorded (only required for systems that use dice)
    const usesDice = this.attributeSystem && 
                     this.attributeSystem.diceMethod !== 'direct' &&
                     !this.attributeSystem.name.includes('CASE File') &&
                     !this.attributeSystem.name.includes('Generic System');
    
    if (usesDice && this.diceRolls.length === 0) {
      issues.push('No dice rolls recorded for attribute scores');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
  
  /**
   * Get a snapshot of the current character state
   * @returns {object} Current character data and generation status
   */
  getCharacterSnapshot() {
    const snapshot = {
      ...this.characterData,
      diceRolls: this.diceRolls,
      stepHistory: this.stepHistory,
      errors: this.errors,
      currentStep: this.currentStep,
      maxSteps: this.maxSteps
    };
    
    // Include attribute system info if available
    if (this.attributeSystem) {
      snapshot.attributeSystem = {
        name: this.attributeSystem.name,
        attributes: this.attributeSystem.attributes,
        diceMethod: this.attributeSystem.diceMethod
      };
    }
    
    return snapshot;
  }
  
  /**
   * Format character data for display to user
   * @returns {string} Formatted character sheet
   */
  formatCharacterSheet() {
    const lines = [];
    
    // Header
    lines.push(`# 🎲 Character Sheet`);
    lines.push('');
    
    // Basic info
    lines.push(`## ${this.characterData.race} ${this.characterData.class}`);
    lines.push(`**Background:** ${this.characterData.background}`);
    lines.push('');
    
    // Attribute/Ability Scores - use attribute system if available
    const attributes = this.attributeSystem ? this.attributeSystem.attributes : Object.keys(this.characterData.abilityScores);
    
    if (this.attributeSystem) {
      lines.push(`### ${this.attributeSystem.name} Attributes`);
    } else {
      lines.push('### Ability Scores');
    }
    
    for (const attrName of attributes) {
      const score = this.characterData.abilityScores[attrName];
      
      // Determine if this system uses modifiers
      let showModifier = true;
      
      if (this.attributeSystem && 
          (this.attributeSystem.name === 'CASE File' || 
           this.attributeSystem.diceMethod === 'direct')) {
        // Systems without dice-based generation don't use modifiers
        showModifier = false;
      }
      
      let modifierText = '';
      if (showModifier) {
        const modifier = Math.floor((score - 10) / 2);
        const sign = modifier >= 0 ? '+' : '';
        modifierText = ` (${sign}${modifier})`;
      }
      
      lines.push(`- **${attrName}:** ${score}${modifierText}`);
    }
    lines.push('');
    
    // Skills
    if (this.characterData.skills.length > 0) {
      lines.push('### Skills');
      lines.push(this.characterData.skills.map(s => `- ${s}`).join('\n'));
      lines.push('');
    }
    
    // Equipment
    if (this.characterData.equipment.length > 0) {
      lines.push('### Equipment');
      lines.push(this.characterData.equipment.map(e => `- ${e}`).join('\n'));
      lines.push('');
    }
    
    // Personality traits
    if (this.characterData.personalityTraits.length > 0) {
      lines.push('### Personality Traits');
      lines.push(this.characterData.personalityTraits.map(t => `- ${t}`).join('\n'));
      lines.push('');
    }
    
    // Backstory
    if (this.characterData.backstory) {
      lines.push('## Backstory');
      lines.push(this.characterData.backstory);
      lines.push('');
    }
    
    // Generation info
    lines.push('---');
    lines.push(`*Generated in ${this.currentStep} steps using ${this.diceRolls.length} dice rolls*`);
    
    return lines.join('\n');
  }
}

/**
 * Generate a complete character with the agent
 * @param {string} specifications - User-provided character specs
 * @param {string} ragSource - Path to active RAG PDF document
 * @param {object} options - Agent configuration options
 * @returns {Promise<object>} Complete character generation result
 */
export async function generateCharacter(specifications = '', ragSource, options = {}) {
  const agent = new CharacterGenerationAgent(options);
  
  // Initialize the agent
  await agent.initialize(specifications, ragSource);
  
  // Run generation loop with step limit
  let stepResult;
  while (agent.currentStep < agent.maxSteps) {
    stepResult = await agent.generateNextStep();
    
    if (!stepResult.success && !stepResult.completed) {
      return {
        success: false,
        error: `Generation failed at step ${agent.currentStep}: ${stepResult.error}`
      };
    }
    
    // Check if generation is complete
    if (stepResult.completed) {
      break;
    }
  }
  
  // Return final character data
  return {
    success: true,
    characterData: agent.getCharacterSnapshot(),
    formattedSheet: agent.formatCharacterSheet()
  };
}

/**
 * Get the default max steps for character generation
 * @returns {number} Default maximum steps
 */
export function getDefaultMaxSteps() {
  return DEFAULT_MAX_STEPS;
}
