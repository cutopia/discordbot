import { splitMessage, createPaginationComponents } from '../pagination.js';

// Test 1: Short message (no pagination needed)
console.log('Test 1: Short message');
const shortMsg = 'Hello world!';
const shortChunks = splitMessage(shortMsg);
console.log(`Input: "${shortMsg}"`);
console.log(`Chunks: ${shortChunks.length}`);
console.log(`Components: ${JSON.stringify(createPaginationComponents(0, shortChunks.length))}`);
console.log('');

// Test 2: Message exactly at limit
console.log('Test 2: Message at limit');
const exactMsg = 'A'.repeat(2000);
const exactChunks = splitMessage(exactMsg);
console.log(`Input length: ${exactMsg.length}`);
console.log(`Chunks: ${exactChunks.length}`);
console.log('');

// Test 3: Message slightly over limit
console.log('Test 3: Message slightly over limit');
const slightlyOverMsg = 'A'.repeat(2100);
const slightlyOverChunks = splitMessage(slightlyOverMsg);
console.log(`Input length: ${slightlyOverMsg.length}`);
console.log(`Chunks: ${slightlyOverChunks.length}`);
console.log(`First chunk length: ${slightlyOverChunks[0].length}`);
console.log('Components for page 1:');
console.log(JSON.stringify(createPaginationComponents(0, slightlyOverChunks.length), null, 2));
console.log('');

// Test 4: Very long message
console.log('Test 4: Very long message with newlines');
const longMsg = `First paragraph with some text.
Second paragraph with more text.
Third paragraph that continues on for a while and includes many characters to ensure we exceed the discord limit of 2000 characters per message. This is important because we want to test how the pagination system handles multi-page responses in Discord.

Fourth paragraph with even more content to make sure we have multiple pages. The goal is to create a response that will definitely need pagination to be properly displayed in Discord's chat interface.`;

// Make it much longer
let testLongMsg = longMsg;
for (let i = 0; i < 10; i++) {
  testLongMsg += `\n\nAdditional paragraph ${i + 5} with more content to ensure we have plenty of pages for testing the pagination system. This helps verify that all navigation buttons work correctly across multiple pages.`;
}

const longChunks = splitMessage(testLongMsg);
console.log(`Input length: ${testLongMsg.length}`);
console.log(`Chunks: ${longChunks.length}`);
console.log('');

// Test 5: Pagination components for different pages
console.log('Test 5: Pagination components for multi-page message');
for (let i = 0; i < Math.min(3, longChunks.length); i++) {
  console.log(`\nPage ${i + 1} of ${longChunks.length}:`);
  const components = createPaginationComponents(i, longChunks.length);
  console.log(JSON.stringify(components, null, 2));
}
console.log('');

// Test 6: Edge cases
console.log('Test 6: Edge cases');

// Empty string
const emptyChunks = splitMessage('');
console.log(`Empty string chunks: ${emptyChunks.length}`);

// Null/undefined
try {
  const nullChunks = splitMessage(null);
  console.log(`Null chunks: ${nullChunks.length}`);
} catch (e) {
  console.log(`Null error: ${e.message}`);
}

// Very long single line (no newlines)
const longSingleLine = 'A'.repeat(5000);
const longSingleLineChunks = splitMessage(longSingleLine);
console.log(`Long single line chunks: ${longSingleLineChunks.length}`);
console.log(`First chunk length: ${longSingleLineChunks[0].length}`);
