import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { getLMStudioResponse } from './lmstudio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Directory to store cached summaries
 */
export const SUMMARY_CACHE_DIR = path.join(__dirname, 'rag_summaries');

/**
 * Ensure the summary cache directory exists
 */
export function ensureSummaryCacheDir() {
  if (!fs.existsSync(SUMMARY_CACHE_DIR)) {
    fs.mkdirSync(SUMMARY_CACHE_DIR, { recursive: true });
  }
}

/**
 * Generate a unique filename for a source's summaries
 */
export function getSummaryCacheFilename(sourceName) {
  return `${sourceName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_summaries.json`;
}

/**
 * Calculate checksum of text content for cache invalidation
 */
export function calculateChecksum(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

/**
 * Load cached summaries if they exist and are valid
 */
export function loadCachedSummaries(sourceName, expectedChecksum) {
  ensureSummaryCacheDir();
  
  const filename = getSummaryCacheFilename(sourceName);
  const filepath = path.join(SUMMARY_CACHE_DIR, filename);
  
  try {
    if (fs.existsSync(filepath)) {
      const cachedData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      
      // Verify checksum matches
      if (cachedData.checksum === expectedChecksum) {
        console.log(`[SUMMARIZER] Loaded cached summaries for ${sourceName}`);
        
        return {
          ...cachedData,
          isValid: true,
          filepath
        };
      } else {
        console.log(`[SUMMARIZER] Cache invalid for ${sourceName} (checksum mismatch)`);
        return null;
      }
    }
  } catch (error) {
    console.error(`[SUMMARIZER] Error loading cached summaries:`, error);
  }
  
  return null;
}

/**
 * Save summaries to cache
 */
export function saveSummariesToCache(sourceName, checksum, summaries) {
  ensureSummaryCacheDir();
  
  const filename = getSummaryCacheFilename(sourceName);
  const filepath = path.join(SUMMARY_CACHE_DIR, filename);
  
  try {
    const cacheData = {
      source: sourceName,
      checksum,
      timestamp: new Date().toISOString(),
      summaries
    };
    
    fs.writeFileSync(filepath, JSON.stringify(cacheData, null, 2), 'utf8');
    console.log(`[SUMMARIZER] Saved summaries to cache: ${filepath}`);
    
    return true;
  } catch (error) {
    console.error(`[SUMMARIZER] Error saving summaries to cache:`, error);
    return false;
  }
}

/**
 * Calculate total size of all summaries
 */
export function calculateTotalSummarySize(summaries) {
  let totalSize = 0;
  
  for (const [category, summary] of Object.entries(summaries)) {
    if (summary && typeof summary === 'string') {
      totalSize += summary.length;
    }
  }
  
  return totalSize;
}

/**
 * Extract chapter titles and content from text
 */
export function extractChapters(text) {
  // Patterns to match chapter headings
  const chapterPatterns = [
    /Chapter\s+[0-9IVX]+[.\s]+([^\n]+)/gi,
    /Chapter\s+[A-Z][.\s]+([^\n]+)/gi,
    /^([A-Z][^\n]{1,50})\n-{3,}/gm,
    /^\d+\.\s+([^\n]+)/gm
  ];
  
  const chapters = [];
  let combinedText = text;
  
  // Try to find chapter boundaries using common patterns
  for (const pattern of chapterPatterns) {
    const matches = [...combinedText.matchAll(pattern)];
    
    if (matches.length >= 2) {
      // We found multiple chapters, extract them
      for (let i = 0; i < matches.length - 1; i++) {
        const start = matches[i].index;
        const end = matches[i + 1].index;
        
        if (start !== undefined && end !== undefined) {
          const chapterTitle = matches[i][1] || matches[i][0];
          const chapterContent = combinedText.substring(start, end).trim();
          
          chapters.push({
            title: chapterTitle.trim(),
            content: chapterContent,
            startIndex: start,
            endIndex: end
          });
        }
      }
      
      // Add the last chapter
      const lastMatch = matches[matches.length - 1];
      if (lastMatch.index !== undefined) {
        const chapterTitle = lastMatch[1] || lastMatch[0];
        const chapterContent = combinedText.substring(lastMatch.index).trim();
        
        chapters.push({
          title: chapterTitle.trim(),
          content: chapterContent,
          startIndex: lastMatch.index,
          endIndex: combinedText.length
        });
      }
      
      break; // Found chapters, stop trying other patterns
    }
  }
  
  // If no chapters found, split by common section markers
  if (chapters.length === 0) {
    const sections = text.split(/\n\s*\n\s*\n/);
    
    for (let i = 0; i < Math.min(sections.length, 10); i++) {
      const section = sections[i].trim();
      if (section.length > 100) { // Only include substantial sections
        chapters.push({
          title: `Section ${i + 1}`,
          content: section,
          startIndex: text.indexOf(section),
          endIndex: text.indexOf(section) + section.length
        });
      }
    }
  }
  
  return chapters;
}

/**
 * Generate a focused summary for a specific category using an LLM
 */

/**
 * Split large text into smaller chunks based on character count
 */
export function chunkText(text, maxChunkSize = 3000) {
  const chunks = [];
  let currentChunk = '';
  
  // Split by sentences to avoid breaking mid-sentence
  const sentences = text.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [text];
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Generate a focused summary for a specific category using an LLM
 */
export async function generateFocusedSummary(chunk, category, llmEndpoint) {
  // Check if chunk is too large and split if necessary
  const MAX_CHUNK_SIZE = 3000; // Keep chunks under ~3000 characters to avoid timeouts
  const chunks = chunk.length > MAX_CHUNK_SIZE ? chunkText(chunk, MAX_CHUNK_SIZE) : [chunk];
  
  const allSummaries = [];
  
  for (const textChunk of chunks) {
    const prompts = {
      characterCreation: `You are analyzing an RPG rulebook. Extract and summarize all information about character creation.

Focus on:
1. Character creation process and steps
2. Available character options (races, classes, backgrounds, etc.)
3. Stat generation methods
4. Starting equipment and resources
5. Any restrictions or guidelines

Provide a comprehensive summary that would help someone create a character in this RPG system.

Chapter/Section Content:
${textChunk}

Summary:`,
      
      combatRules: `You are analyzing an RPG rulebook. Extract and summarize all information about combat rules.

Focus on:
1. Combat turn order and initiative
2. Attack actions and mechanics
3. Defense and armor systems
4. Movement and positioning
5. Special combat maneuvers
6. Damage types and resolution

Provide a comprehensive summary that would help someone understand how to fight in this RPG system.

Chapter/Section Content:
${textChunk}

Summary:`,
      
      nonCombatRules: `You are analyzing an RPG rulebook. Extract and summarize all information about non-combat gameplay rules.

Focus on:
1. How success is determined outside combat (skill checks, rolls, etc.)
2. Social interaction rules
3. Exploration and travel mechanics
4. Magic/spell systems if not in combat
5. Resource management (food, time, money)
6. Any other miscellaneous gameplay rules

Provide a comprehensive summary that would help someone understand how to play this RPG outside of combat.

Chapter/Section Content:
${textChunk}

Summary:`,
      
      settingAtmosphere: `You are analyzing an RPG rulebook. Extract and summarize all information about the game's setting and atmosphere.

Focus on:
1. The world or location where the game takes place
2. Key factions, organizations, and NPCs
3. The overall tone and atmosphere (dark, heroic, whimsical, etc.)
4. Cultural norms and societal structures
5. Notable locations, landmarks, and points of interest

Provide a comprehensive summary that would help someone understand the world and feel of this RPG setting.

Chapter/Section Content:
${textChunk}

Summary:`
    };
    
    const prompt = prompts[category] || prompts.characterCreation;
    
    try {
      // Check if llmEndpoint is a function (for testing or custom implementations)
      if (typeof llmEndpoint === 'function') {
        // Use the provided function directly
        allSummaries.push(await llmEndpoint(prompt));
        continue;
      }
      
      // If llmEndpoint is not provided, use LM Studio's default endpoint
      const endpoint = llmEndpoint || process.env.LM_STUDIO_API_URL || 'http://localhost:1234/v1/chat/completions';
      
      // Check if this is an LM Studio chat completions endpoint
      const isChatEndpoint = endpoint.includes('/chat/completions');
      
      let summary;
      if (isChatEndpoint) {
        // Use the proper LM Studio chat completions API
        console.log(`[SUMMARIZER] Using LM Studio chat completions endpoint: ${endpoint}`);
        
        // Build conversation history with system prompt and user message
        const conversationHistory = [
          { role: 'system', content: 'You are an expert RPG rulebook analyzer. Provide clear, concise summaries of the requested topics.' }
        ];
        
        summary = await getLMStudioResponse(prompt, conversationHistory);
      } else {
        // Fallback to generic HTTP endpoint (legacy completion format)
        console.log(`[SUMMARIZER] Using legacy completion endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt,
            temperature: 0.3, // Lower temperature for more focused summaries
            max_tokens: 1500,
            stream: false
          })
        });
        
        if (!response.ok) {
          throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Extract summary from response (handle different LLM response formats)
        if (data.choices && Array.isArray(data.choices)) {
          summary = data.choices[0]?.text || '';
        } else if (data.content) {
          summary = data.content;
        } else if (typeof data === 'string') {
          summary = data;
        } else {
          throw new Error('Unexpected response format from LLM endpoint');
        }
      }
      
      allSummaries.push(summary.trim());
    } catch (error) {
      console.error(`[SUMMARIZER] Error generating ${category} summary:`, error);
      
      // Fallback: create a placeholder summary based on content length
      const contentPreview = textChunk.substring(0, 200).replace(/\s+/g, ' ').trim();
      allSummaries.push(`[${category.toUpperCase()} SUMMARY - Content preview (LLM unavailable): ${contentPreview}...]`);
    }
  }
  
  // If we had multiple chunks, combine their summaries
  if (allSummaries.length > 1) {
    return allSummaries.join('\n\n---\n\n');
  }
  
  return allSummaries[0] || '';
}


/**
 * Generate all four focused summaries for a document
 */
export async function generateAllSummaries(text, llmEndpoint) {
  console.log('[SUMMARIZER] Extracting chapters from document...');
  
  const chapters = extractChapters(text);
  console.log(`[SUMMARIZER] Found ${chapters.length} chapters/sections`);
  
  if (chapters.length === 0) {
    // If no chapters found, use the entire text as one chapter
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
  
  // Process chapters and generate focused summaries
  for (const chapter of chapters) {
    console.log(`[SUMMARIZER] Processing chapter: "${chapter.title.substring(0, 50)}..."`);
    
    // Generate each type of summary for this chapter
    const chapterSummaries = await Promise.all([
      generateFocusedSummary(chapter.content, 'characterCreation', llmEndpoint),
      generateFocusedSummary(chapter.content, 'combatRules', llmEndpoint),
      generateFocusedSummary(chapter.content, 'nonCombatRules', llmEndpoint),
      generateFocusedSummary(chapter.content, 'settingAtmosphere', llmEndpoint)
    ]);
    
    // Append chapter summaries to the overall summaries
    summaries.characterCreation += `\n\n---\n\nChapter: ${chapter.title}\n${chapterSummaries[0]}`;
    summaries.combatRules += `\n\n---\n\nChapter: ${chapter.title}\n${chapterSummaries[1]}`;
    summaries.nonCombatRules += `\n\n---\n\nChapter: ${chapter.title}\n${chapterSummaries[2]}`;
    summaries.settingAtmosphere += `\n\n---\n\nChapter: ${chapter.title}\n${chapterSummaries[3]}`;
  }
  
  // Trim each summary to fit within reasonable limits
  const MAX_SUMMARY_LENGTH = 45000; // Keep under 50k chars per category for 200k context window
  
  for (const key of Object.keys(summaries)) {
    if (summaries[key].length > MAX_SUMMARY_LENGTH) {
      summaries[key] = summaries[key].substring(0, MAX_SUMMARY_LENGTH) + '\n\n... [summary truncated]';
    }
  }
  
  return summaries;
}

/**
 * Get or generate focused summaries for a document
 */
export async function getOrCreateFocusedSummaries(sourceName, text, llmEndpoint) {
  const checksum = calculateChecksum(text);
  
  // Try to load cached summaries
  const cachedData = loadCachedSummaries(sourceName, checksum);
  
  if (cachedData && cachedData.isValid && cachedData.summaries) {
    return cachedData.summaries;
  }
  
  console.log(`[SUMMARIZER] Generating focused summaries for ${sourceName}...`);
  
  // Generate new summaries
  const summaries = await generateAllSummaries(text, llmEndpoint);
  
  // Save to cache
  saveSummariesToCache(sourceName, checksum, summaries);
  
  return summaries;
}

/**
 * Format summaries for display in Discord
 */
export function formatSummaryInfo(summaries) {
  let info = '📚 **RPG Rulebook Summaries**\n\n';
  
  const totalSize = calculateTotalSummarySize(summaries);
  
  for (const [category, summary] of Object.entries(summaries)) {
    if (summary && typeof summary === 'string') {
      const size = summary.length;
      const percentage = ((size / totalSize) * 100).toFixed(1);
      
      // Truncate long summaries for display
      let preview = summary.substring(0, 150).replace(/\s+/g, ' ').trim();
      if (summary.length > 150) {
        preview += '...';
      }
      
      info += `**${category}**: ${size.toLocaleString()} chars (${percentage}%)\n`;
      info += `   ${preview}\n\n`;
    }
  }
  
  info += `---\n**Total Size**: ${totalSize.toLocaleString()} characters\n`;
  info += `**Context Window Usage**: ${(totalSize / 200000 * 100).toFixed(1)}% of 200k limit`;
  
  return info;
}
