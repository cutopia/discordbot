/**
 * Character Generation Agent Module
 * Manages the agentic loop for RPG character creation with step limits,
 * RAG integration, dice rolls, and validation.
 */

import { processDiceRoll } from './dice.js';

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
      abilityScores: {
        strength: null,
        dexterity: null,
        constitution: null,
        intelligence: null,
        wisdom: null,
        charisma: null
      },
      skills: [],
      equipment: [],
      personalityTraits: [],
      backstory: '',
      otherNotes: []
    };
    
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
   * @param {string} ragSource - Path to active RAG PDF document
   */
  async initialize(specifications = '', ragSource) {
    this.currentStep = 0;
    this.characterData = {
      race: null,
      class: null,
      background: null,
      abilityScores: {
        strength: null,
        dexterity: null,
        constitution: null,
        intelligence: null,
        wisdom: null,
        charisma: null
      },
      skills: [],
      equipment: [],
      personalityTraits: [],
      backstory: '',
      otherNotes: []
    };
    this.ragContext = [];
    this.diceRolls = [];
    this.stepHistory = [];
    this.errors = [];
    
    // Parse user specifications if provided
    if (specifications.trim()) {
      this.characterData.otherNotes.push(`User request: ${specifications}`);
    }
    
    // TODO: Retrieve RAG context for world-building consistency
    // This will be implemented in Phase 3
    
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
    // TODO: Use RAG context to get available races in the world
    const availableRaces = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Tiefling'];
    
    // For now, use a simple selection (will be enhanced with LLM in Phase 2)
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
    // TODO: Use RAG context to get available classes in the world
    const availableClasses = ['Fighter', 'Wizard', 'Cleric', 'Rogue', 'Barbarian', 'Bard', 'Paladin', 'Ranger'];
    
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
   * Uses 4d6 drop lowest method for each ability
   * @returns {Promise<object>} Result of ability score calculation
   */
  async calculateAbilityScores() {
    const scores = {};
    
    // Roll 4d6 drop lowest for each ability score
    for (const [scoreName, _] of Object.entries(this.characterData.abilityScores)) {
      const rollResult = this.rollDiceForAbilityScore();
      
      scores[scoreName] = rollResult.total;
      this.diceRolls.push({
        notation: '4d6dl1',
        result: rollResult
      });
    }
    
    this.characterData.abilityScores = scores;
    
    return {
      success: true,
      action: 'calculate_ability_scores',
      result: `Ability scores calculated using 4d6 drop lowest method`
    };
  }
  
  /**
   * Roll dice for a single ability score (4d6 drop lowest)
   * @returns {object} Roll results including total after dropping lowest
   */
  rollDiceForAbilityScore() {
    // Roll 4d6
    const rolls = [];
    let sum = 0;
    
    for (let i = 0; i < 4; i++) {
      const roll = Math.floor(Math.random() * 6) + 1;
      rolls.push(roll);
      sum += roll;
    }
    
    // Find and remove lowest roll
    const minRoll = Math.min(...rolls);
    const total = sum - minRoll;
    
    return {
      rolls,
      dropped: minRoll,
      total
    };
  }
  
  /**
   * Determine character background (Step 4)
   * @returns {Promise<object>} Result of background determination
   */
  async determineBackground() {
    // TODO: Use RAG context to get available backgrounds in the world
    const availableBackgrounds = [
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
    // TODO: Use RAG context and LLM to generate world-appropriate traits
    const traits = [
      'I idolize a particular hero of my class and constantly try to imitate their deeds.',
      'I am always calm, no matter what the situation. I never raise my voice or lose my temper.',
      'I believe that everything done for a purpose should be done perfectly well.',
      'I am convinced of the superiority of my race, class, or culture.',
      'I am always hungry for new adventures and new places to explore.'
    ];
    
    // Select 2-4 random traits
    const numTraits = Math.floor(Math.random() * 3) + 2;
    this.characterData.personalityTraits = traits.slice(0, numTraits);
    
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
    // TODO: Use RAG context and LLM to generate world-appropriate backstory
    const backstories = [
      `As a ${this.characterData.race} ${this.characterData.class}, I grew up in a small village where I always felt out of place. My desire for adventure led me to strike out on my own.`,
      `My family has been ${this.characterData.background}s for generations, but I chose a different path. Now I seek fortune and glory as an adventurer.`,
      `I was trained by the masters of a distant monastery, where I learned to harness my natural talents as a ${this.characterData.class}.`
    ];
    
    const backstory = backstories[Math.floor(Math.random() * backstories.length)];
    this.characterData.backstory = backstory;
    
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
    
    // Validate ability scores (should be between 3-18 for standard rolling)
    const scores = this.characterData.abilityScores;
    for (const [name, score] of Object.entries(scores)) {
      if (score < 3 || score > 18) {
        issues.push(`${name} score ${score} is outside valid range (3-18)`);
      }
    }
    
    // Check dice rolls are recorded
    if (this.diceRolls.length === 0) {
      issues.push('No dice rolls recorded for ability scores');
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
    return {
      ...this.characterData,
      diceRolls: this.diceRolls,
      stepHistory: this.stepHistory,
      errors: this.errors,
      currentStep: this.currentStep,
      maxSteps: this.maxSteps
    };
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
    
    // Ability scores
    lines.push('### Ability Scores');
    for (const [name, score] of Object.entries(this.characterData.abilityScores)) {
      const modifier = Math.floor((score - 10) / 2);
      const sign = modifier >= 0 ? '+' : '';
      lines.push(`- **${name}:** ${score} (${sign}${modifier})`);
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
