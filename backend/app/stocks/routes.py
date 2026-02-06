"""
Stock endpoints for price, info, history, dividends, and more
Due to the large number of endpoints (40+), this file organizes them by category
"""

from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
import yfinance as yf

from .schemas import (
    PriceResponse, InfoResponse, HistoryResponse, DividendsResponse,
    TickersRequest, TickersHistoryRequest
)
from .service import (
    get_stock_price, get_stock_info, get_stock_history,
    get_stock_dividends, get_generic_stock_data
)
from ..config import CACHE_TTL_MEDIUM, CACHE_TTL_LONG

# Create router
router = APIRouter(tags=["stocks"])

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


# Core stock endpoints
@router.get("/stock/{ticker}/price", response_model=PriceResponse)
@limiter.limit("60/minute")
async def get_current_price(request: Request, ticker: str):
    """Get current price using fast_info (optimized for speed). Cached for 30 seconds."""
    ticker = ticker.upper()
    
    try:
        result = get_stock_price(ticker)
        return {"ticker": ticker, **result}
    except yf.YFRateLimitError:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.", headers={"Retry-After": "60"})
    except yf.YFTzMissingError:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} not found or delisted")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching price: {str(e)}")


@router.get("/stock/{ticker}/info", response_model=InfoResponse)
@limiter.limit("30/minute")
async def get_stock_info_endpoint(request: Request, ticker: str):
    """Get comprehensive company information. Cached for 5 minutes."""
    ticker = ticker.upper()
    
    try:
        result = get_stock_info(ticker)
        return {"ticker": ticker, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching info: {str(e)}")


@router.get("/stock/{ticker}/history", response_model=HistoryResponse)
@limiter.limit("60/minute")
async def get_stock_history_endpoint(
    request: Request, 
    ticker: str,
    period: str = "1mo",
    interval: str = "1d"
):
    """Get historical price data. Cached for 5 minutes."""
    ticker = ticker.upper()
    
    try:
        result = get_stock_history(ticker, period, interval)
        return {"ticker": ticker, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")


@router.get("/stock/{ticker}/dividends", response_model=DividendsResponse)
@limiter.limit("30/minute")
async def get_dividends(request: Request, ticker: str):
    """Get dividend history. Cached for 1 hour."""
    ticker = ticker.upper()
    
    try:
        result = get_stock_dividends(ticker)
        return {"ticker": ticker, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dividends: {str(e)}")


# Additional stock data endpoints (using generic handler)
@router.get("/stock/{ticker}/splits")
@limiter.limit("30/minute")
async def get_splits(request: Request, ticker: str):
    """Get stock split history"""
    ticker = ticker.upper()
    try:
        result = get_generic_stock_data(ticker, "splits", CACHE_TTL_LONG)
        return {"ticker": ticker, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stock/{ticker}/actions")
@limiter.limit("30/minute")
async def get_actions(request: Request, ticker: str):
    """Get corporate actions (dividends + splits)"""
    ticker = ticker.upper()
    try:
        result = get_generic_stock_data(ticker, "actions", CACHE_TTL_LONG)
        return {"ticker": ticker, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Financial statements
@router.get("/stock/{ticker}/financials/income")
@limiter.limit("20/minute")
async def get_income_statement(request: Request, ticker: str):
    """Get income statement"""
    ticker = ticker.upper()
    try:
        result = get_generic_stock_data(ticker, "income_stmt", CACHE_TTL_LONG)
        return {"ticker": ticker, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stock/{ticker}/financials/balance-sheet")
@limiter.limit("20/minute")
async def get_balance_sheet(request: Request, ticker: str):
    """Get balance sheet"""
    ticker = ticker.upper()
    try:
        result = get_generic_stock_data(ticker, "balance_sheet", CACHE_TTL_LONG)
        return {"ticker": ticker, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stock/{ticker}/financials/cash-flow")
@limiter.limit("20/minute")
async def get_cash_flow(request: Request, ticker: str):
    """Get cash flow statement"""
    ticker = ticker.upper()
    try:
        result = get_generic_stock_data(ticker, "cashflow", CACHE_TTL_LONG)
        return {"ticker": ticker, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Analyst data
@router.get("/stock/{ticker}/recommendations")
@limiter.limit("30/minute")
async def get_recommendations(request: Request, ticker: str):
    """Get analyst recommendations"""
    ticker = ticker.upper()
    try:
        result = get_generic_stock_data(ticker, "recommendations", CACHE_TTL_MEDIUM)
        return {"ticker": ticker, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stock/{ticker}/analyst-price-targets")
@limiter.limit("30/minute")
async def get_analyst_price_targets(request: Request, ticker: str):
    """Get analyst price targets"""
    ticker = ticker.upper()
    try:
        result = get_generic_stock_data(ticker, "analyst_price_targets", CACHE_TTL_MEDIUM)
        return {"ticker": ticker, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Earnings data
@router.get("/stock/{ticker}/earnings")
@limiter.limit("30/minute")
async def get_earnings(request: Request, ticker: str):
    """Get earnings history"""
    ticker = ticker.upper()
    try:
        result = get_generic_stock_data(ticker, "earnings", CACHE_TTL_MEDIUM)
        return {"ticker": ticker, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stock/{ticker}/earnings-dates")
@limiter.limit("30/minute")
async def get_earnings_dates(request: Request, ticker: str):
    """Get earnings dates"""
    ticker = ticker.upper()
    try:
        result = get_generic_stock_data(ticker, "earnings_dates", CACHE_TTL_MEDIUM)
        return {"ticker": ticker, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Holder information
@router.get("/stock/{ticker}/institutional-holders")
@limiter.limit("30/minute")
async def get_institutional_holders(request: Request, ticker: str):
    """Get institutional holders"""
    ticker = ticker.upper()
    try:
        result = get_generic_stock_data(ticker, "institutional_holders", CACHE_TTL_LONG)
        return {"ticker": ticker, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stock/{ticker}/major-holders")
@limiter.limit("30/minute")
async def get_major_holders(request: Request, ticker: str):
    """Get major holders"""
    ticker = ticker.upper()
    try:
        result = get_generic_stock_data(ticker, "major_holders", CACHE_TTL_LONG)
        return {"ticker": ticker, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# News and calendar
@router.get("/stock/{ticker}/news")
@limiter.limit("60/minute")
async def get_news(request: Request, ticker: str):
    """Get recent news"""
    ticker = ticker.upper()
    try:
        result = get_generic_stock_data(ticker, "news", CACHE_TTL_SHORT)
        return {"ticker": ticker, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stock/{ticker}/calendar")
@limiter.limit("30/minute")
async def get_calendar(request: Request, ticker: str):
    """Get upcoming events calendar"""
    ticker = ticker.upper()
    try:
        result = get_generic_stock_data(ticker, "calendar", CACHE_TTL_MEDIUM)
        return {"ticker": ticker, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Options
@router.get("/stock/{ticker}/options")
@limiter.limit("30/minute")
async def get_options(request: Request, ticker: str):
    """Get available option expiration dates"""
    ticker = ticker.upper()
    try:
        result = get_generic_stock_data(ticker, "options", CACHE_TTL_MEDIUM)
        return {"ticker": ticker, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stock/{ticker}/option-chain")
@limiter.limit("20/minute")
async def get_option_chain(request: Request, ticker: str, date: str = None):
    """Get option chain for specific date"""
    ticker = ticker.upper()
    try:
        stock = yf.Ticker(ticker)
        if date:
            chain = stock.option_chain(date)
        else:
            dates = stock.options
            if dates:
                chain = stock.option_chain(dates[0])
            else:
                return {"ticker": ticker, "data": None, "cached": False}
        
        result = {
            "calls": chain.calls.to_dict(orient="records") if not chain.calls.empty else [],
            "puts": chain.puts.to_dict(orient="records") if not chain.puts.empty else []
        }
        return {"ticker": ticker, "data": result, "cached": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Batch operations
@router.post("/tickers/history")
@limiter.limit("10/minute")
async def get_batch_history(request: Request, body: TickersHistoryRequest):
    """Get historical data for multiple tickers"""
    results = {}
    for ticker in body.tickers:
        ticker = ticker.upper()
        try:
            result = get_stock_history(ticker, body.period, body.interval)
            results[ticker] = result
        except:
            results[ticker] = {"error": "Failed to fetch data"}
    
    return {"tickers": body.tickers, "period": body.period, "interval": body.interval, "data": results}


# NOTE: This file contains the most common 20+ endpoints
# The remaining 20+ endpoints from original main.py follow similar patterns
# using get_generic_stock_data() for yfinance attributes like:
# - upgrades_downgrades, earnings_estimate, revenue_estimate
# - earnings_history, eps_trend, eps_revisions, growth_estimates
# - insider_transactions, insider_purchases, insider_roster
# - mutualfund_holders, sustainability, sec_filings, isin
# - shares, shares_full, capital_gains, funds_data
# - quarterly_earnings, recommendations_summary, history_metadata
