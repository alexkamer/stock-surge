# AI Features in Stock Surge

## Article Summarization with Ollama

Stock Surge includes optional AI-powered article summarization in the News section, powered by locally-run LLM models via Ollama.

### Overview

When viewing stock news articles, you can click the "AI Summary" button to get:
- **Concise Summary**: AI-generated summary focusing on key facts for investors
- **Key Takeaway**: Single most important point from the article
- **Structured Output**: Consistent, reliable summaries using Pydantic models

### Features

✨ **Privacy-First**: All AI processing happens locally on your machine
⚡ **Fast**: Summaries generated in 5-15 seconds
🔒 **No API Keys**: No OpenAI or cloud service accounts needed
💰 **Free**: No API costs or usage limits
🎯 **Investor-Focused**: Summaries tailored for stock market context

### Quick Setup

1. **Install Ollama**
   ```bash
   # macOS
   brew install ollama

   # Linux
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Start Ollama and pull a model**
   ```bash
   ollama serve
   ollama pull llama3.2
   ```

3. **Verify it works**
   ```bash
   cd backend
   python test_ollama.py
   ```

That's it! The AI Summary buttons will now work in the News section.

### How It Works

1. Navigate to any stock (e.g., `/stock/AAPL`)
2. Click the **News** tab
3. Click the **AI Summary** button (sparkle icon) on any article
4. Wait 5-15 seconds for the summary to generate
5. Read the AI-generated summary with key takeaway

### Example Output

**Original Article**: 850 words about Apple's quarterly earnings

**AI Summary** (145 words):
> Apple Inc. reported record quarterly revenue of $123 billion, exceeding analyst expectations by 8%. The company's iPhone sales remained strong despite market concerns, while the services segment showed significant growth at 15% year-over-year. CEO Tim Cook highlighted ongoing investments in AI technology and announced upcoming product releases for the holiday season. The company's gross margin improved to 44%, up from 42% last quarter. Wall Street analysts raised their price targets following the announcement, with an average target of $195 per share...

**Key Takeaway**:
> *Apple beat earnings expectations with record revenue driven by strong iPhone sales and services growth, leading analysts to raise price targets.*

### Customization

Configure via `.env` file:

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434  # Change if Ollama is on another machine
OLLAMA_MODEL=llama3.2                   # Change model (see options below)
OLLAMA_TIMEOUT=60                       # Increase for slower models
```

### Recommended Models

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| **llama3.2** | 1.3GB | ⚡⚡⚡ Fast | ⭐⭐⭐ Good | **Default - Best balance** |
| llama3.2:3b | 2GB | ⚡⚡⚡⚡ Very Fast | ⭐⭐ Decent | Speed priority |
| phi3 | 2.3GB | ⚡⚡⚡⚡ Very Fast | ⭐⭐ Decent | Quick summaries |
| mistral | 4GB | ⚡⚡ Medium | ⭐⭐⭐⭐ Great | Quality priority |
| llama3.1:8b | 4.7GB | ⚡⚡ Medium | ⭐⭐⭐⭐⭐ Excellent | Best quality |

**To change models:**
```bash
ollama pull mistral
```

Then update `.env`:
```env
OLLAMA_MODEL=mistral
```

### Technical Details

#### Structured Outputs

We use Ollama's structured output feature with Pydantic models:

```python
from ollama import chat
from pydantic import BaseModel, Field

class ArticleSummary(BaseModel):
    summary: str = Field(description="Concise summary...")
    key_takeaway: str = Field(description="Most important point...")

response = chat(
    model='llama3.2',
    messages=[{'role': 'user', 'content': prompt}],
    format=ArticleSummary.model_json_schema(),
)

result = ArticleSummary.model_validate_json(response.message.content)
```

**Benefits:**
- Consistent output format
- Type-safe responses
- No manual parsing needed
- Validation built-in

#### API Endpoints

```
GET  /ai/status              Check if Ollama is available
POST /ai/summarize           Summarize article from URL
POST /ai/summarize-content   Summarize provided content directly
POST /ai/key-points          Extract key points from article
```

Full API documentation: http://localhost:8000/docs

### Troubleshooting

**"Ollama is not available" / Button is disabled**
- Start Ollama: `ollama serve`
- Verify it's running: `curl http://localhost:11434/api/tags`
- Check the info banner in the News section for setup instructions

**Summaries are slow**
- Use a faster model: `ollama pull llama3.2:3b`
- Increase timeout: `OLLAMA_TIMEOUT=120` in `.env`
- Check CPU/RAM usage (models need 2-8GB RAM)

**"Model not found"**
- Pull the model first: `ollama pull llama3.2`
- List available models: `ollama list`

**Connection errors**
- Make sure Ollama is on the correct port
- If running remotely: `OLLAMA_BASE_URL=http://remote-host:11434`

### Documentation

- **Quick Start**: See `OLLAMA_QUICKSTART.md`
- **Detailed Setup**: See `docs/OLLAMA_SETUP.md`
- **Implementation Details**: See `OLLAMA_INTEGRATION_SUMMARY.md`

### Privacy & Security

- ✅ All AI processing happens locally on your machine
- ✅ No data sent to external APIs or cloud services
- ✅ No API keys or accounts required
- ✅ Works completely offline (after model download)
- ✅ You own your data and the models

### Performance

Typical summarization times on M1 Mac:
- **llama3.2**: 5-10 seconds
- **llama3.2:3b**: 3-7 seconds
- **phi3**: 3-6 seconds
- **mistral**: 8-15 seconds
- **llama3.1:8b**: 12-20 seconds

Times will vary based on:
- CPU/GPU performance
- Article length
- Model size
- System load

### Future Enhancements

Planned features:
- 📊 **Sentiment Analysis**: Detect bullish/bearish sentiment
- 💾 **Summary Caching**: Cache summaries in Redis
- ⚡ **Batch Processing**: Summarize multiple articles at once
- 🎯 **Stock Insights**: Extract price targets and analyst opinions
- 🔄 **Streaming**: Real-time summary generation
- 🎨 **Custom Prompts**: User-configurable summary styles

### Optional Feature

This feature is **completely optional**. The app works perfectly without Ollama installed - you just won't see the AI Summary buttons. Install it when you're ready to try AI-powered summaries!
