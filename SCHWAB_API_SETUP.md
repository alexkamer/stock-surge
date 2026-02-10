# Schwab API Integration Setup Guide

This guide covers setting up and using the Schwab API integration in Stock Surge.

## Prerequisites

1. Schwab Developer Account with API credentials
2. Valid OAuth tokens (access token and refresh token)
3. Python 3.12+ with all dependencies installed

## Environment Configuration

Add the following to your `.env` file:

```bash
# Schwab API Credentials
SCHWAB_APP_KEY=your_app_key_here
SCHWAB_APP_SECRET=your_app_secret_here

# Optional: OAuth redirect URI (default: https://127.0.0.1)
SCHWAB_REDIRECT_URI=https://127.0.0.1

# Development mode: use tokens.json (default: true)
SCHWAB_DEV_MODE=true
```

## Initial OAuth Flow

Before using the API, you need to obtain OAuth tokens:

1. Run the initial OAuth flow (using existing scripts):
```bash
python get_token.py
```

2. This will create a `tokens.json` file in the project root with:
```json
{
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 1800,
    "token_type": "Bearer",
    "scope": "api"
}
```

## Starting the Server

Start the FastAPI server:

```bash
cd backend
uv run uvicorn app.main:app --reload
```

The server will start on `http://localhost:8000`

## API Endpoints

### 1. Get Single Quote

Get real-time quote data for a single symbol:

```bash
curl http://localhost:8000/api/schwab/quote/AAPL
```

Response:
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
    "bid_size": 100,
    "ask_size": 100,
    "timestamp": "2026-02-10T12:34:56.789"
  },
  "cached": false
}
```

### 2. Get Batch Quotes

Get quotes for multiple symbols in one request:

```bash
curl "http://localhost:8000/api/schwab/quotes?symbols=AAPL,MSFT,GOOGL"
```

Response:
```json
{
  "quotes": {
    "AAPL": { /* quote data */ },
    "MSFT": { /* quote data */ },
    "GOOGL": { /* quote data */ }
  },
  "cached": false
}
```

### 3. Get Price History

Get historical OHLCV data:

```bash
curl "http://localhost:8000/api/schwab/history/AAPL?period=1mo&interval=1d"
```

Response:
```json
{
  "symbol": "AAPL",
  "data": {
    "period": "1mo",
    "interval": "1d",
    "count": 20,
    "data": [
      {
        "date": "2026-02-04T00:00:00-05:00",
        "open": 272.31,
        "high": 278.95,
        "low": 272.29,
        "close": 276.49,
        "volume": 90320670
      }
      // ... more candles
    ]
  },
  "cached": false
}
```

### Supported Parameters

**Period options:**
- `1d`, `5d`, `1mo`, `3mo`, `6mo`, `1y`, `2y`, `5y`, `10y`, `ytd`, `max`

**Interval options:**
- `1m`, `5m`, `15m`, `30m`, `1h`, `1d`, `1wk`, `1mo`

## Token Management

The integration handles token lifecycle automatically:

- **Automatic Refresh**: Tokens are refreshed automatically when they expire (every 30 minutes)
- **Thread-Safe**: Token refresh is protected by locks for concurrent requests
- **Error Handling**: Clear error messages when tokens expire or authentication fails

### Manual Token Refresh

To manually refresh tokens (useful for testing):

```bash
python get_refresh_token.py
```

### Token Expiry

- Access tokens expire every 30 minutes (1800 seconds)
- Refresh tokens last 7 days
- The system refreshes access tokens automatically with a 5-minute buffer

## Caching

Data is cached in Redis with the following TTLs:

- **Quotes**: 30 seconds (real-time data)
- **Price History**: 5 minutes (historical data)

Cache keys:
- Single quote: `schwab:quote:AAPL`
- Batch quotes: `schwab:quotes:AAPL,GOOGL,MSFT`
- History: `schwab:history:AAPL:1mo:1d`

## Error Handling

The API returns standard HTTP status codes:

- `200`: Success
- `400`: Invalid parameters (bad period/interval)
- `401`: Authentication error (token expired or invalid)
- `404`: Symbol not found
- `429`: Rate limit exceeded (includes `Retry-After` header)
- `500`: Server error

Example error response:
```json
{
  "detail": "Symbol XYZ not found"
}
```

## Rate Limiting

All endpoints are rate-limited to **60 requests per minute** per IP address.

When rate limit is exceeded:
- Status: `429 Too Many Requests`
- Header: `Retry-After: 60` (seconds)

## Testing

### Test Token Management

1. Load tokens from file:
```python
from backend.app.schwab.token_manager import get_token_manager

tm = get_token_manager()
token = tm.get_valid_token()
print(f"Token: {tm.mask_token(token)}")
```

2. Test token refresh by modifying `tokens.json` expiry:
```bash
# Edit tokens.json and set expires_in to a small value
# Then make an API request - it should auto-refresh
curl http://localhost:8000/api/schwab/quote/AAPL
```

### Test API Endpoints

```bash
# Test single quote
curl -i http://localhost:8000/api/schwab/quote/AAPL

# Test batch quotes
curl -i "http://localhost:8000/api/schwab/quotes?symbols=AAPL,MSFT"

# Test price history
curl -i "http://localhost:8000/api/schwab/history/AAPL?period=1mo&interval=1d"

# Test invalid symbol (should return 404)
curl -i http://localhost:8000/api/schwab/quote/INVALID

# Test cache (second request should be faster and return cached=true)
curl http://localhost:8000/api/schwab/quote/AAPL
curl http://localhost:8000/api/schwab/quote/AAPL
```

## Monitoring

Check logs for token refresh events:

```bash
# Start server with logs
cd backend
uv run uvicorn app.main:app --reload

# In logs, look for:
# - "Schwab tokens loaded from file"
# - "Refreshing Schwab access token"
# - "Schwab token refreshed successfully"
```

## Troubleshooting

### Issue: "Token file not found"
**Solution**: Run `python get_token.py` to initialize OAuth flow

### Issue: "Refresh token expired"
**Solution**: Refresh tokens last 7 days. Run `python get_token.py` to get new tokens

### Issue: "SCHWAB_APP_KEY must be set"
**Solution**: Add `SCHWAB_APP_KEY` and `SCHWAB_APP_SECRET` to `.env` file

### Issue: 401 errors on every request
**Solution**:
1. Check if tokens.json exists and has valid tokens
2. Verify environment variables are loaded
3. Try manually refreshing: `python get_refresh_token.py`

### Issue: Rate limit errors
**Solution**:
- Schwab API has rate limits - wait for the `Retry-After` period
- Use batch endpoints (`/quotes`) instead of multiple single requests
- Leverage caching to reduce API calls

## Production Deployment

For production, switch to database-backed token storage:

1. Run database migrations to create `schwab_tokens` table
2. Set `SCHWAB_DEV_MODE=false` in environment
3. Implement user-specific OAuth flow
4. Store tokens per user in database with encryption

## API Documentation

Full interactive API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Security Notes

- Never commit `tokens.json` to version control (already in `.gitignore`)
- Never log full tokens - use `mask_token()` helper
- Set file permissions on `tokens.json`: `chmod 600 tokens.json`
- Use HTTPS in production
- Rotate API credentials regularly
