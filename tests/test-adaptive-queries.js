import { PlaceholderResolver } from '../character-generator.js';

// Test the adaptive query generation functionality
async function testAdaptiveQueryGeneration() {
  console.log('Testing Adaptive Query Generation...\n');
  
  // Create a placeholder resolver instance
  const resolver = new PlaceholderResolver(null, null);
  
  // Test 1: Basic queries (no exploration context)
  console.log('Test 1: Basic Queries (No Exploration Context)');
  const basicQueries = resolver.getBaseQueries('NAME');
  console.log(`Generated ${basicQueries.length} base queries for NAME:`);
  basicQueries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
  
  // Test 2: Adaptive queries with exploration context
  console.log('\nTest 2: Adaptive Queries (With Exploration Context)');
  const explorationContext = {
    discoveredConcepts: ['Magic', 'Technology', 'Social Class'],
    rulebookContext: 'Fantasy setting with magical and technological elements'
  };
  
  const adaptiveQueries = resolver.generateAdaptiveQueries('NAME', explorationContext);
  console.log(`Generated ${adaptiveQueries.length} total queries for NAME:`);
  adaptiveQueries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
  
  // Test 3: Gap-based queries
  console.log('\nTest 3: Gap-Based Queries');
  const gapQueries = resolver.generateGapBasedQueries('ATTRIBUTE', explorationContext);
  console.log(`Generated ${gapQueries.length} gap-based queries for ATTRIBUTE:`);
  gapQueries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
  
  // Test 4: Different placeholder types
  const placeholderTypes = ['SKILL', 'ABILITY', 'BACKSTORY'];
  console.log('\nTest 4: Queries for Different Placeholder Types');
  placeholderTypes.forEach(type => {
    const queries = resolver.generateQueries(type, {}, explorationContext);
    console.log(`${type}: ${queries.length} total queries`);
  });
  
  // Test 5: Extract discovered concepts from research results
  console.log('\nTest 5: Concept Extraction from Research Results');
  const sampleResearchResults = `1. Character creation steps:
   - Choose a race
   - Determine attributes using dice rolls
   - Select skills based on background
2. Key concepts:
   - Magic system
   - Technology levels
   - Social hierarchy
3. Background options:
   - Noble origin
   - Commoner status
   - Outcast status`;
   
  const extractedConcepts = resolver.extractDiscoveredConcepts(sampleResearchResults);
  console.log(`Extracted ${extractedConcepts.length} concepts:`);
  extractedConcepts.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  
  // Test 6: Full query generation with context
  console.log('\nTest 6: Complete Query Generation Pipeline');
  const fullQueries = resolver.generateQueries('BACKSTORY', {
    fieldName: 'character_background'
  }, explorationContext);
  console.log(`Generated ${fullQueries.length} complete queries for BACKSTORY:`);
  fullQueries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
  
  console.log('\n✅ All adaptive query generation tests completed!');
}

// Run the test
testAdaptiveQueryGeneration().catch(console.error);
