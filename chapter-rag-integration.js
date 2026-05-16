import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import both the original RAG and enhanced systems
import {
  getAvailablePDFs,
  extractTextFromPDF,
  createVectorStore as createOriginalVectorStore
} from './rag.js';

import {
  analyzePDF,
  formatSummariesForStorage
} from './chapter-analyzer.js';

import { EnhancedRAGSystem } from './rag-enhanced.js';

/**
 * Integration example: Using both original and enhanced RAG systems
 */
export async function integrateChapterAnalysisWithRAG(pdfPath) {
  const sourceName = path.basename(pdfPath, '.pdf');
  
  console.log(`\n=== Integrating Chapter Analysis with RAG for "${sourceName}" ===\n`);
  
  try {
    // Step 1: Extract text from PDF
    console.log('Step 1: Extracting text from PDF...');
    const text = await extractTextFromPDF(pdfPath);
    console.log(`Extracted ${text.length} characters\n`);
    
    // Step 2: Run chapter analysis (creates rich summaries)
    console.log('Step 2: Running chapter analysis...');
    const analysisResult = await analyzePDF(pdfPath, './analysis-results');
    console.log(`Generated ${analysisResult.summaries.length} summaries across ${analysisResult.totalChapters} chapters\n`);
    
    // Step 3: Create original vector store (for backward compatibility)
    console.log('Step 3: Creating original vector store...');
    const originalVectorStore = await createOriginalVectorStore(sourceName, text);
    console.log(`Created original vector store with ${originalVectorStore.documents.length} documents\n`);
    
    // Step 4: Create enhanced RAG system from analysis
    console.log('Step 4: Creating enhanced RAG system...');
    const enhancedRAG = new EnhancedRAGSystem();
    
    // Format summaries for storage and add to enhanced RAG
    const summaryDocuments = formatSummariesForStorage(analysisResult);
    await enhancedRAG.addDocuments(summaryDocuments, sourceName);
    
    console.log(`Enhanced RAG system ready with ${summaryDocuments.length} summary documents\n`);
    
    return {
      sourceName,
      originalVectorStore,
      enhancedRAG,
      analysisResult
    };
    
  } catch (error) {
    console.error('Error in integration:', error.message);
    throw error;
  }
}

/**
 * Example: Query both systems and compare results
 */
export async function compareQueryResults(integrationResult, query) {
  const { sourceName, originalVectorStore, enhancedRAG } = integrationResult;
  
  console.log(`\n=== Comparing Query Results for "${query}" ===\n`);
  
  // Query original system
  console.log('1. Original RAG System:');
  try {
    const originalResults = await originalVectorStore.similaritySearch(query, 3);
    
    if (originalResults.length > 0) {
      console.log(`   Retrieved ${originalResults.length} results`);
      console.log(`   Top result score: ${(originalResults[0].score || 0).toFixed(3)}`);
      console.log(`   Top content preview: ${originalResults[0].pageContent.substring(0, 150)}...`);
    } else {
      console.log('   No results found');
    }
  } catch (error) {
    console.error(`   Error querying original system: ${error.message}`);
  }
  
  // Query enhanced system
  console.log('\n2. Enhanced RAG System:');
  try {
    const enhancedResults = await enhancedRAG.query(sourceName, query, { k: 3 });
    
    if (enhancedResults.length > 0) {
      console.log(`   Retrieved ${enhancedResults.length} results`);
      
      for (let i = 0; i < Math.min(3, enhancedResults.length); i++) {
        const result = enhancedResults[i];
        console.log(`\n   Result ${i + 1}:`);
        console.log(`     Score: ${(result.score || 0).toFixed(3)}`);
        console.log(`     Aspect: ${result.metadata?.aspect || 'N/A'}`);
        console.log(`     Chapter: ${result.metadata?.chapterNumber || 'N/A'} - ${result.metadata?.chapterTitle || 'N/A'}`);
        console.log(`     Content preview: ${result.pageContent.substring(0, 150)}...`);
      }
    } else {
      console.log('   No results found');
    }
  } catch (error) {
    console.error(`   Error querying enhanced system: ${error.message}`);
  }
  
  console.log('\n=== Comparison Complete ===\n');
}

/**
 * Example: Query with aspect filtering
 */
export async function queryWithAspectFiltering(integrationResult, query, aspects) {
  const { sourceName, enhancedRAG } = integrationResult;
  
  console.log(`\n=== Query with Aspect Filtering ===`);
  console.log(`Query: "${query}"`);
  console.log(`Aspects: ${aspects.join(', ')}\n`);
  
  try {
    const results = await enhancedRAG.query(sourceName, query, { 
      k: 5,
      aspects
    });
    
    console.log(`Retrieved ${results.length} results:\n`);
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      console.log(`${i + 1}. [${result.metadata?.aspect}] Score: ${(result.score || 0).toFixed(3)}`);
      console.log(`   ${result.pageContent.substring(0, 200)}...\n`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Main demonstration
 */
async function demonstrateIntegration() {
  console.log('=== RPG Rulebook Chapter Analysis RAG Integration Demo ===\n');
  
  // Get available PDFs
  const pdfFiles = getAvailablePDFs();
  
  if (pdfFiles.length === 0) {
    console.log('No PDF files found in ragsourcebooks/ directory.');
    return;
  }
  
  console.log(`Found ${pdfFiles.length} PDF file(s):\n`);
  for (const pdf of pdfFiles) {
    console.log(`- ${pdf.name}`);
  }
  
  // Process the first PDF
  const pdfPath = pdfFiles[0].path;
  
  try {
    // Integrate chapter analysis with RAG
    const integrationResult = await integrateChapterAnalysisWithRAG(pdfPath);
    
    // Demonstrate queries
    const demoQueries = [
      { query: 'How do I create a character?', aspects: ['characterCreation'] },
      { query: 'What happens in combat?', aspects: ['combat'] },
      { query: 'How do skill checks work?', aspects: ['gameplay'] },
      { query: 'Tell me about the game world', aspects: ['setting'] }
    ];
    
    // Compare original vs enhanced for one query
    await compareQueryResults(integrationResult, demoQueries[0].query);
    
    // Demonstrate aspect filtering
    for (const demoQuery of demoQueries) {
      await queryWithAspectFiltering(integrationResult, demoQuery.query, demoQuery.aspects);
    }
    
    console.log('\n=== Demo Complete ===\n');
    
  } catch (error) {
    console.error('Demo failed:', error.message);
  }
}

// Run demonstration if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  demonstrateIntegration().catch(console.error);
}

export default {
  integrateChapterAnalysisWithRAG,
  compareQueryResults,
  queryWithAspectFiltering,
  demonstrateIntegration
};
