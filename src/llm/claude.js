const axios = require('axios');

/**
 * Send prompt to Claude API
 * 
 * @param {string} prompt - Full prompt with context
 * @param {object} credentials - Parsed credentials
 * @returns {string} - Claude response
 */
async function sendToClaude(prompt, credentials) {
  if (!credentials.ANTHROPIC_API_KEY) {
    throw new Error('Claude API key not found in credentials');
  }
  
  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: credentials.CLAUDE_MODEL || 'claude-3-opus-20240229',
        max_tokens: 4000,
        messages: [
          { role: 'user', content: prompt }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': credentials.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );
    
    return response.data.content[0].text;
  } catch (error) {
    throw new Error(`Claude API error: ${error.response?.data?.error?.message || error.message}`);
  }
}

module.exports = {
  sendToClaude
};
