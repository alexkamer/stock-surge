"""
Pydantic schemas for user endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional


class WatchlistItem(BaseModel):
    """Request model for adding ticker to watchlist"""
    ticker: str = Field(..., json_schema_extra={"example": "AAPL"})
    position: Optional[int] = Field(None, json_schema_extra={"example": 0})


class WatchlistResponse(BaseModel):
    """Response model for watchlist data"""
    user_id: str
    tickers: list


class PreferencesRequest(BaseModel):
    """Request model for updating user preferences"""
    theme: Optional[str] = Field(None, json_schema_extra={"example": "dark"})
    chart_type: Optional[str] = Field(None, json_schema_extra={"example": "candlestick"})
    default_period: Optional[str] = Field(None, json_schema_extra={"example": "1mo"})
    default_interval: Optional[str] = Field(None, json_schema_extra={"example": "1d"})
    preferences: Optional[dict] = Field(None, json_schema_extra={"example": {}})


class PreferencesResponse(BaseModel):
    """Response model for user preferences"""
    user_id: str
    theme: Optional[str]
    chart_type: Optional[str]
    default_period: Optional[str]
    default_interval: Optional[str]
    preferences: dict
