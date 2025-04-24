# Aikidocs

Aikidocs is a tool that sends contextual prompts to an LLM of your choice. It compresses content from files or directories and uses that as context for your prompts, allowing for more relevant responses from LLMs.

The purpose of this tool is _testing_. Use it to test prompts in combination with context. To suggest a feature, file an issue.

## Features

- Send prompts with compressed context to multiple LLM providers.
- Support for OpenAI, Anthropic Claude, and Google Gemini.
- Smart token counting and cost estimation before sending requests.
- Flexible prompt structure with base instructions and style guides.
- Output responses saved with timestamps for reference.

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
    ├── compress.js    # Context compression logic
    ├── tokenCounter.js # Token counting utilities
    └── llm/           # LLM API integration
        ├── claude.js  # Anthropic Claude API interface
        ├── gemini.js  # Google Gemini API interface
        ├── index.js   # LLM module entry point
        └── openai.js  # OpenAI API interface
```

## Setup

1. Create a `credentials.txt` file with your API keys (use `credentials.txt.example` as a template):

```
# OpenAI credentials
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=o4-mini-2025-04-16

# Anthropic (Claude) credentials
ANTHROPIC_API_KEY=your_anthropic_api_key
CLAUDE_MODEL=claude-3-7-sonnet-latest

# Google (Gemini) credentials
GOOGLE_API_KEY=your_google_api_key
GEMINI_MODEL=gemini-2.0-flash
```

2. Place your context files in the `context` directory.
3. Customize prompts in the `prompts` directory.

## Usage examples

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

### Advanced options

```bash
# Specify base instruction file (within prompts directory)
aikidoc --base-instruction custom-instructions.md

# Specify style guide file (within prompts directory)
aikidoc --style my-style-guide.md
```

## Command line options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--context` | `-c` | Path to context folder | `./context` |
| `--credentials` | `-r` | Path to credentials file | `./credentials.txt` |
| `--prompts` | `-p` | Path to prompts folder or file | `./prompts` |
| `--base-instruction` | `-b` | Name of base instruction file | `base-instructions.md` |
| `--style` | `-s` | Name of style guide file | `style.md` |
| `--llm` | `-l` | LLM provider (gemini, claude, openai) | Auto-detected |
| `--output` | `-o` | Path to output folder | `./output` |

## License

Apache License 2.0
