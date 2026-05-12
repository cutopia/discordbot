/**
 * Example implementation of the improved prompt builder
 * 
 * This demonstrates how to build clean, focused prompts for each character generation step.
 */

class ImprovedPromptBuilder {
  constructor(characterSheet = {}, specifications = '', currentStepIndex = 0, totalSteps = 5) {
    this.characterSheet = characterSheet;
    this.specifications = specifications;
    this.currentStepIndex = currentStepIndex;
    this.totalSteps = totalSteps;
  }

  /**
   * Build the prohibition section - always included at the top
   */
  buildProhibitionSection() {
    return `
CRITICAL INSTRUCTIONS - READ CAREFULLY:

You are creating a PLAYER CHARACTER for an RPG game. Follow these instructions exactly.

**STRICTLY PROHIBITED - VIOLATION WILL RESULT in INVALID CHARACTERS:**
1. **DO NOT use any RPG rules, mechanics, or knowledge from your training data (including D&D, Pathfinder, etc.)**
2. **DO NOT invent stats, classes, or mechanics that aren't explicitly mentioned in the provided context**
3. **If information is missing from the context, you MUST ask for clarification rather than guessing**

**IMPORTANT GUIDELINES:**
1. **Use ONLY information from the context documents - nothing else**
2. **Make choices that are CONSISTENT with the current character sheet state**
3. **Review the character sheet before making new choices to avoid contradictions`;
  }

  /**
   * Build the current character sheet state section
   */
  buildCharacterSheetSection() {
    const sheetFields = Object.entries(this.characterSheet)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');
    
    return `
**CURRENT CHARACTER SHEET STATE:**

${sheetFields || 'Empty - no choices made yet'}`;
  }

  /**
   * Build the current step requirements section
   */
  buildCurrentStepSection(stepDetails) {
    const { stepName, choice, options = [], method = 'player_choice' } = stepDetails;
    
    return `
**CURRENT STEP (${this.currentStepIndex + 1}/${this.totalSteps}):**

Step: ${stepName}
${choice ? `Choice: ${choice}` : ''}
${options.length > 0 ? `Options: ${options.join(', ')}` : ''}
${method && method !== 'player_choice' ? `Method: ${method}` : ''}`;
  }

  /**
   * Build the RAG source context section
   */
  buildRagContextSection(ragContext) {
    return `
**RETRIEVED CONTEXT FROM RPG RULEBOOK:**

${ragContext}`;
  }

  /**
   * Build the user specifications section (optional)
   */
  buildSpecificationsSection(specifications = '') {
    if (!specifications.trim()) {
      return '';
    }
    
    return `
**USER SPECIFICATIONS TO CONSIDER:**

${specifications}

IMPORTANT: Make your choices consistent with these user specifications.`;
  }

  /**
   * Build the output format instructions section
   */
  buildOutputFormatSection() {
    return `
**OUTPUT FORMAT REQUIREMENTS:**

1. Provide a brief narrative explanation of your choice (2-3 sentences)
2. After the narrative, add a section titled "Character Sheet:"
3. For EACH character sheet field you're updating, use this format:
   - Field Name: Value
4. Only include fields that are being updated or added

**EXAMPLE OUTPUT:**

## Step ${this.currentStepIndex + 1}: [Step Name]

[Your narrative explanation here]

Character Sheet:
- Field1: value1
- Field2: value2`;
  }

  /**
   * Build the complete prompt for a character generation step
   */
  buildPrompt(stepDetails, ragContext) {
    const sections = [
      this.buildProhibitionSection(),
      this.buildCharacterSheetSection(),
      this.buildCurrentStepSection(stepDetails),
      this.buildRagContextSection(ragContext),
      this.buildSpecificationsSection(this.specifications),
      this.buildOutputFormatSection()
    ];

    return sections.join('\n');
  }

  /**
   * Build a prompt for the first step (special case)
   */
  buildFirstStepPrompt(stepDetails, ragContext) {
    // For first step, we know there's no character sheet yet
    this.characterSheet = {};
    
    return this.buildPrompt(stepDetails, ragContext);
  }

  /**
   * Build a prompt for subsequent steps
   */
  buildSubsequentStepPrompt(stepDetails, ragContext) {
    return this.buildPrompt(stepDetails, ragContext);
  }
}

// Example usage:

// First step example
const firstStepBuilder = new ImprovedPromptBuilder(
  {}, // Empty character sheet for first step
  'Create a drow character with stealth focus',
  0, // Step index
  5  // Total steps
);

const firstStepDetails = {
  stepName: 'Determine Character Role/Archetype',
  choice: 'Select a character role or archetype that fits the RPG system',
  options: ['Soldier', 'Scout', 'Spy', 'Expert'],
  method: 'player_choice'
};

const firstStepRagContext = `
From the RPG rulebook:

Character roles define your character's primary function in the game world.
Each role comes with its own set of starting skills and abilities.

Available Roles:
- Soldier: Trained in combat, excellent for frontline fighters
- Scout: Skilled in tracking and survival, perfect for wilderness exploration
- Spy: Master of stealth and deception, ideal for infiltration missions
- Expert: Versatile and adaptable, with skills in many areas

For drow characters, the Spy role is particularly common due to their natural stealth abilities.
`;

console.log('=== FIRST STEP PROMPT ===');
console.log(firstStepBuilder.buildFirstStepPrompt(firstStepDetails, firstStepRagContext));

// Subsequent step example
const subsequentStepBuilder = new ImprovedPromptBuilder(
  {
    Name: 'Zaryx the Shadow',
    Role: 'Spy'
  },
  'Create a drow character with stealth focus',
  1, // Step index
  5  // Total steps
);

const subsequentStepDetails = {
  stepName: 'Assign Attributes',
  choice: 'Roll dice and assign attribute scores',
  options: ['4d6 drop lowest', 'Point buy', 'Standard array'],
  method: 'dice_roll'
};

const subsequentStepRagContext = `
Attribute Generation:

Attributes represent your character's core abilities:
- Strength (STR): Physical power
- Dexterity (DEX): Agility and reflexes  
- Constitution (CON): Endurance and health
- Intelligence (INT): Mental acuity
- Wisdom (WIS): Perception and insight
- Charisma (CHA): Social influence

For drow characters, Dexterity is typically the most important attribute,
followed by Intelligence and Charisma.
`;

console.log('\n=== SUBSEQUENT STEP PROMPT ===');
console.log(subsequentStepBuilder.buildSubsequentStepPrompt(subsequentStepDetails, subsequentStepRagContext));

// Export for testing
export { ImprovedPromptBuilder };
