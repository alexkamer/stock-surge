# Ollama AI Summarization - Quick Start

Stock Surge now has AI-powered article summarization using Ollama!

## Quick Setup (5 minutes)

### 1. Install Ollama

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from https://ollama.com/download

### 2. Start Ollama and Pull Model

```bash
# Start Ollama server (in a separate terminal)
ollama serve

# In another terminal, check what models you have
ollama list

# Pull a model if you don't have one (choose one):
ollama pull llama3.2:3b   # Fast, lightweight (recommended)
# or
ollama pull llama3.2      # Slightly larger but better quality
```

### 3. Test the Integration

```bash
cd backend
python test_ollama.py
```

If the test passes, you're ready to go!

### 4. Use It in the App

1. Start your Stock Surge backend: `cd backend && uvicorn app.main:app --reload`
2. Start the frontend: `cd frontend && npm run dev`
3. Navigate to any stock (e.g., `/stock/AAPL`)
4. Go to the "News" tab
5. Click "AI Summary" on any article
6. Wait a few seconds for the AI to generate a summary

## Features

- **AI Summaries**: Click the sparkle button to get a concise AI-generated summary
- **Fast**: Summaries are generated in 5-15 seconds
- **Privacy**: All processing happens locally on your machine
- **No API Keys**: No need for OpenAI or other cloud services

## Troubleshooting

### "Ollama is not available"
Make sure Ollama is running: `ollama serve`

### Slow summaries
Try a smaller model: `ollama pull llama3.2:3b`

### Connection refused
Check if Ollama is on port 11434: `curl http://localhost:11434/api/tags`

## Configuration

Create a `.env` file in the project root to customize:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_TIMEOUT=60
```

## Model Options

- `llama3.2` (default) - Best balance of speed/quality (1.3GB)
- `llama3.2:3b` - Faster, lighter (2GB)
- `phi3` - Very fast (2.3GB)
- `mistral` - Higher quality (4GB)

Change models:
```bash
ollama pull mistral
```

Then update `.env`:
```env
OLLAMA_MODEL=mistral
```

## Full Documentation

See `docs/OLLAMA_SETUP.md` for complete details.

## API Endpoints

- `GET /ai/status` - Check Ollama availability
- `POST /ai/summarize` - Summarize article from URL
- `POST /ai/key-points` - Extract key points

Full API docs: http://localhost:8000/docs
