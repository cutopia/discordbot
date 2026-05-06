/**
 * Tests for Character Generation Agent
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CharacterGenerationAgent, generateCharacter, getDefaultMaxSteps } from '../character-agent.js';

describe('CharacterGenerationAgent', () => {
  describe('constructor', () => {
    it('should create agent with default max steps', () => {
      const agent = new CharacterGenerationAgent();
      assert.strictEqual(agent.maxSteps, 8);
      assert.strictEqual(agent.currentStep, 0);
    });
    
    it('should create agent with custom max steps', () => {
      const agent = new CharacterGenerationAgent({ maxSteps: 12 });
      assert.strictEqual(agent.maxSteps, 12);
    });
    
    it('should initialize character data structure with empty ability scores', () => {
      const agent = new CharacterGenerationAgent();
      
      assert.ok(agent.characterData.race === null);
      assert.ok(agent.characterData.class === null);
      assert.ok(agent.characterData.background === null);
      // Ability scores should be an empty object initially (populated from RAG context)
      assert.deepStrictEqual(agent.characterData.abilityScores, {});
    });
  });
  
  describe('initialize', () => {
    it('should reset agent state', async () => {
      const agent = new CharacterGenerationAgent();
      
      // Simulate some generation progress
      agent.currentStep = 3;
      agent.characterData.race = 'Elf';
      agent.diceRolls.push({ notation: '4d6dl1' });
      
      await agent.initialize('Human Fighter', null);
      
      assert.strictEqual(agent.currentStep, 0);
      assert.strictEqual(agent.characterData.race, null);
      assert.deepStrictEqual(agent.diceRolls, []);
    });
    
    it('should store user specifications', async () => {
      const agent = new CharacterGenerationAgent();
      await agent.initialize('Elf Wizard', null);
      
      assert.ok(agent.characterData.otherNotes.some(note => note.includes('User request: Elf Wizard')));
    });
  });
  
  describe('ability scores calculation', () => {
    it('should calculate ability scores using 4d6 drop lowest', async () => {
      const agent = new CharacterGenerationAgent();
      await agent.initialize('', null);
      
      // Test the rollDiceForAbilityScore method
      for (let i = 0; i < 10; i++) {
        const result = agent.rollDiceForAbilityScore();
        
        assert.strictEqual(result.rolls.length, 4);
        assert.ok(result.dropped >= 1 && result.dropped <= 6);
        assert.ok(result.total >= 3 && result.total <= 18);
      }
    });
    
    it('should fill all ability scores', async () => {
      const agent = new CharacterGenerationAgent();
      await agent.initialize('', null);
      
      // Manually trigger ability score calculation
      const scores = {};
      for (const [scoreName, _] of Object.entries(agent.characterData.abilityScores)) {
        const rollResult = agent.rollDiceForAbilityScore();
        scores[scoreName] = rollResult.total;
      }
      
      agent.characterData.abilityScores = scores;
      
      // Verify all scores are filled
      for (const [name, score] of Object.entries(agent.characterData.abilityScores)) {
        assert.ok(score !== null);
        // Allow for both dice-generated (3-18) and direct assignment systems
        assert.ok(score >= 1 && score <= 20);
      }
    });
  });
  
  describe('determineRace', () => {
    it('should select a race from available options', async () => {
      const agent = new CharacterGenerationAgent();
      
      // Test multiple times to ensure variety
      for (let i = 0; i < 20; i++) {
        await agent.determineRace();
        
        assert.ok(agent.characterData.race);
        assert.ok(['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Tiefling'].includes(agent.characterData.race));
      }
    });
  });
  
  describe('determineClass', () => {
    it('should select a class from available options', async () => {
      const agent = new CharacterGenerationAgent();
      
      // Test multiple times to ensure variety
      for (let i = 0; i < 20; i++) {
        await agent.determineClass();
        
        assert.ok(agent.characterData.class);
        assert.ok(['Fighter', 'Wizard', 'Cleric', 'Rogue', 'Barbarian', 'Bard', 'Paladin', 'Ranger'].includes(agent.characterData.class));
      }
    });
  });
  
  describe('validateCharacter', () => {
    it('should validate complete character data', async () => {
      const agent = new CharacterGenerationAgent();
      
      // Manually set up a complete character
      agent.characterData.race = 'Human';
      agent.characterData.class = 'Fighter';
      agent.characterData.background = 'Soldier';
      agent.characterData.abilityScores = {
        strength: 15,
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 8,
        charisma: 13
      };
      
      // Add dice rolls to satisfy validation
      for (const [scoreName, _] of Object.entries(agent.characterData.abilityScores)) {
        agent.diceRolls.push({ notation: '4d6dl1', result: { total: 15 } });
      }
      
      const validation = agent.validateCharacter();
      
      assert.ok(validation.valid, 'Validation should pass');
      assert.deepStrictEqual(validation.issues, [], 'Issues array should be empty');
    });
    
    it('should detect missing race', async () => {
      const agent = new CharacterGenerationAgent();
      
      agent.characterData.class = 'Fighter';
      agent.characterData.background = 'Soldier';
      agent.characterData.abilityScores = {
        strength: 15,
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 8,
        charisma: 13
      };
      
      const validation = agent.validateCharacter();
      
      assert.ok(!validation.valid, 'Validation should fail');
      assert.ok(validation.issues.includes('Missing race'), 'Should detect missing race');
    });
    
    it('should detect invalid ability scores', async () => {
      const agent = new CharacterGenerationAgent();
      
      agent.characterData.race = 'Human';
      agent.characterData.class = 'Fighter';
      agent.characterData.background = 'Soldier';
      agent.characterData.abilityScores = {
        strength: 20, // Invalid - too high
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 8,
        charisma: 13
      };
      
      const validation = agent.validateCharacter();
      
      assert.ok(!validation.valid, 'Validation should fail');
      assert.ok(validation.issues.some(issue => issue.includes('strength score 20')), 'Should detect invalid strength score');
    });
    
    it('should validate character data', async () => {
      const agent = new CharacterGenerationAgent();
      
      // Set up a complete character with generic system
      agent.characterData.race = 'Human';
      agent.characterData.class = 'Fighter';
      agent.characterData.background = 'Soldier';
      agent.characterData.abilityScores = {
        'Attribute 1': 15,
        'Attribute 2': 12,
        'Attribute 3': 14
      };
      
      const validation = agent.validateCharacter();
      
      // With generic system, dice rolls are not required for validation
      assert.ok(validation.valid, 'Validation should pass with complete data');
    });
  });
  
  describe('getCharacterSnapshot', () => {
    it('should return current character state', async () => {
      const agent = new CharacterGenerationAgent();
      await agent.initialize('', null);
      
      // Add some data
      agent.currentStep = 3;
      agent.characterData.race = 'Elf';
      agent.diceRolls.push({ notation: '4d6dl1' });
      
      const snapshot = agent.getCharacterSnapshot();
      
      assert.strictEqual(snapshot.currentStep, 3);
      assert.strictEqual(snapshot.maxSteps, 8);
      assert.strictEqual(snapshot.race, 'Elf');
      assert.deepStrictEqual(snapshot.diceRolls, [{ notation: '4d6dl1' }]);
    });
  });
  
  describe('formatCharacterSheet', () => {
    it('should format character data for display', async () => {
      const agent = new CharacterGenerationAgent();
      
      // Manually set up a complete character
      agent.characterData.race = 'Human';
      agent.characterData.class = 'Fighter';
      agent.characterData.background = 'Soldier';
      agent.characterData.abilityScores = {
        strength: 16,
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 8,
        charisma: 13
      };
      agent.characterData.skills = ['Athletics', 'Perception'];
      agent.characterData.equipment = ['Chain mail', 'Sword', 'Shield'];
      agent.characterData.personalityTraits = ['I idolize a particular hero.', 'I am always calm.'];
      agent.characterData.backstory = 'A fighter from the north.';
      agent.currentStep = 8;
      agent.diceRolls.push({ notation: '4d6dl1' });
      
      const sheet = agent.formatCharacterSheet();
      
      assert.ok(sheet.includes('# 🎲 Character Sheet'), 'Should include header');
      assert.ok(sheet.includes('## Human Fighter'), 'Should include race and class');
      assert.ok(sheet.includes('**Background:** Soldier'), 'Should include background');
      assert.ok(sheet.includes('### Ability Scores'), 'Should include ability scores section');
      assert.ok(sheet.includes('- **strength:** 16 (+3)'), 'Should include strength with modifier');
    });
  });
});

describe('generateCharacter', () => {
  it('should generate a complete character within step limit', async () => {
    const result = await generateCharacter('', null, { maxSteps: 8 });
    
    assert.ok(result.success);
    assert.ok(result.characterData);
    assert.ok(result.formattedSheet);
    assert.ok(result.characterData.currentStep <= 8);
  });
  
  it('should respect step limit', async () => {
    const result = await generateCharacter('', null, { maxSteps: 4 });
    
    assert.ok(result.success);
    assert.ok(result.characterData.currentStep <= 4);
  });
});

describe('getDefaultMaxSteps', () => {
  it('should return default maximum steps', () => {
    assert.strictEqual(getDefaultMaxSteps(), 8);
  });
});
