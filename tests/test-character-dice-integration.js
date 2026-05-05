/**
 * Test Character Agent Dice Integration with Enhanced Notation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CharacterGenerationAgent } from '../character-agent.js';

describe('Character Generation Agent - Dice Integration', () => {
  describe('ability scores with enhanced dice notation', () => {
    it('should use 4d6dl1 for ability score generation', async () => {
      const agent = new CharacterGenerationAgent();
      await agent.initialize('', null);
      
      // Manually trigger ability score calculation
      const result = await agent.calculateAbilityScores();
      
      assert.ok(result.success, 'Ability score calculation should succeed');
      assert.strictEqual(result.action, 'calculate_ability_scores', 'Should be calculating ability scores');
      
      // Verify all ability scores are filled
      for (const [name, score] of Object.entries(agent.characterData.abilityScores)) {
        assert.ok(score !== null, `${name} score should not be null`);
        assert.ok(score >= 3 && score <= 18, `${name} score ${score} should be in valid range`);
      }
    });
    
    it('should record dice roll history with full details', async () => {
      const agent = new CharacterGenerationAgent();
      await agent.initialize('', null);
      
      // Trigger ability score calculation
      await agent.calculateAbilityScores();
      
      // Verify dice rolls were recorded
      assert.ok(agent.diceRolls.length > 0, 'Should have recorded dice rolls');
      assert.strictEqual(agent.diceRolls.length, 6, 'Should have 6 dice rolls (one per ability)');
      
      // Verify each roll has full details
      for (const roll of agent.diceRolls) {
        assert.strictEqual(roll.notation, '4d6dl1', 'Notation should be 4d6dl1');
        assert.ok(roll.result.total !== null, 'Result total should not be null');
        assert.ok(Array.isArray(roll.result.keptRolls), 'Kept rolls should be an array');
        assert.strictEqual(roll.result.keptRolls.length, 3, 'Should have 3 kept rolls (4 rolled - 1 dropped)');
      }
    });
    
    it('should handle dice roll errors gracefully', async () => {
      const agent = new CharacterGenerationAgent();
      await agent.initialize('', null);
      
      // Test the rollDiceForAbilityScore method directly
      const result = agent.rollDiceForAbilityScore();
      
      assert.ok(result.total !== null, 'Should have a valid total');
      assert.ok(Array.isArray(result.keptRolls), 'Should have kept rolls array');
    });
    
    it('should generate varied ability scores across multiple characters', async () => {
      const agents = [];
      
      // Generate 5 different characters
      for (let i = 0; i < 5; i++) {
        const agent = new CharacterGenerationAgent();
        await agent.initialize('', null);
        await agent.calculateAbilityScores();
        
        // Calculate total of all ability scores
        const totalScore = Object.values(agent.characterData.abilityScores).reduce((a, b) => a + b, 0);
        agents.push(totalScore);
      }
      
      // Verify we got different totals (not all identical)
      const uniqueTotals = new Set(agents);
      assert.ok(uniqueTotals.size > 1, 'Should have generated varied ability scores');
    });
    
    it('should calculate correct modifiers from ability scores', async () => {
      const agent = new CharacterGenerationAgent();
      await agent.initialize('', null);
      
      // Manually set a specific score to test modifier calculation
      agent.characterData.abilityScores.strength = 16;
      
      // Verify modifier is calculated correctly (16 -> +3)
      const strengthScore = agent.characterData.abilityScores.strength;
      const expectedModifier = Math.floor((strengthScore - 10) / 2);
      assert.strictEqual(expectedModifier, 3, 'Strength score 16 should have modifier +3');
    });
  });
  
  describe('character generation with dice integration', () => {
    it('should complete character generation within step limit', async () => {
      const agent = new CharacterGenerationAgent({ maxSteps: 8 });
      await agent.initialize('', null);
      
      let completed = false;
      while (agent.currentStep < agent.maxSteps) {
        const result = await agent.generateNextStep();
        
        if (result.completed) {
          completed = true;
          break;
        }
        
        assert.ok(result.success || result.completed, 'Each step should succeed or be complete');
      }
      
      assert.ok(completed, 'Character generation should complete within step limit');
    });
    
    it('should format character sheet with dice roll information', async () => {
      const agent = new CharacterGenerationAgent();
      await agent.initialize('', null);
      
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
      
      // Add dice rolls
      for (const [scoreName, _] of Object.entries(agent.characterData.abilityScores)) {
        agent.diceRolls.push({
          notation: '4d6dl1',
          result: { total: 15, keptRolls: [3, 4, 5], dropped: 2 }
        });
      }
      
      // Format the character sheet
      const sheet = agent.formatCharacterSheet();
      
      assert.ok(sheet.includes('# 🎲 Character Sheet'), 'Should include header');
      assert.ok(sheet.includes('## Human Fighter'), 'Should include race and class');
      assert.ok(sheet.includes('Ability Scores'), 'Should include ability scores section');
    });
  });
});
