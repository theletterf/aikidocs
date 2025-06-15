document.addEventListener('DOMContentLoaded', () => {
  // Connect to Socket.IO
  const socket = io();
  
  // DOM elements
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Hide instructions and style tabs on initial page load
  document.getElementById('instructions-tab').style.display = 'none';
  document.getElementById('style-tab').style.display = 'none';
  const fileDropzone = document.getElementById('file-dropzone');
  const fileInput = document.getElementById('file-input');
  const fileSelectButton = document.getElementById('file-select-button');
  const fileList = document.getElementById('file-list');
  const baseInstructions = document.getElementById('base-instructions');
  const styleGuide = document.getElementById('style-guide');
  const userPrompt = document.getElementById('user-prompt');
  const modelSelect = document.getElementById('model-select');
  const generateButton = document.getElementById('generate-button');
  const savePromptsButton = document.getElementById('save-prompts-button');
  const copyOutputButton = document.getElementById('copy-output-button');
  const downloadOutputButton = document.getElementById('download-output-button');
  const statusDisplay = document.getElementById('status-display');
  const outputContent = document.getElementById('output-content');
  
  // App state
  let state = {
    files: [],
    contextDir: null,
    availableModels: [],
    currentOutput: '',
    outputFilename: null
  };
  
  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Show active tab content
      tabContents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
      });
      
      const activeTab = document.getElementById(`${tabName}-tab`);
      activeTab.classList.add('active');
      activeTab.style.display = 'flex';
      
      // Hide instructions and style tabs when in context tab
      if (tabName === 'context') {
        document.getElementById('instructions-tab').style.display = 'none';
        document.getElementById('style-tab').style.display = 'none';
      }
      
      // Log for debugging
      console.log(`Switched to tab: ${tabName}`);
    });
  });
  
  // File dropzone handling
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    fileDropzone.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    fileDropzone.addEventListener(eventName, () => {
      fileDropzone.classList.add('dragover');
    });
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    fileDropzone.addEventListener(eventName, () => {
      fileDropzone.classList.remove('dragover');
    });
  });
  
  fileDropzone.addEventListener('drop', handleFileDrop);
  fileDropzone.addEventListener('click', () => fileInput.click());
  fileSelectButton.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFiles(fileInput.files);
    }
  });
  
  // Add event listeners for the new file action buttons
  const addMoreFilesButton = document.getElementById('add-more-files');
  const clearFilesButton = document.getElementById('clear-files');
  
  addMoreFilesButton.addEventListener('click', () => {
    fileInput.click();
  });
  
  clearFilesButton.addEventListener('click', () => {
    clearAllFiles();
  });
  
  function handleFileDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
  }
  
  function handleFiles(files) {
    if (files.length === 0) return;
    
    // Convert FileList to array and store in state
    state.files = [...state.files, ...Array.from(files)];
    
    // Update file list UI
    updateFileList();
    
    // Upload files
    uploadFiles(files);
    
    // Reset file input to allow selecting the same files again if needed
    fileInput.value = '';
    
    // Hide the dropzone and show the file list instead
    updateUIAfterUpload();
  }
  
  function updateFileList() {
    const fileSummary = document.getElementById('file-summary');
    const addMoreButton = document.getElementById('add-more-files');
    const clearFilesButton = document.getElementById('clear-files');
    
    if (state.files.length === 0) {
      fileSummary.textContent = 'No files uploaded';
      addMoreButton.style.display = 'none';
      clearFilesButton.style.display = 'none';
    } else {
      const fileWord = state.files.length === 1 ? 'file' : 'files';
      fileSummary.textContent = `${state.files.length} ${fileWord} uploaded`;
      addMoreButton.style.display = 'inline-block';
      clearFilesButton.style.display = 'inline-block';
    }
  }
  
  function removeFile(index) {
    state.files.splice(index, 1);
    updateFileList();
    
    // If no files left, show the dropzone again
    if (state.files.length === 0) {
      fileDropzone.style.display = 'block';
      state.contextDir = null;
    }
  }
  
  function clearAllFiles() {
    state.files = [];
    state.contextDir = null;
    updateFileList();
    updateUIAfterUpload();
    
    // Show status message
    showStatus('All files cleared', 'info');
    
    // Auto-hide status message after 2 seconds
    setTimeout(() => {
      if (statusDisplay.textContent === 'All files cleared') {
        statusDisplay.style.display = 'none';
      }
    }, 2000);
  }
  
  function updateUIAfterUpload() {
    // Hide the dropzone when files are uploaded
    if (state.files.length > 0) {
      fileDropzone.style.display = 'none';
    } else {
      fileDropzone.style.display = 'block';
    }
  }
  
  function uploadFiles(files) {
    const formData = new FormData();
    
    // Clear any previous status messages
    statusDisplay.style.display = 'none';
    
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    
    showStatus('Uploading files...', 'info');
    
    fetch('/api/upload-context', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        state.contextDir = data.contextDir;
        
        // Update status message with file count
        const fileCount = Array.from(files).length;
        const fileWord = fileCount === 1 ? 'file' : 'files';
        showStatus(`${fileCount} ${fileWord} uploaded successfully`, 'info');
        
        // Auto-hide status message after 3 seconds
        setTimeout(() => {
          if (statusDisplay.textContent.includes('uploaded successfully')) {
            statusDisplay.style.display = 'none';
          }
        }, 3000);
      } else {
        showStatus(`Error: ${data.error}`, 'error');
      }
    })
    .catch(error => {
      showStatus(`Error uploading files: ${error.message}`, 'error');
    });
  }
  
  // Load available models
  function loadAvailableModels() {
    fetch('/api/credentials')
      .then(response => response.json())
      .then(data => {
        state.availableModels = data.availableLLMs || [];
        
        // Populate model select dropdown
        modelSelect.innerHTML = '<option value="" disabled selected>Select a model</option>';
        
        state.availableModels.forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model.charAt(0).toUpperCase() + model.slice(1);
          modelSelect.appendChild(option);
        });
      })
      .catch(error => {
        showStatus(`Error loading models: ${error.message}`, 'error');
      });
  }
  
  // Load prompts
  function loadPrompts() {
    fetch('/api/prompts')
      .then(response => response.json())
      .then(data => {
        baseInstructions.value = data.baseInstructions || '';
        styleGuide.value = data.styleGuide || '';
      })
      .catch(error => {
        showStatus(`Error loading prompts: ${error.message}`, 'error');
      });
  }
  
  // Save prompts
  savePromptsButton.addEventListener('click', () => {
    const promptData = {
      baseInstructions: baseInstructions.value,
      styleGuide: styleGuide.value
    };
    
    fetch('/api/prompts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(promptData)
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        showStatus('Prompts saved successfully', 'info');
      } else {
        showStatus(`Error: ${data.error}`, 'error');
      }
    })
    .catch(error => {
      showStatus(`Error saving prompts: ${error.message}`, 'error');
    });
  });
  
  // Generate button click handler
  generateButton.addEventListener('click', () => {
    if (!state.contextDir) {
      return showStatus('Please upload context files first', 'error');
    }
    
    if (!modelSelect.value) {
      return showStatus('Please select a model', 'error');
    }
    
    if (!userPrompt.value.trim()) {
      return showStatus('Please enter a user prompt', 'error');
    }
    
    // Prepare data for generation
    const data = {
      contextDir: state.contextDir,
      baseInstructions: baseInstructions.value,
      styleGuide: styleGuide.value,
      userPrompt: userPrompt.value,
      selectedLLM: modelSelect.value
    };
    
    // Disable generate button
    generateButton.disabled = true;
    generateButton.textContent = 'Generating...';
    
    // Clear previous output
    outputContent.innerHTML = '';
    showStatus('Starting generation...', 'info');
    
    // Send generation request via Socket.IO
    socket.emit('generate', data);
  });
  
  // Socket.IO event handlers
  socket.on('status', (data) => {
    showStatus(data.message, 'info');
    
    // Show token details if available
    if (data.details) {
      const { model, inputTokens, estimatedOutputTokens } = data.details;
      const detailsHtml = `
        <div class="token-details">
          <p><strong>Model:</strong> ${model}</p>
          <p><strong>Input Tokens:</strong> ${inputTokens}</p>
          <p><strong>Estimated Output Tokens:</strong> ${estimatedOutputTokens}</p>
        </div>
      `;
      statusDisplay.innerHTML += detailsHtml;
    }
  });
  
  socket.on('response', (data) => {
    // Store response data
    state.currentOutput = data.response;
    state.outputFilename = `aikidoc-${data.timestamp}.md`;
    
    // Display raw markdown
    outputContent.textContent = data.response;
    
    // Reset generate button
    generateButton.disabled = false;
    generateButton.textContent = 'Generate';
    
    showStatus('Generation complete!', 'info');
  });
  
  socket.on('error', (data) => {
    showStatus(`Error: ${data.message}`, 'error');
    
    // Reset generate button
    generateButton.disabled = false;
    generateButton.textContent = 'Generate';
  });
  
  // Copy output button
  copyOutputButton.addEventListener('click', () => {
    if (!state.currentOutput) return;
    
    navigator.clipboard.writeText(state.currentOutput)
      .then(() => {
        showStatus('Output copied to clipboard', 'info');
      })
      .catch(err => {
        showStatus(`Error copying to clipboard: ${err.message}`, 'error');
      });
  });
  
  // Download output button
  downloadOutputButton.addEventListener('click', () => {
    if (!state.currentOutput) return;
    
    const blob = new Blob([state.currentOutput], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = state.outputFilename || 'aikidoc-output.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
  
  // Helper functions
  function showStatus(message, type) {
    statusDisplay.textContent = message;
    statusDisplay.className = type;
    statusDisplay.style.display = 'block';
    
    if (type === 'error') {
      console.error(message);
    }
  }
  
  // Add resize event listeners to textareas
  const baseInstructionsTextarea = document.getElementById('base-instructions');
  const styleGuideTextarea = document.getElementById('style-guide');
  
  // Use ResizeObserver to detect textarea resize
  const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      // When textarea is resized, adjust the parent container height
      const parentTab = entry.target.closest('.tab-content');
      if (parentTab) {
        parentTab.style.height = 'auto';
      }
    }
  });
  
  // Observe the textareas for resize events
  if (baseInstructionsTextarea) {
    resizeObserver.observe(baseInstructionsTextarea);
  }
  
  if (styleGuideTextarea) {
    resizeObserver.observe(styleGuideTextarea);
  }
  
  // Initialize
  loadAvailableModels();
  loadPrompts();
  updateUIAfterUpload(); // Set initial UI state
});
