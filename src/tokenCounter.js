const { encode: gptEncode } = require('gpt-3-encoder');
const tiktoken = require('@dqbd/tiktoken');

function countTokens(text, model) {
  switch(model) {
    case 'gpt-4':
    case 'gpt-3.5-turbo':
      try {
        const encoding = tiktoken.encoding_for_model(model);
        return encoding.encode(text).length;
      } catch (e) {
        return gptEncode(text).length; // Fallback to simpler encoder
      }
    case 'claude':
      return Math.ceil(gptEncode(text).length * 1.05); // 5% buffer for Claude specifics
    case 'gemini':
      return Math.ceil(text.length / 4); // ~4 chars per token as rough estimation
    case 'ollama':
      return Math.ceil(text.length / 3.5); // ~3.5 chars per token as estimation for most Ollama models
    default:
      return Math.ceil(text.length / 4); // Default estimation
  }
}

module.exports = { countTokens };