"""
Pydantic schemas for Schwab API endpoints
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class SchwabQuoteData(BaseModel):
    """Single quote data from Schwab API - matches yfinance PriceData format"""
    last_price: float = Field(..., json_schema_extra={"example": 276.49})
    open: float = Field(..., json_schema_extra={"example": 272.31})
    day_high: float = Field(..., json_schema_extra={"example": 278.95})
    day_low: float = Field(..., json_schema_extra={"example": 272.29})
    previous_close: float = Field(..., json_schema_extra={"example": 276.49})
    volume: int = Field(..., json_schema_extra={"example": 90320670})
    currency: str = Field(..., json_schema_extra={"example": "USD"})
    exchange: str = Field(..., json_schema_extra={"example": "NASDAQ"})
    market_cap: Optional[float] = Field(None, json_schema_extra={"example": 4023411913885.9863})
    timestamp: str = Field(..., json_schema_extra={"example": "2026-02-04T17:31:55.417515"})


class SchwabQuoteResponse(BaseModel):
    """Response model for single quote"""
    symbol: str = Field(..., json_schema_extra={"example": "AAPL"})
    data: SchwabQuoteData
    cached: bool = Field(..., json_schema_extra={"example": False})


class SchwabQuotesResponse(BaseModel):
    """Response model for batch quotes"""
    quotes: Dict[str, SchwabQuoteData]
    cached: bool = Field(..., json_schema_extra={"example": False})


class SchwabCandle(BaseModel):
    """Single candle data point"""
    date: str = Field(..., json_schema_extra={"example": "2026-02-04T00:00:00-05:00"})
    open: float = Field(..., json_schema_extra={"example": 272.31})
    high: float = Field(..., json_schema_extra={"example": 278.95})
    low: float = Field(..., json_schema_extra={"example": 272.29})
    close: float = Field(..., json_schema_extra={"example": 276.49})
    volume: int = Field(..., json_schema_extra={"example": 90320670})


class SchwabPriceHistoryData(BaseModel):
    """Price history data from Schwab API"""
    period: str = Field(..., json_schema_extra={"example": "1mo"})
    interval: str = Field(..., json_schema_extra={"example": "1d"})
    count: int = Field(..., json_schema_extra={"example": 20})
    data: List[SchwabCandle]


class SchwabPriceHistoryResponse(BaseModel):
    """Response model for price history"""
    symbol: str = Field(..., json_schema_extra={"example": "AAPL"})
    data: SchwabPriceHistoryData
    cached: bool = Field(..., json_schema_extra={"example": False})
