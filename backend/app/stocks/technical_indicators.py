"""
Technical indicators calculation service
Provides RSI, MACD, Moving Averages, Bollinger Bands, etc.
"""

import pandas as pd
import numpy as np
import yfinance as yf
from typing import Dict, Any, Optional
from datetime import datetime


def calculate_rsi(data: pd.Series, period: int = 14) -> Optional[float]:
    """Calculate Relative Strength Index"""
    try:
        delta = data.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()

        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None
    except Exception:
        return None


def calculate_macd(data: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, Optional[float]]:
    """Calculate MACD, Signal, and Histogram"""
    try:
        exp1 = data.ewm(span=fast, adjust=False).mean()
        exp2 = data.ewm(span=slow, adjust=False).mean()
        macd = exp1 - exp2
        signal_line = macd.ewm(span=signal, adjust=False).mean()
        histogram = macd - signal_line

        return {
            "macd": float(macd.iloc[-1]) if not pd.isna(macd.iloc[-1]) else None,
            "signal": float(signal_line.iloc[-1]) if not pd.isna(signal_line.iloc[-1]) else None,
            "histogram": float(histogram.iloc[-1]) if not pd.isna(histogram.iloc[-1]) else None,
        }
    except Exception:
        return {"macd": None, "signal": None, "histogram": None}


def calculate_moving_averages(data: pd.Series) -> Dict[str, Optional[float]]:
    """Calculate Simple Moving Averages (SMA)"""
    try:
        return {
            "sma_20": float(data.rolling(window=20).mean().iloc[-1]) if len(data) >= 20 else None,
            "sma_50": float(data.rolling(window=50).mean().iloc[-1]) if len(data) >= 50 else None,
            "sma_100": float(data.rolling(window=100).mean().iloc[-1]) if len(data) >= 100 else None,
            "sma_200": float(data.rolling(window=200).mean().iloc[-1]) if len(data) >= 200 else None,
        }
    except Exception:
        return {"sma_20": None, "sma_50": None, "sma_100": None, "sma_200": None}


def calculate_ema(data: pd.Series) -> Dict[str, Optional[float]]:
    """Calculate Exponential Moving Averages (EMA)"""
    try:
        return {
            "ema_12": float(data.ewm(span=12, adjust=False).mean().iloc[-1]) if len(data) >= 12 else None,
            "ema_26": float(data.ewm(span=26, adjust=False).mean().iloc[-1]) if len(data) >= 26 else None,
            "ema_50": float(data.ewm(span=50, adjust=False).mean().iloc[-1]) if len(data) >= 50 else None,
        }
    except Exception:
        return {"ema_12": None, "ema_26": None, "ema_50": None}


def calculate_bollinger_bands(data: pd.Series, period: int = 20, std_dev: int = 2) -> Dict[str, Optional[float]]:
    """Calculate Bollinger Bands"""
    try:
        sma = data.rolling(window=period).mean()
        std = data.rolling(window=period).std()

        upper_band = sma + (std * std_dev)
        lower_band = sma - (std * std_dev)

        return {
            "upper": float(upper_band.iloc[-1]) if not pd.isna(upper_band.iloc[-1]) else None,
            "middle": float(sma.iloc[-1]) if not pd.isna(sma.iloc[-1]) else None,
            "lower": float(lower_band.iloc[-1]) if not pd.isna(lower_band.iloc[-1]) else None,
        }
    except Exception:
        return {"upper": None, "middle": None, "lower": None}


def calculate_stochastic(high: pd.Series, low: pd.Series, close: pd.Series, k_period: int = 14, d_period: int = 3) -> Dict[str, Optional[float]]:
    """Calculate Stochastic Oscillator"""
    try:
        lowest_low = low.rolling(window=k_period).min()
        highest_high = high.rolling(window=k_period).max()

        k_percent = 100 * ((close - lowest_low) / (highest_high - lowest_low))
        d_percent = k_percent.rolling(window=d_period).mean()

        return {
            "k": float(k_percent.iloc[-1]) if not pd.isna(k_percent.iloc[-1]) else None,
            "d": float(d_percent.iloc[-1]) if not pd.isna(d_percent.iloc[-1]) else None,
        }
    except Exception:
        return {"k": None, "d": None}


def calculate_atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> Optional[float]:
    """Calculate Average True Range"""
    try:
        tr1 = high - low
        tr2 = abs(high - close.shift())
        tr3 = abs(low - close.shift())

        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(window=period).mean()

        return float(atr.iloc[-1]) if not pd.isna(atr.iloc[-1]) else None
    except Exception:
        return None


def get_technical_indicators(ticker: str, period: str = "3mo") -> Dict[str, Any]:
    """
    Calculate all technical indicators for a stock

    Args:
        ticker: Stock ticker symbol
        period: Data period (1mo, 3mo, 6mo, 1y, 2y, 5y)

    Returns:
        Dictionary with all calculated indicators
    """
    try:
        # Fetch historical data
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period)

        if hist.empty:
            return {
                "error": "No historical data available",
                "ticker": ticker,
                "period": period,
            }

        # Get current price for context
        current_price = float(hist['Close'].iloc[-1])

        # Calculate all indicators
        rsi = calculate_rsi(hist['Close'])
        macd_data = calculate_macd(hist['Close'])
        sma = calculate_moving_averages(hist['Close'])
        ema = calculate_ema(hist['Close'])
        bollinger = calculate_bollinger_bands(hist['Close'])
        stochastic = calculate_stochastic(hist['High'], hist['Low'], hist['Close'])
        atr = calculate_atr(hist['High'], hist['Low'], hist['Close'])

        # Calculate volume metrics
        avg_volume = float(hist['Volume'].mean())
        current_volume = float(hist['Volume'].iloc[-1])
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else None

        # Trend analysis
        price_vs_sma20 = ((current_price - sma['sma_20']) / sma['sma_20'] * 100) if sma['sma_20'] else None
        price_vs_sma50 = ((current_price - sma['sma_50']) / sma['sma_50'] * 100) if sma['sma_50'] else None
        price_vs_sma200 = ((current_price - sma['sma_200']) / sma['sma_200'] * 100) if sma['sma_200'] else None

        return {
            "ticker": ticker,
            "period": period,
            "timestamp": datetime.utcnow().isoformat(),
            "current_price": current_price,
            "indicators": {
                "rsi": {
                    "value": rsi,
                    "signal": (
                        "oversold" if rsi and rsi < 30 else
                        "overbought" if rsi and rsi > 70 else
                        "neutral" if rsi else None
                    ),
                },
                "macd": macd_data,
                "moving_averages": {
                    "sma": sma,
                    "ema": ema,
                    "price_vs_sma20": price_vs_sma20,
                    "price_vs_sma50": price_vs_sma50,
                    "price_vs_sma200": price_vs_sma200,
                },
                "bollinger_bands": {
                    **bollinger,
                    "position": (
                        "above_upper" if bollinger['upper'] and current_price > bollinger['upper'] else
                        "below_lower" if bollinger['lower'] and current_price < bollinger['lower'] else
                        "within_bands" if bollinger['upper'] and bollinger['lower'] else None
                    ),
                },
                "stochastic": stochastic,
                "atr": atr,
                "volume": {
                    "current": current_volume,
                    "average": avg_volume,
                    "ratio": volume_ratio,
                },
            },
        }

    except Exception as e:
        return {
            "error": str(e),
            "ticker": ticker,
            "period": period,
        }
