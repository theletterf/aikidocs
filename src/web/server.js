const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const { compressContext } = require('../compress');
const { sendToLLM } = require('../llm');
const { countTokens } = require('../tokenCounter');

/**
 * Create and configure the web server for Aikidoc
 * 
 * @param {object} options - Server configuration options
 * @returns {object} - Server instance
 */
function createServer(options = {}) {
  const app = express();
  const server = http.createServer(app);
  const io = socketIO(server);
  
  // Default port
  const port = options.port || 3000;
  
  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  }));
  
  // Serve static files from the web directory
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Routes
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
  
  // API endpoints
  app.get('/api/prompts', (req, res) => {
    const promptsDir = path.resolve(options.prompts || './prompts');
    
    try {
      // Get base instructions
      const baseInstructionPath = path.join(promptsDir, options.baseInstruction || 'base-instructions.md');
      const baseInstructions = fs.existsSync(baseInstructionPath) 
        ? fs.readFileSync(baseInstructionPath, 'utf8') 
        : '';
      
      // Get style guide
      const stylePath = path.join(promptsDir, options.style || 'style.md');
      const styleGuide = fs.existsSync(stylePath) 
        ? fs.readFileSync(stylePath, 'utf8') 
        : '';
      
      res.json({
        baseInstructions,
        styleGuide
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/prompts', (req, res) => {
    const promptsDir = path.resolve(options.prompts || './prompts');
    
    try {
      const { baseInstructions, styleGuide } = req.body;
      
      // Save base instructions
      const baseInstructionPath = path.join(promptsDir, options.baseInstruction || 'base-instructions.md');
      fs.writeFileSync(baseInstructionPath, baseInstructions, 'utf8');
      
      // Save style guide
      const stylePath = path.join(promptsDir, options.style || 'style.md');
      fs.writeFileSync(stylePath, styleGuide, 'utf8');
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/credentials', (req, res) => {
    try {
      const credentialsPath = path.resolve(options.credentials || './credentials.txt');
      
      if (!fs.existsSync(credentialsPath)) {
        return res.status(404).json({ error: 'Credentials file not found' });
      }
      
      const credentialsText = fs.readFileSync(credentialsPath, 'utf8');
      const availableLLMs = [];
      
      // Always add Ollama as an available LLM
      availableLLMs.push('ollama');
      
      // Parse credentials to determine available LLMs
      credentialsText.split('\n').forEach(line => {
        const line_trimmed = line.trim();
        if (line_trimmed === '' || line_trimmed.startsWith('#')) return;
        
        const [key, value] = line_trimmed.split('=').map(part => part.trim());
        if (key && value !== undefined) {
          const cleanValue = value.replace(/^["'](.*)["']$/, '$1');
          
          if (key === 'OPENAI_API_KEY' && cleanValue && !availableLLMs.includes('openai')) {
            availableLLMs.push('openai');
          } else if (key === 'ANTHROPIC_API_KEY' && cleanValue && !availableLLMs.includes('claude')) {
            availableLLMs.push('claude');
          } else if (key === 'GOOGLE_API_KEY' && cleanValue && !availableLLMs.includes('gemini')) {
            availableLLMs.push('gemini');
          }
        }
      });
      
      res.json({ availableLLMs });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Handle file uploads for context
  app.post('/api/upload-context', (req, res) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ error: 'No files were uploaded' });
      }
      
      const tempContextDir = path.join(options.output || './output', 'temp-context');
      
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(tempContextDir)) {
        fs.mkdirSync(tempContextDir, { recursive: true });
      } else {
        // Clear existing files
        fs.readdirSync(tempContextDir).forEach(file => {
          const filePath = path.join(tempContextDir, file);
          fs.unlinkSync(filePath);
        });
      }
      
      // Handle multiple files
      const uploadedFiles = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
      
      uploadedFiles.forEach(file => {
        const filePath = path.join(tempContextDir, file.name);
        file.mv(filePath);
      });
      
      res.json({ 
        success: true, 
        message: `${uploadedFiles.length} files uploaded successfully`,
        contextDir: tempContextDir
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('Client connected');
    
    socket.on('generate', async (data) => {
      try {
        const { 
          contextDir, 
          baseInstructions, 
          styleGuide, 
          userPrompt, 
          selectedLLM 
        } = data;
        
        // Validate inputs
        if (!contextDir || !selectedLLM) {
          return socket.emit('error', { message: 'Missing required parameters' });
        }
        
        // Combine prompts
        const prompt = `${baseInstructions}\n\nStyle Guide:\n${styleGuide}\n\nUser Request:\n${userPrompt}`;
        
        // Compress context
        socket.emit('status', { message: 'Compressing context...' });
        const compressedContext = await compressContext(contextDir);
        
        // Get credentials
        const credentialsPath = path.resolve(options.credentials || './credentials.txt');
        const credentialsText = fs.readFileSync(credentialsPath, 'utf8');
        
        // Calculate token count
        const inputTokens = countTokens(compressedContext + prompt, selectedLLM);
        const estimatedOutputTokens = Math.ceil(inputTokens * 0.5); // Rough estimate
        
        socket.emit('status', { 
          message: `Sending request to ${selectedLLM}...`,
          details: {
            model: selectedLLM,
            inputTokens,
            estimatedOutputTokens
          }
        });
        
        // Send to LLM
        const response = await sendToLLM(compressedContext, prompt, credentialsText, selectedLLM);
        
        // Generate timestamp for filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFilename = `${selectedLLM}-response-${timestamp}.md`;
        const outputFilePath = path.join(options.output || './output', outputFilename);
        
        // Write response to file
        fs.writeFileSync(outputFilePath, response, 'utf8');
        
        // Send response to client
        socket.emit('response', {
          response,
          outputFilePath,
          timestamp
        });
        
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
  
  return {
    app,
    server,
    io,
    start: () => {
      server.listen(port, () => {
        console.log(`Aikidoc web server running at http://localhost:${port}`);
      });
    }
  };
}

module.exports = { createServer };
