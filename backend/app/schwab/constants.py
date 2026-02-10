"""
Constants and mappings for Schwab API
"""

# API Endpoints
SCHWAB_API_BASE_URL = "https://api.schwabapi.com"
SCHWAB_QUOTES_ENDPOINT = "/marketdata/v1/quotes"
SCHWAB_QUOTE_ENDPOINT = "/marketdata/v1/{symbol}/quotes"
SCHWAB_PRICE_HISTORY_ENDPOINT = "/marketdata/v1/pricehistory"

# Period mappings for price history (yfinance format -> Schwab API format)
PERIOD_MAPPINGS = {
    "1d": {"periodType": "day", "period": 1},
    "5d": {"periodType": "day", "period": 5},
    "1mo": {"periodType": "month", "period": 1},
    "3mo": {"periodType": "month", "period": 3},
    "6mo": {"periodType": "month", "period": 6},
    "1y": {"periodType": "year", "period": 1},
    "2y": {"periodType": "year", "period": 2},
    "5y": {"periodType": "year", "period": 5},
    "10y": {"periodType": "year", "period": 10},
    "ytd": {"periodType": "ytd", "period": 1},
    "max": {"periodType": "year", "period": 20},
}

# Frequency mappings (yfinance format -> Schwab API format)
FREQUENCY_MAPPINGS = {
    "1m": {"frequencyType": "minute", "frequency": 1},
    "2m": {"frequencyType": "minute", "frequency": 2},
    "5m": {"frequencyType": "minute", "frequency": 5},
    "15m": {"frequencyType": "minute", "frequency": 15},
    "30m": {"frequencyType": "minute", "frequency": 30},
    "60m": {"frequencyType": "minute", "frequency": 60},
    "90m": {"frequencyType": "minute", "frequency": 90},
    "1h": {"frequencyType": "minute", "frequency": 60},
    "1d": {"frequencyType": "daily", "frequency": 1},
    "5d": {"frequencyType": "daily", "frequency": 5},
    "1wk": {"frequencyType": "weekly", "frequency": 1},
    "1mo": {"frequencyType": "monthly", "frequency": 1},
}
