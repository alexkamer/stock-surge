"""
Pydantic schemas for stock endpoints
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any


# Request models
class TickersRequest(BaseModel):
    """Request model for batch ticker operations"""
    tickers: List[str] = Field(..., json_schema_extra={"example": ["AAPL", "MSFT", "GOOGL"]})


class TickersHistoryRequest(BaseModel):
    """Request model for batch ticker history"""
    tickers: List[str] = Field(..., json_schema_extra={"example": ["AAPL", "MSFT"]})
    period: str = Field(default="1mo", json_schema_extra={"example": "1mo"})
    interval: str = Field(default="1d", json_schema_extra={"example": "1d"})


# Price models
class PriceData(BaseModel):
    """Stock price data"""
    last_price: float = Field(..., json_schema_extra={"example": 276.49})
    open: float = Field(..., json_schema_extra={"example": 272.31})
    day_high: float = Field(..., json_schema_extra={"example": 278.95})
    day_low: float = Field(..., json_schema_extra={"example": 272.29})
    previous_close: float = Field(..., json_schema_extra={"example": 270.0})
    volume: int = Field(..., json_schema_extra={"example": 90320670})
    currency: str = Field(..., json_schema_extra={"example": "USD"})
    exchange: str = Field(..., json_schema_extra={"example": "NMS"})
    market_cap: Optional[float] = Field(None, json_schema_extra={"example": 4063829416205.57})
    timestamp: str = Field(..., json_schema_extra={"example": "2026-02-04T17:31:55.417515"})


class PriceResponse(BaseModel):
    """Response model for stock price"""
    ticker: str = Field(..., json_schema_extra={"example": "AAPL"})
    data: PriceData
    cached: bool = Field(..., json_schema_extra={"example": False})


# History models
class OHLCVData(BaseModel):
    """OHLCV (Open, High, Low, Close, Volume) data point"""
    date: str = Field(..., json_schema_extra={"example": "2026-02-04T00:00:00-05:00"})
    open: float = Field(..., json_schema_extra={"example": 272.31})
    high: float = Field(..., json_schema_extra={"example": 278.95})
    low: float = Field(..., json_schema_extra={"example": 272.29})
    close: float = Field(..., json_schema_extra={"example": 276.49})
    volume: int = Field(..., json_schema_extra={"example": 90320670})


class HistoryData(BaseModel):
    """Stock history data"""
    period: str = Field(..., json_schema_extra={"example": "1mo"})
    interval: str = Field(..., json_schema_extra={"example": "1d"})
    count: int = Field(..., json_schema_extra={"example": 20})
    data: List[OHLCVData]


class HistoryResponse(BaseModel):
    """Response model for stock history"""
    ticker: str = Field(..., json_schema_extra={"example": "AAPL"})
    data: HistoryData
    cached: bool = Field(..., json_schema_extra={"example": False})


# Dividend models
class DividendData(BaseModel):
    """Dividend data point"""
    date: str = Field(..., json_schema_extra={"example": "2025-11-10T00:00:00-05:00"})
    amount: float = Field(..., json_schema_extra={"example": 0.26})


class DividendsResponse(BaseModel):
    """Response model for dividends"""
    ticker: str = Field(..., json_schema_extra={"example": "AAPL"})
    data: List[DividendData]
    cached: bool = Field(..., json_schema_extra={"example": False})


# Company info models
class CompanyInfo(BaseModel):
    """Company information"""
    name: str = Field(..., json_schema_extra={"example": "Apple Inc."})
    symbol: str = Field(..., json_schema_extra={"example": "AAPL"})
    sector: Optional[str] = Field(None, json_schema_extra={"example": "Technology"})
    industry: Optional[str] = Field(None, json_schema_extra={"example": "Consumer Electronics"})
    description: Optional[str] = Field(None, json_schema_extra={"example": "Apple Inc. designs, manufactures..."})
    website: Optional[str] = Field(None, json_schema_extra={"example": "https://www.apple.com"})
    market_cap: Optional[float] = Field(None, json_schema_extra={"example": 4063829426176})
    pe_ratio: Optional[float] = Field(None, json_schema_extra={"example": 34.998734})
    forward_pe: Optional[float] = Field(None, json_schema_extra={"example": 29.799831})
    dividend_yield: Optional[float] = Field(None, json_schema_extra={"example": 0.0039})
    beta: Optional[float] = Field(None, json_schema_extra={"example": 1.107})
    fifty_two_week_high: Optional[float] = Field(None, alias="52_week_high", json_schema_extra={"example": 288.62})
    fifty_two_week_low: Optional[float] = Field(None, alias="52_week_low", json_schema_extra={"example": 169.21})
    employees: Optional[int] = Field(None, json_schema_extra={"example": 150000})
    country: Optional[str] = Field(None, json_schema_extra={"example": "United States"})
    city: Optional[str] = Field(None, json_schema_extra={"example": "Cupertino"})

    model_config = ConfigDict(populate_by_name=True)


class InfoResponse(BaseModel):
    """Response model for company info"""
    ticker: str = Field(..., json_schema_extra={"example": "AAPL"})
    data: CompanyInfo
    cached: bool = Field(..., json_schema_extra={"example": False})
