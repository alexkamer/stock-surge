"""
Market, sector, and industry endpoints
"""

from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
import yfinance as yf

from .schemas import MarketOverviewResponse, SectorResponse, IndustryResponse, AvailableMarket
from .service import get_market_overview_data, get_sector_data, get_industry_data

# Create router
router = APIRouter(tags=["market"])

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@router.get("/markets/available")
@limiter.limit("30/minute")
async def get_available_markets(request: Request):
    """Get list of available markets that can be queried."""
    markets = [
        {
            "id": "US",
            "name": "U.S. Markets",
            "description": "Major U.S. indices including S&P 500, Dow, and Nasdaq"
        },
        {
            "id": "GB",
            "name": "UK Markets",
            "description": "FTSE indices and UK market data"
        },
        {
            "id": "ASIA",
            "name": "Asian Markets",
            "description": "Major Asian indices including Nikkei, Hang Seng, and Shanghai"
        },
        {
            "id": "EUROPE",
            "name": "European Markets",
            "description": "Major European indices including DAX, CAC, and FTSE"
        },
        {
            "id": "RATES",
            "name": "Interest Rates",
            "description": "Treasury yields and interest rate data"
        },
        {
            "id": "COMMODITIES",
            "name": "Commodities",
            "description": "Oil, gold, silver, and other commodity prices"
        },
        {
            "id": "CURRENCIES",
            "name": "Currencies",
            "description": "Major currency pairs and forex data"
        },
        {
            "id": "CRYPTOCURRENCIES",
            "name": "Cryptocurrencies",
            "description": "Bitcoin, Ethereum, and other crypto assets"
        }
    ]
    return {"markets": markets}


@router.get("/market/{market_id}/overview", response_model=MarketOverviewResponse)
@limiter.limit("30/minute")
async def get_market_overview(request: Request, market_id: str = "US"):
    """
    Get market overview with major indices for a specific market.
    Uses yfinance Market API for efficient data retrieval.
    Cached for 60 seconds.
    """
    market_id = market_id.upper()

    try:
        result = get_market_overview_data(market_id)
        return {"market_id": market_id, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching market overview: {str(e)}")


@router.get("/sector/{sector_key}", response_model=SectorResponse)
@limiter.limit("30/minute")
async def get_sector(request: Request, sector_key: str):
    """
    Get sector information including overview, top companies, industries, ETFs, and mutual funds.
    Cached for 1 hour.
    """
    try:
        result = get_sector_data(sector_key)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sector data: {str(e)}")


@router.get("/industry/{industry_key}", response_model=IndustryResponse)
@limiter.limit("30/minute")
async def get_industry(request: Request, industry_key: str):
    """
    Get industry information including overview, top performing and growth companies.
    Cached for 1 hour.
    """
    try:
        result = get_industry_data(industry_key)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching industry data: {str(e)}")
