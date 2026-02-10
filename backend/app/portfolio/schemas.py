"""Pydantic schemas for portfolio endpoints"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class PortfolioPositionCreate(BaseModel):
    """Request to add a position"""
    ticker: str = Field(..., json_schema_extra={"example": "AAPL"})
    quantity: int = Field(..., gt=0, json_schema_extra={"example": 10})
    purchase_price: float = Field(..., gt=0, json_schema_extra={"example": 273.49})
    purchase_date: datetime = Field(..., json_schema_extra={"example": "2026-01-15T10:30:00"})
    notes: Optional[str] = Field(None, max_length=500)


class PortfolioPositionUpdate(BaseModel):
    """Request to update a position"""
    quantity: Optional[int] = Field(None, gt=0)
    purchase_price: Optional[float] = Field(None, gt=0)
    purchase_date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=500)


class PortfolioPosition(BaseModel):
    """Single portfolio position"""
    id: str
    ticker: str
    quantity: int
    purchase_price: float  # In dollars
    purchase_date: datetime
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime


class PortfolioPositionWithMetrics(PortfolioPosition):
    """Position with calculated metrics"""
    current_price: float
    current_value: float  # quantity * current_price
    cost_basis: float  # quantity * purchase_price
    unrealized_pl: float  # current_value - cost_basis
    unrealized_pl_percent: float  # (unrealized_pl / cost_basis) * 100
    day_change: float
    day_change_percent: float


class PortfolioSummary(BaseModel):
    """Overall portfolio summary"""
    user_id: str
    total_positions: int
    total_value: float
    total_cost_basis: float
    total_unrealized_pl: float
    total_unrealized_pl_percent: float
    total_day_change: float
    total_day_change_percent: float
    positions: List[PortfolioPositionWithMetrics]


class PerformanceDataPoint(BaseModel):
    """Single data point in portfolio performance history"""
    date: str
    value: float
    pl: float  # P/L relative to start of period
    pl_percent: float  # P/L % relative to start of period
    alltime_pl: float  # All-time P/L vs purchase price
    alltime_pl_percent: float  # All-time P/L % vs purchase price


class PerformanceResponse(BaseModel):
    """Portfolio performance over time"""
    period: str
    data: List[PerformanceDataPoint]


class SectorAllocation(BaseModel):
    """Sector allocation data"""
    sector: str
    value: float
    percent: float


class PositionPerformance(BaseModel):
    """Individual position performance"""
    ticker: str
    pl: float
    pl_percent: float
    current_value: float


class AnalyticsResponse(BaseModel):
    """Complete portfolio analytics"""
    performance: PerformanceResponse
    sector_allocation: List[SectorAllocation]
    top_performers: List[PositionPerformance]
    bottom_performers: List[PositionPerformance]
