# Schwab API - Quick Start Guide

## TL;DR

The Schwab API integration is **fully implemented and ready to use**. Follow these 3 steps to get started:

## 1. Configure Environment

Add to `.env`:
```bash
SCHWAB_APP_KEY=your_app_key
SCHWAB_APP_SECRET=your_app_secret
SCHWAB_DEV_MODE=true
```

## 2. Get OAuth Tokens

Run once to authenticate:
```bash
python get_token.py
```

This creates `tokens.json` (automatically refreshed by the system).

## 3. Start the Server

```bash
cd backend
uv run uvicorn app.main:app --reload
```

## Test Endpoints

```bash
# Single quote
curl http://localhost:8000/api/schwab/quote/AAPL

# Batch quotes
curl "http://localhost:8000/api/schwab/quotes?symbols=AAPL,MSFT,GOOGL"

# Price history
curl "http://localhost:8000/api/schwab/history/AAPL?period=1mo&interval=1d"
```

## Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/schwab/quote/{symbol}` | GET | Real-time quote for single symbol |
| `/api/schwab/quotes?symbols=...` | GET | Batch quotes (comma-separated) |
| `/api/schwab/history/{symbol}` | GET | Historical OHLCV data |

## Key Features

- ✅ **Automatic token refresh** (every 30 minutes)
- ✅ **Redis caching** (30s for quotes, 5min for history)
- ✅ **Rate limiting** (60 requests/minute)
- ✅ **Error handling** (401, 404, 429, 500)
- ✅ **Thread-safe** (concurrent requests supported)
- ✅ **Data normalization** (matches yfinance format)

## Token Management

Tokens refresh automatically. If you need to manually refresh:

```bash
python get_refresh_token.py
```

**Note**: Refresh tokens expire after 7 days. If expired, re-run `python get_token.py`.

## Documentation

- **Setup Guide**: `SCHWAB_API_SETUP.md` (detailed configuration)
- **Implementation**: `SCHWAB_IMPLEMENTATION_SUMMARY.md` (technical details)
- **API Docs**: http://localhost:8000/docs (Swagger UI)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Token file not found" | Run `python get_token.py` |
| "SCHWAB_APP_KEY must be set" | Add credentials to `.env` |
| 401 errors | Run `python get_refresh_token.py` |
| Rate limit (429) | Wait 60 seconds or use batch endpoints |

## Example Response

```json
{
  "symbol": "AAPL",
  "data": {
    "last_price": 276.49,
    "open": 272.31,
    "high": 278.95,
    "low": 272.29,
    "close": 276.49,
    "volume": 90320670,
    "bid": 276.48,
    "ask": 276.50,
    "timestamp": "2026-02-10T12:34:56"
  },
  "cached": false
}
```

## What's Implemented

### Core Components
- ✅ Token Manager (automatic refresh with 5-min buffer)
- ✅ HTTP Client (with retry logic and rate limiting)
- ✅ Service Layer (caching and data normalization)
- ✅ FastAPI Routes (3 endpoints)
- ✅ Pydantic Schemas (request/response validation)
- ✅ Database Model (for future multi-user support)

### Files Created
```
backend/app/schwab/
├── __init__.py
├── token_manager.py    # Token lifecycle
├── client.py           # HTTP client
├── service.py          # Business logic
├── routes.py           # API endpoints
├── schemas.py          # Pydantic models
└── constants.py        # API mappings
```

## Need More Info?

- Full setup: `SCHWAB_API_SETUP.md`
- Implementation details: `SCHWAB_IMPLEMENTATION_SUMMARY.md`
- Interactive docs: http://localhost:8000/docs

**Status**: ✅ Production-ready, fully tested, ready to use!
