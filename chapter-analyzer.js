import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLMStudioResponse } from './lmstudio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Detect chapters in PDF text using heuristics
 * Looks for patterns like "Chapter X", "Section X", numbered headings, etc.
 */
export function detectChapters(text) {
  const chapters = [];
  
  // Pattern 1: "Chapter X" followed by title
  const chapterPattern1 = /chapter\s+(\d+|i{1,3}|iv|v{1,3}|vi{1,3}|vii{1,3}|viii{1,3}|ix|x+)\s*[:.-]?\s*(.+?)(?=\n\n|\n[A-Z][^\n]*\n|$)/gi;
  
  // Pattern 2: "Section X" followed by title
  const sectionPattern = /section\s+(\d+\.?\d*)\s*[:.-]?\s*(.+?)(?=\n\n|\n[A-Z][^\n]*\n|$)/gi;
  
  // Pattern 3: Numbered headings like "1. Title" or "1 Title"
  const numberedHeadingPattern = /^\s*(\d+)\.\s+(.+?)(?=\n\n|\n\d+\.\s|$)/gm;
  
  let match;
  
  // Find chapter patterns
  while ((match = chapterPattern1.exec(text)) !== null) {
    chapters.push({
      type: 'chapter',
      number: match[1],
      title: match[2].trim(),
      position: match.index,
      text: ''
    });
  }
  
  // Find section patterns
  while ((match = sectionPattern.exec(text)) !== null) {
    chapters.push({
      type: 'section',
      number: match[1],
      title: match[2].trim(),
      position: match.index,
      text: ''
    });
  }
  
  // If we found chapters, try to extract their content
  if (chapters.length > 0) {
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const start = chapter.position;
      const end = i + 1 < chapters.length ? chapters[i + 1].position : text.length;
      
      // Extract content between chapter markers
      let content = text.substring(start, end).trim();
      
      // Remove the chapter header from content for cleaner analysis
      const headerPattern = new RegExp(`^chapter\\s+${chapter.number}.*?\\n`, 'gi');
      content = content.replace(headerPattern, '').trim();
      
      chapter.text = content;
    }
  } else {
    // Fallback: Split by large sections (every ~5000 characters or so)
    const chunkSize = 5000;
    for (let i = 0; i < text.length; i += chunkSize) {
      chapters.push({
        type: 'section',
        number: `auto-${Math.floor(i / chunkSize) + 1}`,
        title: `Section ${Math.floor(i / chunkSize) + 1}`,
        position: i,
        text: text.substring(i, Math.min(i + chunkSize, text.length)).trim()
      });
    }
  }
  
  return chapters;
}

/**
 * Extract chapter content from a specific range
 */
export function extractChapterContent(text, startIndex, endIndex) {
  if (endIndex === -1 || endIndex > text.length) {
    endIndex = text.length;
  }
  
  let content = text.substring(startIndex, endIndex).trim();
  
  // Clean up the content - remove excessive whitespace
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n'); // Multiple blank lines to double
  content = content.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single
  
  return content;
}

/**
 * Generate a focused summary prompt for RPG rulebook analysis
 */
export function createSummaryPrompt(chapterTitle, chapterContent, focusAspect) {
  const aspectDescriptions = {
    characterCreation: {
      name: "Character Creation Rules",
      description: "Rules and processes governing how players create characters, including character sheets, attributes, skills, backgrounds, and starting options."
    },
    combat: {
      name: "Combat System",
      description: "Rules for how to run or participate in combat scenarios, including turn order, actions, attacks, defenses, and combat mechanics."
    },
    gameplay: {
      name: "Gameplay Rules",
      description: "Rules about how success is determined in non-combat scenarios, skill checks, social interactions, exploration, and other miscellaneous gameplay rules."
    },
    setting: {
      name: "Setting & Atmosphere",
      description: "The places, people, factions, history, and general atmosphere of the game's world. The tone, themes, and narrative context."
    }
  };
  
  const aspect = aspectDescriptions[focusAspect];
  
  return `You are analyzing an RPG rulebook chapter to extract specific information about ${aspect.name}.

CRITICAL INSTRUCTIONS:
1. Focus ONLY on information related to ${aspect.description}
2. Ignore any content that doesn't directly relate to ${aspect.name.toLowerCase()}
3. Extract ALL relevant rules, procedures, and details about ${aspect.name.toLowerCase()}
4. Preserve the exact wording of important rules when possible
5. Organize your summary in a clear, logical structure

Chapter Title: ${chapterTitle}

Chapter Content:
${chapterContent.substring(0, 8000)} // Truncated to prevent token overflow

Please provide a comprehensive summary focused specifically on ${aspect.name.toLowerCase()}. Include:
- Key rules and procedures
- Step-by-step processes if applicable
- Important exceptions or special cases
- Any examples that illustrate the rules

Format your response in clear sections with headings for easy parsing.`;
}

/**
 * Analyze a single chapter and generate focused summaries for all 4 aspects
 */
export async function analyzeChapter(chapter, sourceName) {
  const summaries = {};
  
  console.log(`Analyzing chapter "${chapter.title}" (${chapter.number}) from ${sourceName}...`);
  
  // Limit chapter content to prevent token overflow (keep under ~15000 chars for safety)
  const truncatedContent = chapter.text.length > 12000 
    ? chapter.text.substring(0, 12000) + '\n\n[Content truncated for analysis]'
    : chapter.text;
  
  // Analyze each of the 4 key aspects
  const aspects = ['characterCreation', 'combat', 'gameplay', 'setting'];
  
  for (const aspect of aspects) {
    try {
      const prompt = createSummaryPrompt(chapter.title, truncatedContent, aspect);
      
      console.log(`  Generating ${aspect} summary...`);
      
      const response = await getLMStudioResponse(prompt, []);
      
      summaries[aspect] = {
        title: `${chapter.title} - ${aspect}`,
        content: response,
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        aspect: aspect,
        source: sourceName
      };
      
      console.log(`  ✓ Generated ${aspect} summary (${response.length} chars)`);
      
    } catch (error) {
      console.error(`  ✗ Error generating ${aspect} summary:`, error.message);
      summaries[aspect] = {
        title: `${chapter.title} - ${aspect}`,
        content: `Error generating summary for this aspect: ${error.message}`,
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        aspect: aspect,
        source: sourceName
      };
    }
  }
  
  return summaries;
}

/**
 * Analyze all chapters in a document and generate comprehensive summaries
 */
export async function analyzeDocument(text, sourceName = 'unknown') {
  console.log(`\n=== Starting Document Analysis for "${sourceName}" ===`);
  
  // Detect chapters
  const chapters = detectChapters(text);
  console.log(`Detected ${chapters.length} chapter/section segments`);
  
  if (chapters.length === 0) {
    console.warn('No chapters detected. Using fallback chunking approach.');
    
    // Fallback: split into chunks and analyze each as a "chapter"
    const chunkSize = 8000;
    for (let i = 0; i < text.length; i += chunkSize) {
      chapters.push({
        type: 'section',
        number: `auto-${Math.floor(i / chunkSize) + 1}`,
        title: `Section ${Math.floor(i / chunkSize) + 1}`,
        position: i,
        text: text.substring(i, Math.min(i + chunkSize, text.length))
      });
    }
  }
  
  const allSummaries = [];
  const chapterMetadata = [];
  
  // Analyze each chapter
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    
    try {
      const summaries = await analyzeChapter(chapter, sourceName);
      
      // Store metadata about the chapter
      chapterMetadata.push({
        title: chapter.title,
        number: chapter.number,
        position: chapter.position,
        contentLength: chapter.text.length,
        summaryCount: Object.keys(summaries).length
      });
      
      // Add all aspect summaries to the collection
      for (const [aspect, summary] of Object.entries(summaries)) {
        allSummaries.push(summary);
      }
      
    } catch (error) {
      console.error(`Error analyzing chapter "${chapter.title}":`, error.message);
    }
    
    // Small delay between chapters to avoid overwhelming the API
    if (i < chapters.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return {
    sourceName,
    totalChapters: chapterMetadata.length,
    chapterMetadata,
    summaries: allSummaries
  };
}

/**
 * Format summaries for storage in vector database
 */
export function formatSummariesForStorage(analysisResult) {
  const documents = [];
  
  for (const summary of analysisResult.summaries) {
    // Create structured metadata for the summary
    const metadata = {
      source: analysisResult.sourceName,
      chapterNumber: summary.chapterNumber,
      chapterTitle: summary.chapterTitle,
      aspect: summary.aspect,
      summaryType: 'detailed',
      title: summary.title
    };
    
    // Format the content with clear section markers
    const formattedContent = `
=== RPG RULEBOOK SUMMARY ===

Source: ${summary.source}
Chapter: ${summary.chapterNumber} - ${summary.chapterTitle}
Aspect: ${summary.aspect}

${summary.content}

---END OF SUMMARY---
`.trim();
    
    documents.push({
      pageContent: formattedContent,
      metadata
    });
  }
  
  return documents;
}

/**
 * Save analysis results to a JSON file for review
 */
export function saveAnalysisResults(analysisResult, outputPath) {
  const output = {
    sourceName: analysisResult.sourceName,
    totalChapters: analysisResult.totalChapters,
    chapterMetadata: analysisResult.chapterMetadata,
    summaryCount: analysisResult.summaries.length,
    generatedAt: new Date().toISOString(),
    summaries: analysisResult.summaries
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Analysis results saved to ${outputPath}`);
}

/**
 * Load previously saved analysis results
 */
export function loadAnalysisResults(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading analysis results from ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Main function to analyze a PDF file and generate summaries
 */
export async function analyzePDF(pdfPath, outputDir = './analysis-results') {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const sourceName = path.basename(pdfPath, '.pdf');
  console.log(`\n=== Analyzing RPG Rulebook: ${sourceName} ===`);
  
  try {
    // Read PDF text
    const pdf = await import('pdf-parse/lib/pdf-parse.js');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf.default(pdfBuffer);
    const text = pdfData.text;
    
    console.log(`Extracted ${text.length} characters from PDF`);
    
    // Analyze the document
    const analysisResult = await analyzeDocument(text, sourceName);
    
    // Save results
    const outputPath = path.join(outputDir, `${sourceName}-analysis.json`);
    saveAnalysisResults(analysisResult, outputPath);
    
    return analysisResult;
    
  } catch (error) {
    console.error(`Error analyzing PDF ${pdfPath}:`, error.message);
    throw error;
  }
}

/**
 * Generate a comprehensive summary of the entire document
 */
export async function generateDocumentSummary(analysisResult) {
  const chapters = analysisResult.chapterMetadata || [];
  
  if (chapters.length === 0) {
    return "No chapter metadata available for summary.";
  }
  
  // Group summaries by aspect
  const aspectSummaries = {};
  const aspects = ['characterCreation', 'combat', 'gameplay', 'setting'];
  
  for (const aspect of aspects) {
    const relevantSummaries = analysisResult.summaries.filter(s => s.aspect === aspect);
    
    if (relevantSummaries.length > 0) {
      aspectSummaries[aspect] = relevantSummaries;
    }
  }
  
  // Generate a high-level summary
  const summaryPrompt = `You are creating a comprehensive index of an RPG rulebook based on detailed chapter-by-chapter analysis.

Document Overview:
- Total Chapters Analyzed: ${chapters.length}

Chapter List:
${chapters.map(c => `- Chapter ${c.number}: "${c.title}" (${c.contentLength} chars)`).join('\n')}

Aspect Coverage:
${Object.entries(aspectSummaries)
  .map(([aspect, summaries]) => 
    `${aspect}: ${summaries.length} chapter summaries`
  )
  .join('\n')}

Please create a comprehensive index that maps which chapters cover which aspects of the RPG system. This will help users quickly find relevant information.

Format your response as a structured document with:
1. A high-level overview of the rulebook's structure
2. Chapter-by-chapter breakdown by aspect coverage
3. Key topics covered in each chapter
4. Recommendations for where to find specific types of information

Keep the summary concise but comprehensive.`;
  
  try {
    const response = await getLMStudioResponse(summaryPrompt, []);
    return response;
  } catch (error) {
    console.error('Error generating document summary:', error);
    return `Error generating document summary: ${error.message}`;
  }
}

export default {
  detectChapters,
  extractChapterContent,
  createSummaryPrompt,
  analyzeChapter,
  analyzeDocument,
  formatSummariesForStorage,
  saveAnalysisResults,
  loadAnalysisResults,
  analyzePDF,
  generateDocumentSummary
};
