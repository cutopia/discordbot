import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Import pdf-parse directly to avoid its debug mode initialization
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse/lib/pdf-parse.js');
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

/**
 * Load the RAG prompt template from prompt.txt
 */
function loadRagPromptTemplate() {
  const promptPath = path.join(__dirname, 'prompt.txt');
  
  try {
    if (fs.existsSync(promptPath)) {
      return fs.readFileSync(promptPath, 'utf8');
    }
  } catch (error) {
    console.error('Error loading RAG prompt template:', error);
  }
  
  // Default fallback prompt
  return `You are a helpful AI roleplaying game expert system that answers questions based on the provided context.
Rules:
1. Only use information from the provided context to answer questions.
2. If the context doesn't contain enough information, say so honestly
3. Be specific and cite relevant parts of the context
4. Keep your answers clear and concise
5. If you're unsure, admit it rather than guessing.
6. If asked to do a creative task such as coming up with a character biography or adventure idea, do NOT just copy the examples in the provided context. Instead, be as original as you can while carefully fitting into the provided context's own world.

Context:
{context}

Question: {input}

Answer based on the context above:`;
}

// Local embedding implementation - no external API dependencies

/**
 * Simple local embedding generator using a pre-trained model
 * Uses the all-minilm model from Ollama for embeddings (384 dimensions)
 */
class LocalEmbeddings {
  constructor() {
    // Use Ollama's all-minilm model by default
    this.modelName = process.env.OLLAMA_EMBEDDING_MODEL || 'all-minilm';
    this.dimensions = 384;
    
    // Ollama API configuration
    this.apiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434/api';
    
    // Embedding cache to avoid recomputing
    this.embeddingCache = new Map();
  }

  /**
   * Generate embeddings for a list of texts using Ollama's API
   * @param {string[]} texts - Array of text strings to embed
   * @returns {Promise<number[][]>} - Array of embedding vectors
   */
  async embedDocuments(texts) {
    const embeddings = [];
    
    // Process with small batch size to avoid overwhelming the API
    const batchSize = 5;
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      // Add a small delay between batches to avoid rate limiting
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      for (const text of batch) {
        const content = typeof text === 'string' ? text : text.pageContent || '';
        const cacheKey = content;
        
        if (this.embeddingCache.has(cacheKey)) {
          embeddings.push(this.embeddingCache.get(cacheKey));
        } else {
          // Generate embedding using Ollama's embeddings API
          try {
            const embedding = await this.generateOllamaEmbedding(content);
            this.embeddingCache.set(cacheKey, embedding);
            embeddings.push(embedding);
          } catch (error) {
            console.error(`Error in batch embedding for text "${content.substring(0, 50)}...":`, error.message);
            // Use fallback embedding
            const fallback = this.generateHashEmbedding(content);
            this.embeddingCache.set(cacheKey, fallback);
            embeddings.push(fallback);
          }
        }
      }
    }
    
    return embeddings;
  }

  /**
   * Generate embedding for a single query using Ollama's API
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - Embedding vector
   */
  async embedQuery(text) {
    const cacheKey = text;
    
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey);
    }
    
    // Generate embedding using Ollama's embeddings API
    const embedding = await this.generateOllamaEmbedding(text);
    this.embeddingCache.set(cacheKey, embedding);
    
    return embedding;
  }

  /**
   * Generate a deterministic embedding vector from text content using Ollama API
   * @param {string} text - Input text
   * @returns {Promise<number[]>} - Embedding vector (384 dimensions)
   */
  async generateOllamaEmbedding(text) {
    try {
      const response = await fetch(`${this.apiUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.modelName,
          prompt: text
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Extract embedding from the response
      // Ollama returns { embedding: [...] }
      if (data.embedding && Array.isArray(data.embedding)) {
        return data.embedding;
      } else {
        throw new Error('Invalid embedding format from Ollama API');
      }
    } catch (error) {
      console.error(`Error generating embedding for text "${text.substring(0, 50)}...":`, error);
      
      // Fallback to hash-based embedding if API fails
      const fallbackEmbedding = this.generateHashEmbedding(text);
      console.warn('Using fallback hash-based embedding due to Ollama API error');
      return fallbackEmbedding;
    }
  }

  /**
   * Generate a deterministic embedding vector from text content using hashing
   * This is a fallback implementation when the Ollama API is unavailable
   * @param {string} text - Input text
   * @returns {number[]} - Embedding vector (384 dimensions)
   */
  generateHashEmbedding(text) {
    // Simple hash-based embedding generation for demo purposes
    // Each character contributes to the embedding based on its ASCII value
    const embedding = new Array(this.dimensions).fill(0);
    
    if (!text || text.length === 0) {
      return embedding;
    }
    
    // Use a simple hashing approach to distribute values across dimensions
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
      
      // Map hash to a dimension and value
      const dimIndex = Math.abs(hash % this.dimensions);
      const value = (Math.sin(hash) + 1) / 2; // Normalize to [0, 1]
      embedding[dimIndex] += value;
    }
    
    // Normalize the embedding vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }

  /**
   * Clear the embedding cache
   */
  clearCache() {
    this.embeddingCache.clear();
  }
}

// In-memory vector store implementation for langchain v1.x
class SimpleVectorStore {
  constructor() {
    this.documents = [];
    this.embeddings = [];
  }

  async addDocuments(docs) {
    this.documents.push(...docs);
    docs.forEach(doc => {
      if (doc.embedding) {
        this.embeddings.push({ embedding: doc.embedding, document: doc });
      }
    });
  }

  async similaritySearch(query, k = 4) {
    if (this.documents.length === 0) return [];
    
    // Generate embedding for the query
    let queryEmbedding;
    try {
      const embeddings = new LocalEmbeddings();
      queryEmbedding = await embeddings.embedQuery(query);
    } catch (error) {
      console.error('Error generating query embedding:', error);
      // Fallback to hash embedding if Ollama fails
      queryEmbedding = this.generateHashEmbedding(query);
    }
    
    // Calculate cosine similarity between query and all document embeddings
    const similarities = [];
    
    for (let i = 0; i < this.documents.length; i++) {
      const doc = this.documents[i];
      const docEmbedding = doc.embedding || new Array(384).fill(0);
      
      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);
      
      similarities.push({
        document: doc,
        score: similarity
      });
    }
    
    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.score - a.score);
    
    // Apply minimum relevance threshold to filter out irrelevant results
    const minRelevanceThreshold = 0.25;
    const relevantResults = similarities.filter(item => item.score >= minRelevanceThreshold);
    
    // If no results meet the threshold, return top k anyway (better than nothing)
    const resultsToReturn = relevantResults.length > 0 ? relevantResults : similarities.slice(0, k);
    
    return resultsToReturn.slice(0, k).map(item => ({
      pageContent: typeof item.document === 'string' 
        ? item.document 
        : item.document.pageContent || '',
      metadata: item.document.metadata || {},
      score: item.score
    }));
  }
  
  /**
   * Calculate cosine similarity between two vectors
   * @param {number[]} vec1 - First vector
   * @param {number[]} vec2 - Second vector
   * @returns {number} Cosine similarity (range: [-1, 1], higher = more similar)
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      console.warn('Vector dimensions mismatch in cosine similarity');
      // Pad or truncate to match lengths
      const maxLength = Math.max(vec1.length, vec2.length);
      const padded1 = new Array(maxLength).fill(0);
      const padded2 = new Array(maxLength).fill(0);
      
      for (let i = 0; i < vec1.length; i++) padded1[i] = vec1[i];
      for (let i = 0; i < vec2.length; i++) padded2[i] = vec2[i];
      
      return this.cosineSimilarity(padded1, padded2);
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
   * Generate a deterministic embedding vector from text content using hashing
   * This is used as fallback when Ollama API is unavailable
   * @param {string} text - Input text
   * @returns {number[]} - Embedding vector (384 dimensions)
   */
  generateHashEmbedding(text) {
    // Simple hash-based embedding generation for demo purposes
    const dimensions = 384;
    const embedding = new Array(dimensions).fill(0);
    
    if (!text || text.length === 0) {
      return embedding;
    }
    
    // Use a simple hashing approach to distribute values across dimensions
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
      
      // Map hash to a dimension and value
      const dimIndex = Math.abs(hash % dimensions);
      const value = (Math.sin(hash) + 1) / 2; // Normalize to [0, 1]
      embedding[dimIndex] += value;
    }
    
    // Normalize the embedding vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < dimensions; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }

  static async fromDocuments(docs, embeddings) {
    const store = new SimpleVectorStore();
    
    for (const doc of docs) {
      const content = typeof doc === 'string' ? doc : doc.pageContent || '';
      const metadata = doc.metadata || {};
      
      let embedding;
      try {
        embedding = await embeddings.embedQuery(content);
      } catch (e) {
        embedding = new Array(384).fill(0);
      }
      
      store.documents.push({ pageContent: content, metadata, embedding });
    }
    
    return store;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the RAG prompt template
const ragPromptTemplate = loadRagPromptTemplate();

// Store vector stores per channel
const vectorStores = new Map();
const sourceDocuments = new Map();

/**
 * Get available PDF files from the ragsourcebooks directory
 */
export function getAvailablePDFs() {
  const pdfDir = path.join(__dirname, 'ragsourcebooks');
  const pdfFiles = [];
  
  if (fs.existsSync(pdfDir)) {
    fs.readdirSync(pdfDir).forEach(file => {
      if (file.toLowerCase().endsWith('.pdf')) {
        pdfFiles.push({
          name: file.replace('.pdf', ''),
          path: path.join(pdfDir, file)
        });
      }
    });
  }
  
  return pdfFiles;
}

/**
 * Extract text from a PDF file
 */
export async function extractTextFromPDF(filePath) {
  try {
    const pdfBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(pdfBuffer);
    return pdfData.text;
  } catch (error) {
    console.error(`Error extracting text from PDF ${filePath}:`, error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Create a vector store from document text
 */
export async function createVectorStore(sourceName, text) {
  try {
    // Use smaller chunk sizes for better retrieval granularity (optimal for RAG)
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 384,
      chunkOverlap: 76,
    });
    
    console.log(`Splitting ${sourceName} into chunks...`);
    const splits = await textSplitter.splitText(text);
    console.log(`Created ${splits.length} chunks from ${sourceName}`);
    
    // Verify we have reasonable chunk sizes
    const avgChunkSize = splits.reduce((sum, chunk) => sum + chunk.length, 0) / splits.length;
    console.log(`Average chunk size: ${Math.round(avgChunkSize)} characters`);
    
    if (splits.length === 0) {
      throw new Error('No chunks were created from the document');
    }
    
    const embeddings = new LocalEmbeddings();
    
    const vectorStore = await SimpleVectorStore.fromDocuments(
      splits.map(text => ({
        pageContent: text,
        metadata: { source: sourceName }
      })),
      embeddings
    );
    
    console.log(`Successfully created vector store with ${vectorStore.documents.length} documents`);
    return vectorStore;
  } catch (error) {
    console.error(`Error creating vector store for ${sourceName}:`, error);
    throw new Error(`Failed to create vector store: ${error.message}`);
  }
}

/**
 * Get or create a vector store for a specific PDF source
 */
export async function getOrCreateVectorStore(pdfPath) {
  const sourceName = path.basename(pdfPath, '.pdf');
  
  if (vectorStores.has(sourceName)) {
    return vectorStores.get(sourceName);
  }
  
  try {
    console.log(`Extracting text from ${sourceName}...`);
    const text = await extractTextFromPDF(pdfPath);
    
    console.log(`Creating vector store for ${sourceName}...`);
    const vectorStore = await createVectorStore(sourceName, text);
    
    vectorStores.set(sourceName, vectorStore);
    sourceDocuments.set(sourceName, { path: pdfPath, text });
    
    console.log(`Successfully created vector store for ${sourceName}`);
    return vectorStore;
  } catch (error) {
    console.error(`Failed to create vector store for ${pdfPath}:`, error);
    throw error;
  }
}

/**
 * Query the vector store for relevant context
 */
export async function queryVectorStore(sourceName, query, k = 3) {
  const vectorStore = vectorStores.get(sourceName);
  
  if (!vectorStore) {
    throw new Error(`No vector store found for source: ${sourceName}`);
  }
  
  console.log(`[RAG] Querying vector store "${sourceName}" with "${query.substring(0, 50)}..." (k=${k})`);
  
  const docs = await vectorStore.similaritySearch(query, k);
  
  // Log relevance scores for debugging
  if (docs.length > 0) {
    console.log('[RAG] Retrieved documents:');
    docs.forEach((doc, i) => {
      const contentLength = doc.content ? doc.content.length : (doc.pageContent ? doc.pageContent.length : 0);
      console.log(`  ${i + 1}. Score: ${Math.round(doc.score * 100)}%, Length: ${contentLength} chars`);
    });
  } else {
    console.log('[RAG] No documents retrieved from vector store');
  }
  
  return docs.map(doc => ({
    content: doc.pageContent,
    metadata: doc.metadata,
    score: doc.score
  }));
}

/**
 * Get context from vector store and format it for the AI
 */
export async function getContextForQuery(sourceName, query, k = 3) {
  try {
    const docs = await queryVectorStore(sourceName, query, k);
    
    console.log(`[RAG] Retrieved ${docs.length} documents for "${sourceName}"`);
    
    if (docs.length === 0) {
      console.warn('[RAG] No documents retrieved from vector store');
      return 'No relevant information found in the knowledge base.';
    }
    
    // Format context with relevance scores for better AI understanding
    const contextParts = docs.map((doc, index) => {
      const relevanceScore = Math.round(doc.score * 100);
      return `Context ${index + 1} (Relevance: ${relevanceScore}%):\n${doc.content}\n`;
    });
    
    // Add metadata about the retrieval for the AI
    const contextInfo = `Retrieved ${docs.length} relevant context chunk(s) from knowledge base.\n` +
                       `Query: "${query}"\n\n` +
                       contextParts.join('\n---\n');
    
    console.log(`[RAG] Context info generated (length: ${contextInfo.length} chars)`);
    
    return contextInfo;
  } catch (error) {
    console.error('[RAG] Error getting context:', error);
    return 'Error retrieving context from knowledge base.';
  }
}

/**
 * Format a query using the RAG prompt template
 * @param {string} sourceName - Name of the RAG source
 * @param {string} query - The user's question
 * @param {string} context - The retrieved context from vector store
 * @returns {string} - Formatted prompt with context and instructions
 */
export function formatQueryWithPrompt(sourceName, query, context) {
  if (!ragPromptTemplate) {
    // Fallback if template couldn't be loaded
    return `Based on the following context from ${sourceName}:\n\n${context}\n\nQuestion: ${query}`;
  }
  
  // Replace placeholders in the prompt template
  let formatted = ragPromptTemplate.replace('{context}', context);
  formatted = formatted.replace('{input}', query);
  
  return formatted;
}

/**
 * Get a formatted RAG query for LM Studio
 * This combines the prompt template with retrieved context
 * @param {string} sourceName - Name of the RAG source
 * @param {string} query - The user's question
 * @param {number} k - Number of context chunks to retrieve (default: 3)
 * @returns {Promise<string>} - Formatted prompt ready for LM Studio
 */
export async function getRagQuery(sourceName, query, k = 3) {
  try {
    console.log(`[RAG] Getting query for source "${sourceName}", query: "${query.substring(0, 50)}..."`);
    
    const context = await getContextForQuery(sourceName, query, k);
    console.log(`[RAG] Retrieved context (length: ${context.length} chars)`);
    
    const formatted = formatQueryWithPrompt(sourceName, query, context);
    console.log(`[RAG] Formatted prompt (length: ${formatted.length} chars)`);
    
    return formatted;
  } catch (error) {
    console.error('[RAG] Error getting RAG query:', error);
    return `Question: ${query}\n\nNote: Could not retrieve context from knowledge base.`;
  }
}

/**
 * Clear vector store for a specific source
 */
export function clearVectorStore(sourceName) {
  if (vectorStores.has(sourceName)) {
    vectorStores.delete(sourceName);
    sourceDocuments.delete(sourceName);
    console.log(`Cleared vector store for ${sourceName}`);
  }
}

/**
 * Clear all vector stores
 */
export function clearAllVectorStores() {
  vectorStores.clear();
  sourceDocuments.clear();
  console.log('Cleared all vector stores');
}

// Export the vectorStores map for direct access when needed
export { vectorStores };
