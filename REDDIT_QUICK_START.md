# Reddit Sentiment - Quick Start Cheat Sheet

## 5-Minute Setup

### 1. Get Reddit Credentials (2 min)
```
1. Visit: https://old.reddit.com/prefs/apps/
2. Click "create another app..."
3. Name: stock-surge-tracker
4. Type: script
5. Click "create app"
6. Copy client_id (under "personal use script")
7. Copy client_secret (next to "secret")
```

### 2. Configure (1 min)
```bash
cp .env.example .env
nano .env  # or vim, code, etc.

# Add:
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USER_AGENT=stock-surge:v1.0 (by /u/your_reddit_username)
```

### 3. Test (1 min)
```bash
uv run python test_reddit_tracker.py
# Should see: ✅ All tests completed!
```

### 4. Collect Data (1 min)
```bash
uv run python reddit_tracker.py --mode scan --limit 200
# Scans 200 recent posts
```

### 5. Start API
```bash
./start-backend.sh
# Server starts on http://localhost:8000
```

---

## Test Endpoints

```bash
# Trending tickers
curl http://localhost:8000/reddit/trending

# Sentiment for AAPL
curl http://localhost:8000/reddit/sentiment/AAPL

# Recent mentions of TSLA
curl http://localhost:8000/reddit/mentions/TSLA

# Overall stats
curl http://localhost:8000/reddit/stats
```

---

## Common Commands

```bash
# Scan recent posts (one-time)
uv run python reddit_tracker.py --mode scan --limit 100

# Stream real-time (continuous)
uv run python reddit_tracker.py --mode stream

# Run tests
uv run python test_reddit_tracker.py

# Start API server
./start-backend.sh

# Check if server is running
curl http://localhost:8000/docs
```

---

## API Endpoints

| Endpoint | Description | Cache |
|----------|-------------|-------|
| `GET /reddit/trending?timeframe=24h&limit=20` | Top mentioned tickers | 5 min |
| `GET /reddit/sentiment/{ticker}?days=7` | Sentiment history | 15 min |
| `GET /reddit/mentions/{ticker}?limit=50` | Recent posts | 1 hour |
| `GET /reddit/stats` | Overall statistics | 5 min |

---

## Sentiment Scale

```
+1.0 to +0.3  🟢 Bullish   (moon, rocket, calls, 🚀)
+0.3 to -0.3  🟡 Neutral   (neutral language)
-0.3 to -1.0  🔴 Bearish   (dump, crash, puts, 💩)
```

---

## Configuration Options

Edit `.env` to customize:

```env
# Which subreddits to monitor (+ separated)
REDDIT_SUBREDDITS=wallstreetbets+stocks+investing+StockMarket

# Minimum upvotes to consider (filter noise)
REDDIT_MIN_SCORE=10

# Enable/disable real-time streaming
REDDIT_STREAM_ENABLED=true
```

---

## Troubleshooting

### "401 Unauthorized"
- Check `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET`
- Verify no extra spaces when copying

### No data showing up
- Run initial scan first: `python reddit_tracker.py --mode scan`
- Check posts have enough upvotes (min: 10)

### Tickers not detected
- Must be ALL CAPS or prefixed with $
- Valid: `AAPL`, `$TSLA`, `$MSFT`
- Invalid: `aapl`, `apple`

### "429 Too Many Requests"
- Reddit rate limit (60/min)
- Wait a few seconds, tracker auto-retries

---

## Example Response

```json
{
  "timeframe": "24h",
  "data": [
    {
      "ticker": "NVDA",
      "mentions": 234,
      "sentiment": 0.72,
      "sentiment_label": "Bullish",
      "top_post": {
        "title": "NVDA earnings beat 🚀",
        "score": 1247
      }
    }
  ]
}
```

---

## Run in Background

### Using screen (recommended):
```bash
screen -S reddit-tracker
uv run python reddit_tracker.py --mode stream
# Press Ctrl+A, then D to detach
# Reattach: screen -r reddit-tracker
```

### Using nohup:
```bash
nohup uv run python reddit_tracker.py --mode stream > reddit.log 2>&1 &
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `reddit_tracker.py` | Main tracking service |
| `test_reddit_tracker.py` | Test suite |
| `.env` | Configuration (create from .env.example) |
| `REDDIT_SETUP.md` | Detailed setup guide |
| `REDDIT_FEATURE_COMPLETE.md` | Feature documentation |

---

## Next Steps

1. ✅ Get Reddit credentials
2. ✅ Run initial scan
3. ✅ Test endpoints
4. 🔜 Build frontend components
5. 🔜 Add to stock detail page
6. 🔜 Create Reddit dashboard

---

**Need help?** Check `REDDIT_SETUP.md` for detailed guide.
