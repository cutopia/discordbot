import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Import pdf-parse directly to avoid its debug mode initialization
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse/lib/pdf-parse.js');
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
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
    
    for (const text of texts) {
      const content = typeof text === 'string' ? text : text.pageContent || '';
      const cacheKey = content;
      
      if (this.embeddingCache.has(cacheKey)) {
        embeddings.push(this.embeddingCache.get(cacheKey));
      } else {
        // Generate embedding using Ollama's embeddings API
        const embedding = await this.generateOllamaEmbedding(content);
        this.embeddingCache.set(cacheKey, embedding);
        embeddings.push(embedding);
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
    
    return this.documents.slice(0, k).map(doc => ({
      pageContent: typeof doc === 'string' ? doc : doc.pageContent || '',
      metadata: doc.metadata || {},
      score: 0
    }));
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
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    const splits = await textSplitter.splitText(text);
    const embeddings = new LocalEmbeddings();
    
    const vectorStore = await SimpleVectorStore.fromDocuments(
      splits.map(text => ({
        pageContent: text,
        metadata: { source: sourceName }
      })),
      embeddings
    );
    
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
  
  const docs = await vectorStore.similaritySearch(query, k);
  
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
    
    if (docs.length === 0) {
      return 'No relevant information found in the knowledge base.';
    }
    
    const contextParts = docs.map((doc, index) => {
      return `Context ${index + 1}:\n${doc.content}\n`;
    });
    
    return contextParts.join('\n---\n');
  } catch (error) {
    console.error('Error getting context:', error);
    return 'Error retrieving context from knowledge base.';
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
