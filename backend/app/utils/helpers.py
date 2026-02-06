"""
Helper utilities for Stock Surge API
Shared functions used across modules
"""

from typing import Any, Dict, Optional
from datetime import datetime
import pandas as pd
import math
import numpy as np


def format_timestamp(dt: Optional[datetime] = None) -> str:
    """
    Format datetime as ISO string

    Args:
        dt: Datetime object (defaults to now)

    Returns:
        ISO formatted timestamp string
    """
    if dt is None:
        dt = datetime.now()
    return dt.isoformat()


def safe_float(value: Any, default: float = 0.0) -> float:
    """
    Safely convert value to float with fallback

    Args:
        value: Value to convert
        default: Default value if conversion fails

    Returns:
        Float value or default
    """
    try:
        if pd.isna(value):
            return default
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_int(value: Any, default: int = 0) -> int:
    """
    Safely convert value to int with fallback

    Args:
        value: Value to convert
        default: Default value if conversion fails

    Returns:
        Int value or default
    """
    try:
        if pd.isna(value):
            return default
        return int(value)
    except (ValueError, TypeError):
        return default


def clean_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Remove None values from dictionary

    Args:
        data: Dictionary to clean

    Returns:
        Dictionary with None values removed
    """
    return {k: v for k, v in data.items() if v is not None}


def format_large_number(value: float, precision: int = 2) -> str:
    """
    Format large numbers with K, M, B, T suffixes

    Args:
        value: Number to format
        precision: Decimal precision

    Returns:
        Formatted string (e.g., "1.5B")
    """
    if value >= 1_000_000_000_000:
        return f"{value / 1_000_000_000_000:.{precision}f}T"
    elif value >= 1_000_000_000:
        return f"{value / 1_000_000_000:.{precision}f}B"
    elif value >= 1_000_000:
        return f"{value / 1_000_000:.{precision}f}M"
    elif value >= 1_000:
        return f"{value / 1_000:.{precision}f}K"
    else:
        return f"{value:.{precision}f}"


def validate_ticker(ticker: str) -> bool:
    """
    Basic ticker validation

    Args:
        ticker: Stock ticker symbol

    Returns:
        True if valid format, False otherwise
    """
    if not ticker or not isinstance(ticker, str):
        return False

    ticker = ticker.strip().upper()

    # Basic validation: 1-5 alphanumeric characters, possibly with dots/hyphens
    if len(ticker) < 1 or len(ticker) > 10:
        return False

    return ticker.replace(".", "").replace("-", "").isalnum()


def make_json_serializable(obj: Any) -> Any:
    """
    Convert non-JSON-serializable objects to serializable format

    Args:
        obj: Object to convert

    Returns:
        JSON-serializable version of the object
    """
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
