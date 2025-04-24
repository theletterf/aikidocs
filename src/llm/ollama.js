// filepath: /Users/fabri/repos/aikidoc/src/llm/ollama.js
const axios = require('axios');

/**
 * Send prompt to local Ollama instance
 * 
 * @param {string} prompt - Full prompt with context
 * @param {object} credentials - Parsed credentials
 * @returns {string} - Ollama response
 */
async function sendToOllama(prompt, credentials) {
  // Check if host is specified, otherwise default to localhost
  const host = credentials.OLLAMA_HOST || 'http://localhost:11434';
  const model = credentials.OLLAMA_MODEL || 'llama3.2';
  
  try {
    const response = await axios.post(
      `${host}/api/generate`,
      {
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 4000
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.response;
  } catch (error) {
    throw new Error(`Ollama API error: ${error.response?.data?.error || error.message}`);
  }
}

module.exports = {
  sendToOllama
};