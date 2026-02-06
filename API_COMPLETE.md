# Stock Surge API - Complete Endpoint Reference

## Base URL
```
http://localhost:8000
```

## Interactive Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 📊 Core Stock Data (Fast & Essential)

### `GET /stock/{ticker}/price`
Get current real-time price data (optimized for speed).
- **Cache**: 30 seconds
- **Rate Limit**: 60/minute
- **Returns**: Current price, open, high, low, volume, market cap

### `GET /stock/{ticker}/info`
Get comprehensive company information.
- **Cache**: 5 minutes
- **Rate Limit**: 30/minute
- **Returns**: Company name, sector, industry, description, website, key metrics

### `GET /stock/{ticker}/history`
Get historical OHLCV data.
- **Cache**: Variable (1min-30min based on interval)
- **Rate Limit**: 30/minute
- **Params**: `period` (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max), `interval` (1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo)
- **Returns**: Historical price and volume data

---

## 📈 Financial Statements

### Income Statement
- `GET /stock/{ticker}/financials/income?frequency=yearly` - Annual income statement
- `GET /stock/{ticker}/financials/income?frequency=quarterly` - Quarterly income statement
- `GET /stock/{ticker}/financials/income?frequency=ttm` - Trailing twelve months

### Balance Sheet
- `GET /stock/{ticker}/financials/balance-sheet?frequency=yearly` - Annual balance sheet
- `GET /stock/{ticker}/financials/balance-sheet?frequency=quarterly` - Quarterly balance sheet

### Cash Flow
- `GET /stock/{ticker}/financials/cash-flow?frequency=yearly` - Annual cash flow
- `GET /stock/{ticker}/financials/cash-flow?frequency=quarterly` - Quarterly cash flow
- `GET /stock/{ticker}/financials/cash-flow?frequency=ttm` - Trailing twelve months

**Cache**: 6 hours | **Rate Limit**: 20/minute

---

## 💰 Dividends & Corporate Actions

### `GET /stock/{ticker}/dividends`
Get dividend history.
- **Cache**: 1 hour
- **Rate Limit**: 30/minute

### `GET /stock/{ticker}/splits`
Get stock split history.
- **Cache**: 1 hour
- **Rate Limit**: 30/minute

### `GET /stock/{ticker}/actions`
Get all corporate actions (dividends + splits).
- **Cache**: 1 hour
- **Rate Limit**: 30/minute

### `GET /stock/{ticker}/capital-gains`
Get capital gains data (primarily for funds).
- **Cache**: 24 hours
- **Rate Limit**: 30/minute

---

## 📊 Analyst Data & Recommendations

### `GET /stock/{ticker}/recommendations`
Get detailed analyst recommendations history.
- **Cache**: 1 hour
- **Rate Limit**: 30/minute
- **Returns**: Buy/hold/sell ratings over time

### `GET /stock/{ticker}/recommendations-summary`
Get aggregated summary of analyst recommendations.
- **Cache**: 1 hour
- **Rate Limit**: 30/minute
- **Returns**: Count of strong buy, buy, hold, sell, strong sell

### `GET /stock/{ticker}/analyst-price-targets`
Get analyst price targets (current, low, high, median).
- **Cache**: 1 hour
- **Rate Limit**: 30/minute

### `GET /stock/{ticker}/upgrades-downgrades`
Get analyst upgrades and downgrades history.
- **Cache**: 1 hour
- **Rate Limit**: 30/minute

---

## 📉 Earnings Data

### Current & Historical Earnings
- `GET /stock/{ticker}/earnings` - Annual earnings history
- `GET /stock/{ticker}/quarterly-earnings` - Quarterly earnings
- `GET /stock/{ticker}/earnings-dates` - Upcoming and historical earnings dates
- `GET /stock/{ticker}/earnings-history` - Actual vs estimates with surprise %

### Earnings Estimates
- `GET /stock/{ticker}/earnings-estimate` - EPS estimates for current/future periods
- `GET /stock/{ticker}/revenue-estimate` - Revenue estimates
- `GET /stock/{ticker}/eps-trend` - How EPS estimates changed over time (7/30/60/90 days)
- `GET /stock/{ticker}/eps-revisions` - Upward/downward revision counts
- `GET /stock/{ticker}/growth-estimates` - Growth projections vs industry/sector/market

**Cache**: 6 hours | **Rate Limit**: 30/minute

---

## 👥 Ownership & Insider Trading

### Holders
- `GET /stock/{ticker}/institutional-holders` - Institutional ownership
- `GET /stock/{ticker}/major-holders` - Major shareholders breakdown
- `GET /stock/{ticker}/mutualfund-holders` - Mutual fund ownership

### Insider Trading
- `GET /stock/{ticker}/insider-transactions` - All insider trades (buys & sells)
- `GET /stock/{ticker}/insider-purchases` - Insider buy transactions only
- `GET /stock/{ticker}/insider-roster` - Company insiders list with positions

**Cache**: 24 hours | **Rate Limit**: 30/minute

---

## 📰 News & Calendar

### `GET /stock/{ticker}/news?count=10`
Get recent news articles.
- **Cache**: 15 minutes
- **Rate Limit**: 40/minute
- **Params**: `count` (default: 10)

### `GET /stock/{ticker}/calendar`
Get upcoming events calendar (earnings, dividends, etc.).
- **Cache**: 6 hours
- **Rate Limit**: 30/minute

---

## 🎯 Options Trading

### `GET /stock/{ticker}/options`
Get available option expiration dates.
- **Cache**: 1 hour
- **Rate Limit**: 30/minute

### `GET /stock/{ticker}/option-chain?date=YYYY-MM-DD`
Get options chain data for specific expiration.
- **Cache**: 5 minutes
- **Rate Limit**: 30/minute
- **Returns**: Calls and puts with strike, bid, ask, volume, OI, IV

---

## 🌱 ESG & Compliance

### `GET /stock/{ticker}/sustainability`
Get ESG ratings and sustainability metrics.
- **Cache**: 24 hours
- **Rate Limit**: 30/minute

### `GET /stock/{ticker}/sec-filings`
Get recent SEC filings (10-K, 10-Q, 8-K, etc.).
- **Cache**: 6 hours
- **Rate Limit**: 30/minute

---

## 🔢 Share Count & Metadata

### `GET /stock/{ticker}/shares`
Get share count over time.
- **Cache**: 24 hours
- **Rate Limit**: 30/minute

### `GET /stock/{ticker}/shares-full`
Get detailed share count data (more comprehensive).
- **Cache**: 24 hours
- **Rate Limit**: 20/minute
- **Note**: Slower to fetch

### `GET /stock/{ticker}/isin`
Get ISIN (International Securities Identification Number).
- **Cache**: 24 hours
- **Rate Limit**: 30/minute

### `GET /stock/{ticker}/history-metadata`
Get metadata about historical data (timezone, currency, etc.).
- **Cache**: 24 hours
- **Rate Limit**: 30/minute

---

## 💼 Fund-Specific Data

### `GET /stock/{ticker}/funds-data`
Get mutual fund specific data (fund family, category, etc.).
- **Cache**: 24 hours
- **Rate Limit**: 30/minute
- **Note**: Only works for mutual fund tickers

---

## 🔄 Batch Operations

### `POST /stock/batch/history`
Get historical data for multiple tickers efficiently (uses threading).
- **Cache**: 30 minutes
- **Rate Limit**: 10/minute
- **Body**: `{"tickers": ["AAPL", "MSFT"], "period": "1mo", "interval": "1d"}`
- **Max**: 50 tickers per request

### `POST /tickers/news`
Get news for multiple tickers at once.
- **Cache**: 15 minutes
- **Rate Limit**: 30/minute
- **Body**: `{"tickers": ["AAPL", "MSFT", "GOOGL"]}`
- **Max**: 20 tickers

### `POST /tickers/history`
Get historical data using yfinance.Tickers class.
- **Cache**: 30 minutes
- **Rate Limit**: 10/minute
- **Body**: `{"tickers": ["AAPL", "MSFT"], "period": "1mo", "interval": "1d"}`
- **Max**: 50 tickers

### `GET /tickers/compare?tickers=AAPL,MSFT,GOOGL&period=1mo&interval=1d`
Compare multiple tickers side-by-side.
- **Cache**: 5 minutes
- **Rate Limit**: 20/minute
- **Max**: 10 tickers
- **Returns**: Historical data + current price + performance metrics

---

## 🔐 Authentication Endpoints

### `POST /auth/register`
Register new user account.
- **Rate Limit**: 5/minute
- **Body**: `{"email": "user@example.com", "password": "password123", "name": "John Doe"}`

### `POST /auth/login`
Login with email and password.
- **Rate Limit**: 10/minute
- **Body**: Form data with `username` (email) and `password`
- **Returns**: Access token (30 min) + refresh token (7 days)

### `POST /auth/refresh`
Refresh access token.
- **Rate Limit**: 20/minute
- **Body**: `{"refresh_token": "..."}`

### `GET /auth/me`
Get current authenticated user.
- **Requires**: Authorization header with Bearer token

---

## 👤 User Data Endpoints (Protected)

All require authentication via Authorization header.

### Watchlist
- `GET /user/watchlist` - Get user's saved watchlist
- `POST /user/watchlist` - Add ticker to watchlist
  - Body: `{"ticker": "AAPL", "position": 0}`
- `DELETE /user/watchlist/{ticker}` - Remove from watchlist

### Preferences
- `GET /user/preferences` - Get user preferences (theme, chart settings)
- `PUT /user/preferences` - Update user preferences
  - Body: `{"theme": "dark", "chart_type": "candlestick", "default_period": "1mo"}`

**Rate Limit**: 60/minute

---

## 🔴 Real-time WebSocket

### `WS /ws/live/{tickers}`
Real-time price streaming via WebSocket.
- **Usage**: `ws://localhost:8000/ws/live/AAPL,MSFT,GOOGL`
- **Max**: 20 tickers
- **Update Frequency**: Every 5 seconds (polling)
- **Returns**: Live price updates as JSON

---

## 📊 Response Format

All endpoints return JSON with this structure:

```json
{
  "ticker": "AAPL",
  "data": { ... },
  "cached": false
}
```

Some endpoints may include a `message` field for additional info.

---

## ⚡ Performance Tips

1. **Use batch endpoints** for multiple tickers instead of individual requests
2. **Leverage caching** - repeated requests within cache TTL are instant
3. **Use appropriate intervals** - Don't request 1m data for 1-year periods
4. **Enable Redis** for distributed caching (currently using in-memory fallback)
5. **Monitor rate limits** - displayed in API docs for each endpoint

---

## 🐛 Error Codes

- `400` - Bad request (invalid parameters)
- `401` - Unauthorized (invalid/expired token)
- `404` - Ticker not found or no data available
- `429` - Rate limit exceeded (check Retry-After header)
- `500` - Server error (yfinance error or internal issue)

---

## 📝 Notes

- All ticker symbols are automatically converted to uppercase
- Timestamps are in ISO 8601 format
- Financial data may be `null` for some tickers
- Cache TTLs vary based on data volatility (prices: 30s, financials: 6h, ownership: 24h)
- Rate limits are per IP address

---

## 🎯 Total Endpoints

- **Stock Data**: 43 endpoints
- **Authentication**: 4 endpoints
- **User Data**: 5 endpoints
- **Batch Operations**: 3 endpoints
- **Real-time**: 1 WebSocket endpoint

**Total**: 56 endpoints covering all yfinance capabilities!

---

## 🚀 Next Steps

With all yfinance data available via API, you can now:
1. Build comprehensive stock detail pages
2. Create financial analysis dashboards
3. Show analyst consensus and price targets
4. Display insider trading activity
5. Visualize earnings trends
6. Compare multiple stocks side-by-side
7. Track ESG scores
8. Monitor options activity

The backend is complete! Ready to build an amazing frontend! 📈
