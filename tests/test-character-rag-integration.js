/**
 * Tests for Character Generation with RAG Integration
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateCharacterWithProgress, formatProgressReport } from '../character-generator.js';

describe('Character Generator - RAG Integration', () => {
  describe('generateCharacterWithProgress', () => {
    it('should generate character without RAG source (null)', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      assert.ok(result.success, 'Generation should succeed');
      assert.ok(result.characterData, 'Should have character data');
      assert.ok(result.formattedSheet, 'Should have formatted sheet');
      assert.ok(Array.isArray(result.progressUpdates), 'Should have progress updates array');
    });
    
    it('should generate character with empty specifications', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      // Should complete within step limit
      assert.ok(result.completedSteps <= 8, `Should complete within 8 steps, got ${result.completedSteps}`);
      
      // Should have all required fields filled
      assert.ok(result.characterData.race, 'Race should be set');
      assert.ok(result.characterData.class, 'Class should be set');
      assert.ok(result.characterData.background, 'Background should be set');
    });
    
    it('should respect custom max steps', async () => {
      const result = await generateCharacterWithProgress('', null, { maxSteps: 4 });
      
      // Should complete within the specified step limit
      assert.ok(result.completedSteps <= 4, `Should complete within 4 steps, got ${result.completedSteps}`);
    });
    
    it('should include dice rolls in character data', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      // Should have ability scores calculated with dice
      assert.ok(result.characterData.abilityScores, 'Should have ability scores');
      
      const scores = Object.values(result.characterData.abilityScores);
      for (const score of scores) {
        assert.ok(score >= 3 && score <= 18, `Score ${score} should be in valid range`);
      }
    });
    
    it('should format character sheet correctly', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      const sheet = result.formattedSheet;
      
      assert.ok(sheet.includes('# 🎲 Character Sheet'), 'Should include header');
      assert.ok(sheet.includes(result.characterData.race), 'Should include race');
      assert.ok(sheet.includes(result.characterData.class), 'Should include class');
    });
    
    it('should record progress updates during generation', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      // Should have some progress updates
      assert.ok(Array.isArray(result.progressUpdates), 'Should have progress updates array');
      
      // Check that we have updates for key steps
      const stepActions = result.progressUpdates.map(u => u.action);
      assert.ok(stepActions.some(a => a.includes('race')), 'Should have race generation update');
      assert.ok(stepActions.some(a => a.includes('class')), 'Should have class generation update');
    });
    
    it('should handle user specifications', async () => {
      const result = await generateCharacterWithProgress('Elf Wizard', null);
      
      // Should include user request in other notes
      assert.ok(result.characterData.otherNotes, 'Should have other notes');
      assert.ok(result.characterData.otherNotes.some(note => note.includes('User request: Elf Wizard')), 
        'Should include user specifications');
    });
    
    it('should validate ability scores are in valid range', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      // All ability scores should be between 3-18
      for (const [name, score] of Object.entries(result.characterData.abilityScores)) {
        assert.ok(score >= 3 && score <= 18, 
          `${name} score ${score} should be in valid range 3-18`);
      }
    });
    
    it('should complete character generation within step limit', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      // Should have completed
      assert.ok(result.completedSteps > 0, 'Should have completed some steps');
      assert.ok(result.completedSteps <= 8, 'Should not exceed max steps');
    });
    
    it('should include dice roll history', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      // Should have recorded dice rolls
      assert.ok(Array.isArray(result.characterData.diceRolls), 'Should have dice rolls array');
      
      // Generic system has 3 attributes, so we expect at least 3 dice rolls
      assert.ok(result.characterData.diceRolls.length >= 3, 
        'Should have at least 3 dice rolls for ability scores');
    });
    
    it('should format progress report correctly', () => {
      const progressUpdates = [
        { step: 1, action: 'step_race', status: 'success', message: 'Selected race: Human' },
        { step: 2, action: 'step_class', status: 'success', message: 'Selected class: Wizard' },
        { step: 3, action: 'step_ability_scores', status: 'info', message: 'Retrieved 3 context documents for world consistency' }
      ];
      
      const report = formatProgressReport(progressUpdates);
      
      assert.ok(report.includes('Character Generation Progress'), 'Should include header');
      assert.ok(report.includes('✅ **Step 1:** Selected race: Human'), 'Should format success step');
      assert.ok(report.includes('ℹ️ **Step 3:** Retrieved 3 context documents for world consistency'), 
        'Should format info step');
    });
    
    it('should handle error status in progress report', () => {
      const progressUpdates = [
        { step: 1, action: 'step_race', status: 'error', message: 'Generation failed' }
      ];
      
      const report = formatProgressReport(progressUpdates);
      
      assert.ok(report.includes('❌ **Step 1:** Generation failed'), 'Should format error step');
    });
    
    it('should handle warning status in progress report', () => {
      const progressUpdates = [
        { step: 2, action: 'step_class', status: 'warning', message: 'RAG context retrieval failed' }
      ];
      
      const report = formatProgressReport(progressUpdates);
      
      assert.ok(report.includes('⚠️ **Step 2:** RAG context retrieval failed'), 'Should format warning step');
    });
    
    it('should return empty string for null progress updates', () => {
      const report = formatProgressReport(null);
      assert.strictEqual(report, '', 'Should return empty string for null input');
    });
    
    it('should return empty string for empty progress updates array', () => {
      const report = formatProgressReport([]);
      assert.strictEqual(report, '', 'Should return empty string for empty array');
    });
  });
  
  describe('character data validation', () => {
    it('should validate race is from available options', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      const validRaces = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Tiefling'];
      assert.ok(validRaces.includes(result.characterData.race), 
        `Race ${result.characterData.race} should be in valid options`);
    });
    
    it('should validate class is from available options', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      const validClasses = ['Fighter', 'Wizard', 'Cleric', 'Rogue', 'Barbarian', 'Bard', 'Paladin', 'Ranger'];
      assert.ok(validClasses.includes(result.characterData.class), 
        `Class ${result.characterData.class} should be in valid options`);
    });
    
    it('should validate background is from available options', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      const validBackgrounds = [
        'Acolyte', 'Charlatan', 'Criminal', 'Entertainer', 'Folk Hero',
        'Guild Artisan', 'Hermit', 'Noble', 'Outlander', 'Sage', 'Sailor', 'Soldier', 'Urchin'
      ];
      assert.ok(validBackgrounds.includes(result.characterData.background), 
        `Background ${result.characterData.background} should be in valid options`);
    });
    
    it('should include personality traits', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      assert.ok(Array.isArray(result.characterData.personalityTraits), 'Should have personality traits array');
      assert.ok(result.characterData.personalityTraits.length > 0, 'Should have at least one personality trait');
    });
    
    it('should include equipment', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      assert.ok(Array.isArray(result.characterData.equipment), 'Should have equipment array');
    });
    
    it('should include skills', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      assert.ok(Array.isArray(result.characterData.skills), 'Should have skills array');
    });
  });
});
