/**
 * Clarification system for character creation agent
 * Provides tools and utilities for requesting and handling clarifying information
 */

import { getLMStudioResponse } from './lmstudio.js';

/**
 * Available clarification tools that can be called by the LLM
 */
export const availableClarifyTools = [
  {
    name: 'request_clarification',
    description: 'Request additional clarifying information when the character creation context is incomplete or ambiguous. Use this tool when you need more specific details about choices, options, or methods.',
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The specific question that needs clarification (e.g., "What are the available character classes for drow characters?" or "How should I roll for ability scores in this system?")'
        },
        context: {
          type: 'string',
          optional: true,
          description: 'Additional context about what information is missing or ambiguous'
        }
      },
      required: ['question']
    },
    handler: handleClarificationRequest
  }
];

/**
 * Handle clarification requests from the LLM
 * @param {object} args - Arguments containing question and optional context
 * @returns {Promise<object>} Result with success status and message
 */
export async function handleClarificationRequest(args) {
  const { question, context } = args;
  
  console.log(`Clarification requested: ${question}`);
  if (context) {
    console.log(`Context: ${context}`);
  }
  
  // In a real implementation, this might:
  // 1. Query the RAG system for additional information
  // 2. Use heuristics to suggest reasonable defaults
  // 3. Return structured guidance for the user to make a choice
  
  return {
    success: true,
    message: `Clarification requested: "${question}". Please provide more details or check the RPG rulebook for specific guidance on this step.`,
    question: question,
    context: context || null
  };
}

/**
 * Get a list of available clarification tool names
 * @returns {string[]} Array of tool names
 */
export function getClarifyToolNames() {
  return availableClarifyTools.map(tool => tool.name);
}

/**
 * Get detailed information about all available clarification tools
 * @returns {Array} Array of tool definitions with name, description, and parameters
 */
export function getClarifyToolDefinitions() {
  return availableClarifyTools.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters
  }));
}

/**
 * Find a clarification tool by name
 * @param {string} name - The name of the tool to find
 * @returns {object|null} The tool definition or null if not found
 */
export function getClarifyToolByName(name) {
  return availableClarifyTools.find(tool => tool.name === name) || null;
}

/**
 * Execute a clarification tool by name with given arguments
 * @param {string} name - The name of the tool to execute
 * @param {object} args - Arguments to pass to the tool handler
 * @returns {Promise<object>} Result from the tool execution
 */
export async function executeClarifyTool(name, args = {}) {
  const tool = getClarifyToolByName(name);
  
  if (!tool) {
    return {
      success: false,
      error: `Unknown clarification tool: ${name}. Available tools: ${getClarifyToolNames().join(', ')}`
    };
  }
  
  try {
    // Validate required parameters
    if (tool.parameters?.required) {
      for (const requiredParam of tool.parameters.required) {
        if (!(requiredParam in args)) {
          return {
            success: false,
            error: `Missing required parameter: ${requiredParam}`
          };
        }
      }
    }
    
    // Execute the tool handler
    const result = await tool.handler(args);
    
    // Ensure result has proper structure
    if (typeof result === 'string') {
      return { success: true, message: result };
    } else if (!result.success && !result.error) {
      return { ...result, success: false, error: 'Tool execution failed' };
    }
    
    return result;
  } catch (error) {
    console.error(`Error executing clarification tool ${name}:`, error);
    return {
      success: false,
      error: `Failed to execute clarification tool ${name}: ${error.message}`
    };
  }
}

/**
 * Format clarification results for LLM consumption
 * @param {string} toolName - Name of the tool that was executed
 * @param {object} result - Result from tool execution
 * @returns {string} Formatted result string
 */
export function formatClarifyToolResult(toolName, result) {
  if (toolName === 'request_clarification') {
    if (result.success) {
      return `✅ Clarification requested: ${result.message}`;
    } else {
      return `❌ Clarification request failed: ${result.error}`;
    }
  }
  
  // Default formatting
  if (result.success) {
    return JSON.stringify(result, null, 2);
  } else {
    return `Error: ${result.error}`;
  }
}

/**
 * Generate a prompt section for using clarification tools
 * @param {object} options - Options for the prompt generation
 * @returns {string} Formatted prompt section
 */
export function generateClarifyPrompt(options = {}) {
  const { stepName, currentContext, availableOptions } = options;
  
  let prompt = `## 🤔 Clarification Tools Available

You have access to a clarification tool that can help you when the character creation context is incomplete or ambiguous.

### When to Use This Tool:
- **When choices are not clearly defined** in the provided context
- **When options are missing** for a specific step
- **When the method for making choices** (dice rolls, selection methods) is unclear
- **When you need more specific information** about RPG system rules

### Available Tool:

\`\`\`json
${JSON.stringify(getClarifyToolDefinitions(), null, 2)}
\`\`\`

### How to Use:
1. **Identify what information is missing or ambiguous**
2. **Formulate a clear, specific question** that addresses the gap
3. **Call the request_clarification tool** with your question

### Example Usage:

If you're on step "${stepName || 'character creation'}" and need clarification about options:

\`\`\`json
{
  "tool": "request_clarification",
  "arguments": {
    "question": "What are the available character classes for this RPG system?",
    "context": "The context mentions character classes but doesn't list specific options"
  }
}
\`\`\`

### Important Guidelines:
- **Use clarification tools proactively** when you encounter ambiguity
- **Ask specific questions** to get useful answers
- **Don't guess** when the information is critical - ask for clarification instead
- **Provide context** in your question to help get more accurate responses

${currentContext ? `\n### Current Context:
${currentContext}` : ''}

${availableOptions && availableOptions.length > 0 
  ? `\n### Available Options (if any):
${availableOptions.join(', ')}` : ''}`;
  
  return prompt;
}

/**
 * Detect if a step needs clarification based on its structure
 * @param {object} step - The step to analyze
 * @returns {object} Clarification analysis with need and reason
 */
export function analyzeStepForClarification(step) {
  const analysis = {
    needsClarification: false,
    reasons: [],
    confidence: 0
  };
  
  // Check if step is missing critical information
  if (!step.stepName || step.stepName.length === 0) {
    analysis.reasons.push('Missing step name');
    analysis.confidence += 30;
  }
  
  if (!step.choice && !step.options?.length > 0) {
    analysis.reasons.push('No choice or options defined');
    analysis.confidence += 25;
  }
  
  if (step.method === 'player_choice' && !step.options?.length > 0) {
    analysis.reasons.push('Player choice without available options');
    analysis.confidence += 35;
  }
  
  // Check for ambiguous language in step name
  const ambiguousKeywords = ['choose', 'select', 'determine', 'make a decision'];
  if (step.stepName && ambiguousKeywords.some(keyword => 
      step.stepName.toLowerCase().includes(keyword) && !step.options?.length > 0)) {
    analysis.reasons.push('Ambiguous choice without options');
    analysis.confidence += 20;
  }
  
  // Determine if clarification is needed
  analysis.needsClarification = analysis.confidence >= 40;
  
  return analysis;
}

/**
 * Generate a comprehensive prompt that includes clarification capabilities
 * @param {object} options - Options for the prompt generation
 * @returns {string} Complete prompt with clarification instructions
 */
export function generateCompletePromptWithClarify(options) {
  const { 
    basePrompt, 
    stepInfo, 
    context,
    availableOptions = []
  } = options;
  
  const clarificationSection = generateClarifyPrompt({
    stepName: stepInfo?.stepName,
    currentContext: context,
    availableOptions
  });
  
  return `${basePrompt}

${clarificationSection}`;
}
