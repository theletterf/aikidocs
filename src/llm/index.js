const { sendToGemini } = require('./gemini');
const { sendToClaude } = require('./claude');
const { sendToOpenAI } = require('./openai');

/**
 * Send context and prompt to specified LLM
 * 
 * @param {string} context - Compressed context
 * @param {string} prompt - User prompt
 * @param {string} credentials - API credentials
 * @param {string} provider - LLM provider (gemini, claude, openai)
 * @returns {string} - LLM response
 */
async function sendToLLM(context, prompt, credentials, provider) {
  // Parse credentials based on provider
  const parsedCredentials = parseCredentials(credentials, provider);
  
  // Full prompt with context
  const fullPrompt = `${prompt}\n\nContext:\n${context}`;
  
  // Send to the appropriate LLM
  switch (provider.toLowerCase()) {
    case 'gemini':
      return await sendToGemini(fullPrompt, parsedCredentials);
    case 'claude':
      return await sendToClaude(fullPrompt, parsedCredentials);
    case 'openai':
      return await sendToOpenAI(fullPrompt, parsedCredentials);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

/**
 * Parse credentials based on provider
 * 
 * @param {string} credentialsText - Raw credentials text
 * @param {string} provider - LLM provider
 * @returns {object} - Parsed credentials
 */
function parseCredentials(credentialsText, provider) {
  const credentials = {};
  const lines = credentialsText.split('\n');
  
  for (const line of lines) {
    if (line.trim() === '' || line.startsWith('#')) continue;
    
    const [key, value] = line.split('=').map(part => part.trim());
    if (key && value) {
      credentials[key] = value;
    }
  }
  
  return credentials;
}

module.exports = {
  sendToLLM
};
