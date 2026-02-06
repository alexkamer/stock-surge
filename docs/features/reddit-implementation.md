# Reddit Sentiment Tracker - Implementation Plan

## Overview
Build a real-time Reddit sentiment tracking system for stock mentions using PRAW (Python Reddit API Wrapper).

---

## Architecture

### Backend Components
```
backend/
├── reddit_tracker.py       # Main Reddit scraping service
├── sentiment_analyzer.py   # NLP sentiment analysis
├── ticker_validator.py     # Validate stock tickers
└── models.py              # Add RedditMention model
```

### New API Endpoints
```python
GET  /reddit/trending              # Top mentioned tickers in last 24h
GET  /reddit/sentiment/{ticker}    # Sentiment for specific ticker
GET  /reddit/mentions/{ticker}     # Recent mentions with posts
GET  /reddit/stats                 # Overall Reddit activity stats
POST /reddit/track/{ticker}        # Add ticker to tracking list
```

### Database Schema
```sql
CREATE TABLE reddit_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker VARCHAR(10) NOT NULL,
    post_id VARCHAR(20) UNIQUE NOT NULL,
    subreddit VARCHAR(50) NOT NULL,
    title TEXT,
    body TEXT,
    score INT,
    num_comments INT,
    sentiment_score FLOAT,  -- -1 to 1 (bearish to bullish)
    created_utc TIMESTAMP,
    permalink TEXT,
    author VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_ticker (ticker),
    INDEX idx_created_utc (created_utc),
    INDEX idx_sentiment (ticker, sentiment_score)
);

CREATE TABLE reddit_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    mention_count INT DEFAULT 0,
    avg_sentiment FLOAT,
    total_score INT,
    total_comments INT,
    UNIQUE(ticker, date)
);
```

---

## Implementation Steps

### Phase 1: Basic Reddit Scraper (Day 1)

**1. Install Dependencies**
```bash
cd /Users/alexkamer/stock-surge
uv add praw asyncpraw textblob vaderSentiment
```

**2. Create Reddit Tracker Service**
File: `/Users/alexkamer/stock-surge/reddit_tracker.py`

Features:
- Connect to Reddit API with PRAW
- Monitor r/wallstreetbets, r/stocks, r/investing
- Extract ticker mentions using regex
- Validate tickers against yfinance
- Store mentions in database
- Real-time streaming

**3. Reddit API Credentials**
Add to `.env`:
```env
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USER_AGENT=stock-surge:v1.0 (by /u/yourusername)
```

### Phase 2: Sentiment Analysis (Day 1-2)

**1. Implement Sentiment Analyzer**
File: `/Users/alexkamer/stock-surge/sentiment_analyzer.py`

Two approaches:
- **VADER** (best for social media text)
- **TextBlob** (general purpose)

**2. Sentiment Scoring**
- Analyze post title + body
- Consider emojis (🚀 = bullish, 💩 = bearish)
- Weight by score and comments
- Generate -1 to 1 sentiment score

### Phase 3: API Endpoints (Day 2)

**1. Add Endpoints to main.py**

```python
@app.get("/reddit/trending")
async def get_trending_tickers(
    timeframe: str = "24h",  # 24h, 7d, 30d
    limit: int = 20
):
    """Get most mentioned tickers"""
    # Return: [{"ticker": "AAPL", "mentions": 156, "sentiment": 0.65}]

@app.get("/reddit/sentiment/{ticker}")
async def get_ticker_sentiment(ticker: str, days: int = 7):
    """Get sentiment history for ticker"""
    # Return: Daily sentiment scores, mention counts

@app.get("/reddit/mentions/{ticker}")
async def get_ticker_mentions(ticker: str, limit: int = 50):
    """Get recent posts mentioning ticker"""
    # Return: Post details with sentiment scores
```

**2. Caching Strategy**
- Trending tickers: 5 minutes
- Sentiment data: 15 minutes
- Individual mentions: 1 hour

### Phase 4: Background Service (Day 2-3)

**1. Continuous Reddit Stream**
Run as background process:
```python
# Background task that runs 24/7
async def reddit_stream_worker():
    while True:
        try:
            # Stream new posts
            # Analyze sentiment
            # Store in database
            # Update stats
        except Exception as e:
            # Log error, retry
```

**2. Process Management**
Options:
- FastAPI background tasks
- Celery worker
- Systemd service
- Docker container

---

## Frontend Components

### Phase 5: Reddit Dashboard (Day 3-4)

**Components to Build:**

**1. TrendingTickersCard.tsx**
- Show top 10 mentioned tickers
- 24h mention count
- Sentiment indicator (bullish/bearish)
- Sparkline of sentiment trend
- Click to view details

**2. SentimentChart.tsx**
- Line chart: Sentiment over time
- Bar chart: Mention volume
- Color coding: Green (bullish), Red (bearish)
- Time range selector (1D, 7D, 30D)

**3. RedditMentionsFeed.tsx**
- List of recent Reddit posts
- Post title, score, comments
- Sentiment badge
- Link to Reddit post
- Subreddit indicator

**4. RedditStatsCards.tsx**
- Total mentions today
- Average sentiment
- Most bullish ticker
- Most bearish ticker

**Frontend Routes:**
```
/reddit                    # Main Reddit dashboard
/reddit/{ticker}          # Ticker-specific Reddit analysis
```

---

## Technical Specifications

### Ticker Extraction Regex
```python
# Match $AAPL or standalone AAPL
TICKER_PATTERN = r'\$([A-Z]{1,5})\b|(?<!\w)([A-Z]{2,5})(?!\w)'

# Blacklist common false positives
BLACKLIST = {
    "CEO", "DD", "IMO", "IPO", "EOD", "FOR", "ALL",
    "NEW", "USA", "ETF", "ATH", "ATL", "PM", "AH"
}
```

### Sentiment Analysis Logic
```python
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

analyzer = SentimentIntensityAnalyzer()

def analyze_sentiment(text: str) -> float:
    """Return sentiment score -1 (bearish) to 1 (bullish)"""
    scores = analyzer.polarity_scores(text)

    # VADER compound score is already -1 to 1
    compound = scores['compound']

    # Boost for rocket emojis
    if '🚀' in text or '📈' in text or 'moon' in text.lower():
        compound = min(compound + 0.2, 1.0)

    # Reduce for bearish indicators
    if '💩' in text or '📉' in text or 'dump' in text.lower():
        compound = max(compound - 0.2, -1.0)

    return compound
```

### Weighted Sentiment Score
```python
def calculate_weighted_sentiment(mentions: list) -> float:
    """Weight sentiment by post engagement"""
    total_weight = 0
    weighted_sum = 0

    for mention in mentions:
        # Weight by score and comments
        weight = mention.score + (mention.num_comments * 2)
        weighted_sum += mention.sentiment_score * weight
        total_weight += weight

    return weighted_sum / total_weight if total_weight > 0 else 0
```

---

## Example API Responses

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
      "top_subreddit": "wallstreetbets",
      "change_24h": "+45%"
    },
    {
      "ticker": "TSLA",
      "mentions": 189,
      "sentiment": -0.34,
      "sentiment_label": "Bearish",
      "avg_score": 89,
      "top_subreddit": "stocks",
      "change_24h": "-12%"
    }
  ],
  "cached": false
}
```

### GET /reddit/sentiment/AAPL
```json
{
  "ticker": "AAPL",
  "current_sentiment": 0.45,
  "mention_count_7d": 456,
  "sentiment_history": [
    {"date": "2024-02-01", "sentiment": 0.52, "mentions": 67},
    {"date": "2024-02-02", "sentiment": 0.48, "mentions": 72}
  ],
  "sentiment_breakdown": {
    "bullish": 245,
    "neutral": 156,
    "bearish": 55
  },
  "top_posts": [
    {
      "title": "AAPL earnings beat expectations 🚀",
      "score": 1247,
      "sentiment": 0.89,
      "subreddit": "wallstreetbets",
      "permalink": "https://reddit.com/r/wallstreetbets/..."
    }
  ]
}
```

### GET /reddit/mentions/TSLA
```json
{
  "ticker": "TSLA",
  "total_mentions": 156,
  "mentions": [
    {
      "post_id": "abc123",
      "title": "TSLA delivery numbers are out",
      "body": "Q1 deliveries exceeded expectations...",
      "score": 892,
      "num_comments": 234,
      "sentiment_score": 0.67,
      "sentiment_label": "Bullish",
      "author": "u/stocktrader123",
      "subreddit": "stocks",
      "created_utc": "2024-02-04T12:34:56Z",
      "permalink": "https://reddit.com/r/stocks/..."
    }
  ]
}
```

---

## UI Design Mockup

### Reddit Dashboard Page
```
┌─────────────────────────────────────────────────────────────┐
│ Reddit Sentiment Tracker                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐│
│  │ Total Mentions  │  │ Avg Sentiment   │  │ Most Bullish ││
│  │     2,456       │  │     +0.45       │  │    NVDA      ││
│  │    📈 +23%      │  │   Bullish       │  │   +0.82      ││
│  └─────────────────┘  └─────────────────┘  └──────────────┘│
│                                                              │
│  Trending Tickers (24h)                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. NVDA    234 mentions    +0.72 🟢  ▲ +45%         │  │
│  │ 2. TSLA    189 mentions    -0.34 🔴  ▼ -12%         │  │
│  │ 3. AAPL    156 mentions    +0.45 🟢  ▲ +8%          │  │
│  │ 4. AMD     134 mentions    +0.61 🟢  ▲ +28%         │  │
│  │ 5. SPY     112 mentions    +0.12 🟡  — 0%           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Sentiment Chart                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         NVDA Sentiment (7 Days)                       │  │
│  │  1.0 ┤                                           ●    │  │
│  │  0.5 ┤                               ●       ●        │  │
│  │  0.0 ┼───────────────────────────────────────────────│  │
│  │ -0.5 ┤                                               │  │
│  │ -1.0 ┤                                               │  │
│  │      └────────────────────────────────────────────  │  │
│  │       1/28  1/29  1/30  1/31  2/1   2/2   2/3      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Recent Mentions                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🟢 +0.89 │ AAPL earnings beat expectations 🚀       │  │
│  │          │ r/wallstreetbets • 1247↑ • 234💬        │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 🔴 -0.45 │ TSLA recalls 10k vehicles                │  │
│  │          │ r/stocks • 456↑ • 89💬                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance Considerations

### Rate Limits
- Reddit API: 60 requests/minute
- Stream ~10-20 posts/minute during peak hours
- Batch process old posts during off-hours

### Database Optimization
- Index on ticker + created_utc
- Partition by date for historical data
- Delete mentions older than 90 days (or archive)

### Caching Strategy
- Trending tickers: 5 min cache
- Individual ticker sentiment: 15 min cache
- Historical data: 1 hour cache

### Background Processing
- Run scraper as separate process
- Use message queue (Redis) for coordination
- Store raw posts, process sentiment async

---

## Testing Plan

### Unit Tests
- Ticker extraction regex
- Sentiment analysis accuracy
- Blacklist filtering

### Integration Tests
- Reddit API connection
- Database writes
- API endpoint responses

### Manual Testing
- Monitor r/wallstreetbets for 1 hour
- Verify sentiment scores match intuition
- Check for false positive tickers

---

## Deployment

### Environment Variables
```env
# Reddit API
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USER_AGENT=stock-surge:v1.0 (by /u/yourusername)

# Subreddits to monitor
REDDIT_SUBREDDITS=wallstreetbets+stocks+investing+StockMarket

# Processing config
REDDIT_MIN_SCORE=10
REDDIT_STREAM_ENABLED=true
```

### Background Service Options

**Option 1: FastAPI Background Task**
```python
@app.on_event("startup")
async def start_reddit_stream():
    asyncio.create_task(reddit_stream_worker())
```

**Option 2: Separate Process**
```bash
python reddit_tracker.py &
```

**Option 3: Systemd Service**
```ini
[Unit]
Description=Stock Surge Reddit Tracker
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/Users/alexkamer/stock-surge
ExecStart=/usr/bin/python3 reddit_tracker.py
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## Future Enhancements

### Phase 2 Features
1. **Comment Sentiment** - Analyze top comments, not just posts
2. **Historical Correlation** - Reddit sentiment vs actual price movement
3. **Alerts** - Notify when ticker mentions spike
4. **Sentiment Divergence** - Detect when Reddit sentiment conflicts with analyst ratings

### Phase 3 Features
1. **Twitter Integration** - Add Twitter/X sentiment
2. **Insider Trading Correlation** - Cross-reference with insider buys/sells
3. **Earnings Prediction** - Use sentiment to predict earnings reactions
4. **Portfolio Sentiment** - Aggregate sentiment for watchlist

---

## Success Metrics

### Technical Metrics
- Process 1000+ Reddit posts per day
- <5 second API response time
- >95% uptime for background scraper

### User Metrics
- Users visit Reddit tab >3x per week
- Average session time >2 minutes
- Users add tickers to watchlist based on Reddit data

### Data Quality
- <5% false positive tickers
- Sentiment accuracy validated against human judgment
- Complete coverage of top financial subreddits

---

## Timeline

**Day 1:**
- Set up Reddit API credentials
- Implement basic scraper with PRAW
- Create ticker extraction and validation
- Store mentions in database

**Day 2:**
- Add sentiment analysis (VADER)
- Create API endpoints
- Test with real data

**Day 3:**
- Build frontend components
- Create Reddit dashboard page
- Integrate with backend API

**Day 4:**
- Background streaming service
- Testing and debugging
- Documentation

**Total: 3-4 days for MVP**

---

This implementation will make Stock Surge the first free stock dashboard with real-time Reddit sentiment analysis - a feature typically only found in premium services!
