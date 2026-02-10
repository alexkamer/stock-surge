# Stock-Focused Chat Enhancement - Demo Prompts

## Quick Demo Script

This document contains ready-to-use prompts to demonstrate all the new chat features.

---

## 1. Basic Ticker Detection

**Prompt:**
```
What's the latest on $AAPL?
```

**What to Show:**
- ✨ Ticker card appears automatically
- Shows live price, change percentage
- 7-day sparkline chart
- Key metrics (volume, market cap)
- "Add to Watchlist" button
- "View Details" link

---

## 2. Multiple Tickers

**Prompt:**
```
How are the major tech stocks doing? I'm interested in AAPL, MSFT, GOOGL, and TSLA.
```

**What to Show:**
- 🎯 Four ticker cards appear
- Each shows independent data
- Compact view for multiple tickers
- Real-time price updates

---

## 3. Stock Comparison

**Prompt:**
```
Compare AAPL vs MSFT vs GOOGL
```

**What to Show:**
- 📊 Comparison chart with 3 color-coded lines
- Percentage-based performance (normalized)
- Metrics table below
- Side-by-side comparison of key stats

**Alternative Prompts:**
- `How does AAPL compare to MSFT?`
- `TSLA versus NIO performance`
- `Compare the major EV makers`

---

## 4. Article Analysis (Mock Example)

**Prompt:**
```
I found this interesting article about Apple's earnings: https://finance.yahoo.com/news/apple-earnings-q4-2024

What do you think?
```

**What to Show:**
- 📄 Article summary card appears
- Sentiment badge (Bullish/Bearish/Neutral)
- AI-generated summary
- Key takeaway highlighted
- "Show Key Points" button expands to bullet list
- Reading time and word count stats

**Note:** For testing, use any accessible news URL. If scraping fails, it shows graceful error.

---

## 5. Code Examples & Copy

**Prompt:**
```
Show me Python code to calculate moving average for stock prices.
```

**AI Response Example:**
```python
def calculate_sma(prices, period=20):
    """Calculate Simple Moving Average"""
    if len(prices) < period:
        return None
    return sum(prices[-period:]) / period

# Example usage
prices = [100, 102, 101, 105, 107, 106, 108]
sma_5 = calculate_sma(prices, period=5)
print(f"5-day SMA: {sma_5}")
```

**What to Show:**
- 📋 Hover over code block
- Copy button appears in top-right
- Click to copy (checkmark shows)
- Paste in text editor to verify

---

## 6. Message Actions

**Prompt:**
```
Explain the P/E ratio and why it matters for investors.
```

**What to Show:**
- 🖱️ Hover over AI response
- Action buttons appear (top-right)
- Copy as plain text
- Copy as markdown
- Both work correctly

---

## 7. Search Feature

**Setup:** First have a conversation with multiple messages about different stocks.

**Demo:**
1. Press `Cmd+K` (or `Ctrl+K` on Windows)
2. Type "AAPL" in search box
3. Shows "X / Y" results counter
4. Press `Enter` to jump to next match
5. Press `Shift+Enter` for previous
6. Press `Esc` to close

**Alternative:** Click "Search" button in toolbar

---

## 8. Export Feature

**Demo:**
1. Press `Cmd+E` (or `Ctrl+E`)
2. Export modal appears
3. Choose format:
   - **Markdown** (for docs)
   - **JSON** (for data)
   - **Plain Text** (for simple sharing)
4. Toggle "Include timestamps"
5. Click "Export"
6. File downloads

**Alternative:** Click "Export" button in toolbar

---

## 9. Keyboard Shortcuts Demo

**Script:**
1. `Cmd+N` → New chat (starts fresh)
2. Type message → `Enter` to send
3. `Cmd+K` → Search (opens modal)
4. `Esc` → Close search
5. `Cmd+E` → Export (opens modal)
6. `Esc` → Close export
7. `Cmd+/` → Focus input (cursor jumps to textarea)

---

## 10. Mixed Content

**Prompt:**
```
Let's analyze $AAPL vs $MSFT. I found this article comparing them:
https://example.com/aapl-msft-comparison

Here's some Python code to fetch their data:

```python
import yfinance as yf

def compare_stocks(ticker1, ticker2):
    stock1 = yf.Ticker(ticker1)
    stock2 = yf.Ticker(ticker2)
    return {
        'ticker1': stock1.info['currentPrice'],
        'ticker2': stock2.info['currentPrice']
    }

compare_stocks('AAPL', 'MSFT')
```py
```

**What to Show:**
- 🎭 Multiple features work together:
  - Ticker cards for AAPL and MSFT
  - Stock comparison chart (due to "vs")
  - Article summary card
  - Code block with copy button
- All render correctly without conflicts

---

## Advanced Demo Scenarios

### Scenario A: Day Trader Workflow

**Conversation Flow:**
```
User: What are the top movers today?
AI: [Response with tickers]
→ Ticker cards appear for all mentioned stocks

User: Compare TSLA vs NIO vs RIVN
→ Comparison chart appears

User: What's the RSI for TSLA?
AI: [Response with RSI value]
→ (Future: Indicator badge appears)

User: Thanks! Let me export this.
→ Press Cmd+E, export as PDF
```

---

### Scenario B: Research Analyst

**Conversation Flow:**
```
User: I need to research AAPL for a report

AI: [Provides analysis]
→ Ticker card with metrics

User: Here's an article I found: [URL]
→ Article summary appears

User: Compare AAPL to sector peers MSFT and GOOGL
→ Comparison chart

User: Can you show me code to calculate beta?
AI: [Provides code]
→ Copy code button

User: Perfect. Let me export this as markdown.
→ Cmd+E, export as .md for report
```

---

### Scenario C: Quick Price Check

**Conversation Flow:**
```
User: Quick check: AAPL, TSLA, NVDA prices

AI: Here are the current prices: [mentions all three]
→ Three compact ticker cards appear
→ Instant visual of all prices and changes
```

---

## Testing Different AI Responses

### Test 1: AI Mentions Tickers Naturally

**Prompt:**
```
What tech stocks should I consider for long-term growth?
```

**Expected AI Response:**
```
For long-term growth, consider:

1. **Apple (AAPL)** - Strong ecosystem, services growth
2. **Microsoft (MSFT)** - Cloud dominance with Azure
3. **NVIDIA (NVDA)** - AI chip leader
4. **Google (GOOGL)** - Search and cloud computing

Each offers different risk/reward profiles...
```

**What to Show:**
- Ticker cards appear inline for AAPL, MSFT, NVDA, GOOGL
- Cards integrate naturally with AI response

---

### Test 2: AI Suggests Comparison

**Prompt:**
```
Which is better for growth: AAPL or MSFT?
```

**Expected:**
- Comparison chart appears automatically
- AI analysis alongside chart
- Visual reinforces text analysis

---

### Test 3: AI Provides Code

**Prompt:**
```
How do I fetch stock data in Python?
```

**Expected:**
- Code block with copy button
- User can easily copy and paste

---

## Pro Tips for Demos

### Make It Smooth
1. Pre-type prompts in a text file
2. Copy-paste for speed
3. Have multiple browser tabs ready

### Show Real Data
1. Use real tickers (AAPL, MSFT, GOOGL)
2. Use accessible article URLs
3. Test before demo to ensure APIs work

### Highlight Key Features
1. Point out automatic detection
2. Show hover interactions
3. Demonstrate keyboard shortcuts
4. Export sample conversation

### Handle Failures Gracefully
1. If article scraping fails: "Shows graceful error handling"
2. If chart doesn't load: "Data caching at work"
3. If API slow: "Real-time data loading"

---

## Troubleshooting During Demo

### If Ticker Card Doesn't Appear
- Make sure format is $AAPL or AAPL (3-5 letters)
- Check if it's in FALSE_POSITIVES list (AS, OR, etc.)
- Mention in context with "stock", "price", etc.

### If Comparison Doesn't Trigger
- Use keywords: "compare", "vs", "versus"
- Mention 2-4 tickers
- Try: "Compare AAPL and MSFT"

### If Article Summary Fails
- Check if Ollama is running
- Try different URL
- Explain: "Some sites block scraping"

### If Keyboard Shortcuts Don't Work
- Check if input is focused
- Try clicking toolbar buttons instead
- Mention browser/OS might have conflicts

---

## Audience-Specific Demos

### For Developers
**Focus on:**
- Code copy functionality
- Export as JSON for data analysis
- Keyboard shortcuts for productivity
- Technical indicator badges (future)

**Demo Prompts:**
```
Show me API integration code for stock data
How do I calculate technical indicators?
Compare performance of different algorithms
```

---

### For Traders
**Focus on:**
- Real-time ticker cards
- Comparison charts
- Quick price checks
- Search through conversation history

**Demo Prompts:**
```
What's AAPL doing right now?
Compare AAPL vs MSFT vs GOOGL
Quick check: TSLA, NIO, RIVN
```

---

### For Analysts
**Focus on:**
- Article summarization
- Export for reports
- Rich data visualization
- Multi-stock comparison

**Demo Prompts:**
```
Analyze this earnings report: [URL]
Compare sector leaders
Export this analysis as markdown
```

---

### For Students
**Focus on:**
- Educational code examples
- Copy for assignments
- Article summarization for research
- Export for study notes

**Demo Prompts:**
```
Explain P/E ratio with example code
How do I analyze stock trends?
Summarize this research paper: [URL]
```

---

## Success Metrics to Show

During demo, point out:
- ⚡ **Speed**: "Notice how fast ticker cards load"
- 🎯 **Accuracy**: "AI detected tickers automatically"
- 💎 **Polish**: "Smooth animations, no lag"
- 🔧 **Power**: "Keyboard shortcuts for pros"
- 📱 **UX**: "Hover actions keep UI clean"

---

## Closing Demo

**Final Prompt:**
```
This chat is amazing! Let me export it to share with my team.
```

**Actions:**
1. Press `Cmd+E`
2. Choose Markdown
3. Click Export
4. Show downloaded file
5. Open in text editor
6. Show formatted conversation

**Ending Note:**
"All these features work together seamlessly - automatic detection, rich visualizations, and powerful interactions. Perfect for stock analysis and discussion!"
