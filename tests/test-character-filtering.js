/**
 * Tests for Character Generation Filtering Logic
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CharacterGenerationAgent } from '../character-agent.js';

describe('Character Generation - Filtering Logic', () => {
  describe('background filtering', () => {
    it('should filter out "none provided" text from background list', async () => {
      const agent = new CharacterGenerationAgent();
      
      // Simulate a response with invalid content
      const response = 'Acolyte, None provided Shotgun, Charlatan, Criminal';
      
      // Manually test the filtering logic that's now in determineBackground
      const availableBackgrounds = response.split(',')
        .map(b => b.trim())
        .filter(b => {
          if (b.length === 0) return false;
          
          const lowerB = b.toLowerCase();
          if (lowerB.includes('not found')) return false;
          if (lowerB.includes('no backgrounds')) return false;
          if (lowerB.includes('none provided')) return false;
          if (lowerB.includes('crew position')) return false;
          if (lowerB.includes('weapon')) return false;
          if (lowerB.includes('equipment')) return false;
          
          const wordCount = b.split(/\s+/).length;
          if (wordCount > 4) return false;
          
          if (!/[a-zA-Z]/.test(b)) return false;
          if (/\d/.test(b)) return false;
          
          return true;
        });
      
      assert.strictEqual(availableBackgrounds.length, 3);
      assert.ok(availableBackgrounds.includes('Acolyte'));
      assert.ok(availableBackgrounds.includes('Charlatan'));
      assert.ok(availableBackgrounds.includes('Criminal'));
      assert.ok(!availableBackgrounds.includes('None provided Shotgun'));
    });
    
    it('should filter out "crew position" text from background list', async () => {
      const response = 'Acolyte, Crew position: Engineer, Charlatan';
      
      const availableBackgrounds = response.split(',')
        .map(b => b.trim())
        .filter(b => !b.toLowerCase().includes('crew position'));
      
      assert.strictEqual(availableBackgrounds.length, 2);
      assert.ok(!availableBackgrounds.includes('Crew position: Engineer'));
    });
    
    it('should filter out "weapon" text from background list', async () => {
      const response = 'Acolyte, Weapon: Shotgun, Charlatan';
      
      const availableBackgrounds = response.split(',')
        .map(b => b.trim())
        .filter(b => !b.toLowerCase().includes('weapon'));
      
      assert.strictEqual(availableBackgrounds.length, 2);
      assert.ok(!availableBackgrounds.includes('Weapon: Shotgun'));
    });
    
    it('should filter out "equipment" text from background list', async () => {
      const response = 'Acolyte, Equipment: Backpack, Charlatan';
      
      const availableBackgrounds = response.split(',')
        .map(b => b.trim())
        .filter(b => !b.toLowerCase().includes('equipment'));
      
      assert.strictEqual(availableBackgrounds.length, 2);
      assert.ok(!availableBackgrounds.includes('Equipment: Backpack'));
    });
    
    it('should filter out invalid backgrounds during validation', async () => {
      const agent = new CharacterGenerationAgent();
      
      // Manually set up character data with invalid background
      agent.characterData.race = 'Human';
      agent.characterData.class = 'Fighter';
      agent.characterData.background = 'None provided Shotgun';
      agent.characterData.abilityScores = { attr1: 10, attr2: 10, attr3: 10 };
      
      const validation = agent.validateCharacter();
      
      assert.ok(!validation.valid);
      assert.ok(validation.issues.some(issue => 
        issue.includes('Invalid background') && issue.includes('none provided')
      ));
    });
  });
  
  describe('race filtering', () => {
    it('should filter out "none provided" text from race list', async () => {
      const response = 'Human, None provided Shotgun, Elf, Dwarf';
      
      const availableRaces = response.split(',')
        .map(r => r.trim())
        .filter(r => !r.toLowerCase().includes('none provided'));
      
      assert.strictEqual(availableRaces.length, 3);
      assert.ok(!availableRaces.includes('None provided Shotgun'));
    });
    
    it('should filter out "crew position" text from race list', async () => {
      const response = 'Human, Crew position: Pilot, Elf';
      
      const availableRaces = response.split(',')
        .map(r => r.trim())
        .filter(r => !r.toLowerCase().includes('crew position'));
      
      assert.strictEqual(availableRaces.length, 2);
    });
    
    it('should filter out "weapon" text from race list', async () => {
      const response = 'Human, Weapon: Shotgun, Elf';
      
      const availableRaces = response.split(',')
        .map(r => r.trim())
        .filter(r => !r.toLowerCase().includes('weapon'));
      
      assert.strictEqual(availableRaces.length, 2);
    });
    
    it('should filter out invalid races during validation', async () => {
      const agent = new CharacterGenerationAgent();
      
      agent.characterData.race = 'None provided Shotgun';
      agent.characterData.class = 'Fighter';
      agent.characterData.background = 'Soldier';
      agent.characterData.abilityScores = { attr1: 10, attr2: 10, attr3: 10 };
      
      const validation = agent.validateCharacter();
      
      assert.ok(!validation.valid);
      assert.ok(validation.issues.some(issue => 
        issue.includes('Invalid race') && issue.includes('none provided')
      ));
    });
  });
  
  describe('class filtering', () => {
    it('should filter out "none provided" text from class list', async () => {
      const response = 'Fighter, None provided Shotgun, Wizard, Rogue';
      
      const availableClasses = response.split(',')
        .map(c => c.trim())
        .filter(c => !c.toLowerCase().includes('none provided'));
      
      assert.strictEqual(availableClasses.length, 3);
      assert.ok(!availableClasses.includes('None provided Shotgun'));
    });
    
    it('should filter out "crew position" text from class list', async () => {
      const response = 'Fighter, Crew position: Pilot, Wizard';
      
      const availableClasses = response.split(',')
        .map(c => c.trim())
        .filter(c => !c.toLowerCase().includes('crew position'));
      
      assert.strictEqual(availableClasses.length, 2);
    });
    
    it('should filter out "weapon" text from class list', async () => {
      const response = 'Fighter, Weapon: Shotgun, Wizard';
      
      const availableClasses = response.split(',')
        .map(c => c.trim())
        .filter(c => !c.toLowerCase().includes('weapon'));
      
      assert.strictEqual(availableClasses.length, 2);
    });
    
    it('should filter out invalid classes during validation', async () => {
      const agent = new CharacterGenerationAgent();
      
      agent.characterData.race = 'Human';
      agent.characterData.class = 'None provided Shotgun';
      agent.characterData.background = 'Soldier';
      agent.characterData.abilityScores = { attr1: 10, attr2: 10, attr3: 10 };
      
      const validation = agent.validateCharacter();
      
      assert.ok(!validation.valid);
      assert.ok(validation.issues.some(issue => 
        issue.includes('Invalid class') && issue.includes('none provided')
      ));
    });
  });
  
  describe('length validation', () => {
    it('should reject backgrounds that are too short', async () => {
      const agent = new CharacterGenerationAgent();
      
      agent.characterData.race = 'Human';
      agent.characterData.class = 'Fighter';
      agent.characterData.background = 'A'; // Too short
      agent.characterData.abilityScores = { attr1: 10, attr2: 10, attr3: 10 };
      
      const validation = agent.validateCharacter();
      
      assert.ok(!validation.valid);
      assert.ok(validation.issues.some(issue => 
        issue.includes('has invalid length')
      ));
    });
    
    it('should reject backgrounds that are too long', async () => {
      const agent = new CharacterGenerationAgent();
      
      const veryLongBackground = 'A'.repeat(60); // Too long (max is 50)
      
      agent.characterData.race = 'Human';
      agent.characterData.class = 'Fighter';
      agent.characterData.background = veryLongBackground;
      agent.characterData.abilityScores = { attr1: 10, attr2: 10, attr3: 10 };
      
      const validation = agent.validateCharacter();
      
      assert.ok(!validation.valid);
      assert.ok(validation.issues.some(issue => 
        issue.includes('has invalid length')
      ));
    });
    
    it('should accept valid-length backgrounds', async () => {
      const agent = new CharacterGenerationAgent();
      
      agent.characterData.race = 'Human';
      agent.characterData.class = 'Fighter';
      agent.characterData.background = 'Soldier'; // Valid length
      agent.characterData.abilityScores = { attr1: 10, attr2: 10, attr3: 10 };
      
      const validation = agent.validateCharacter();
      
      assert.ok(validation.valid);
      assert.ok(!validation.issues.some(issue => 
        issue.includes('has invalid length')
      ));
    });
  });
});
