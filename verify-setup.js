import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Discord Bot RAG Setup Verification ===\n');

let allChecksPassed = true;

// Check 1: Required files exist
console.log('1. Checking required files...');
const requiredFiles = [
  'rag.js',
  'test-rag.js',
  'commands.js',
  'app.js',
  'chatbot.js',
  'package.json'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    allChecksPassed = false;
  }
});

// Check 2: PDF files exist
console.log('\n2. Checking PDF source files...');
const pdfDir = path.join(__dirname, 'ragsourcebooks');
if (fs.existsSync(pdfDir)) {
  const pdfFiles = fs.readdirSync(pdfDir).filter(f => f.toLowerCase().endsWith('.pdf'));
  if (pdfFiles.length > 0) {
    console.log(`   ✅ Found ${pdfFiles.length} PDF file(s):`);
    pdfFiles.forEach(pdf => console.log(`      - ${pdf}`));
  } else {
    console.log('   ❌ No PDF files found in ragsourcebooks/');
    allChecksPassed = false;
  }
} else {
  console.log('   ❌ ragsourcebooks/ directory not found');
  allChecksPassed = false;
}

// Check 3: Required dependencies
console.log('\n3. Checking package.json dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const requiredDeps = ['pdf-parse', '@langchain/openai', '@langchain/textsplitters', 'langchain'];
  
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
  
  if (missingDeps.length === 0) {
    console.log('   ✅ All required dependencies present');
    requiredDeps.forEach(dep => console.log(`      - ${dep}`));
  } else {
    console.log('   ❌ Missing dependencies:', missingDeps.join(', '));
    allChecksPassed = false;
  }
} catch (error) {
  console.log(`   ❌ Error reading package.json: ${error.message}`);
  allChecksPassed = false;
}

// Check 4: Environment variables
console.log('\n4. Checking environment configuration...');
const requiredEnvVars = ['DISCORD_APP_ID', 'DISCORD_TOKEN', 'PUBLIC_KEY'];
let envCheckPassed = true;

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value && value !== `your_${varName.toLowerCase()}_here`) {
    console.log(`   ✅ ${varName} is set`);
  } else {
    console.log(`   ⚠️  ${varName} not set or using default value`);
    envCheckPassed = false;
  }
});

if (process.env.OPENAI_API_KEY) {
  console.log(`   ✅ OPENAI_API_KEY is set (for RAG embeddings)`);
}

// Check 5: Verify rag.js exports
console.log('\n5. Checking rag.js module exports...');
try {
  const ragModule = await import('./rag.js');
  const requiredExports = [
    'getAvailablePDFs',
    'extractTextFromPDF',
    'createVectorStore',
    'queryVectorStore',
    'getOrCreateVectorStore',
    'clearVectorStore',
    'clearAllVectorStores'
  ];
  
  const missingExports = requiredExports.filter(exp => !ragModule[exp]);
  
  if (missingExports.length === 0) {
    console.log('   ✅ All required exports present');
    requiredExports.forEach(exp => console.log(`      - ${exp}`));
  } else {
    console.log('   ❌ Missing exports:', missingExports.join(', '));
    allChecksPassed = false;
  }
} catch (error) {
  console.log(`   ⚠️  Could not import rag.js: ${error.message}`);
}

// Check 6: Verify chatbot.js integration
console.log('\n6. Checking chatbot.js RAG integration...');
try {
  const chatbotModule = await import('./chatbot.js');
  const requiredFunctions = ['setRAGSource', 'getRAGSource'];
  
  const missingFunctions = requiredFunctions.filter(fn => !chatbotModule[fn]);
  
  if (missingFunctions.length === 0) {
    console.log('   ✅ RAG integration functions present');
    requiredFunctions.forEach(fn => console.log(`      - ${fn}`));
  } else {
    console.log('   ⚠️  Missing RAG functions:', missingFunctions.join(', '));
  }
} catch (error) {
  console.log(`   ⚠️  Could not import chatbot.js: ${error.message}`);
}

// Final summary
console.log('\n' + '='.repeat(50));
if (allChecksPassed && envCheckPassed) {
  console.log('✅ All checks passed! Setup appears complete.');
  console.log('\nNext steps:');
  console.log('1. Run: npm install');
  console.log('2. Register commands: npm run register');
  console.log('3. Test RAG: node test-rag.js');
  console.log('4. Start bot: npm start');
} else if (allChecksPassed) {
  console.log('⚠️  Some checks passed but environment variables need configuration.');
  console.log('\nPlease update your .env file with the required values.');
} else {
  console.log('❌ Some checks failed. Please review the output above.');
}

console.log('='.repeat(50));
