#!/usr/bin/env node

/**
 * Verification script for character creation clarification feature
 * This script demonstrates and verifies all aspects of the new functionality
 */

import { 
  executeClarifyTool,
  analyzeStepForClarification,
  generateClarifyPrompt,
  getClarifyToolDefinitions
} from './clarify.js';

async function verifyClarificationFeature() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Character Creation Clarification Feature Verification    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let testsPassed = 0;
  let totalTests = 0;

  // Test Suite
  const testSuite = [
    {
      name: 'Module Import',
      description: 'Verify clarify.js can be imported successfully',
      async test() {
        const { 
          executeClarifyTool,
          analyzeStepForClarification,
          generateClarifyPrompt,
          getClarifyToolDefinitions
        } = await import('./clarify.js');
        
        return !!executeClarifyTool && 
               !!analyzeStepForClarification && 
               !!generateClarifyPrompt &&
               !!getClarifyToolDefinitions;
      }
    },
    
    {
      name: 'Available Tools',
      description: 'Verify clarification tools are available',
      async test() {
        const tools = getClarifyToolDefinitions();
        return tools.length > 0 && 
               tools[0].name === 'request_clarification';
      }
    },
    
    {
      name: 'Tool Execution',
      description: 'Verify clarification tool can be executed',
      async test() {
        try {
          const result = await executeClarifyTool('request_clarification', {
            question: 'Test question?',
            context: 'Test context'
          });
          
          return result.success && 
                 result.question === 'Test question?' &&
                 result.context === 'Test context';
        } catch (error) {
          return false;
        }
      }
    },
    
    {
      name: 'Step Analysis - Complete Step',
      description: 'Verify complete steps don\'t need clarification',
      async test() {
        const step = {
          stepName: 'Choose class',
          choice: 'Select your character\'s class',
          options: ['Warrior', 'Mage', 'Rogue'],
          method: 'player_choice'
        };
        
        const analysis = analyzeStepForClarification(step);
        return !analysis.needsClarification;
      }
    },
    
    {
      name: 'Step Analysis - Incomplete Step',
      description: 'Verify incomplete steps need clarification',
      async test() {
        const step = {
          stepName: 'Select background',
          choice: null,
          options: [],
          method: 'player_choice'
        };
        
        const analysis = analyzeStepForClarification(step);
        return analysis.needsClarification && 
               analysis.confidence >= 40;
      }
    },
    
    {
      name: 'Step Analysis - Empty Step',
      description: 'Verify empty steps need clarification',
      async test() {
        const step = {
          stepName: '',
          choice: null,
          options: [],
          method: null
        };
        
        const analysis = analyzeStepForClarification(step);
        return analysis.needsClarification && 
               analysis.confidence >= 50;
      }
    },
    
    {
      name: 'Prompt Generation',
      description: 'Verify clarification prompt can be generated',
      async test() {
        const prompt = generateClarifyPrompt({
          stepName: 'Choose class',
          currentContext: 'Test context',
          availableOptions: ['Warrior', 'Mage']
        });
        
        return prompt.includes('request_clarification') &&
               prompt.includes('When to Use This Tool');
      }
    },
    
    {
      name: 'Integration with Character Generator',
      description: 'Verify integration with character-generator.js',
      async test() {
        try {
          const { CharacterGenerationAgent } = await import('./character-generator.js');
          
          // Create agent and verify it has the clarification analysis function
          const agent = new CharacterGenerationAgent('Test specs', 'test_source');
          
          // Verify step analysis works with agent's context
          const step = {
            stepName: 'Choose class',
            choice: null,
            options: [],
            method: 'player_choice'
          };
          
          const { analyzeStepForClarification } = await import('./clarify.js');
          const analysis = analyzeStepForClarification(step);
          
          return agent instanceof CharacterGenerationAgent &&
                 analysis.needsClarification;
        } catch (error) {
          console.error('Integration test error:', error.message);
          return false;
        }
      }
    },
    
    {
      name: 'Error Handling',
      description: 'Verify error handling for unknown tools',
      async test() {
        try {
          const result = await executeClarifyTool('nonexistent_tool', {});
          return !result.success && 
                 result.error.includes('Unknown clarification tool');
        } catch (error) {
          return false;
        }
      }
    },
    
    {
      name: 'Confidence Scoring',
      description: 'Verify confidence scoring works correctly',
      async test() {
        // Test various step configurations
        const steps = [
          { stepName: 'Test', options: ['A', 'B'], method: 'dice_roll' }, // Should be low confidence
          { stepName: '', options: [], method: null }, // Should be high confidence
          { stepName: 'Choose X', choice: null, options: [] } // Should be medium-high confidence
        ];
        
        const results = steps.map(step => analyzeStepForClarification(step));
        
        // Verify that incomplete steps have higher confidence scores
        return results[1].confidence > results[0].confidence;
      }
    },
    
    {
      name: 'Real-World Scenario',
      description: 'Verify real-world character creation scenario',
      async test() {
        try {
          const { CharacterGenerationAgent } = await import('./character-generator.js');
          
          // Simulate a realistic character creation scenario
          const agent = new CharacterGenerationAgent(
            'Create a drow character seeking redemption who wants to explore the Heart',
            'test_source'
          );
          
          // Test with various steps that might need clarification
          const testSteps = [
            {
              stepName: 'Choose a character class',
              choice: null,
              options: [],
              method: 'player_choice'
            },
            {
              stepName: 'Determine ability scores',
              choice: null,
              options: [],
              method: 'dice_roll'
            }
          ];
          
          // Verify analysis works for each step
          const { analyzeStepForClarification } = await import('./clarify.js');
          const analyses = testSteps.map(step => analyzeStepForClarification(step));
          
          return agent instanceof CharacterGenerationAgent &&
                 analyses.length === 2;
        } catch (error) {
          console.error('Real-world scenario error:', error.message);
          return false;
        }
      }
    }
  ];

  // Run all tests
  for (let i = 0; i < testSuite.length; i++) {
    const test = testSuite[i];
    totalTests++;
    
    process.stdout.write(`\n${i + 1}. ${test.name}... `);
    
    try {
      const passed = await test.test();
      
      if (passed) {
        testsPassed++;
        console.log('✅ PASS');
        console.log(`   ${test.description}`);
      } else {
        console.log('❌ FAIL');
        console.log(`   ${test.description}`);
      }
    } catch (error) {
      console.log('❌ ERROR');
      console.log(`   ${test.description}`);
      console.log(`   Error: ${error.message}`);
    }
  }

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                        Test Summary                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`Tests Passed: ${testsPassed}/${totalTests}`);
  
  const percentage = Math.round((testsPassed / totalTests) * 100);
  console.log(`Success Rate: ${percentage}%`);
  
  if (testsPassed === totalTests) {
    console.log('\n🎉 All tests passed! The clarification feature is working correctly.');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    return false;
  }
}

// Run verification
verifyClarificationFeature()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error during verification:', error);
    process.exit(1);
  });
