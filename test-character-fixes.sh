#!/bin/bash

echo "=== Testing Character Generation Fixes ==="
echo ""

# Test with the "Those Dark Places" PDF
node -e "
import('./character-generator.js').then(module => {
  const { generateCharacterWithProgress } = module;
  
  async function test() {
    console.log('Testing character generation with \"Those Dark Places\" PDF...');
    
    try {
      // First, we need to create the vector store
      const { getOrCreateVectorStore, clearAllVectorStores } = await import('./rag.js');
      
      const pdfPath = './ragsourcebooks/Those_Dark_Places.pdf';
      const sourceName = 'Those_Dark_Places';
      
      console.log('Creating vector store...');
      await getOrCreateVectorStore(pdfPath);
      
      console.log('\\nGenerating character with specifications...');
      const result = await generateCharacterWithProgress(
        'I want to create a drow character who is seeking redemption and wants to explore the Heart',
        sourceName
      );
      
      if (result.success) {
        console.log('\\n✅ Character generation completed successfully!');
        console.log('\\n' + result.formattedSheet);
        
        if (result.progressUpdates && result.progressUpdates.length > 0) {
          console.log('\\n--- Progress Report ---');
          console.log(`Total steps completed: ${result.progressUpdates.filter(u => u.status === 'completed').length}`);
          result.progressUpdates.forEach((update, i) => {
            console.log(`${i + 1}. ${update.step}: ${update.status}`);
            if (update.details) {
              console.log(`   ${update.details}`);
            }
          });
        }
      } else {
        console.error('\\n❌ Character generation failed:', result.error);
      }
      
      clearAllVectorStores();
    } catch (error) {
      console.error('Error during character generation:', error);
    }
  }
  
  test();
});
"
