import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import local embedding and vector store implementations
import { LocalEmbeddings, SimpleVectorStore } from './rag.js';

/**
 * Enhanced RAG system that supports both chunk-based and summary-based retrieval
 */
class EnhancedRAGSystem {
  constructor() {
    this.vectorStores = new Map();
    this.sourceDocuments = new Map();
    this.summaryIndexes = new Map(); // Index of summaries by aspect
    this.embeddings = new LocalEmbeddings();
    
    // Aspect metadata for routing queries
    this.aspectMetadata = {
      characterCreation: {
        keywords: ['character', 'creation', 'attributes', 'skills', 'background', 'sheet', 'stats'],
        description: 'Rules and processes governing character creation'
      },
      combat: {
        keywords: ['combat', 'battle', 'fight', 'attack', 'defense', 'turn', 'actions', 'damage'],
        description: 'Rules for combat scenarios'
      },
      gameplay: {
        keywords: ['gameplay', 'success', 'skill', 'check', 'social', 'exploration', 'non-combat', 'interaction'],
        description: 'Non-combat rules and gameplay mechanics'
      },
      setting: {
        keywords: ['setting', 'world', 'place', 'location', 'character', 'faction', 'history', 'atmosphere', 'tone'],
        description: 'Game world setting and atmosphere'
      }
    };
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(documents, sourceName) {
    const docs = documents.map(doc => ({
      pageContent: typeof doc === 'string' ? doc : doc.pageContent || '',
      metadata: typeof doc === 'string' ? { source: sourceName } : doc.metadata || { source: sourceName }
    }));
    
    // Create vector store if it doesn't exist
    if (!this.vectorStores.has(sourceName)) {
      this.vectorStores.set(sourceName, new SimpleVectorStore());
    }
    
    const vectorStore = this.vectorStores.get(sourceName);
    
    // Add documents with embeddings
    for (const doc of docs) {
      try {
        const embedding = await this.embeddings.embedQuery(doc.pageContent);
        vectorStore.documents.push({
          pageContent: doc.pageContent,
          metadata: doc.metadata,
          embedding
        });
        
        // Track summary documents separately
        if (doc.metadata?.aspect && doc.metadata?.summaryType === 'detailed') {
          const aspect = doc.metadata.aspect;
          
          if (!this.summaryIndexes.has(sourceName)) {
            this.summaryIndexes.set(sourceName, {});
          }
          
          if (!this.summaryIndexes.get(sourceName)[aspect]) {
            this.summaryIndexes.get(sourceName)[aspect] = [];
          }
          
          this.summaryIndexes.get(sourceName)[aspect].push({
            document: doc,
            embedding
          });
        }
        
      } catch (error) {
        console.error(`Error adding document to vector store:`, error);
      }
    }
    
    return docs.length;
  }

  /**
   * Query the vector store with aspect-aware routing
   */
  async query(sourceName, query, options = {}) {
    const { k = 5, aspects = null } = options;
    
    // Detect relevant aspects from the query
    const detectedAspects = this.detectQueryAspects(query);
    
    console.log(`[EnhancedRAG] Query: "${query.substring(0, 50)}..."`);
    console.log(`[EnhancedRAG] Detected aspects: ${detectedAspects.join(', ')}`);
    
    // If specific aspects are requested, use them; otherwise use detected ones
    const queryAspects = aspects || detectedAspects;
    
    let results = [];
    
    // Query summary indexes first (if available and relevant)
    if (this.summaryIndexes.has(sourceName) && queryAspects.length > 0) {
      for (const aspect of queryAspects) {
        if (this.summaryIndexes.get(sourceName)[aspect]) {
          const aspectResults = await this.queryAspectIndex(
            sourceName, 
            aspect, 
            query, 
            Math.ceil(k / queryAspects.length)
          );
          
          results.push(...aspectResults);
        }
      }
    }
    
    // Query main vector store for additional context
    if (this.vectorStores.has(sourceName)) {
      const mainStore = this.vectorStores.get(sourceName);
      
      // If we already have enough results from summaries, reduce k for main search
      const remainingK = Math.max(k - results.length, 2);
      
      try {
        const mainResults = await mainStore.similaritySearch(query, remainingK);
        
        // Filter out duplicates
        const existingContent = new Set(results.map(r => r.pageContent));
        for (const result of mainResults) {
          if (!existingContent.has(result.pageContent)) {
            results.push(result);
          }
        }
      } catch (error) {
        console.error(`[EnhancedRAG] Error querying main vector store:`, error);
      }
    }
    
    // Sort by score and return top k
    results.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    return results.slice(0, k).map(result => ({
      pageContent: result.pageContent,
      metadata: result.metadata || {},
      score: result.score || 0
    }));
  }

  /**
   * Query a specific aspect index
   */
  async queryAspectIndex(sourceName, aspect, query, k = 3) {
    const aspectData = this.summaryIndexes.get(sourceName)?.[aspect];
    
    if (!aspectData || aspectData.length === 0) {
      return [];
    }
    
    // Generate embedding for the query
    let queryEmbedding;
    try {
      queryEmbedding = await this.embeddings.embedQuery(query);
    } catch (error) {
      console.error(`[EnhancedRAG] Error generating query embedding:`, error);
      return [];
    }
    
    // Calculate similarity with each aspect document
    const similarities = aspectData.map(item => ({
      document: item.document,
      score: this.cosineSimilarity(queryEmbedding, item.embedding)
    }));
    
    // Sort and return top k
    similarities.sort((a, b) => b.score - a.score);
    
    return similarities.slice(0, k).map(item => ({
      pageContent: typeof item.document === 'string' 
        ? item.document 
        : item.document.pageContent || '',
      metadata: typeof item.document === 'string' 
        ? {} 
        : item.document.metadata || {},
      score: item.score
    }));
  }

  /**
   * Detect which aspects are relevant to a query
   */
  detectQueryAspects(query) {
    const detected = [];
    
    for (const [aspect, metadata] of Object.entries(this.aspectMetadata)) {
      const keywords = metadata.keywords;
      
      for (const keyword of keywords) {
        if (query.toLowerCase().includes(keyword)) {
          detected.push(aspect);
          break; // Only add aspect once
        }
      }
    }
    
    return detected;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }
    
    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Get context from vector store and format it for the AI
   */
  async getContext(sourceName, query, options = {}) {
    const docs = await this.query(sourceName, query, options);
    
    if (docs.length === 0) {
      return 'No relevant information found in the knowledge base.';
    }
    
    // Format context with metadata
    const contextParts = docs.map((doc, index) => {
      const relevanceScore = Math.round(doc.score * 100);
      const content = doc.pageContent || '';
      
      let metadataInfo = '';
      if (doc.metadata?.aspect) {
        metadataInfo = ` [Aspect: ${doc.metadata.aspect}]`;
      }
      if (doc.metadata?.chapterNumber) {
        metadataInfo += ` [Chapter: ${doc.metadata.chapterNumber}]`;
      }
      
      return `Context ${index + 1}${metadataInfo} (Relevance: ${relevanceScore}%):\n${content}\n`;
    });
    
    const contextInfo = `Retrieved ${docs.length} relevant context chunk(s) from knowledge base.\n` +
                       `Query: "${query}"\n\n` +
                       contextParts.join('\n---\n');
    
    return contextInfo;
  }

  /**
   * Clear vector store for a specific source
   */
  clear(sourceName) {
    this.vectorStores.delete(sourceName);
    if (this.summaryIndexes.has(sourceName)) {
      this.summaryIndexes.delete(sourceName);
    }
    console.log(`[EnhancedRAG] Cleared vector store for ${sourceName}`);
  }

  /**
   * Clear all vector stores
   */
  clearAll() {
    this.vectorStores.clear();
    this.summaryIndexes.clear();
    console.log('[EnhancedRAG] Cleared all vector stores');
  }
}

/**
 * Format summaries for storage in vector database
 */
function formatSummariesForStorage(analysisResult) {
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
 * Create an enhanced RAG system from analysis results
 */
async function createEnhancedRAGFromAnalysis(analysisResult) {
  const rag = new EnhancedRAGSystem();
  
  // Format summaries for storage
  const documents = formatSummariesForStorage(analysisResult);
  
  // Add to vector store
  await rag.addDocuments(documents, analysisResult.sourceName);
  
  return rag;
}

// Export the enhanced RAG system
export { EnhancedRAGSystem, createEnhancedRAGFromAnalysis };

export default {
  EnhancedRAGSystem,
  createEnhancedRAGFromAnalysis,
  formatSummariesForStorage
};
