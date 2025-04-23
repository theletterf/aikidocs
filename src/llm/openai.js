const axios = require('axios');

/**
 * Send prompt to OpenAI API
 * 
 * @param {string} prompt - Full prompt with context
 * @param {object} credentials - Parsed credentials
 * @returns {string} - OpenAI response
 */
async function sendToOpenAI(prompt, credentials) {
  if (!credentials.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not found in credentials');
  }
  
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: credentials.OPENAI_MODEL || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.OPENAI_API_KEY}`
        }
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
  }
}

module.exports = {
  sendToOpenAI
};
