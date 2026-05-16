import { extractChapters, generateFocusedSummary, calculateChecksum } from '../rag_summarizer.js';
import fs from 'fs';
import path from 'path';

// Import cache functions separately since they're in the same module
const { saveSummariesToCache, loadCachedSummaries } = await import('../rag_summarizer.js');

/**
 * Mock LLM endpoint that returns sample responses for testing
 */
async function mockLLMEndpoint(prompt) {
  // Use more specific matching based on the prompt content
  if (prompt.includes('Character creation process and steps')) {
    return 'Character Creation Summary: Players create characters by choosing race, class, and background. They start with 3 ability scores and basic equipment.';
  } else if (prompt.includes('Combat turn order and initiative')) {
    return 'Combat Rules Summary: Turn-based combat with initiative rolls. Each turn allows one action and movement. Attacks use d20 + modifiers.';
  } else if (prompt.includes('How success is determined outside combat')) {
    return 'Non-Combat Rules Summary: Social interactions use persuasion checks (DC 10-20). Exploration tracks time and resources. Magic spells have components and casting times.';
  } else if (prompt.includes('The world or location where the game takes place')) {
    return 'Setting Summary: Eldoria is a dark fantasy world with warring kingdoms, major factions like Royal Guard and Shadow Guild, and a grim but hopeful atmosphere.';
  }
  return 'Summary not available for this category.';
}

/**
 * Test the summary system with a sample text
 */
async function testSummarySystem() {
  console.log('=== Testing RPG Summary System ===\n');
  
  // Test 1: Extract chapters from sample text
  console.log('Test 1: Chapter extraction');
  const sampleText = `
This is an RPG rulebook about a fantasy world.

Chapter 1: Character Creation
Players create characters by choosing a race, class, and background. 
Each character starts with 3 ability scores that can be assigned freely.
Characters begin with basic equipment and 50 gold pieces.

Chapter 2: Combat Rules
Combat uses a turn-based system where initiative is rolled at the start.
Each turn allows one action and one movement.
Attacks are resolved by rolling a d20 and adding modifiers.

Chapter 3: Non-Combat Gameplay
Social interactions use persuasion checks with DC 10-20 based on difficulty.
Exploration involves tracking time, managing resources, and navigating terrain.
Magic spells require components and have varying casting times.

Chapter 4: The World of Eldoria
Eldoria is a dark fantasy setting with warring kingdoms.
The major factions include the Royal Guard, Shadow Guild, and Mage Academy.
The atmosphere is grim but hopeful, with stories of heroism against darkness.
`;
  
  const chapters = extractChapters(sampleText);
  console.log(`Found ${chapters.length} chapters:`);
  chapters.forEach((chapter, i) => {
    console.log(`  ${i + 1}. "${chapter.title}" (${chapter.content.length} chars)`);
  });
  
  // Test 2: Calculate checksum
  console.log('\nTest 2: Checksum calculation');
  const checksum = calculateChecksum(sampleText);
  console.log(`Checksum: ${checksum}`);
  
  // Test 3: Generate focused summary (using mock LLM for testing)
  console.log('\nTest 3: Generating focused summaries...');
  
  const categories = ['characterCreation', 'combatRules', 'nonCombatRules', 'settingAtmosphere'];
  
  for (const chapter of chapters) {
    console.log(`\nProcessing chapter: "${chapter.title}"`);
    
    for (const category of categories) {
      try {
        const summary = await generateFocusedSummary(chapter.content, category, mockLLMEndpoint);
        console.log(`  ${category}: ${summary.substring(0, 80)}...`);
      } catch (error) {
        console.error(`  Error generating ${category} summary:`, error.message);
      }
    }
  }
  
  // Test 4: Full summary generation
  console.log('\nTest 4: Generating all summaries for document...');
  
  const summaries = await generateAllSummaries(sampleText, mockLLMEndpoint);
  
  console.log('\nGenerated Summaries:');
  let totalSize = 0;
  for (const [category, summary] of Object.entries(summaries)) {
    const size = summary.length;
    totalSize += size;
    console.log(`  ${category}: ${size} chars`);
    console.log(`    Preview: ${summary.substring(0, 100)}...`);
  }
  
  console.log(`\nTotal size: ${totalSize} characters`);
  
  // Test 5: Save and load from cache
  console.log('\nTest 5: Cache functionality');
  
  const sourceName = 'test_document';
  const saved = saveSummariesToCache(sourceName, checksum, summaries);
  console.log(`Saved to cache: ${saved}`);
  
  const loaded = loadCachedSummaries(sourceName, checksum);
  console.log(`Loaded from cache: ${loaded ? 'success' : 'failed'}`);
  
  if (loaded) {
    console.log('Cache contents match:', JSON.stringify(summaries) === JSON.stringify(loaded.summaries));
  }
  
  console.log('\n=== Tests Complete ===');
}

/**
 * Generate all summaries for a document
 */
async function generateAllSummaries(text, llmEndpoint) {
  const chapters = extractChapters(text);
  
  if (chapters.length === 0) {
    chapters.push({
      title: 'Document',
      content: text,
      startIndex: 0,
      endIndex: text.length
    });
  }
  
  const summaries = {
    characterCreation: '',
    combatRules: '',
    nonCombatRules: '',
    settingAtmosphere: ''
  };
  
  for (const chapter of chapters) {
    console.log(`Processing chapter: "${chapter.title}"`);
    
    const chapterSummaries = await Promise.all([
      generateFocusedSummary(chapter.content, 'characterCreation', llmEndpoint),
      generateFocusedSummary(chapter.content, 'combatRules', llmEndpoint),
      generateFocusedSummary(chapter.content, 'nonCombatRules', llmEndpoint),
      generateFocusedSummary(chapter.content, 'settingAtmosphere', llmEndpoint)
    ]);
    
    summaries.characterCreation += `\n\n---\n\nChapter: ${chapter.title}\n${chapterSummaries[0]}`;
    summaries.combatRules += `\n\n---\n\nChapter: ${chapter.title}\n${chapterSummaries[1]}`;
    summaries.nonCombatRules += `\n\n---\n\nChapter: ${chapter.title}\n${chapterSummaries[2]}`;
    summaries.settingAtmosphere += `\n\n---\n\nChapter: ${chapter.title}\n${chapterSummaries[3]}`;
  }
  
  return summaries;
}

// Run the test
testSummarySystem().catch(console.error);
