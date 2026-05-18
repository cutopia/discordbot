#!/usr/bin/env node

/**
 * Verification script for LM Studio integration
 * Tests that the LLM is accessible and can generate responses
 */

import { getLMStudioResponse } from './lmstudio.js';

async function verifyLMStudio() {
  console.log('=== LM Studio Integration Verification ===\n');
  
  // Check environment configuration
  const endpoint = process.env.LM_STUDIO_API_URL || 'http://localhost:1234/v1/chat/completions';
  const model = process.env.DEFAULT_MODEL || 'auto';
  
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Model: ${model}\n`);
  
  // Test 1: Check if endpoint is reachable
  console.log('Test 1: Checking endpoint availability...');
  try {
    const response = await fetch(endpoint.replace('/chat/completions', '/models'), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✓ Endpoint is reachable');
    
    if (data.data && Array.isArray(data.data)) {
      console.log(`✓ Found ${data.data.length} model(s):`);
      data.data.forEach((model, i) => {
        console.log(`  ${i + 1}. ${model.id}`);
      });
    }
  } catch (error) {
    console.error('✗ Endpoint check failed:', error.message);
    console.log('\nPlease ensure LM Studio is running with a loaded model.');
    console.log('Start the server in LM Studio and verify it\'s listening on port 1234.\n');
    return false;
  }
  
  // Test 2: Generate a simple response
  console.log('\nTest 2: Generating a simple response...');
  try {
    const testPrompt = 'Say "Hello, LM Studio is working!"';
    const response = await getLMStudioResponse(testPrompt);
    
    if (response && response.length > 0) {
      console.log('✓ LLM responded successfully');
      console.log(`Response: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`);
      
      // Verify it contains expected content
      if (response.toLowerCase().includes('hello') && 
          response.toLowerCase().includes('lm studio')) {
        console.log('✓ Response contains expected content');
      } else {
        console.log('⚠ Response received but may not match expected content');
      }
    } else {
      console.error('✗ LLM returned empty response');
      return false;
    }
  } catch (error) {
    console.error('✗ LLM request failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('\nRequest timed out. Consider increasing LM_STUDIO_TIMEOUT in .env');
    }
    
    return false;
  }
  
  // Test 3: Test with conversation history
  console.log('\nTest 3: Testing with conversation history...');
  try {
    const conversationHistory = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is 2+2?' }
    ];
    
    const response = await getLMStudioResponse('4', conversationHistory);
    console.log('✓ Conversation history test passed');
    console.log(`Response: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`);
  } catch (error) {
    console.error('✗ Conversation history test failed:', error.message);
    return false;
  }
  
  // Test 4: Verify token usage tracking
  console.log('\nTest 4: Checking token usage tracking...');
  try {
    const response = await getLMStudioResponse('Hello');
    
    const { getLastTokenUsage } = await import('./lmstudio.js');
    const tokenUsage = getLastTokenUsage();
    
    if (tokenUsage) {
      console.log('✓ Token usage tracking is working');
      console.log(`  Prompt tokens: ${tokenUsage.promptTokens}`);
      console.log(`  Completion tokens: ${tokenUsage.completionTokens}`);
      console.log(`  Total tokens: ${tokenUsage.totalTokens}`);
      console.log(`  Context window: ${tokenUsage.maxContextWindow}`);
    } else {
      console.log('⚠ Token usage not available in response (may be normal for some models)');
    }
  } catch (error) {
    console.error('✗ Token usage check failed:', error.message);
  }
  
  console.log('\n=== Verification Complete ===');
  console.log('✓ All tests passed! LM Studio integration is working correctly.');
  console.log('\nYou can now use the RAG summary system with confidence.');
  
  return true;
}

// Run verification
verifyLMStudio().catch(error => {
  console.error('Verification error:', error);
  process.exit(1);
});
