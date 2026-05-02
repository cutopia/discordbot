import 'dotenv/config';
import fs from 'fs';

// Inline the LocalEmbeddings class for testing
class LocalEmbeddings {
  constructor() {
    this.modelName = process.env.OLLAMA_EMBEDDING_MODEL || 'all-minilm';
    this.dimensions = 384;
    this.apiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434/api';
    this.embeddingCache = new Map();
  }

  async embedDocuments(texts) {
    const embeddings = [];
    
    for (const text of texts) {
      const content = typeof text === 'string' ? text : text.pageContent || '';
      const cacheKey = content;
      
      if (this.embeddingCache.has(cacheKey)) {
        embeddings.push(this.embeddingCache.get(cacheKey));
      } else {
        const embedding = await this.generateOllamaEmbedding(content);
        this.embeddingCache.set(cacheKey, embedding);
        embeddings.push(embedding);
      }
    }
    
    return embeddings;
  }

  async embedQuery(text) {
    const cacheKey = text;
    
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey);
    }
    
    const embedding = await this.generateOllamaEmbedding(text);
    this.embeddingCache.set(cacheKey, embedding);
    
    return embedding;
  }

  async generateOllamaEmbedding(text) {
    try {
      console.log(`Calling Ollama API for embedding: "${text.substring(0, 50)}..."`);
      const response = await fetch(`${this.apiUrl}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt: text
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.embedding && Array.isArray(data.embedding)) {
        console.log(`✓ Got embedding from Ollama (${data.embedding.length} dimensions)`);
        return data.embedding;
      } else {
        throw new Error('Invalid embedding format from Ollama API');
      }
    } catch (error) {
      console.error(`Error generating embedding:`, error.message);
      
      // Fallback to hash-based embedding if API fails
      const fallbackEmbedding = this.generateHashEmbedding(text);
      console.warn('Using fallback hash-based embedding due to Ollama API error');
      return fallbackEmbedding;
    }
  }

  generateHashEmbedding(text) {
    const dimensions = 384;
    const embedding = new Array(dimensions).fill(0);
    
    if (!text || text.length === 0) {
      return embedding;
    }
    
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
      
      const dimIndex = Math.abs(hash % dimensions);
      const value = (Math.sin(hash) + 1) / 2;
      embedding[dimIndex] += value;
    }
    
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < dimensions; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }

  clearCache() {
    this.embeddingCache.clear();
  }
}

async function testEmbedding() {
  console.log('=== Testing LocalEmbeddings with Ollama ===\n');
  
  const embeddings = new LocalEmbeddings();
  
  try {
    // Test query embedding
    console.log('1. Testing query embedding...');
    const startTime = Date.now();
    const embedding = await embeddings.embedQuery('test query about magic spells');
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`   ✓ Generated in ${duration}s`);
    console.log(`   Length: ${embedding.length}`);
    console.log(`   First 5 values:`, embedding.slice(0, 5));
    console.log();
    
    // Test document embeddings
    console.log('2. Testing document embeddings...');
    const docs = [
      'This is a test document about magic spells and rituals.',
      'Another document about combat rules and battle tactics.',
      'A third document about character creation and backgrounds.'
    ];
    
    const docStartTime = Date.now();
    const docEmbeddings = await embeddings.embedDocuments(docs);
    const docDuration = ((Date.now() - docStartTime) / 1000).toFixed(2);
    
    console.log(`   ✓ Generated ${docEmbeddings.length} document embeddings in ${docDuration}s`);
    console.log(`   First doc embedding length: ${docEmbeddings[0].length}`);
    console.log();
    
    // Test similarity calculation
    console.log('3. Testing cosine similarity...');
    const queryEmb = await embeddings.embedQuery('magic spells');
    const doc1Emb = docEmbeddings[0];
    const doc2Emb = docEmbeddings[1];
    
    const sim1 = cosineSimilarity(queryEmb, doc1Emb);
    const sim2 = cosineSimilarity(queryEmb, doc2Emb);
    
    console.log(`   Similarity to magic document: ${sim1.toFixed(4)}`);
    console.log(`   Similarity to combat document: ${sim2.toFixed(4)}`);
    console.log();
    
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) return 0;
  
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
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return dotProduct / (magnitude1 * magnitude2);
}

testEmbedding();
