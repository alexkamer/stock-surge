"""
Market data service layer using yfinance
"""

import yfinance as yf
from typing import Dict, Any

from ..utils.cache import get_cached_data, set_cached_data
from ..utils.helpers import make_json_serializable
from ..config import CACHE_TTL_SHORT, CACHE_TTL_LONG


def get_market_overview_data(market_id: str) -> Dict[str, Any]:
    """Get market overview with indices"""
    cache_key = f"market_overview:{market_id}"
    cached = get_cached_data(cache_key)

    if cached:
        return {
            "market_name": cached.get("market_name", market_id),
            "status": cached.get("status", "unknown"),
            "indices": cached.get("indices", {}),
            "cached": True
        }

    market = yf.Market(market_id)
    status_data = market.status
    summary_data = market.summary

    # Process indices data
    indices = {}
    for key, data in summary_data.items():
        indices[key] = {
            "symbol": data.get("symbol", ""),
            "short_name": data.get("shortName", ""),
            "regular_market_price": data.get("regularMarketPrice", 0.0),
            "regular_market_change": data.get("regularMarketChange", 0.0),
            "regular_market_change_percent": data.get("regularMarketChangePercent", 0.0),
            "regular_market_previous_close": data.get("regularMarketPreviousClose", 0.0),
            "market_state": data.get("marketState", "UNKNOWN")
        }

    result = {
        "market_name": status_data.get("name", market_id),
        "status": status_data.get("status", "unknown"),
        "indices": indices
    }

    set_cached_data(cache_key, result, CACHE_TTL_SHORT)
    return {**result, "cached": False}


def get_sector_data(sector_key: str) -> Dict[str, Any]:
    """Get sector information"""
    cache_key = f"sector:{sector_key}"
    cached = get_cached_data(cache_key)

    if cached:
        return {**cached, "cached": True}

    sector = yf.Sector(sector_key)

    # Convert DataFrames to dicts
    top_companies = sector.top_companies.to_dict('records') if sector.top_companies is not None and not sector.top_companies.empty else []
    industries = sector.industries.to_dict('records') if sector.industries is not None and not sector.industries.empty else []

    # Filter out None values from ETFs and mutual funds
    top_etfs = {k: v for k, v in sector.top_etfs.items() if v is not None} if isinstance(sector.top_etfs, dict) else {}
    top_mutual_funds = {k: v for k, v in sector.top_mutual_funds.items() if v is not None} if isinstance(sector.top_mutual_funds, dict) else {}

    result = {
        "key": sector.key,
        "name": sector.name,
        "symbol": sector.symbol,
        "overview": {
            "companies_count": sector.overview.get('companies_count', 0),
            "market_cap": sector.overview.get('market_cap', 0.0),
            "description": sector.overview.get('description', ''),
            "industries_count": sector.overview.get('industries_count', 0),
            "market_weight": sector.overview.get('market_weight', 0.0),
            "employee_count": sector.overview.get('employee_count', 0)
        },
        "top_companies": make_json_serializable(top_companies),
        "industries": make_json_serializable(industries),
        "top_etfs": top_etfs,
        "top_mutual_funds": top_mutual_funds,
        "cached": False
    }

    set_cached_data(cache_key, result, CACHE_TTL_LONG)
    return result


def get_industry_data(industry_key: str) -> Dict[str, Any]:
    """Get industry information"""
    cache_key = f"industry:{industry_key}"
    cached = get_cached_data(cache_key)

    if cached:
        return {**cached, "cached": True}

    industry = yf.Industry(industry_key)

    # Convert DataFrames to dicts
    top_performing = industry.top_performing_companies.to_dict('records') if industry.top_performing_companies is not None and not industry.top_performing_companies.empty else []
    top_growth = industry.top_growth_companies.to_dict('records') if industry.top_growth_companies is not None and not industry.top_growth_companies.empty else []

    result = {
        "key": industry.key,
        "name": industry.name,
        "symbol": industry.symbol,
        "sector_key": industry.sector_key,
        "sector_name": industry.sector_name,
        "overview": {
            "companies_count": industry.overview.get('companies_count', 0),
            "market_cap": industry.overview.get('market_cap', 0.0),
            "description": industry.overview.get('description', ''),
            "market_weight": industry.overview.get('market_weight', 0.0),
            "employee_count": industry.overview.get('employee_count', 0)
        },
        "top_performing_companies": make_json_serializable(top_performing),
        "top_growth_companies": make_json_serializable(top_growth),
        "cached": False
    }

    set_cached_data(cache_key, result, CACHE_TTL_LONG)
    return result
