# Aikidocs

Aikidocs is a tool that sends contextual prompts to an LLM of your choice. It compresses content from files or directories and uses that as context for your prompts, allowing for more relevant responses from LLMs.

![demo](https://github.com/user-attachments/assets/a5a4b620-8597-4632-a97a-4d1f4f367440)

The purpose of this tool is _testing_. The target audience is technical writers. Use it to test prompts in combination with context. To suggest a feature, file an issue. And remember: tech writers must own the prompts.

Note that I'm developing Aikidocs using GitHub Copilot.

## Features

- Send prompts with compressed context to multiple LLM providers.
- Support for OpenAI, Anthropic Claude, Google Gemini, and local Ollama models.
- Smart token counting and cost estimation before sending requests.
- Flexible prompt structure with base instructions and style guides.
- Output responses saved with timestamps for reference.
- Modern web UI for drag-and-drop file uploads and easy prompt editing.
- Download generated content as Markdown.

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/aikidoc.git
cd aikidoc

# Install dependencies
npm install

# Make the command executable
npm link
```

## Testing

The project uses the `mocha` framework to run unit tests.

### Setup

**Note:** You will need to `npm` install the project **dev dependencies** (using the `-D` option) before running the unit tests.

```bash
npm install -D
```

### Running tests

The unit test files can be found in the project `test` directory. You may add more tests there as needed.

To run all unit tests:

```bash
npm run test
```

## Project structure

```
aikidoc/
├── context/           # Place your context files here (code, docs, etc.)
├── credentials.txt    # API keys for LLM providers
├── index.js           # Main script
├── output/            # Generated responses are saved here
├── prompts/           # Prompt templates and instructions
│   ├── base-instructions.md    # Base instructions for prompts
│   └── style.md               # Style guidelines for responses
└── src/               # Source code
│   ├── compress.js    # Context compression logic
│   ├── tokenCounter.js # Token counting utilities
│   └── llm/           # LLM API integration
│       ├── claude.js  # Anthropic Claude API interface
│       ├── gemini.js  # Google Gemini API interface
│       ├── index.js   # LLM module entry point
│       ├── ollama.js  # Local Ollama API interface
│       └── openai.js  # OpenAI API interface
└── test
    └── cleanupContext.test.js # Test the cleanup logic
```

## Setup

1. Create a `credentials.txt` file with your API keys (use `credentials.txt.example` as a template):

```
# OpenAI credentials
# See model names here: https://platform.openai.com/docs/models
OPENAI_API_KEY=
OPENAI_MODEL=o4-mini-2025-04-16

# Anthropic (Claude) credentials
# See model names here: https://docs.anthropic.com/claude/reference/models
ANTHROPIC_API_KEY=
CLAUDE_MODEL=claude-3-7-sonnet-latest

# Google (Gemini) credentials
# See model names here: https://ai.google.dev/gemini-api/docs/models
GOOGLE_API_KEY=
GEMINI_MODEL=gemini-2.0-flash

# Ollama configuration
# See available models with the 'ollama list' command
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

2. Place your context files in the `context` directory.
3. Customize prompts in the `prompts` directory.

## Usage examples

### Web UI

```bash
# Start the web UI on the default port (3000)
aikidoc serve

# Start the web UI on a custom port
aikidoc serve --port 8080
```

The web UI provides a user-friendly interface where you can:
- Drag and drop context files
- Edit base instructions and style guides
- Select an LLM model
- View and download generated content as Markdown

### Basic usage

```bash
# Use default settings (context from ./context, prompts from ./prompts)
aikidoc
```

### Specify LLM provider

```bash
# Use Claude specifically
aikidoc --llm claude

# Use OpenAI
aikidoc --llm openai

# Use Gemini
aikidoc --llm gemini

# Use local Ollama
aikidoc --llm ollama
```

### Custom paths

```bash
# Use a different context folder
aikidoc --context ./my-project-code

# Use a different prompts folder
aikidoc --prompts ./my-prompts

# Specify a different credentials file
aikidoc --credentials ./my-credentials.txt

# Customize the output location
aikidoc --output ./my-responses
```

### Interactive mode

```bash
# Use interactive mode to enter your prompt directly in the CLI
aikidoc --interactive

# Combine interactive mode with a specific LLM provider
aikidoc --interactive --llm ollama
```

In interactive mode:

1. The tool loads base instructions from your prompts folder.
2. You can type your prompt directly in the terminal.
3. Type `END` on a new line when finished .
4. The response is displayed in the terminal and saved to a file.

### Advanced options

```bash
# Specify base instruction file (within prompts directory)
aikidoc --base-instruction custom-instructions.md

# Specify style guide file (within prompts directory)
aikidoc --style my-style-guide.md
```

## Command line options

### Global options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--context` | `-c` | Path to context folder | `./context` |
| `--credentials` | `-r` | Path to credentials file | `./credentials.txt` |
| `--prompts` | `-p` | Path to prompts folder or file | `./prompts` |
| `--base-instruction` | `-b` | Name of base instruction file | `base-instructions.md` |
| `--style` | `-s` | Name of style guide file | `style.md` |
| `--llm` | `-l` | LLM provider (gemini, claude, openai, ollama) | Auto-detected |
| `--output` | `-o` | Path to output folder | `./output` |
| `--interactive` | `-i` | Enable interactive mode to enter prompt in CLI | `false` |

### Serve command options

```bash
aikidoc serve [options]
```

| Option | Description | Default |
|--------|-------------|---------|  
| `--port` | Port to run the web server on | `3000` |

## License

Apache License 2.0
