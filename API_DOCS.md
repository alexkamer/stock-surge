# Stock Surge API Documentation

## Base URL
`http://localhost:8000`

## Features
- ✅ **Response Models**: All endpoints now show expected response formats in `/docs`
- ✅ **Rate Limiting**: Automatic rate limiting per endpoint
- ✅ **Caching**: Smart caching with TTL based on data type
- ✅ **Real-time Streaming**: WebSocket support for live price updates
- ✅ **Auto-Reload**: Development server auto-reloads on file changes

---

## Core Endpoints

### GET `/stock/{ticker}/price`
Get current price using fast_info (optimized for speed).

**Rate Limit**: 60/minute
**Cache TTL**: 30 seconds

**Response Example**:
```json
{
  "ticker": "AAPL",
  "data": {
    "last_price": 276.49,
    "open": 272.31,
    "day_high": 278.95,
    "day_low": 272.29,
    "previous_close": 270.0,
    "volume": 90320670,
    "currency": "USD",
    "exchange": "NMS",
    "market_cap": 4063829416205.57,
    "timestamp": "2026-02-04T17:31:55.417515"
  },
  "cached": false
}
```

### GET `/stock/{ticker}/info`
Get comprehensive company information.

**Rate Limit**: 30/minute
**Cache TTL**: 5 minutes

**Response Example**:
```json
{
  "ticker": "AAPL",
  "data": {
    "name": "Apple Inc.",
    "symbol": "AAPL",
    "sector": "Technology",
    "industry": "Consumer Electronics",
    "description": "Apple Inc. designs, manufactures...",
    "website": "https://www.apple.com",
    "market_cap": 4063829426176,
    "pe_ratio": 34.998734,
    "forward_pe": 29.799831,
    "dividend_yield": 0.0039,
    "beta": 1.107,
    "52_week_high": 288.62,
    "52_week_low": 169.21,
    "employees": 150000,
    "country": "United States",
    "city": "Cupertino"
  },
  "cached": false
}
```

### GET `/stock/{ticker}/history?period=1mo&interval=1d`
Get historical OHLCV data.

**Parameters**:
- `period`: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
- `interval`: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo

**Rate Limit**: 30/minute
**Cache TTL**: Variable (1 min for intraday, 30 min for daily+)

**Response Example**:
```json
{
  "ticker": "AAPL",
  "data": {
    "period": "5d",
    "interval": "1d",
    "count": 5,
    "data": [
      {
        "date": "2026-02-04T00:00:00-05:00",
        "open": 272.31,
        "high": 278.95,
        "low": 272.29,
        "close": 276.49,
        "volume": 90320670
      }
    ]
  },
  "cached": false
}
```

---

## Corporate Actions

### GET `/stock/{ticker}/dividends`
Get dividend payment history.

**Rate Limit**: 30/minute
**Cache TTL**: 1 hour

**Response Example**:
```json
{
  "ticker": "AAPL",
  "data": [
    {
      "date": "2025-11-10T00:00:00-05:00",
      "amount": 0.26
    },
    {
      "date": "2025-08-11T00:00:00-04:00",
      "amount": 0.26
    }
  ],
  "cached": false
}
```

### GET `/stock/{ticker}/splits`
Get stock split history.

### GET `/stock/{ticker}/actions`
Get all corporate actions (dividends + splits combined).

---

## Financial Statements

### GET `/stock/{ticker}/financials/income?frequency=yearly`
Get income statement (yearly/quarterly/ttm).

**Rate Limit**: 20/minute
**Cache TTL**: 6 hours

**Response Example**:
```json
{
  "ticker": "AAPL",
  "frequency": "yearly",
  "data": {
    "Total Revenue": {
      "2025-09-30": 416161000000.0,
      "2024-09-30": 391035000000.0,
      "2023-09-30": 383285000000.0
    },
    "Net Income": {
      "2025-09-30": 112010000000.0,
      "2024-09-30": 93736000000.0,
      "2023-09-30": 96995000000.0
    }
  },
  "cached": false
}
```

### GET `/stock/{ticker}/financials/balance-sheet?frequency=yearly`
Get balance sheet (yearly/quarterly).

### GET `/stock/{ticker}/financials/cash-flow?frequency=yearly`
Get cash flow statement (yearly/quarterly/ttm).

---

## Analyst Data

### GET `/stock/{ticker}/recommendations`
Get analyst buy/hold/sell ratings.

**Response Example**:
```json
{
  "ticker": "AAPL",
  "data": [
    {
      "period": "0m",
      "strongBuy": 6,
      "buy": 23,
      "hold": 16,
      "sell": 1,
      "strongSell": 1
    }
  ],
  "cached": false
}
```

### GET `/stock/{ticker}/analyst-price-targets`
Get analyst price targets.

**Response Example**:
```json
{
  "ticker": "AAPL",
  "data": {
    "current": 276.49,
    "high": 350.0,
    "low": 205.0,
    "mean": 292.46,
    "median": 300.0
  },
  "cached": false
}
```

### GET `/stock/{ticker}/earnings`
Get historical earnings.

### GET `/stock/{ticker}/earnings-dates`
Get upcoming and past earnings dates.

---

## Ownership

### GET `/stock/{ticker}/institutional-holders`
Get institutional ownership data.

**Rate Limit**: 30/minute
**Cache TTL**: 24 hours

### GET `/stock/{ticker}/major-holders`
Get major shareholders breakdown.

---

## News & Events

### GET `/stock/{ticker}/news?count=10`
Get recent news articles.

**Rate Limit**: 40/minute
**Cache TTL**: 15 minutes

### GET `/stock/{ticker}/calendar`
Get events calendar (earnings, dividends, etc.).

**Response Example**:
```json
{
  "ticker": "AAPL",
  "data": {
    "Dividend Date": "2025-11-12",
    "Ex-Dividend Date": "2026-02-08",
    "Earnings Date": ["2026-04-30"],
    "Earnings High": 2.16,
    "Earnings Low": 1.83,
    "Earnings Average": 1.94092
  },
  "cached": false
}
```

---

## Multi-Ticker Operations (Tickers Class)

### POST `/tickers/history`
Get historical data for multiple tickers (uses yfinance Tickers class).

**Rate Limit**: 10/minute
**Cache TTL**: 30 minutes
**Max Tickers**: 50

**Request Body**:
```json
{
  "tickers": ["AAPL", "MSFT"],
  "period": "1mo",
  "interval": "1d"
}
```

**Response Example**:
```json
{
  "tickers": ["AAPL", "MSFT"],
  "data": {
    "period": "1mo",
    "interval": "1d",
    "data": {
      "AAPL": [
        {
          "date": "2026-02-04T00:00:00",
          "open": 272.31,
          "high": 278.95,
          "low": 272.29,
          "close": 276.49,
          "volume": 90320670
        }
      ],
      "MSFT": [...]
    }
  },
  "cached": false
}
```

### POST `/tickers/news`
Get news for multiple tickers.

**Rate Limit**: 30/minute
**Max Tickers**: 20

**Request Body**:
```json
{
  "tickers": ["AAPL", "MSFT", "GOOGL"]
}
```

### GET `/tickers/compare?tickers=AAPL,MSFT,GOOGL&period=1mo`
Compare multiple tickers side-by-side.

**Rate Limit**: 20/minute
**Cache TTL**: 5 minutes
**Max Tickers**: 10

**Response Example**:
```json
{
  "tickers": ["AAPL", "MSFT"],
  "period": "1mo",
  "data": {
    "AAPL": {
      "current_price": 276.49,
      "market_cap": 4063829416205.57,
      "currency": "USD",
      "period_return_pct": 7.05,
      "period_high": 278.95,
      "period_low": 252.18,
      "avg_volume": 77665034,
      "52_week_high": 288.62,
      "52_week_low": 169.21,
      "history": [
        {"date": "2026-02-04T00:00:00", "close": 276.49}
      ]
    },
    "MSFT": {...}
  },
  "cached": false
}
```

---

## Real-Time Streaming (WebSocket)

### WS `/ws/live/{tickers}`
Real-time price streaming via WebSocket.

**Connection**: `ws://localhost:8000/ws/live/AAPL,MSFT,GOOGL`
**Max Tickers**: 20
**Update Interval**: ~5 seconds

**Connection Message**:
```json
{
  "status": "connected",
  "tickers": ["AAPL", "MSFT"],
  "message": "Live price stream started"
}
```

**Price Update Message**:
```json
{
  "id": "AAPL",
  "price": 276.49,
  "currency": "USD",
  "exchange": "NMS",
  "market_cap": 4063829416205.57,
  "volume": 90320670,
  "timestamp": "2026-02-04T18:12:14.921767"
}
```

**Example Client (Python)**:
```python
import asyncio
import websockets
import json

async def stream_prices():
    uri = "ws://localhost:8000/ws/live/AAPL,MSFT"
    async with websockets.connect(uri) as ws:
        while True:
            message = await ws.recv()
            data = json.loads(message)
            print(f"{data['id']}: ${data['price']:.2f}")

asyncio.run(stream_prices())
```

**Example Client (JavaScript)**:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/live/AAPL,MSFT');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`${data.id}: $${data.price.toFixed(2)}`);
};
```

---

## Batch Operations

### POST `/stock/batch/history`
Batch historical data using yf.download() with threading.

**Rate Limit**: 10/minute
**Cache TTL**: 30 minutes
**Max Tickers**: 50

Similar to `/tickers/history` but uses `yf.download()` instead of `Tickers.history()`.

---

## Interactive Documentation

Visit **http://localhost:8000/docs** for:
- Interactive API testing (Swagger UI)
- Request/response examples for all endpoints
- Schema definitions
- Try out endpoints directly in the browser

Alternative docs: **http://localhost:8000/redoc**

---

## Error Responses

All endpoints return standard error formats:

**404 - Not Found**:
```json
{
  "detail": "Ticker INVALID not found or delisted"
}
```

**429 - Rate Limit Exceeded**:
```json
{
  "detail": "Rate limit exceeded. Please try again later."
}
```

**500 - Internal Server Error**:
```json
{
  "detail": "Error fetching data: <error message>"
}
```

---

## Development Notes

- **Auto-Reload**: Server automatically reloads on file changes
- **Redis Optional**: Falls back to in-memory cache if Redis unavailable
- **Rate Limiting**: Enforced per IP address
- **CORS**: Enabled for all origins (update for production)
- **yfinance Config**: Auto-retry enabled (2 retries for transient errors)

---

## Quick Start

```bash
# Start the server
uv run main.py

# Visit interactive docs
open http://localhost:8000/docs

# Test an endpoint
curl http://localhost:8000/stock/AAPL/price

# Test WebSocket (Python)
uv run test_websocket.py
```
