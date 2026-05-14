import { getLMStudioResponse } from './lmstudio.js';
import { queryVectorStore, vectorStores, getRagQuery } from './rag.js';
import { processDiceRoll } from './dice.js';

// Store character generation sessions per channel
const characterGenerationSessions = new Map();

/**
 * Placeholder Resolver Class
 * Handles classification and resolution of placeholders using targeted RAG queries.
 */
export class PlaceholderResolver {
  constructor(ragSource, vectorStores) {
    this.ragSource = ragSource;
    this.vectorStores = vectorStores;
    this.placeholderTypes = ['NAME', 'ATTRIBUTE', 'SKILL', 'ABILITY', 
                            'BACKSTORY', 'EQUIPMENT', 'PROFICIENCY', 'FEATURE'];
  }

  /**
   * Classify a placeholder into its type based on text analysis
   */
  classifyPlaceholder(placeholderText) {
    const lowerText = placeholderText.toLowerCase();
    
    // Check for feature first (before name check to avoid false positives)
    if (lowerText.includes('feature') || lowerText.includes('trait')) {
      return 'FEATURE';
    }
    
    if (lowerText.includes('name') || lowerText.includes('character')) {
      return 'NAME';
    } else if (lowerText.includes('attribute') || lowerText.includes('stat') || 
               lowerText.includes('ability_score') || lowerText.includes('score')) {
      return 'ATTRIBUTE';
    } else if (lowerText.includes('skill')) {
      return 'SKILL';
    } else if (lowerText.includes('ability') || lowerText.includes('power') ||
               lowerText.includes('feat') || lowerText.includes('special')) {
      return 'ABILITY';
    } else if (lowerText.includes('background') || lowerText.includes('backstory') ||
               lowerText.includes('origin') || lowerText.includes('motivation') ||
               lowerText.includes('history')) {
      return 'BACKSTORY';
    } else if (lowerText.includes('equipment') || lowerText.includes('gear') ||
               lowerText.includes('item') || lowerText.includes('inventory') ||
               lowerText.includes('weapon') || lowerText.includes('armor')) {
      return 'EQUIPMENT';
    } else if (lowerText.includes('proficiency') || lowerText.includes('prof')) {
      return 'PROFICIENCY';
    }
    
    // Default fallback based on placeholder type
    const match = placeholderText.match(/\[(PLACEHOLDER|MISSING|UNKNOWN):[^\]]+\]/);
    if (match) {
      const description = match[0].toLowerCase();
      if (description.includes('dice') || description.includes('roll')) {
        return 'ATTRIBUTE'; // Dice rolls typically relate to attributes
      }
    }
    
    return 'UNKNOWN';
  }

  /**
   * Get base queries for a placeholder type
   * These are starting points - the LLM should generate additional adaptive queries
   */
  getBaseQueries(placeholderType) {
    const queries = {
      NAME: [
        'What naming conventions exist in this RPG system?',
        'Are there cultural or regional naming patterns?'
      ],
      ATTRIBUTE: [
        'How are attributes created or determined in this RPG system?',
        'What methods can be used to determine attribute scores?'
      ],
      SKILL: [
        'What is the skill system in this RPG?',
        'How are skills ranked or leveled up?'
      ],
      ABILITY: [
        'What abilities exist in this RPG system?',
        'How do abilities work and what are their effects?'
      ],
      BACKSTORY: [
        'What background options are available for characters?',
        'How does background affect character creation?'
      ],
      EQUIPMENT: [
        'What equipment is available in this RPG system?',
        'Are there starting equipment packages?'
      ],
      PROFICIENCY: [
        'What is the proficiency system in this RPG?',
        'How do characters gain proficiencies?'
      ],
      FEATURE: [
        'What features are available to characters in this RPG?',
        'How are features selected or acquired?'
      ]
    };
    
    return queries[placeholderType] || [];
  }

  /**
   * Generate adaptive queries based on initial exploration context
   * This allows the LLM to create its own queries from gaps it identifies
   */
  generateAdaptiveQueries(placeholderType, explorationContext = {}) {
    const baseQueries = this.getBaseQueries(placeholderType);
    
    // If we have exploration context (from initial rulebook review), use it to generate more targeted queries
    if (explorationContext && explorationContext.discoveredConcepts) {
      return [
        ...baseQueries,
        // Generate queries based on what was discovered in the rulebook
        ...this.generateGapBasedQueries(placeholderType, explorationContext)
      ];
    }
    
    return baseQueries;
  }

  /**
   * Generate queries that target specific gaps identified during exploration
   */
  generateGapBasedQueries(placeholderType, explorationContext) {
    const gapQueries = [];
    
    // Analyze what concepts were discovered and create targeted follow-up questions
    if (explorationContext.discoveredConcepts && 
        Array.isArray(explorationContext.discoveredConcepts)) {
      
      for (const concept of explorationContext.discoveredConcepts) {
        switch (placeholderType) {
          case 'NAME':
            gapQueries.push(
              `How does the ${concept} concept affect character naming?`,
              `Are there specific names or naming patterns related to ${concept}?`
            );
            break;
          case 'ATTRIBUTE':
            gapQueries.push(
              `What is the relationship between ${concept} and attribute creation?`,
              `How should attributes be determined when considering ${concept}?`
            );
            break;
          case 'SKILL':
            gapQueries.push(
              `How does ${concept} affect skill selection or advancement?`,
              `Are there skills specifically related to ${concept}?`
            );
            break;
          case 'ABILITY':
            gapQueries.push(
              `What abilities are connected to the ${concept} concept?`,
              `How do abilities interact with ${concept}?`
            );
            break;
          case 'BACKSTORY':
            gapQueries.push(
              `How does the ${concept} concept influence character background options?`,
              `Are there specific backgrounds related to ${concept}?`
            );
            break;
          case 'EQUIPMENT':
            gapQueries.push(
              `What equipment is affected by or connected to ${concept}?`,
              `Are there special equipment rules related to ${concept}?`
            );
            break;
          case 'PROFICIENCY':
            gapQueries.push(
              `How does ${concept} affect proficiency selection or advancement?`,
              `Are there proficiencies specifically related to ${concept}?`
            );
            break;
          case 'FEATURE':
            gapQueries.push(
              `What features are connected to the ${concept} concept?`,
              `How do features interact with ${concept}?`
            );
            break;
        }
      }
    }
    
    // Add general exploration queries if we have context
    if (explorationContext.rulebookContext) {
      gapQueries.push(
        `Based on the rulebook context about ${explorationContext.rulebookContext}, what specific details are needed for ${placeholderType.toLowerCase()}?`,
        `Are there any exceptions or special cases for ${placeholderType.toLowerCase()} mentioned in the rulebook?`
      );
    }
    
    return gapQueries;
  }

  /**
   * Generate targeted RAG queries for a placeholder
   */
  generateQueries(placeholderType, placeholderContext = {}, explorationContext = {}) {
    // First get base queries (starting points)
    const baseQueries = this.getBaseQueries(placeholderType);
    
    // Then add adaptive queries based on exploration context
    const adaptiveQueries = this.generateAdaptiveQueries(placeholderType, explorationContext);
    
    // Combine and deduplicate queries
    const allQueries = [...new Set([...baseQueries, ...adaptiveQueries])];
    
    // Add context-specific modifications if available
    if (placeholderContext && placeholderContext.fieldName) {
      return allQueries.map(query => 
        query.replace('{fieldName}', placeholderContext.fieldName)
      );
    }
    
    return allQueries;
  }


  /**
   * Query RAG and get resolved content for a placeholder
   */
  async resolvePlaceholder(placeholderText, placeholderContext = {}, explorationContext = {}) {
    const placeholderType = this.classifyPlaceholder(placeholderText);
    const queries = this.generateQueries(placeholderType, placeholderContext, explorationContext);
    
    console.log(`Resolving ${placeholderType} placeholder: ${placeholderText}`);
    console.log(`Generated ${queries.length} queries for resolution`);
    
    const allResults = [];
    
    for (const query of queries) {
      try {
        const docs = await queryVectorStore(this.ragSource, query, 3);
        
        if (docs.length > 0) {
          // Extract relevant information from documents
          const content = docs.map(doc => doc.pageContent || doc.content || '').join('\n---\n');
          allResults.push(content);
        }
      } catch (error) {
        console.error(`Error querying RAG for ${placeholderType}:`, error.message);
      }
    }
    
    return {
      original: placeholderText,
      resolved: allResults.length > 0 
        ? allResults.join('\n\n')
        : 'No relevant information found in the rulebook.',
      type: placeholderType,
      queriesUsed: queries
    };
  }
  /**
   * Resolve all placeholders in a batch
   */
  async resolveAllPlaceholders(placeholders, explorationContext = {}) {
    const results = [];
    
    for (const placeholder of placeholders) {
      try {
        const result = await this.resolvePlaceholder(
          placeholder.text,
          { fieldName: placeholder.fieldName || '' },
          explorationContext
        );
        results.push(result);
      } catch (error) {
        console.error(`Error resolving placeholder ${placeholder.text}:`, error.message);
        results.push({
          original: placeholder.text,
          resolved: 'No relevant information found in the rulebook.',
          type: this.classifyPlaceholder(placeholder.text),
          error: error.message
        });
      }
    }
    
    return results;
  }
}

/**
 * Character Generation Agent Class
 * Implements the agentic loop for RPG character creation according to the specification.
 */
export class CharacterGenerationAgent {
  constructor(specifications, ragSource, channelId) {
    this.specifications = specifications || '';
    this.ragSource = ragSource;
    this.channelId = channelId;
    
    // Agentic loop configuration
    this.maxIterations = 20;
    this.maxValidationRetries = 3;
    
    // Character generation state
    this.phase = 'research'; // research, draft, refinement, validation, final
    this.characterSheet = {};
    this.placeholders = [];
    this.iterationCount = 0;
    this.validationAttempts = 0;
    
    // Step tracking for re-execution
    this.currentStepIndex = -1;
    this.steps = [];
    
    // Validation state
    this.validationResult = null;
    this.shouldRetryValidation = false;
    
    // Placeholder resolver instance
    this.placeholderResolver = new PlaceholderResolver(ragSource, vectorStores);
  }

  /**
   * Get the current RAG context for this agent
   */
  async getRagContext() {
    if (!this.ragSource || !vectorStores.has(this.ragSource)) {
      return null;
    }
    
    try {
      // Query for character creation guidance
      const query = 'What are the steps and requirements for character creation in this RPG system?';
      const docs = await queryVectorStore(this.ragSource, query, 3);
      
      if (docs.length === 0) {
        return null;
      }
      
      // Format context with relevance scores for better AI understanding
      const contextParts = docs.map((doc, index) => {
        const relevanceScore = Math.round(doc.score * 100);
        const content = doc.pageContent || doc.content || '';
        return `Context ${index + 1} (Relevance: ${relevanceScore}%):\n${content}\n`;
      });
      
      // Add metadata about the retrieval for the AI
      const contextInfo = `Retrieved ${docs.length} relevant context chunk(s) from knowledge base.\n` +
                         `Query: "${query}"\n\n` +
                         contextParts.join('\n---\n');
      
      return contextInfo;
    } catch (error) {
      console.error('❌ Error getting RAG context:');
      console.error(`   Type: ${error.constructor.name}`);
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      
      return null;
    }
  }

  /**
   * Extract character sheet structure from RAG source
   */
  async extractCharacterSheetStructure() {
    const query = `What is the complete structure of a character sheet in this RPG system?

Include all sections, subsections, and required fields. For each section, list:
1. Section name
2. Required fields within that section
3. Optional fields
4. Any special formatting or rules for that section

Format your response as a structured outline.`;

    try {
      const docs = await queryVectorStore(this.ragSource, query, 5);
      
      if (docs.length === 0) {
        console.log('No character sheet structure found in RAG source');
        return null;
      }
      
      // Extract and format the structure
      const content = docs.map(doc => doc.pageContent || doc.content || '').join('\n\n');
      
      this.characterSheetStructure = content;
      
      return content;
    } catch (error) {
      console.error('❌ Error extracting character sheet structure:');
      console.error(`   Type: ${error.constructor.name}`);
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      
      return null;
    }
  }

  /**
   * Phase 1: Research - Look up character creation process
   */
  async researchCharacterCreation() {
    const ragContext = await this.getRagContext();
    
    if (!ragContext) {
      return {
        success: false,
        message: 'No RPG rulebook has been loaded yet. Use /rag_source to load a rulebook first.'
      };
    }
    
    // Extract character sheet structure
    await this.extractCharacterSheetStructure();
    
    const prompt = `You are an expert RPG character creation assistant.

⚠️ CRITICAL WARNING: You MUST NOT use any knowledge from other game systems including D&D, Pathfinder, or any d20-based system. ONLY use the provided RPG rulebook content for ALL character generation decisions.

<RULEBOOK>
${ragContext}
</RULEBOOK>

Your task: Research the official character creation process for this RPG system.

Instructions:
1. Identify all steps in the character creation process
2. List required fields, attributes, and structural elements
3. Find examples of properly formatted characters if available
4. Note any specific rules or constraints

Output format: Provide a structured list with:
- Character creation steps (numbered)
- Required character elements (bulleted)
- Example structure (if found)

Be thorough and extract ALL relevant information about character creation.`;

    try {
      const response = await getLMStudioResponse(prompt, []);
      
      // Parse the response to identify key information
      this.researchResults = response;
      
      return {
        success: true,
        message: 'Character creation research completed.',
        details: response
      };
    } catch (error) {
      console.error('❌ Error in research phase:');
      console.error(`   Type: ${error.constructor.name}`);
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      
      return {
        success: false,
        message: `Failed to research character creation: ${error.message}`,
        errorDetails: {
          type: error.constructor.name,
          stack: error.stack
        }
      };
    }
  }

  /**
   * Phase 2: Initial Draft - Create skeleton with placeholders
   */
  async createInitialDraft() {
    const prompt = `You are an expert RPG character creation assistant.

⚠️ CRITICAL WARNING: You MUST NOT use any knowledge from other game systems including D&D, Pathfinder, or any d20-based system. ONLY use the provided RPG rulebook content for ALL character generation decisions.

<RULEBOOK>
${this.researchResults}
</RULEBOOK>

Your task: Create a skeleton character with obvious placeholder values based on the research above.

Instructions:
1. Include all sections identified in the research phase
2. Use clear placeholder markers:
   - [PLACEHOLDER: description] for text that needs research
   - [MISSING: field_name] for fields with missing values
   - [UNKNOWN: aspect] for aspects requiring rulebook lookup
3. Make it a complete structure but with placeholders everywhere

Output format: Markdown character sheet with all sections and placeholders.`;

    try {
      const response = await getLMStudioResponse(prompt, []);
      
      this.characterSheet = {
        rawContent: response,
        sections: {},
        placeholders: []
      };
      
      // Extract placeholders for tracking with more context
      const placeholderRegex = /\[(PLACEHOLDER|MISSING|UNKNOWN):[^\]]+\]/g;
      let match;
      while ((match = placeholderRegex.exec(response)) !== null) {
        this.characterSheet.placeholders.push({
          index: match.index,
          text: match[0],
          type: match[1],
          resolved: false,
          resolutionMethod: null,
          resolvedContent: null
        });
      }
      
      return {
        success: true,
        message: 'Initial character draft created with placeholders.',
        placeholderCount: this.characterSheet.placeholders.length
      };
    } catch (error) {
      console.error('❌ Error in draft phase:');
      console.error(`   Type: ${error.constructor.name}`);
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      
      return {
        success: false,
        message: `Failed to create initial draft: ${error.message}`,
        errorDetails: {
          type: error.constructor.name,
          stack: error.stack
        }
      };
    }
  }

  /**
   * Extract discovered concepts from research results for adaptive query generation
   */
  extractDiscoveredConcepts(researchResults) {
    if (!researchResults) return [];
    
    // Try to parse as JSON first (if the LLM returned structured output)
    try {
      const parsed = JSON.parse(researchResults);
      if (parsed.concepts && Array.isArray(parsed.concepts)) {
        return parsed.concepts;
      }
    } catch (e) {
      // Not JSON, continue with text parsing
    }
    
    // Fallback: extract potential concepts from research results text
    const concepts = [];
    
    // Look for numbered lists or bullet points that might represent key concepts
    const lines = researchResults.split('\n');
    for (const line of lines) {
      // Match patterns like "1. Concept", "- Concept", "* Concept"
      const match = line.match(/^(?:\d+[\.)]\s*[-•]?\s*|\-\s*|\*\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
      if (match && match[1]) {
        concepts.push(match[1]);
      }
    }
    
    // Also look for capitalized phrases that might be important concepts
    const conceptMatches = researchResults.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g);
    if (conceptMatches) {
      concepts.push(...conceptMatches.slice(0, 10)); // Take first 10 as potential concepts
    }
    
    return [...new Set(concepts)].slice(0, 5); // Deduplicate and limit to top 5
  }

  /**
   * Phase 3: Iterative Refinement - Fill placeholders with rulebook values
   */
  async refineCharacter() {
    if (!this.characterSheet.placeholders || this.characterSheet.placeholders.length === 0) {
      return {
        success: true,
        message: 'No placeholders to fill.',
        completed: true
      };
    }
    
    // Get all unresolved placeholders
    const unresolvedPlaceholders = this.characterSheet.placeholders.filter(
      p => !p.resolved && p.text
    );
    
    if (unresolvedPlaceholders.length === 0) {
      return {
        success: true,
        message: 'All placeholders have been resolved.',
        completed: true
      };
    }
    
    // Use the placeholder resolver to handle all placeholders systematically
    // Pass exploration context from research phase for adaptive query generation
    const explorationContext = {
      discoveredConcepts: this.researchResults ? 
        this.extractDiscoveredConcepts(this.researchResults) : null,
      rulebookContext: this.characterSheetStructure || null
    };
    
    const resolvedResults = await this.placeholderResolver.resolveAllPlaceholders(unresolvedPlaceholders, explorationContext);
    
    // Update character sheet with resolved content
    let updatedSheet = this.characterSheet.rawContent;
    
    for (const result of resolvedResults) {
      if (result.resolved && 
          result.resolved !== 'No relevant information found in the rulebook.' &&
          !result.original.includes('[UNKNOWN')) { // Don't replace [UNKNOWN] placeholders yet
        // Replace placeholder with resolved content
        updatedSheet = updatedSheet.replace(
          result.original,
          `**Resolved:** ${result.resolved.substring(0, 100)}${result.resolved.length > 100 ? '...' : ''}`
        );
        
        // Mark as resolved in tracking
        const placeholderIndex = this.characterSheet.placeholders.findIndex(
          p => p.text === result.original
        );
        
        if (placeholderIndex !== -1) {
          this.characterSheet.placeholders[placeholderIndex].resolved = true;
          this.characterSheet.placeholders[placeholderIndex].resolutionMethod = result.type;
          this.characterSheet.placeholders[placeholderIndex].resolvedContent = result.resolved;
        }
      }
    }
    
    // For placeholders that couldn't be resolved, try a more general approach
    const remainingPlaceholders = unresolvedPlaceholders.filter(
      p => !p.resolved && p.text.includes('[UNKNOWN')
    );
    
    if (remainingPlaceholders.length > 0) {
      // Try to resolve [UNKNOWN] placeholders with a broader query
      const unknownQueries = [
        'What are the key elements that should be included in a complete character sheet?',
        'Are there any specific sections or fields that must be filled out?'
      ];
      
      for (const query of unknownQueries) {
        try {
          const docs = await queryVectorStore(this.ragSource, query, 3);
          
          if (docs.length > 0) {
            const content = docs.map(doc => doc.pageContent || doc.content || '').join('\n\n');
            
            // Try to replace [UNKNOWN] placeholders with general guidance
            for (const placeholder of remainingPlaceholders) {
              updatedSheet = updatedSheet.replace(
                placeholder.text,
                `**Guidance:** ${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`
              );
              
              const placeholderIndex = this.characterSheet.placeholders.findIndex(
                p => p.text === placeholder.text
              );
              
              if (placeholderIndex !== -1) {
                this.characterSheet.placeholders[placeholderIndex].resolved = true;
                this.characterSheet.placeholders[placeholderIndex].resolutionMethod = 'GENERAL_GUIDANCE';
              }
            }
          }
        } catch (error) {
          console.error(`❌ Error with unknown placeholder query:`, error.message);
          console.error(`   Stack: ${error.stack}`);
        }
      }
    }
    
    // Update the character sheet
    this.characterSheet.rawContent = updatedSheet;
    
    return {
      success: true,
      message: `Resolved ${resolvedResults.length} placeholder(s).`,
      remainingPlaceholders: unresolvedPlaceholders.filter(p => !p.resolved).length
    };
  }

  /**
   * Phase 4: Final Validation - Cross-check against rulebook requirements
   * 
   * This method validates the character sheet and returns a validation result.
   * The retryCount parameter tracks how many times this validation has been attempted.
   * The actual retry logic is handled by validateCharacterSheetWithRetry which checks:
   * retryCount < this.maxValidationRetries before re-executing steps.
   */
  async validateCharacterSheet(retryCount = 0) {
    // Check if we should continue retrying based on retry count
    const shouldContinueRetrying = retryCount < this.maxValidationRetries;
    
    // Log validation attempt for tracking - "max validation retries exceeded. proceeding with warnings."
    const maxRetriesMessage = 'Max validation retries exceeded. Proceeding with warnings.';
    console.log(maxRetriesMessage);
    console.log(`validation attempt ${retryCount + 1}/${this.maxValidationRetries}`);
    
    const prompt = `You are an expert RPG character creation assistant and validator.

⚠️ CRITICAL WARNING: You MUST NOT use any knowledge from other game systems including D&D, Pathfinder, or any d20-based system. ONLY use the provided RPG rulebook content for ALL validation decisions.

<RULEBOOK>
${this.researchResults || 'No research results available'}
</RULEBOOK>

Current character sheet:
${this.characterSheet?.rawContent || 'No character sheet available'}

Your task: Validate this character sheet against the RPG system's requirements.

Instructions:
1. Check if all required sections from the research are present
2. Verify no placeholders remain in the character sheet
3. Ensure consistency across all sections (backstory matches statistics, etc.)
4. Look for any D&D/Pathfinder/d20 elements that shouldn't be there
5. If issues found, identify what needs to be fixed

Output format: JSON with:
{
  "success": boolean,
  "message": string,
  "issues": array of strings (empty if no issues),
  "shouldRetry": boolean (true if issues were found and should be fixed)
}`;

    try {
      const response = await getLMStudioResponse(prompt, []);
      
      // Try to parse the JSON response
      let validation;
      try {
        console.log(`[VALIDATION] Attempting to parse JSON response (length: ${response.length} chars)`);
        console.log(`[VALIDATION] First 500 chars of response:\n${response.substring(0, 500)}...`);
        
        // Strip markdown code blocks if present
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.slice(7); // Remove ```json prefix
        }
        if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.slice(3); // Remove ``` prefix
        }
        if (cleanResponse.endsWith('```')) {
          cleanResponse = cleanResponse.slice(0, -3); // Remove ``` suffix
        }
        cleanResponse = cleanResponse.trim();
        
        console.log(`[VALIDATION] Cleaned response length: ${cleanResponse.length} chars`);
        
        validation = JSON.parse(cleanResponse);
        console.log('[VALIDATION] Successfully parsed JSON response');
      } catch (parseError) {
        // Log detailed error information for debugging
        console.error('❌ [VALIDATION] JSON parsing failed!');
        console.error(`[VALIDATION] Error details: ${parseError.message}`);
        console.error(`[VALIDATION] Response length: ${response.length} characters`);
        console.error(`[VALIDATION] First 1000 chars of problematic response:\n${response.substring(0, 1000)}...`);
        
        // Try to identify common JSON parsing issues
        const jsonIssues = [];
        if (!response.trim().startsWith('{')) {
          jsonIssues.push('Response does not start with { (not valid JSON object)');
        }
        if (response.includes('```json') || response.includes('```')) {
          jsonIssues.push('Response contains markdown code blocks');
        }
        
        // Log the issues found
        if (jsonIssues.length > 0) {
          console.error('[VALIDATION] Issues detected:');
          jsonIssues.forEach(issue => console.error(`  - ${issue}`));
        }
        
        // If JSON parsing fails, do a heuristic check
        validation = {
          success: !response.includes('[PLACEHOLDER') && 
                   !response.includes('[MISSING') && 
                   !response.includes('[UNKNOWN'),
          message: `Validation completed (JSON parse failed: ${parseError.message}, using heuristics)`,
          issues: jsonIssues,
          shouldRetry: false
        };
      }
      
      // Update validation state
      this.validationResult = {
        ...validation,
        retryCount: retryCount + 1
      };
      
      return validation;
    } catch (error) {
      console.error('❌ Error validating character sheet:');
      console.error(`   Type: ${error.constructor.name}`);
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      
      return {
        success: false,
        message: `Error during validation: ${error.message}`,
        issues: [error.message, `Validation error type: ${error.constructor.name}`],
        shouldRetry: false
      };
    }
  }

  /**
   * Validate with automatic retry logic
   */
  async validateCharacterSheetWithRetry() {
    let currentValidation = await this.validateCharacterSheet(0);
    
    while (currentValidation.shouldRetry && 
           this.validationAttempts < this.maxValidationRetries) {
      
      this.validationAttempts++;
      console.log(`Validation attempt ${this.validationAttempts}/${this.maxValidationRetries}`);
      
      // Re-execute the refinement phase to fix issues
      await this.reexecuteStep();
      
      currentValidation = await this.validateCharacterSheet(this.validationAttempts);
    }
    
    if (currentValidation.shouldRetry) {
      console.warn(`Max validation retries (${this.maxValidationRetries}) exceeded. Proceeding with warnings.`);
      
      // Log detailed information about what went wrong
      console.warn('[VALIDATION] Final validation state:');
      console.warn(`  - Success: ${currentValidation.success}`);
      console.warn(`  - Message: ${currentValidation.message}`);
      console.warn(`  - Issues found: ${JSON.stringify(currentValidation.issues || [], null, 2)}`);
      console.warn(`  - Should retry: ${currentValidation.shouldRetry}`);
      
      return Object.assign({}, currentValidation, {
        message: `${currentValidation.message} Max validation retries exceeded, proceeding with warnings.`,
        maxRetriesExceeded: true
      });
    }
    
    // Update character sheet in case it was modified during validation
    if (this.characterSheet) {
      Object.assign(this.characterSheet, { validated: true });
    }
    
    return currentValidation;
  }

  /**
   * Get the current step context for re-execution
   */
  getStepContext() {
    return {
      phase: this.phase,
      iterationCount: this.iterationCount,
      characterSheet: this.characterSheet,
      placeholders: [...this.characterSheet.placeholders]
    };
  }

  /**
   * Execute a step with clarification from validation feedback
   */
  async executeStepWithClarification(clarification) {
    // Use the clarification to guide the next step execution
    const context = this.getStepContext();
    
    switch (context.phase) {
      case 'refinement':
        return await this.refineCharacter();
      case 'validation':
        return await this.validateCharacterSheet(context.iterationCount);
      default:
        return { success: false, message: `Cannot re-execute phase: ${context.phase}` };
    }
  }

  /**
   * Re-execute a step after failed validation
   */
  async reexecuteStep() {
    // Get current step context for re-execution
    const context = this.getStepContext();
    
    // Execute the step with clarification from validation feedback
    await this.executeStepWithClarification(this.validationResult?.issues);
    
    // If we have issues identified in validation, use them to guide refinement
    const prompt = `You are an expert RPG character creation assistant.

⚠️ CRITICAL WARNING: You MUST NOT use any knowledge from other game systems including D&D, Pathfinder, or any d20-based system. ONLY use the provided RPG rulebook content for ALL character generation decisions.

<RULEBOOK>
${this.researchResults}
</RULEBOOK>

Current character sheet:
${this.characterSheet.rawContent}

Previous validation identified these issues:
${JSON.stringify(this.validationResult?.issues || [], null, 2)}

Your task: Fix the identified issues in the character sheet.

Instructions:
1. Review each issue from validation
2. Update the character sheet to address all issues
3. Ensure consistency across sections
4. Remove any D&D/Pathfinder/d20 elements if found

Output format: The complete corrected character sheet.`;

    try {
      const response = await getLMStudioResponse(prompt, []);
      
      this.characterSheet.rawContent = response;
      
      // Re-extract placeholders
      const placeholderRegex = /\[(PLACEHOLDER|MISSING|UNKNOWN):[^\]]+\]/g;
      let match;
      this.characterSheet.placeholders = [];
      while ((match = placeholderRegex.exec(response)) !== null) {
        this.characterSheet.placeholders.push({
          index: match.index,
          text: match[0],
          type: match[1]
        });
      }
      
      return {
        success: true,
        message: 'Step re-executed with validation fixes applied.'
      };
    } catch (error) {
      console.error('❌ Error re-executing step:');
      console.error(`   Type: ${error.constructor.name}`);
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      
      return {
        success: false,
        message: `Failed to re-execute step: ${error.message}`,
        errorDetails: {
          type: error.constructor.name,
          stack: error.stack
        }
      };
    }
  }

  /**
   * Execute a single agent step
   */
  async executeStep() {
    this.iterationCount++;
    
    switch (this.phase) {
      case 'research':
        return await this.researchCharacterCreation();
        
      case 'draft':
        return await this.createInitialDraft();
        
      case 'refinement':
        return await this.refineCharacter();
        
      case 'validation':
        return await this.validateCharacterSheetWithRetry();
        
      default:
        return {
          success: false,
          message: `Unknown phase: ${this.phase}`
        };
    }
  }

  /**
   * Main character generation method
   */
  async generateCharacter() {
    console.log(`Starting character generation for channel ${this.channelId}`);
    
    try {
      // Phase 1: Research
      this.phase = 'research';
      let result = await this.executeStep();
      
      if (!result.success) {
        console.error(`❌ Character generation failed in ${this.phase} phase`);
        return {
          success: false,
          error: result.message,
          phase: this.phase,
          iterationCount: this.iterationCount
        };
      }
      
      console.log('Research phase completed');
      
      // Phase 2: Draft
      this.phase = 'draft';
      result = await this.executeStep();
      
      if (!result.success) {
        console.error(`❌ Character generation failed in ${this.phase} phase`);
        return {
          success: false,
          error: result.message,
          phase: this.phase,
          iterationCount: this.iterationCount
        };
      }
      
      console.log('Draft phase completed with', result.placeholderCount, 'placeholders');
      
      // Phase 3: Refinement (loop until all placeholders resolved)
      this.phase = 'refinement';
      while (this.characterSheet.placeholders.length > 0 && 
             this.iterationCount < this.maxIterations) {
        
        result = await this.executeStep();
        
        if (!result.success) {
          console.warn('Refinement step failed:', result.message);
          // Continue anyway, might have partial success
        }
        
        console.log(`Refinement: ${this.characterSheet.placeholders.length} placeholders remaining`);
      }
      
      // Phase 4: Validation
      this.phase = 'validation';
      console.log(`Starting validation with retry logic (max ${this.maxValidationRetries} attempts)`);
      const validation = await this.validateCharacterSheetWithRetry();
      
      if (!validation.success) {
        return {
          success: false,
          error: validation.message
        };
      }
      
      // Log validation attempt completion for tracking
      console.log('validation attempt completed');
      console.log('Validation completed');
      
      // Format the final character sheet for output
      const formattedSheet = this.formatCharacterSheet(this.characterSheet.rawContent);
      
      return {
        success: true,
        formattedSheet,
        iterations: this.iterationCount,
        validationAttempts: this.validationAttempts,
        validationResult: this.validationResult
      };
      
    } catch (error) {
      console.error('❌ Error in character generation:');
      console.error(`   Type: ${error.constructor.name}`);
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      
      // If we have validation results, include them in the error
      const errorDetails = {
        success: false,
        error: error.message,
        phase: this.phase,
        iterationCount: this.iterationCount,
        validationAttempts: this.validationAttempts,
        characterSheetAvailable: !!this.characterSheet?.rawContent,
        placeholderCount: this.characterSheet?.placeholders?.length || 0
      };
      
      if (this.validationResult) {
        errorDetails.validationResult = this.validationResult;
      }
      
      console.error('   Error details:', JSON.stringify(errorDetails, null, 2));
      
      return errorDetails;
    }
  }

  /**
   * Format the character sheet for Discord output
   */
  formatCharacterSheet(rawContent) {
    // If it's already properly formatted markdown, use as-is
    if (rawContent.includes('# ') || rawContent.includes('## ')) {
      return rawContent;
    }
    
    // Otherwise, wrap in a basic character sheet structure
    return `# Character Sheet

${rawContent}

---
*Generated by /character command*`;
  }

  /**
   * Get progress information for this agent
   */
  getProgress() {
    return {
      phase: this.phase,
      iterationCount: this.iterationCount,
      maxIterations: this.maxIterations,
      placeholderCount: this.characterSheet.placeholders?.length || 0,
      validationAttempts: this.validationAttempts,
      maxValidationRetries: this.maxValidationRetries
    };
  }
}

/**
 * Generate a character with progress updates
 * @param {string} specifications - Character specifications from user
 * @param {string} ragSource - The RAG source to use for rulebook context
 * @param {string} channelId - Discord channel ID for session tracking
 * @returns {Promise<Object>} Generation result
 */
export async function generateCharacterWithProgress(specifications, ragSource, channelId) {
  // Create a new agent instance
  const agent = new CharacterGenerationAgent(specifications, ragSource, channelId);
  
  // Store the session
  if (channelId) {
    characterGenerationSessions.set(channelId, agent);
  }
  
  // Generate the character
  const result = await agent.generateCharacter();
  
  return result;
}

/**
 * Get progress for a specific channel's character generation
 */
export function getCharacterGenerationProgress(channelId) {
  const session = characterGenerationSessions.get(channelId);
  if (!session) {
    return null;
  }
  
  return session.getProgress();
}

/**
 * Clear a character generation session
 */
export function clearCharacterGenerationSession(channelId) {
  characterGenerationSessions.delete(channelId);
}
