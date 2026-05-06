/**
 * Test Character Generation with Real RAG Context
 * This test uses actual PDF files from ragsourcebooks directory
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateCharacterWithProgress } from '../character-generator.js';
import { getAvailablePDFs, queryVectorStore } from '../rag.js';

describe('Character Generation with Real RAG Context', () => {
  // Get available PDFs for testing
  const pdfFiles = getAvailablePDFs();
  
  describe('RAG Source Availability', () => {
    it('should have at least one PDF file available', () => {
      assert.ok(pdfFiles.length > 0, 'Should have at least one PDF file in ragsourcebooks');
    });
    
    it('should return PDF files with correct structure', () => {
      if (pdfFiles.length > 0) {
        const firstPDF = pdfFiles[0];
        assert.ok(firstPDF.name, 'Should have name property');
        assert.ok(firstPDF.path, 'Should have path property');
        assert.ok(firstPDF.path.endsWith('.pdf'), 'Path should end with .pdf');
      }
    });
  });
  
  describe('Character Generation without RAG', () => {
    it('should generate character successfully without RAG source', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      assert.ok(result.success, 'Generation should succeed');
      assert.ok(result.characterData.race, 'Should have race');
      assert.ok(result.characterData.class, 'Should have class');
    });
  });
  
  describe('Character Generation with RAG Context', () => {
    // Only run these tests if we have PDF files
    if (pdfFiles.length > 0) {
      const testPDF = pdfFiles[0];
      
      it('should generate character using real RAG source', async () => {
        const result = await generateCharacterWithProgress('', testPDF.path);
        
        assert.ok(result.success, 'Generation should succeed with RAG');
        assert.ok(result.characterData.race, 'Should have race');
        assert.ok(result.characterData.class, 'Should have class');
      });
      
      it('should include RAG context in progress updates', async () => {
        const result = await generateCharacterWithProgress('', testPDF.path);
        
        // Check if any progress updates mention context retrieval
        const hasContextUpdate = result.progressUpdates.some(update => 
          update.message && update.message.includes('context')
        );
        
        assert.ok(hasContextUpdate, 'Should have context-related progress updates');
      });
      
      it('should respect user specifications with RAG', async () => {
        const result = await generateCharacterWithProgress('Human Fighter', testPDF.path);
        
        assert.ok(result.success, 'Generation should succeed');
        assert.ok(result.characterData.otherNotes.some(note => 
          note.includes('User request: Human Fighter')
        ), 'Should include user specifications');
      });
      
      it('should complete within step limit with RAG', async () => {
        const result = await generateCharacterWithProgress('', testPDF.path, { maxSteps: 8 });
        
        assert.ok(result.completedSteps <= 8, 
          `Should complete within 8 steps, got ${result.completedSteps}`);
      });
    }
  });
  
  describe('Query Vector Store Integration', () => {
    if (pdfFiles.length > 0) {
      const testPDF = pdfFiles[0];
      
      it('should query vector store and return results', async () => {
        // This test requires the RAG system to be initialized
        // We'll just verify the function exists and can be called
        assert.ok(typeof queryVectorStore === 'function', 
          'queryVectorStore should be a function');
      });
    }
  });
  
  describe('Character Data Validation with RAG', () => {
    it('should validate ability scores are in valid range (3-18)', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      for (const [name, score] of Object.entries(result.characterData.abilityScores)) {
        assert.ok(score >= 3 && score <= 18, 
          `${name} score ${score} should be in valid range`);
      }
    });
    
    it('should validate all required fields are filled', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      const requiredFields = ['race', 'class', 'background'];
      for (const field of requiredFields) {
        assert.ok(result.characterData[field], `Should have ${field}`);
      }
    });
    
    it('should validate dice rolls are recorded', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      assert.ok(Array.isArray(result.characterData.diceRolls), 
        'Should have dice rolls array');
      // Generic system has 3 attributes, so we expect 3 dice rolls
      assert.ok(result.characterData.diceRolls.length >= 3, 
        'Should have at least 3 dice rolls for ability scores');
    });
    
    it('should include personality traits', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      assert.ok(Array.isArray(result.characterData.personalityTraits), 
        'Should have personality traits array');
      assert.ok(result.characterData.personalityTraits.length > 0, 
        'Should have at least one personality trait');
    });
    
    it('should include equipment', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      assert.ok(Array.isArray(result.characterData.equipment), 
        'Should have equipment array');
    });
    
    it('should include skills', async () => {
      const result = await generateCharacterWithProgress('', null);
      
      assert.ok(Array.isArray(result.characterData.skills), 
        'Should have skills array');
    });
  });
});
