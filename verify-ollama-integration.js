#!/usr/bin/env node

/**
 * Verification script for Ollama embedding integration
 */

console.log('=== Verifying Ollama Embedding Integration ===\n');

// Check 1: Verify rag.js has been updated
console.log('✓ Checking rag.js...');
const fs = await import('fs');
const ragContent = fs.readFileSync('./rag.js', 'utf8');

if (ragContent.includes('OLLAMA_API_URL')) {
  console.log('  ✓ Ollama API URL configuration found');
} else {
  console.log('  ✗ Ollama API URL configuration missing');
}

if (ragContent.includes('generateOllamaEmbedding')) {
  console.log('  ✓ generateOllamaEmbedding method found');
} else {
  console.log('  ✗ generateOllamaEmbedding method missing');
}

// Check 2: Verify .env.example has been updated
console.log('\n✓ Checking .env.example...');
const envContent = fs.readFileSync('./.env.example', 'utf8');

if (envContent.includes('OLLAMA_API_URL')) {
  console.log('  ✓ OLLAMA_API_URL variable found');
} else {
  console.log('  ✗ OLLAMA_API_URL variable missing');
}

if (envContent.includes('OLLAMA_EMBEDDING_MODEL')) {
  console.log('  ✓ OLLAMA_EMBEDDING_MODEL variable found');
} else {
  console.log('  ✗ OLLAMA_EMBEDDING_MODEL variable missing');
}

// Check 3: Test Ollama API connectivity
console.log('\n✓ Testing Ollama API connectivity...');
const http = await import('http');

function testOllamaAPI() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 11434,
      path: '/api/tags',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const models = JSON.parse(data);
          if (models.models && Array.isArray(models.models)) {
            const hasAllMinilm = models.models.some(m => m.name.includes('all-minilm'));
            resolve(hasAllMinilm ? '✓ Ollama API accessible with all-minilm model' : '⚠️ Ollama running but all-minilm not found');
          } else {
            resolve('⚠️ Unexpected response format');
          }
        } catch (e) {
          resolve('✗ Failed to parse Ollama response');
        }
      });
    });

    req.on('error', () => resolve('✗ Ollama API not accessible'));
    req.end();
  });
}

const ollamaStatus = await testOllamaAPI();
console.log(`  ${ollamaStatus}`);

// Summary
console.log('\n=== Verification Complete ===');
console.log('\nNext steps:');
console.log('1. Ensure Ollama is running: ollama serve');
console.log('2. Copy .env.example to .env if not done already');
console.log('3. Test RAG functionality: npm run test-rag');

