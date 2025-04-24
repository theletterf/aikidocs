#!/usr/bin/env node

const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const { compressContext } = require('./src/compress');
const { sendToLLM } = require('./src/llm');
const { countTokens } = require('./src/tokenCounter');
const readline = require('readline'); // Replaced inquirer with readline

program
  .option('-c, --context <path>', 'path to context folder', './context')
  .option('-r, --credentials <path>', 'path to credentials file', './credentials.txt')
  .option('-p, --prompts <path>', 'path to prompts folder or file', './prompts')
  .option('-b, --base-instruction <name>', 'name of base instruction file to use', 'base-instructions.md')
  .option('-s, --style <name>', 'name of style guide file to use', 'style.md')
  .option('-l, --llm <provider>', 'LLM provider (gemini, claude, openai)', '')
  .option('-o, --output <path>', 'path to output folder', './output')
  .parse(process.argv);

const options = program.opts();

/**
 * Load prompt content from either a file or directory structure
 */
async function loadPromptContent(promptPath) {
  const stats = fs.existsSync(promptPath) ? fs.statSync(promptPath) : null;
  
  if (!stats) {
    throw new Error(`Prompt path not found: ${promptPath}`);
  }
  
  let promptContent = '';
  
  if (stats.isDirectory()) {
    // Load from prompt directory structure
    console.log(`Loading prompts from directory: ${promptPath}`);
    
    // Load base instructions
    const baseInstructionPath = path.join(promptPath, options.baseInstruction);
    if (fs.existsSync(baseInstructionPath)) {
      promptContent += fs.readFileSync(baseInstructionPath, 'utf8') + '\n\n';
    } else {
      console.warn(`Base instruction file not found: ${baseInstructionPath}`);
    }
    
    // Append style guide if available
    const stylePath = path.join(promptPath, options.style);
    if (fs.existsSync(stylePath)) {
      promptContent += `Style Guide:\n${fs.readFileSync(stylePath, 'utf8')}\n\n`;
    }
    
    // Look for additional context files in context subfolder
    const contextDir = path.join(promptPath, 'context');
    if (fs.existsSync(contextDir) && fs.statSync(contextDir).isDirectory()) {
      const contextFiles = fs.readdirSync(contextDir)
        .filter(file => !file.startsWith('.'));
      
      for (const file of contextFiles) {
        const filePath = path.join(contextDir, file);
        if (fs.statSync(filePath).isFile()) {
          promptContent += `Additional Context (${file}):\n${fs.readFileSync(filePath, 'utf8')}\n\n`;
        }
      }
    }
    
    if (!promptContent.trim()) {
      throw new Error(`No prompt content found in directory: ${promptPath}`);
    }
  } else {
    // Maintain backward compatibility with single prompt file
    console.log(`Loading prompt from file: ${promptPath}`);
    promptContent = fs.readFileSync(promptPath, 'utf8');
  }
  
  return promptContent.trim();
}

async function confirmCostEstimation(context, prompt, model) {
  const inputTokens = countTokens(context + prompt, model);
  const estimatedOutputTokens = Math.ceil(inputTokens * 0.5); // Rough estimate

  const message = `\nCost Estimate:\n- Model: ${model}\n- Input Tokens: ${inputTokens}\n- Estimated Output Tokens: ${estimatedOutputTokens}\n`;

  console.log(message);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Do you want to proceed with this request? (yes/no, default: yes): ', (answer) => {
      rl.close();
      resolve(answer.trim() === '' || answer.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  try {
    // Read and validate context
    const contextPath = path.resolve(options.context);
    if (!fs.existsSync(contextPath)) {
      console.error(`Context path not found: ${contextPath}`);
      process.exit(1);
    }
    
    // Read credentials
    const credentialsPath = path.resolve(options.credentials);
    if (!fs.existsSync(credentialsPath)) {
      console.error(`Credentials file not found: ${credentialsPath}`);
      process.exit(1);
    }
    const credentialsText = fs.readFileSync(credentialsPath, 'utf8');
    
    // Parse credentials and determine available LLMs
    const credentials = {};
    const availableLLMs = [];
    
    // Always add Ollama as an available LLM since it doesn't require an API key
    availableLLMs.push('ollama');
    
    credentialsText.split('\n').forEach(line => {
      const line_trimmed = line.trim();
      if (line_trimmed === '' || line_trimmed.startsWith('#')) return;
      
      const [key, value] = line_trimmed.split('=').map(part => part.trim());
      if (key && value !== undefined) {
        // Remove quotes if present
        const cleanValue = value.replace(/^["'](.*)["']$/, '$1');
        credentials[key] = cleanValue;
        
        // Check which LLMs have valid credentials (non-empty API keys)
        if (key === 'OPENAI_API_KEY' && cleanValue && !availableLLMs.includes('openai')) {
          availableLLMs.push('openai');
        } else if (key === 'ANTHROPIC_API_KEY' && cleanValue && !availableLLMs.includes('claude')) {
          availableLLMs.push('claude');
        } else if (key === 'GOOGLE_API_KEY' && cleanValue && !availableLLMs.includes('gemini')) {
          availableLLMs.push('gemini');
        }
      }
    });
    
    // Select LLM provider based on user choice or available credentials
    let selectedLLM = options.llm;
    
    if (selectedLLM && availableLLMs.includes(selectedLLM)) {
      console.log(`Using specified LLM provider: ${selectedLLM}`);
    } else {
      if (selectedLLM && !availableLLMs.includes(selectedLLM)) {
        console.log(`Warning: Specified LLM '${selectedLLM}' has no valid API key.`);
      }
      
      if (availableLLMs.length === 0) {
        throw new Error('No valid LLM credentials found. Please add at least one API key to your credentials file.');
      }
      
      selectedLLM = availableLLMs[0];
      console.log(`Auto-selecting ${selectedLLM} (first provider with valid credentials).`);
    }
    
    // Load prompt content (from file or directory)
    const promptPath = path.resolve(options.prompts);
    const prompt = await loadPromptContent(promptPath);
    
    // Ensure output directory exists
    const outputPath = path.resolve(options.output);
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
      console.log(`Created output directory: ${outputPath}`);
    }
    
    // Compress context
    const compressedContext = await compressContext(contextPath);

    // Confirm cost estimation
    const proceed = await confirmCostEstimation(compressedContext, prompt, selectedLLM);
    if (!proceed) {
      console.log("Request canceled.");
      process.exit(0);
    }
    
    // Send to LLM
    console.log(`Sending request to ${selectedLLM}...`);
    const response = await sendToLLM(compressedContext, prompt, credentialsText, selectedLLM);
    
    // Generate output filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFilename = `${selectedLLM}-response-${timestamp}.txt`;
    const outputFilePath = path.join(outputPath, outputFilename);
    
    // Write response to file
    fs.writeFileSync(outputFilePath, response, 'utf8');
    
    console.log(`\nResponse saved to: ${outputFilePath}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
