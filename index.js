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
  .option('-l, --llm <provider>', 'LLM provider (gemini, claude, openai, ollama)', '')
  .option('-o, --output <path>', 'path to output folder', './output')
  .option('-i, --interactive', 'enable interactive mode to enter prompt in CLI')
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

/**
 * Get user prompt in interactive mode
 */
async function getUserPrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n=== Interactive Mode ===');
  console.log('Enter your prompt below. Type END on a new line when finished.');
  console.log('This will be combined with the base instructions from your prompts folder.');
  console.log('-------------------------------------------\n');
  
  return new Promise((resolve) => {
    let userPrompt = '';
    let isFirstLine = true;
    
    rl.on('line', (line) => {
      if (line.trim().toUpperCase() === 'END') {
        rl.close();
        console.log('\n-------------------------------------------');
        console.log(`Prompt received (${userPrompt.length} characters)\n`);
        resolve(userPrompt.trim());
      } else {
        if (!isFirstLine) {
          userPrompt += '\n';
        }
        userPrompt += line;
        isFirstLine = false;
      }
    });
    
    // Handle Ctrl+C to cancel
    rl.on('SIGINT', () => {
      console.log('\n\nPrompt entry canceled.');
      rl.close();
      resolve('');
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
    
    // Load base prompt content (from file or directory)
    const promptPath = path.resolve(options.prompts);
    const basePrompt = await loadPromptContent(promptPath);
    
    // Get user prompt if in interactive mode
    let userPrompt = '';
    if (options.interactive) {
      userPrompt = await getUserPrompt();
      if (!userPrompt) {
        console.log('No prompt provided. Exiting.');
        process.exit(0);
      }
    }
    
    // Combine base prompt with user prompt if in interactive mode
    const prompt = options.interactive 
      ? `${basePrompt}\n\nUser Request:\n${userPrompt}` 
      : basePrompt;
      
    if (options.interactive) {
      console.log('\nBase instructions loaded from prompts folder.');
      console.log(`User prompt combined with base instructions.`);
    }
    
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
    
    // In interactive mode, don't display the response in the console
    // Just inform the user where to find the response with the specific filename
    if (options.interactive) {
      console.log(`\nResponse saved to: ${outputFilePath}`);
      console.log('Check the file for results.');
    } else {
      console.log(`\nResponse saved to: ${outputFilePath}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
