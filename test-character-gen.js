import { generateCharacterWithProgress } from './character-generator.js';
import { getAvailablePDFs, getOrCreateVectorStore, clearAllVectorStores } from './rag.js';

async function testCharacterGeneration() {
  console.log('=== Testing Character Generation ===\n');
  
  // Get available PDFs
  const pdfs = getAvailablePDFs();
  console.log(`Found ${pdfs.length} PDF(s):`);
  pdfs.forEach(pdf => console.log(`  - ${pdf.name}: ${pdf.path}`));
  
  if (pdfs.length === 0) {
    console.log('No PDFs found. Please add a PDF to the ragsourcebooks directory.');
    return;
  }
  
  // Use the first available PDF
  const pdfPath = pdfs[0].path;
  const sourceName = pdfs[0].name;
  
  try {
    // Create vector store
    console.log(`\nCreating vector store for "${sourceName}"...`);
    await getOrCreateVectorStore(pdfPath);
    
    // Test character generation with specifications
    const specifications = 'I want to create a drow character who is seeking redemption and wants to explore the Heart';
    
    console.log(`\nGenerating character with specifications: ${specifications}`);
    console.log('=========================================\n');
    
    const result = await generateCharacterWithProgress(specifications, sourceName);
    
    if (result.success) {
      console.log('\n✅ Character generation completed successfully!');
      console.log('\n' + result.formattedSheet);
      
      if (result.progressUpdates && result.progressUpdates.length > 0) {
        console.log('\n--- Progress Report ---');
        result.progressUpdates.forEach((update, i) => {
          console.log(`${i + 1}. ${update.step}: ${update.status}`);
          if (update.details) {
            console.log(`   ${update.details}`);
          }
        });
      }
    } else {
      console.error('\n❌ Character generation failed:', result.error);
    }
    
  } catch (error) {
    console.error('Error during character generation:', error);
  } finally {
    // Clean up
    clearAllVectorStores();
  }
}

// Run the test
testCharacterGeneration();
