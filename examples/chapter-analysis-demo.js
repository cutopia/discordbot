import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the new chapter analysis system
import {
  detectChapters,
  analyzeDocument,
  formatSummariesForStorage,
  generateDocumentSummary
} from '../chapter-analyzer.js';

import { EnhancedRAGSystem } from '../rag-enhanced.js';

/**
 * Demonstration of the chapter analysis system
 */
async function demonstrateChapterAnalysis() {
  console.log('=== RPG Rulebook Chapter Analysis Demo ===\n');
  
  // Find a PDF to analyze
  const pdfDir = path.join(__dirname, '..', 'ragsourcebooks');
  const pdfFiles = fs.existsSync(pdfDir) ? fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf')) : [];
  
  if (pdfFiles.length === 0) {
    console.log('No PDF files found in ragsourcebooks/. Please add a PDF to test.');
    return;
  }
  
  const pdfPath = path.join(pdfDir, pdfFiles[0]);
  const sourceName = path.basename(pdfPath, '.pdf');
  
  console.log(`Analyzing: ${sourceName}\n`);
  
  // Step 1: Extract text from PDF
  console.log('Step 1: Extracting text from PDF...');
  try {
    const pdf = await import('pdf-parse/lib/pdf-parse.js');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf.default(pdfBuffer);
    const text = pdfData.text;
    
    console.log(`Extracted ${text.length} characters\n`);
    
    // Step 2: Detect chapters
    console.log('Step 2: Detecting chapters...');
    const chapters = detectChapters(text);
    
    console.log(`Detected ${chapters.length} chapter/section segments:\n`);
    for (let i = 0; i < Math.min(10, chapters.length); i++) {
      const chapter = chapters[i];
      console.log(`  ${i + 1}. [${chapter.type}] Chapter ${chapter.number}: "${chapter.title}" (${chapter.text.length} chars)`);
    }
    
    if (chapters.length > 10) {
      console.log(`  ... and ${chapters.length - 10} more chapters\n`);
    }
    
    // Step 3: Analyze document
    console.log('Step 3: Analyzing document with LLM...');
    const analysisResult = await analyzeDocument(text, sourceName);
    
    console.log(`\nAnalysis complete! Generated ${analysisResult.summaries.length} summaries.`);
    
    // Show summary by aspect
    const aspects = {};
    for (const summary of analysisResult.summaries) {
      if (!aspects[summary.aspect]) {
        aspects[summary.aspect] = 0;
      }
      aspects[summary.aspect]++;
    }
    
    console.log('\nSummaries by aspect:');
    for (const [aspect, count] of Object.entries(aspects)) {
      console.log(`  ${aspect}: ${count}`);
    }
    
    // Step 4: Create enhanced RAG system
    console.log('\nStep 4: Creating enhanced RAG system...');
    const rag = new EnhancedRAGSystem();
    const documents = formatSummariesForStorage(analysisResult);
    await rag.addDocuments(documents, sourceName);
    
    console.log(`Enhanced RAG system ready with ${documents.length} summary documents\n`);
    
    // Step 5: Test queries
    console.log('Step 5: Testing queries...\n');
    
    const testQueries = [
      { query: 'How do I create a character?', aspects: ['characterCreation'] },
      { query: 'What happens in combat?', aspects: ['combat'] },
      { query: 'How do skill checks work?', aspects: ['gameplay'] },
      { query: 'Tell me about the game world', aspects: ['setting'] }
    ];
    
    for (const testQuery of testQueries) {
      console.log(`Query: "${testQuery.query}"`);
      
      const results = await rag.query(sourceName, testQuery.query, {
        k: 3,
        aspects: testQuery.aspects
      });
      
      if (results.length > 0) {
        console.log(`  Retrieved ${results.length} results:`);
        
        for (let i = 0; i < Math.min(2, results.length); i++) {
          const result = results[i];
          console.log(`    ${i + 1}. [${result.metadata?.aspect}] Score: ${(result.score || 0).toFixed(3)}`);
          console.log(`       Chapter: ${result.metadata?.chapterNumber} - ${result.metadata?.chapterTitle}`);
          console.log(`       Preview: ${result.pageContent.substring(0, 150)}...`);
        }
      } else {
        console.log('  No results found');
      }
      
      console.log('');
    }
    
    // Step 6: Generate document summary
    console.log('Step 6: Generating document summary...');
    const docSummary = await generateDocumentSummary(analysisResult);
    console.log(`Generated document summary (${docSummary.length} chars)\n`);
    
    // Save results
    console.log('Saving results...');
    fs.writeFileSync(
      path.join(__dirname, '..', 'analysis-results', `${sourceName}-demo-summary.md`),
      docSummary
    );
    console.log('Results saved to analysis-results/\n');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

// Run the demo
demonstrateChapterAnalysis().catch(console.error);
