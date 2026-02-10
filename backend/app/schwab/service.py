"""
Business logic layer for Schwab API
Handles caching, data normalization, and transformation
"""

from typing import Dict, List, Any
from datetime import datetime
from loguru import logger

from .client import get_schwab_client, SchwabAPIError
from .constants import PERIOD_MAPPINGS, FREQUENCY_MAPPINGS
from ..utils.cache import get_cached_data, set_cached_data
from ..config import CACHE_TTL_SHORT, CACHE_TTL_MEDIUM
from ..utils.helpers import format_timestamp


def get_schwab_quote(symbol: str) -> Dict[str, Any]:
    """
    Get real-time quote for a single symbol with caching

    Args:
        symbol: Stock ticker symbol

    Returns:
        Dictionary with quote data and cache status
        Format: {"data": {...}, "cached": bool}

    Raises:
        SchwabAPIError: If API call fails
    """
    # Check cache first
    cache_key = f"schwab:quote:{symbol.upper()}"
    cached = get_cached_data(cache_key)
    if cached:
        return {"data": cached, "cached": True}

    # Fetch from Schwab API
    client = get_schwab_client()
    raw_quote = client.get_quote(symbol)

    # Normalize to match yfinance format
    normalized = _normalize_quote(raw_quote)

    # Cache for 30 seconds (real-time data)
    set_cached_data(cache_key, normalized, CACHE_TTL_SHORT)

    return {"data": normalized, "cached": False}


def get_schwab_quotes(symbols: List[str]) -> Dict[str, Any]:
    """
    Get real-time quotes for multiple symbols with caching

    Args:
        symbols: List of stock ticker symbols

    Returns:
        Dictionary with quotes data and cache status
        Format: {"data": {symbol: quote_data}, "cached": bool}

    Raises:
        SchwabAPIError: If API call fails
    """
    # Normalize symbols to uppercase
    symbols = [s.upper() for s in symbols]

    # Check cache for all symbols
    cache_key = f"schwab:quotes:{','.join(sorted(symbols))}"
    cached = get_cached_data(cache_key)
    if cached:
        return {"data": cached, "cached": True}

    # Fetch from Schwab API
    client = get_schwab_client()
    raw_quotes = client.get_quotes(symbols)

    # Normalize all quotes
    normalized_quotes = {}
    for symbol, raw_quote in raw_quotes.items():
        normalized_quotes[symbol] = _normalize_quote(raw_quote)

    # Cache for 30 seconds
    set_cached_data(cache_key, normalized_quotes, CACHE_TTL_SHORT)

    return {"data": normalized_quotes, "cached": False}


def get_schwab_price_history(
    symbol: str,
    period: str = "1mo",
    interval: str = "1d"
) -> Dict[str, Any]:
    """
    Get historical price data with caching

    Args:
        symbol: Stock ticker symbol
        period: Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
        interval: Data interval (1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo)

    Returns:
        Dictionary with history data and cache status
        Format: {"data": {...}, "cached": bool}

    Raises:
        SchwabAPIError: If API call fails
        ValueError: If period or interval is invalid
    """
    # Check cache first
    cache_key = f"schwab:history:{symbol.upper()}:{period}:{interval}"
    cached = get_cached_data(cache_key)
    if cached:
        return {"data": cached, "cached": True}

    # Map period and interval to Schwab API format
    if period not in PERIOD_MAPPINGS:
        raise ValueError(f"Invalid period: {period}. Valid options: {list(PERIOD_MAPPINGS.keys())}")

    if interval not in FREQUENCY_MAPPINGS:
        raise ValueError(f"Invalid interval: {interval}. Valid options: {list(FREQUENCY_MAPPINGS.keys())}")

    period_params = PERIOD_MAPPINGS[period]
    frequency_params = FREQUENCY_MAPPINGS[interval]

    # Fetch from Schwab API
    client = get_schwab_client()
    raw_history = client.get_price_history(
        symbol=symbol.upper(),
        period_type=period_params["periodType"],
        period=period_params["period"],
        frequency_type=frequency_params["frequencyType"],
        frequency=frequency_params["frequency"]
    )

    # Normalize to match yfinance format
    normalized = _normalize_price_history(raw_history, period, interval)

    # Cache for 5 minutes
    set_cached_data(cache_key, normalized, CACHE_TTL_MEDIUM)

    return {"data": normalized, "cached": False}


def _normalize_quote(raw_quote: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize Schwab quote data to match yfinance format

    Args:
        raw_quote: Raw quote data from Schwab API

    Returns:
        Normalized quote dictionary matching yfinance PriceData format
    """
    # Schwab API returns nested structure with quote and reference sections
    quote_data = raw_quote.get("quote", {})
    reference_data = raw_quote.get("reference", {})

    return {
        "last_price": quote_data.get("lastPrice"),
        "open": quote_data.get("openPrice"),
        "day_high": quote_data.get("highPrice"),
        "day_low": quote_data.get("lowPrice"),
        "previous_close": quote_data.get("closePrice"),
        "volume": quote_data.get("totalVolume"),
        "currency": "USD",  # Schwab API primarily trades in USD
        "exchange": reference_data.get("exchangeName", ""),
        "market_cap": None,  # Not provided in quote endpoint, would need additional call
        "timestamp": format_timestamp()
    }


def _normalize_price_history(
    raw_history: Dict[str, Any],
    period: str,
    interval: str
) -> Dict[str, Any]:
    """
    Normalize Schwab price history to match yfinance format

    Args:
        raw_history: Raw history data from Schwab API
        period: Requested period
        interval: Requested interval

    Returns:
        Normalized history dictionary
    """
    # Schwab API history structure (example):
    # {
    #   "candles": [
    #     {
    #       "datetime": 1738627200000,  # Unix timestamp in milliseconds
    #       "open": 272.31,
    #       "high": 278.95,
    #       "low": 272.29,
    #       "close": 276.49,
    #       "volume": 90320670
    #     },
    #     ...
    #   ],
    #   "symbol": "AAPL"
    # }

    candles = raw_history.get("candles", [])

    # Convert candles to yfinance format
    history_data = []
    for candle in candles:
        # Convert timestamp from milliseconds to datetime
        timestamp_ms = candle.get("datetime", 0)
        dt = datetime.fromtimestamp(timestamp_ms / 1000)

        history_data.append({
            "date": dt.isoformat(),
            "open": candle.get("open"),
            "high": candle.get("high"),
            "low": candle.get("low"),
            "close": candle.get("close"),
            "volume": candle.get("volume")
        })

    return {
        "period": period,
        "interval": interval,
        "count": len(history_data),
        "data": history_data
    }
