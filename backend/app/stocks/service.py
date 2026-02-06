"""
Stock data service layer using yfinance
Contains all business logic for fetching and processing stock data
"""

import yfinance as yf
from typing import Dict, List, Any, Optional
from datetime import datetime
import pandas as pd

from ..utils.helpers import safe_float, safe_int, format_timestamp, make_json_serializable
from ..utils.cache import get_cached_data, set_cached_data
from ..config import CACHE_TTL_SHORT, CACHE_TTL_MEDIUM, CACHE_TTL_LONG


def make_json_serializable(obj: Any) -> Any:
    """Convert non-JSON-serializable objects to serializable format"""
    import math
    import numpy as np

    if isinstance(obj, dict):
        return {k: make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [make_json_serializable(v) for v in obj]
    elif hasattr(obj, 'item'):  # numpy types
        val = obj.item()
        if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
            return None
        return val
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif obj is None or isinstance(obj, (str, int, bool)):
        return obj
    else:
        return str(obj)


def get_stock_price(ticker: str) -> Dict[str, Any]:
    """
    Get current stock price using fast_info

    Args:
        ticker: Stock ticker symbol

    Returns:
        Dictionary with price data
    """
    cache_key = f"price:{ticker}"
    cached = get_cached_data(cache_key)
    if cached:
        return {"data": cached, "cached": True}

    stock = yf.Ticker(ticker)
    fast_info = stock.fast_info

    result = {
        "last_price": fast_info.last_price,
        "open": fast_info.open,
        "day_high": fast_info.day_high,
        "day_low": fast_info.day_low,
        "previous_close": fast_info.previous_close,
        "volume": fast_info.last_volume,
        "currency": fast_info.currency,
        "exchange": fast_info.exchange,
        "market_cap": fast_info.market_cap,
        "timestamp": format_timestamp()
    }

    set_cached_data(cache_key, result, CACHE_TTL_SHORT)
    return {"data": result, "cached": False}


def get_stock_info(ticker: str) -> Dict[str, Any]:
    """
    Get comprehensive company information

    Args:
        ticker: Stock ticker symbol

    Returns:
        Dictionary with company info
    """
    cache_key = f"info:{ticker}"
    cached = get_cached_data(cache_key)
    if cached:
        return {"data": cached, "cached": True}

    stock = yf.Ticker(ticker)
    info = stock.info

    result = {
        "name": info.get("longName", "N/A"),
        "symbol": info.get("symbol", ticker),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "description": info.get("longBusinessSummary"),
        "website": info.get("website"),
        "market_cap": info.get("marketCap"),
        "pe_ratio": info.get("trailingPE"),
        "forward_pe": info.get("forwardPE"),
        "dividend_yield": info.get("dividendYield"),
        "beta": info.get("beta"),
        "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
        "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
        "employees": info.get("fullTimeEmployees"),
        "country": info.get("country"),
        "city": info.get("city"),
    }

    set_cached_data(cache_key, result, CACHE_TTL_MEDIUM)
    return {"data": result, "cached": False}


def get_stock_history(ticker: str, period: str = "1mo", interval: str = "1d") -> Dict[str, Any]:
    """
    Get historical price data

    Args:
        ticker: Stock ticker symbol
        period: Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
        interval: Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)

    Returns:
        Dictionary with history data
    """
    cache_key = f"history:{ticker}:{period}:{interval}"
    cached = get_cached_data(cache_key)
    if cached:
        return {"data": cached, "cached": True}

    stock = yf.Ticker(ticker)
    hist = stock.history(period=period, interval=interval)

    if hist.empty:
        return {"data": {"period": period, "interval": interval, "count": 0, "data": []}, "cached": False}

    # Convert DataFrame to list of dicts
    history_data = []
    for index, row in hist.iterrows():
        history_data.append({
            "date": index.isoformat(),
            "open": safe_float(row["Open"]),
            "high": safe_float(row["High"]),
            "low": safe_float(row["Low"]),
            "close": safe_float(row["Close"]),
            "volume": safe_int(row["Volume"])
        })

    result = {
        "period": period,
        "interval": interval,
        "count": len(history_data),
        "data": history_data
    }

    set_cached_data(cache_key, result, CACHE_TTL_MEDIUM)
    return {"data": result, "cached": False}


def get_stock_dividends(ticker: str) -> Dict[str, Any]:
    """
    Get dividend history

    Args:
        ticker: Stock ticker symbol

    Returns:
        Dictionary with dividend data
    """
    cache_key = f"dividends:{ticker}"
    cached = get_cached_data(cache_key)
    if cached:
        return {"data": cached, "cached": True}

    stock = yf.Ticker(ticker)
    dividends = stock.dividends

    if dividends.empty:
        return {"data": [], "cached": False}

    # Convert Series to list of dicts
    dividend_data = []
    for index, amount in dividends.items():
        dividend_data.append({
            "date": index.isoformat(),
            "amount": safe_float(amount)
        })

    set_cached_data(cache_key, dividend_data, CACHE_TTL_LONG)
    return {"data": dividend_data, "cached": False}


def get_generic_stock_data(ticker: str, data_type: str, cache_ttl: int = CACHE_TTL_MEDIUM) -> Dict[str, Any]:
    """
    Generic function to get various stock data types

    Args:
        ticker: Stock ticker symbol
        data_type: Type of data to fetch (method name on yf.Ticker)
        cache_ttl: Cache time-to-live in seconds

    Returns:
        Dictionary with data and cache status
    """
    cache_key = f"{data_type}:{ticker}"
    cached = get_cached_data(cache_key)
    if cached:
        return {"data": cached, "cached": True}

    stock = yf.Ticker(ticker)

    # Get data using getattr (dynamic method call)
    if hasattr(stock, data_type):
        data = getattr(stock, data_type)

        # Handle DataFrame, Series, dict, or other types
        if isinstance(data, pd.DataFrame):
            if not data.empty:
                # For financial statements, preserve the index (metric names) as a column
                df_with_index = data.reset_index()
                result = df_with_index.to_dict(orient="records")
            else:
                result = []
        elif isinstance(data, pd.Series):
            result = data.to_dict() if not data.empty else {}
        elif isinstance(data, dict):
            result = data
        else:
            result = str(data)

        # Make JSON serializable
        result = make_json_serializable(result)

        set_cached_data(cache_key, result, cache_ttl)
        return {"data": result, "cached": False}

    return {"data": None, "cached": False}
