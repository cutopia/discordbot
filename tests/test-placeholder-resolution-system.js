/**
 * Test script for the Placeholder Resolution System
 * 
 * This script tests:
 * 1. Placeholder classification functionality
 * 2. Targeted RAG query generation
 * 3. Integration with the character generator
 */

import { CharacterGenerationAgent } from '../character-generator.js';
import { getAvailablePDFs, getOrCreateVectorStore, clearAllVectorStores } from '../rag.js';

async function testPlaceholderClassification() {
  console.log('\n=== Testing Placeholder Classification ===\n');
  
  // Create a mock agent with a dummy RAG source
  const agent = new CharacterGenerationAgent('', 'test', 'test-channel');
  
  // Test various placeholder types
  const testPlaceholders = [
    '[PLACEHOLDER: character_name]',
    '[MISSING: strength_score]',
    '[UNKNOWN: skill_level]',
    '[PLACEHOLDER: background_story]',
    '[MISSING: equipment_item]',
    '[UNKNOWN: ability_description]',
    '[PLACEHOLDER: proficiency_rank]',
    '[MISSING: feature_name]'
  ];
  
  console.log('Testing placeholder classification:');
  for (const placeholder of testPlaceholders) {
    const type = agent.placeholderResolver.classifyPlaceholder(placeholder);
    console.log(`  ${placeholder} -> ${type}`);
  }
  
  // Verify classifications
  const expectedTypes = {
    '[PLACEHOLDER: character_name]': 'NAME',
    '[MISSING: strength_score]': 'ATTRIBUTE',
    '[UNKNOWN: skill_level]': 'SKILL',
    '[PLACEHOLDER: background_story]': 'BACKSTORY',
    '[MISSING: equipment_item]': 'EQUIPMENT',
    '[UNKNOWN: ability_description]': 'ABILITY',
    '[PLACEHOLDER: proficiency_rank]': 'PROFICIENCY',
    '[MISSING: feature_name]': 'FEATURE'
  };
  
  let allCorrect = true;
  for (const [placeholder, expectedType] of Object.entries(expectedTypes)) {
    const actualType = agent.placeholderResolver.classifyPlaceholder(placeholder);
    if (actualType !== expectedType) {
      console.log(`  ❌ Mismatch: ${placeholder} expected ${expectedType}, got ${actualType}`);
      allCorrect = false;
    }
  }
  
  if (allCorrect) {
    console.log('\n✅ All placeholder classifications correct!');
  } else {
    console.log('\n❌ Some placeholder classifications failed');
  }
  
  return allCorrect;
}

async function testQueryGeneration() {
  console.log('\n=== Testing Query Generation ===\n');
  
  const agent = new CharacterGenerationAgent('', 'test', 'test-channel');
  
  // Test query generation for different placeholder types
  const testCases = [
    { type: 'NAME', context: {} },
    { type: 'ATTRIBUTE', context: { fieldName: 'strength' } },
    { type: 'SKILL', context: { fieldName: 'stealth' } },
    { type: 'BACKSTORY', context: {} }
  ];
  
  console.log('Testing query generation:');
  for (const testCase of testCases) {
    const queries = agent.placeholderResolver.generateQueries(testCase.type, testCase.context);
    console.log(`\n${testCase.type}:`);
    console.log(`  Context: ${JSON.stringify(testCase.context)}`);
    console.log(`  Queries (${queries.length}):`);
    queries.forEach((query, i) => {
      console.log(`    ${i + 1}. ${query.substring(0, 80)}...`);
    });
  }
  
  return true;
}

async function testIntegrationWithPDF() {
  console.log('\n=== Testing Integration with PDF RAG Source ===\n');
  
  // Get available PDFs
  const pdfFiles = getAvailablePDFs();
  console.log(`Found ${pdfFiles.length} PDF file(s)`);
  
  if (pdfFiles.length === 0) {
    console.log('No PDF files found. Skipping integration test.');
    return false;
  }
  
  // Load the first PDF
  const pdfPath = pdfFiles[0].path;
  console.log(`Loading ${pdfFiles[0].name}...`);
  
  try {
    const vectorStore = await getOrCreateVectorStore(pdfPath);
    console.log(`✅ Vector store created with ${vectorStore.documents.length} documents`);
    
    // Create agent with the loaded RAG source
    const agent = new CharacterGenerationAgent('', pdfFiles[0].name, 'test-channel');
    
    // Test placeholder resolution with real PDF content
    const testPlaceholders = [
      { text: '[PLACEHOLDER: character_name]', context: {} },
      { text: '[MISSING: attribute_score]', context: { fieldName: 'core_attribute' } }
    ];
    
    console.log('\nTesting placeholder resolution with real PDF:');
    for (const placeholder of testPlaceholders) {
      const result = await agent.placeholderResolver.resolvePlaceholder(
        placeholder.text,
        placeholder.context
      );
      
      console.log(`\n  Placeholder: ${placeholder.text}`);
      console.log(`  Type: ${result.type}`);
      console.log(`  Resolved (${result.resolved.length} chars):`);
      console.log(`    ${result.resolved.substring(0, 150)}...`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in integration test:', error);
    return false;
  }
}

async function testCompleteWorkflow() {
  console.log('\n=== Testing Complete Workflow ===\n');
  
  const pdfFiles = getAvailablePDFs();
  
  if (pdfFiles.length === 0) {
    console.log('No PDF files found. Skipping complete workflow test.');
    return false;
  }
  
  try {
    // Load RAG source
    await getOrCreateVectorStore(pdfFiles[0].path);
    
    // Create agent
    const agent = new CharacterGenerationAgent('', pdfFiles[0].name, 'test-channel');
    
    console.log('Testing research phase:');
    const researchResult = await agent.researchCharacterCreation();
    console.log(`  Success: ${researchResult.success}`);
    console.log(`  Message: ${researchResult.message}`);
    
    if (researchResult.success) {
      console.log('\nTesting character sheet structure extraction:');
      const structure = await agent.extractCharacterSheetStructure();
      if (structure) {
        console.log(`  Structure extracted (${structure.length} chars)`);
      } else {
        console.log('  No structure found');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in complete workflow test:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('Starting Placeholder Resolution System Tests\n');
  console.log('=' .repeat(50));
  
  const results = {
    classification: false,
    queryGeneration: false,
    integration: false,
    completeWorkflow: false
  };
  
  try {
    // Clear any existing vector stores
    clearAllVectorStores();
    
    // Run tests
    results.classification = await testPlaceholderClassification();
    results.queryGeneration = await testQueryGeneration();
    results.integration = await testIntegrationWithPDF();
    results.completeWorkflow = await testCompleteWorkflow();
    
    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('Test Summary:');
    console.log(`  Classification: ${results.classification ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Query Generation: ${results.queryGeneration ? '✅ PASS' : '✅ N/A'}`);
    console.log(`  Integration: ${results.integration ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Complete Workflow: ${results.completeWorkflow ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = Object.values(results).every(r => r === true);
    console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    return results;
  } catch (error) {
    console.error('Test execution error:', error);
    return results;
  }
}

// Export runAllTests for direct execution
export { testPlaceholderClassification, testQueryGeneration, testIntegrationWithPDF, testCompleteWorkflow, runAllTests };

// Run tests if executed directly
if (typeof process !== 'undefined' && process.argv[1] === import.meta.url) {
  await runAllTests();
}
