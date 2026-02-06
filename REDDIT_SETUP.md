# Reddit API Setup Guide

## Quick Start (5 minutes)

### Step 1: Get Reddit API Credentials

1. **Log into Reddit** at https://www.reddit.com

2. **Create an Application**
   - Visit https://old.reddit.com/prefs/apps/
   - Scroll to bottom and click **"create another app..."**
   - Fill out the form:
     - **name**: `stock-surge-tracker` (or anything you want)
     - **App type**: Select **"script"** (for personal use)
     - **description**: `Stock mention tracker for personal use`
     - **about url**: Leave blank
     - **redirect uri**: `http://localhost:8080` (required but not used)
   - Click **"create app"**

3. **Copy Your Credentials**
   - You'll see your new app listed
   - **client_id**: The string under "personal use script" (14 characters)
   - **client_secret**: The string next to "secret" (27 characters)

   Example of what you'll see:
   ```
   personal use script
   abc123DEF456xyz7  <-- This is your CLIENT_ID

   secret
   xYz789AbC123dEf456GhI789jKl  <-- This is your CLIENT_SECRET
   ```

### Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   # Replace with your actual credentials
   REDDIT_CLIENT_ID=abc123DEF456xyz7
   REDDIT_CLIENT_SECRET=xYz789AbC123dEf456GhI789jKl
   REDDIT_USER_AGENT=stock-surge:v1.0 (by /u/your_reddit_username)
   ```

3. **IMPORTANT**: Replace `your_reddit_username` with your actual Reddit username

### Step 3: Test the Tracker

Run the test script to verify everything works:

```bash
cd /Users/alexkamer/stock-surge
uv run python test_reddit_tracker.py
```

You should see:
```
✅ All tests completed!
```

### Step 4: Collect Initial Data

Scan recent posts to populate the database:

```bash
uv run python reddit_tracker.py --mode scan --limit 200
```

This will:
- Scan the 200 most recent posts from financial subreddits
- Extract stock ticker mentions
- Analyze sentiment
- Store data in memory

You should see output like:
```
Found 3 ticker(s): NVDA, AMD, TSLA | Sentiment: Bullish (+0.72) | r/wallstreetbets | Score: 234
```

### Step 5: Start the API Server

In one terminal, start the FastAPI server:

```bash
cd /Users/alexkamer/stock-surge
./start-backend.sh
```

The server will start on http://localhost:8000

### Step 6: Test the Reddit Endpoints

In another terminal, test the API:

```bash
# Get trending tickers
curl http://localhost:8000/reddit/trending

# Get sentiment for specific ticker
curl http://localhost:8000/reddit/sentiment/AAPL

# Get recent mentions
curl http://localhost:8000/reddit/mentions/TSLA

# Get overall stats
curl http://localhost:8000/reddit/stats
```

### Step 7 (Optional): Run Continuous Streaming

For real-time Reddit monitoring:

```bash
uv run python reddit_tracker.py --mode stream
```

This will continuously monitor r/wallstreetbets, r/stocks, r/investing, and r/StockMarket for new posts.

**Note**: Keep this running in a separate terminal or use a process manager like `screen`, `tmux`, or `systemd`.

---

## Understanding the Data

### Sentiment Scores

- **+1.0 to +0.3**: Bullish (positive sentiment)
- **+0.3 to -0.3**: Neutral
- **-0.3 to -1.0**: Bearish (negative sentiment)

### Indicators

**Bullish signals:**
- Keywords: "moon", "rocket", "bull", "calls", "long"
- Emojis: 🚀 📈 💎
- Example: "AAPL to the moon 🚀" → Score: +0.85

**Bearish signals:**
- Keywords: "dump", "crash", "bear", "puts", "short"
- Emojis: 💩 📉 🤡
- Example: "TSLA dumping hard 💩" → Score: -0.75

---

## Configuration Options

### Environment Variables

Edit `.env` to customize:

```env
# Which subreddits to monitor (+ separated)
REDDIT_SUBREDDITS=wallstreetbets+stocks+investing+StockMarket+options

# Minimum upvotes to consider (filter noise)
REDDIT_MIN_SCORE=10

# Enable/disable real-time streaming
REDDIT_STREAM_ENABLED=true
```

### Add More Subreddits

Popular financial subreddits:
- `wallstreetbets` - High volume, retail sentiment
- `stocks` - General stock discussion
- `investing` - Long-term investment focus
- `StockMarket` - Market-wide discussion
- `options` - Options trading
- `pennystocks` - Small-cap stocks
- `Daytrading` - Day trading strategies
- `algotrading` - Algorithmic trading

Example:
```env
REDDIT_SUBREDDITS=wallstreetbets+stocks+investing+options+Daytrading
```

---

## Troubleshooting

### Error: "401 Unauthorized"
- Check your `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET`
- Verify they're copied correctly (no extra spaces)
- Make sure you selected "script" type when creating the app

### Error: "429 Too Many Requests"
- You're hitting Reddit's rate limit (60 requests/minute)
- The tracker automatically handles this, just wait
- If using `scan` mode, reduce `--limit`

### No data showing up
- Make sure you ran the initial scan: `python reddit_tracker.py --mode scan`
- Check if posts have minimum score (default: 10 upvotes)
- Lower `REDDIT_MIN_SCORE` in .env if needed

### Tickers not being detected
- Tickers must be in ALL CAPS or prefixed with $
- Valid: `AAPL`, `$TSLA`, `$MSFT`
- Invalid: `aapl`, `apple`, `tsla`
- The tracker validates against yfinance, so only real tickers work

### "AI" detected as ticker
- This is a known issue - "AI" can be a ticker (C3.ai) or just "AI" the acronym
- The validator checks if it's a real ticker via yfinance
- False positives are filtered out

---

## API Response Examples

### GET /reddit/trending

```json
{
  "timeframe": "24h",
  "data": [
    {
      "ticker": "NVDA",
      "mentions": 234,
      "sentiment": 0.72,
      "sentiment_label": "Bullish",
      "avg_score": 156,
      "top_post": {
        "title": "NVDA earnings beat expectations 🚀",
        "score": 1247,
        "sentiment": 0.89
      }
    }
  ],
  "cached": false
}
```

### GET /reddit/sentiment/AAPL

```json
{
  "ticker": "AAPL",
  "mention_count": 456,
  "current_sentiment": 0.45,
  "sentiment_label": "Bullish",
  "sentiment_history": [
    {
      "date": "2024-02-01",
      "sentiment": 0.52,
      "mentions": 67
    }
  ],
  "cached": false
}
```

### GET /reddit/mentions/TSLA

```json
{
  "ticker": "TSLA",
  "data": [
    {
      "post_id": "abc123",
      "title": "TSLA delivery numbers are out",
      "score": 892,
      "sentiment_score": 0.67,
      "sentiment_label": "Bullish",
      "subreddit": "stocks",
      "permalink": "https://reddit.com/r/stocks/comments/..."
    }
  ],
  "cached": false
}
```

---

## Advanced Usage

### Running as Background Service

#### Using `screen` (recommended for development):
```bash
screen -S reddit-tracker
uv run python reddit_tracker.py --mode stream
# Press Ctrl+A, then D to detach
# Reattach with: screen -r reddit-tracker
```

#### Using `nohup`:
```bash
nohup uv run python reddit_tracker.py --mode stream > reddit.log 2>&1 &
```

#### Using `systemd` (recommended for production):

Create `/etc/systemd/system/reddit-tracker.service`:

```ini
[Unit]
Description=Stock Surge Reddit Tracker
After=network.target

[Service]
Type=simple
User=yourusername
WorkingDirectory=/Users/alexkamer/stock-surge
Environment="PATH=/Users/alexkamer/.local/bin:/usr/local/bin:/usr/bin"
ExecStart=/usr/bin/uv run python reddit_tracker.py --mode stream
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable reddit-tracker
sudo systemctl start reddit-tracker
sudo systemctl status reddit-tracker
```

---

## Data Retention

The current implementation stores data in memory, which means:
- ✅ Fast access
- ✅ No database setup required
- ❌ Data lost on restart

**For production**, add database persistence:
1. Uncomment database code in `reddit_tracker.py`
2. Run migrations: `alembic upgrade head`
3. Data will persist across restarts

---

## Rate Limits & Performance

### Reddit API Limits
- **60 requests per minute** for authenticated apps
- PRAW automatically handles rate limiting
- Tracker processes ~10-20 posts/minute during peak hours

### Caching
- **Trending tickers**: 5 minutes
- **Sentiment data**: 15 minutes
- **Mentions**: 1 hour
- **Stats**: 5 minutes

### Performance Tips
1. Run initial scan during off-hours to build up data
2. Use caching - most repeated requests are instant
3. Lower `REDDIT_MIN_SCORE` only if you need more data (more noise)
4. Monitor specific subreddits instead of all of them

---

## Next Steps

Once Reddit sentiment is working:

1. **Build Frontend Components**
   - `TrendingTickersCard.tsx` - Show top mentioned tickers
   - `SentimentChart.tsx` - Visualize sentiment over time
   - `RedditFeed.tsx` - Display recent mentions

2. **Add Database Persistence**
   - Store mentions in PostgreSQL/SQLite
   - Track historical sentiment
   - Generate reports

3. **Correlate with Price Data**
   - Compare Reddit sentiment vs actual price movement
   - Identify predictive patterns
   - Alert when sentiment diverges from price

4. **Advanced Features**
   - Insider trading correlation
   - Earnings prediction based on sentiment
   - Alert on mention volume spikes

---

**Ready to track Reddit sentiment! 📊🚀**
