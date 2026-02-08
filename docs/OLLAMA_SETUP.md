# Ollama AI Integration Setup

This guide explains how to set up Ollama for AI-powered article summarization in Stock Surge.

## What is Ollama?

Ollama is a local LLM (Large Language Model) runtime that allows you to run AI models on your own machine. Stock Surge uses it to generate article summaries in the News section.

## Installation

### macOS

```bash
brew install ollama
```

Or download from: https://ollama.com/download

### Linux

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Windows

Download the installer from: https://ollama.com/download

### Python Package

The backend also requires the Ollama Python package:

```bash
pip install ollama
```

This is included in the backend requirements and will be installed automatically.

## Setup

### 1. Start Ollama Server

```bash
ollama serve
```

The server will start on `http://localhost:11434` by default.

### 2. Pull a Model

Stock Surge is configured to use `llama3.2` by default, which is a good balance of speed and quality:

```bash
ollama pull llama3.2
```

**Other recommended models:**

- `llama3.2` (default) - Fast, good for summaries (1.3GB)
- `llama3.2:3b` - Smaller, faster (2GB)
- `mistral` - Alternative option (4GB)
- `phi3` - Very fast for simple tasks (2.3GB)

### 3. Configure Stock Surge (Optional)

If you want to use a different model or Ollama is running on a different host, create a `.env` file in the project root:

```env
# Ollama Configuration (optional)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_TIMEOUT=60
```

### 4. Verify Installation

You can check if Ollama is running:

```bash
curl http://localhost:11434/api/tags
```

Or use the Stock Surge API:

```bash
curl http://localhost:8000/ai/status
```

## Usage

### In the UI

1. Navigate to any stock detail page (e.g., `/stock/AAPL`)
2. Click on the "News" tab
3. Click the "AI Summary" button on any article
4. Wait a few seconds for the summary to be generated

### Via API

**Check Ollama status:**
```bash
curl http://localhost:8000/ai/status
```

**Summarize an article:**
```bash
curl -X POST http://localhost:8000/ai/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://finance.yahoo.com/news/article-url",
    "max_length": 200
  }'
```

**Extract key points:**
```bash
curl -X POST http://localhost:8000/ai/key-points \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://finance.yahoo.com/news/article-url",
    "num_points": 5
  }'
```

## Troubleshooting

### "Ollama service is not available"

- Make sure Ollama is running: `ollama serve`
- Check if the server is accessible: `curl http://localhost:11434/api/tags`
- Verify the `OLLAMA_BASE_URL` in your `.env` file

### "Model not found"

Pull the model first:
```bash
ollama pull llama3.2
```

### Slow summaries

- Try a smaller/faster model like `llama3.2:3b` or `phi3`
- Increase the timeout in `.env`: `OLLAMA_TIMEOUT=120`
- Make sure you have enough RAM (models need 2-8GB depending on size)

### Connection errors

If Ollama is running on a different machine:
```env
OLLAMA_BASE_URL=http://your-ollama-host:11434
```

## Model Recommendations

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| `llama3.2` | 1.3GB | Fast | Good | General use (default) |
| `llama3.2:3b` | 2GB | Very Fast | Good | Quick summaries |
| `phi3` | 2.3GB | Very Fast | Decent | Simple summaries |
| `mistral` | 4GB | Medium | Great | Detailed summaries |
| `llama3.1:8b` | 4.7GB | Medium | Excellent | High quality |

## Features

- **Article Summarization**: Generate concise summaries of news articles
- **Key Points Extraction**: Extract the most important points from articles
- **Local Processing**: All AI processing happens on your machine
- **Privacy**: No data is sent to external services

## API Endpoints

- `GET /ai/status` - Check if Ollama is available
- `POST /ai/summarize` - Summarize an article from URL
- `POST /ai/summarize-content` - Summarize provided content
- `POST /ai/key-points` - Extract key points from an article

Full API documentation: http://localhost:8000/docs
