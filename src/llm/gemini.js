const axios = require('axios');

/**
 * Send prompt to Gemini API
 * 
 * @param {string} prompt - Full prompt with context
 * @param {object} credentials - Parsed credentials
 * @returns {string} - Gemini response
 */
async function sendToGemini(prompt, credentials) {
  if (!credentials.GOOGLE_API_KEY) {
    throw new Error('Google API key not found in credentials');
  }
  
  try {
    const model = credentials.GEMINI_MODEL || 'gemini-pro';
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${credentials.GOOGLE_API_KEY}`;
    
    const response = await axios.post(
      apiUrl,
      {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    throw new Error(`Gemini API error: ${error.response?.data?.error?.message || error.message}`);
  }
}

module.exports = {
  sendToGemini
};
