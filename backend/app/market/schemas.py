"""
Pydantic schemas for market endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class MarketIndexData(BaseModel):
    """Market index data"""
    symbol: str = Field(..., json_schema_extra={"example": "^GSPC"})
    short_name: str = Field(..., json_schema_extra={"example": "S&P 500"})
    regular_market_price: float = Field(..., json_schema_extra={"example": 6798.4})
    regular_market_change: float = Field(..., json_schema_extra={"example": -84.32})
    regular_market_change_percent: float = Field(..., json_schema_extra={"example": -1.225})
    regular_market_previous_close: float = Field(..., json_schema_extra={"example": 6882.72})
    market_state: str = Field(..., json_schema_extra={"example": "POST"})


class MarketOverviewResponse(BaseModel):
    """Response model for market overview"""
    market_id: str = Field(..., json_schema_extra={"example": "US"})
    market_name: str = Field(..., json_schema_extra={"example": "U.S. markets"})
    status: str = Field(..., json_schema_extra={"example": "closed"})
    indices: Dict[str, MarketIndexData]
    cached: bool = Field(..., json_schema_extra={"example": False})


class AvailableMarket(BaseModel):
    """Available market information"""
    id: str = Field(..., json_schema_extra={"example": "US"})
    name: str = Field(..., json_schema_extra={"example": "U.S. Markets"})
    description: str = Field(..., json_schema_extra={"example": "Major U.S. indices including S&P 500, Dow, and Nasdaq"})


class SectorOverview(BaseModel):
    """Sector overview data"""
    companies_count: int
    market_cap: float
    description: str
    industries_count: int
    market_weight: float
    employee_count: int


class SectorResponse(BaseModel):
    """Response model for sector data"""
    key: str
    name: str
    symbol: str
    overview: SectorOverview
    top_companies: List[Dict[str, Any]]
    industries: List[Dict[str, Any]]
    top_etfs: Dict[str, str]
    top_mutual_funds: Dict[str, str]
    cached: bool


class IndustryOverview(BaseModel):
    """Industry overview data"""
    companies_count: int
    market_cap: float
    description: str
    market_weight: float
    employee_count: int


class IndustryResponse(BaseModel):
    """Response model for industry data"""
    key: str
    name: str
    symbol: str
    sector_key: str
    sector_name: str
    overview: IndustryOverview
    top_performing_companies: List[Dict[str, Any]]
    top_growth_companies: List[Dict[str, Any]]
    cached: bool
