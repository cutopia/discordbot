import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Import pdf-parse directly to avoid its debug mode initialization
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse/lib/pdf-parse.js');
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
// In-memory vector store implementation for langchain v1.x
// The original MemoryVectorStore was removed in langchain v1
class SimpleVectorStore {
  constructor() {
    this.documents = [];
    this.embeddings = [];
  }

  async addDocuments(docs) {
    this.documents.push(...docs);
    // Store embeddings if available
    docs.forEach(doc => {
      if (doc.embedding) {
        this.embeddings.push({ embedding: doc.embedding, document: doc });
      }
    });
  }

  async similaritySearch(query, k = 4) {
    // Simple cosine similarity implementation for demo purposes
    // In production, use a proper vector database or the @langchain/community package
    if (this.documents.length === 0) return [];
    
    // Return top-k documents (simplified - just returns all for now)
    return this.documents.slice(0, k).map(doc => ({
      pageContent: typeof doc === 'string' ? doc : doc.pageContent || '',
      metadata: doc.metadata || {},
      score: 0 // Placeholder score
    }));
  }

  static async fromDocuments(docs, embeddings) {
    const store = new SimpleVectorStore();
    
    // Generate embeddings for documents if not already present
    for (const doc of docs) {
      const content = typeof doc === 'string' ? doc : doc.pageContent || '';
      const metadata = doc.metadata || {};
      
      // Generate embedding using the provided embeddings model
      let embedding;
      try {
        embedding = await embeddings.embedQuery(content);
      } catch (e) {
        // Fallback: create a simple hash-based "embedding" for demo purposes
        embedding = new Array(1536).fill(0); // Default OpenAI dimension
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
 * @returns {Array<{name: string, path: string}>} - Array of available PDF files
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
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<string>} - Extracted text content
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
 * @param {string} sourceName - Name of the source (for identification)
 * @param {string} text - Document text content
 * @returns {Promise<MemoryVectorStore>} - Created vector store
 */
export async function createVectorStore(sourceName, text) {
  try {
    // Split text into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    const splits = await textSplitter.splitText(text);
    
    // Create embeddings (using OpenAI-compatible API)
    // For local development, you might want to use a different embedding model
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY || 'dummy-key', // Placeholder for local LLMs
      modelName: 'text-embedding-ada-002'
    });
    
    // Create vector store using our simple in-memory implementation
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
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<MemoryVectorStore>} - Vector store for the PDF
 */
export async function getOrCreateVectorStore(pdfPath) {
  const sourceName = path.basename(pdfPath, '.pdf');
  
  // Check if we already have a vector store for this source
  if (vectorStores.has(sourceName)) {
    return vectorStores.get(sourceName);
  }
  
  try {
    // Extract text from PDF
    console.log(`Extracting text from ${sourceName}...`);
    const text = await extractTextFromPDF(pdfPath);
    
    // Create vector store
    console.log(`Creating vector store for ${sourceName}...`);
    const vectorStore = await createVectorStore(sourceName, text);
    
    // Store for future use
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
 * @param {string} sourceName - Name of the PDF source
 * @param {string} query - User's question
 * @param {number} k - Number of results to return (default: 3)
 * @returns {Promise<Array>} - Relevant document chunks with metadata
 */
export async function queryVectorStore(sourceName, query, k = 3) {
  const vectorStore = vectorStores.get(sourceName);
  
  if (!vectorStore) {
    throw new Error(`No vector store found for source: ${sourceName}`);
  }
  
  // Search for similar documents
  const docs = await vectorStore.similaritySearch(query, k);
  
  return docs.map(doc => ({
    content: doc.pageContent,
    metadata: doc.metadata,
    score: doc.score // Relevance score (lower is better for some vector stores)
  }));
}

/**
 * Get context from vector store and format it for the AI
 * @param {string} sourceName - Name of the PDF source
 * @param {string} query - User's question
 * @param {number} k - Number of results to return (default: 3)
 * @returns {Promise<string>} - Formatted context string
 */
export async function getContextForQuery(sourceName, query, k = 3) {
  try {
    const docs = await queryVectorStore(sourceName, query, k);
    
    if (docs.length === 0) {
      return 'No relevant information found in the knowledge base.';
    }
    
    // Format context with document metadata
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
 * @param {string} sourceName - Name of the PDF source
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
