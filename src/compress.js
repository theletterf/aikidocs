const fs = require('fs');
const path = require('path');

/**
 * Compress and clean up context from a directory or file
 * 
 * @param {string} contextPath - Path to context folder or file
 * @returns {string} - Compressed context
 */
async function compressContext(contextPath) {
  console.log(`Processing context from: ${contextPath}`);
  let context = '';
  const stats = fs.statSync(contextPath);
  
  if (stats.isDirectory()) {
    // Process directory recursively
    context = await processDirectory(contextPath);
  } else if (stats.isFile()) {
    // Process single file
    const filename = path.basename(contextPath);
    const content = fs.readFileSync(contextPath, 'utf8');
    context = `# ${filename}\n\n${content}`;
  }

  // Clean up the context
  context = cleanupContext(context);
  
  console.log(`Context processed: ${(context.length / 1024).toFixed(1)}KB`);
  return context;
}

/**
 * Process directory recursively
 */
async function processDirectory(dirPath, depth = 0) {
  let result = '';
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    // Skip hidden files/directories
    if (item.startsWith('.')) continue;
    
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isFile()) {
      const content = fs.readFileSync(itemPath, 'utf8');
      result += `# ${item}\n\n${content}\n\n`;
    } else if (stats.isDirectory() && depth < 2) { // Limit recursion depth
      const subDirContent = await processDirectory(itemPath, depth + 1);
      result += `# ${item} (directory)\n\n${subDirContent}\n\n`;
    }
  }
  
  return result;
}

/**
 * Clean up context content
 */
function cleanupContext(context) {
  // Pull out and stash ```code blocks```, mark each with a %%_placeholder%%
  const stash = [];
  let i = 0;
  context = context.replace(/```[\s\S]+?```/g, (match) => {
    stash.push(match);
    return `%%_${i++}%%`;
  });

  // Clean up spacing in the remaining content
  context = context
    .replace(/\n{3,}/g, '\n\n')       // Collapse 3+ newlines to 2
    .replace(/[^\S\r\n]+$/gm, '')     // Remove trailing whitespace except newlines
    .trim();

  // Restore each stashed string back to its placeholder
  stash.forEach((block, idx) => {
    context = context.replace(`%%_${idx}%%`, block);
  });

  return context;
}

module.exports = {
  compressContext,
  cleanupContext
};
