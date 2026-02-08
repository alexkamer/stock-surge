"""
Market data service layer using yfinance
"""

import yfinance as yf
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, List

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

    # Convert DataFrames to dicts - include the index (symbol) in the records
    if sector.top_companies is not None and not sector.top_companies.empty:
        top_companies = sector.top_companies.reset_index().to_dict('records')
    else:
        top_companies = []

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

    # Convert DataFrames to dicts - include the index (symbol) in the records
    if industry.top_performing_companies is not None and not industry.top_performing_companies.empty:
        top_performing = industry.top_performing_companies.reset_index().to_dict('records')
    else:
        top_performing = []

    if industry.top_growth_companies is not None and not industry.top_growth_companies.empty:
        top_growth = industry.top_growth_companies.reset_index().to_dict('records')
    else:
        top_growth = []

    # Get all companies in the industry
    if industry.top_companies is not None and not industry.top_companies.empty:
        top_companies = industry.top_companies.reset_index().to_dict('records')
    else:
        top_companies = []

    # Get research reports and enrich with ticker information
    research_reports = industry.research_reports if hasattr(industry, 'research_reports') and industry.research_reports else []

    # Create a mapping of company names to tickers for enrichment
    company_name_to_ticker = {}
    if industry.top_companies is not None and not industry.top_companies.empty:
        for symbol, row in industry.top_companies.iterrows():
            company_name_to_ticker[row['name'].lower()] = symbol

    # Enrich reports with ticker information
    enriched_reports = []
    for report in research_reports:
        enriched_report = dict(report)

        # Try to extract ticker from headHtml or match company name
        ticker = None
        head_html = report.get('headHtml', '')

        # Check if ticker is in the headHtml (e.g., "NXT: Raising target price")
        if ':' in head_html:
            potential_ticker = head_html.split(':')[0].strip()
            if potential_ticker.isupper() and len(potential_ticker) <= 5:
                ticker = potential_ticker

        # Try to match company name from headHtml
        if not ticker:
            for company_name, company_ticker in company_name_to_ticker.items():
                if company_name in head_html.lower():
                    ticker = company_ticker
                    break

        enriched_report['ticker'] = ticker
        enriched_reports.append(enriched_report)

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
        "top_companies": make_json_serializable(top_companies),
        "research_reports": make_json_serializable(enriched_reports),
        "cached": False
    }

    set_cached_data(cache_key, result, CACHE_TTL_LONG)
    return result



def fetch_ticker_price(ticker: str) -> Dict[str, Any]:
    """Fetch real-time price for a single ticker"""
    try:
        stock = yf.Ticker(ticker)
        info = stock.fast_info

        price = getattr(info, "last_price", None)
        previous_close = getattr(info, "previous_close", None)

        change = None
        change_percent = None
        if price is not None and previous_close is not None and previous_close != 0:
            change = price - previous_close
            change_percent = (change / previous_close) * 100

        return {
            "ticker": ticker,
            "price": float(price) if price is not None else None,
            "change": float(change) if change is not None else None,
            "change_percent": float(change_percent) if change_percent is not None else None,
            "previous_close": float(previous_close) if previous_close is not None else None,
            "day_high": float(getattr(info, "day_high", None)) if getattr(info, "day_high", None) is not None else None,
            "day_low": float(getattr(info, "day_low", None)) if getattr(info, "day_low", None) is not None else None,
            "volume": int(getattr(info, "last_volume", None)) if getattr(info, "last_volume", None) is not None else None,
        }
    except Exception as e:
        print(f"Error fetching price for {ticker}: {e}")
        return {
            "ticker": ticker,
            "price": None,
            "change": None,
            "change_percent": None,
            "previous_close": None,
            "day_high": None,
            "day_low": None,
            "volume": None,
        }


async def get_industry_prices_async(industry_key: str, tickers: List[str]) -> Dict[str, Any]:
    """Get real-time prices for multiple tickers asynchronously"""
    cache_key = f"industry_prices:{industry_key}:{'-'.join(sorted(tickers))}"
    cached = get_cached_data(cache_key)

    if cached:
        return {
            "industry_key": industry_key,
            "prices": cached.get("prices", []),
            "cached": True
        }

    # Use ThreadPoolExecutor to run blocking yfinance calls in parallel
    with ThreadPoolExecutor(max_workers=10) as executor:
        loop = asyncio.get_event_loop()
        tasks = [
            loop.run_in_executor(executor, fetch_ticker_price, ticker)
            for ticker in tickers
        ]
        prices = await asyncio.gather(*tasks)

    result = {
        "prices": prices
    }

    set_cached_data(cache_key, result, CACHE_TTL_SHORT)
    return {
        "industry_key": industry_key,
        "prices": prices,
        "cached": False
    }



def fetch_ticker_history(ticker: str, period: str) -> Dict[str, Any]:
    """Fetch historical price data for a single ticker"""
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period, interval="1d")
        
        if hist.empty:
            return {"ticker": ticker, "data": []}
        
        # Convert to list of dicts with normalized returns
        data = []
        first_close = hist['Close'].iloc[0]
        
        for date, row in hist.iterrows():
            normalized_return = ((row['Close'] - first_close) / first_close) * 100
            data.append({
                "date": date.strftime('%Y-%m-%d'),
                "close": float(row['Close']),
                "normalized_return": float(normalized_return)
            })
        
        return {"ticker": ticker, "data": data}
    except Exception as e:
        print(f"Error fetching history for {ticker}: {e}")
        return {"ticker": ticker, "data": []}


async def get_industry_performance_async(industry_key: str, tickers: List[str], period: str = "1mo") -> Dict[str, Any]:
    """Get historical performance data for multiple tickers asynchronously"""
    cache_key = f"industry_performance:{industry_key}:{period}:{'-'.join(sorted(tickers))}"
    cached = get_cached_data(cache_key)
    
    if cached:
        return {
            "industry_key": industry_key,
            "period": period,
            "performance": cached.get("performance", []),
            "cached": True
        }
    
    # Use ThreadPoolExecutor to run blocking yfinance calls in parallel
    with ThreadPoolExecutor(max_workers=10) as executor:
        loop = asyncio.get_event_loop()
        tasks = [
            loop.run_in_executor(executor, fetch_ticker_history, ticker, period)
            for ticker in tickers
        ]
        performance = await asyncio.gather(*tasks)
    
    result = {
        "performance": performance
    }

    set_cached_data(cache_key, result, 300)  # 5 minutes
    return {
        "industry_key": industry_key,
        "period": period,
        "performance": performance,
        "cached": False
    }
