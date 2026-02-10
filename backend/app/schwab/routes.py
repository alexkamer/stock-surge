"""
Schwab API endpoints for real-time market data
"""

from fastapi import APIRouter, HTTPException, Request, Query
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import List
from loguru import logger

from .schemas import SchwabQuoteResponse, SchwabQuotesResponse, SchwabPriceHistoryResponse
from .service import get_schwab_quote, get_schwab_quotes, get_schwab_price_history, get_schwab_accounts, get_schwab_account_positions, get_schwab_transactions
from .client import SchwabAPIError
from .token_manager import SchwabAuthError, TokenManager


# Create router
router = APIRouter(prefix="/api/schwab", tags=["schwab"])

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@router.get("/status")
@limiter.limit("60/minute")
async def get_schwab_status(request: Request):
    """
    Check Schwab API connection status

    Returns:
        Connection status and token expiry info
    """
    try:
        from ..config import SCHWAB_APP_KEY, SCHWAB_APP_SECRET, SCHWAB_DEV_MODE, SCHWAB_TOKEN_FILE

        token_manager = TokenManager(
            app_key=SCHWAB_APP_KEY,
            app_secret=SCHWAB_APP_SECRET,
            token_file=SCHWAB_TOKEN_FILE,
            dev_mode=SCHWAB_DEV_MODE
        )

        # Try to get a valid token to verify connection
        token = token_manager.get_valid_token()

        return {
            "connected": True,
            "dev_mode": SCHWAB_DEV_MODE,
        }
    except Exception as e:
        logger.error(f"Schwab status check failed: {e}")
        return {
            "connected": False,
            "error": str(e)
        }


@router.get("/quote/{symbol}", response_model=SchwabQuoteResponse)
@limiter.limit("60/minute")
async def get_quote(request: Request, symbol: str):
    """
    Get real-time quote for a single symbol

    Args:
        symbol: Stock ticker symbol (e.g., AAPL)

    Returns:
        Real-time quote data with bid/ask spreads

    Raises:
        404: Symbol not found
        401: Authentication error
        500: API error
    """
    symbol = symbol.upper()

    try:
        result = get_schwab_quote(symbol)
        return {"symbol": symbol, **result}

    except SchwabAuthError as e:
        logger.error(f"Schwab auth error: {e}")
        raise HTTPException(
            status_code=401,
            detail=f"Schwab authentication error: {str(e)}"
        )

    except SchwabAPIError as e:
        error_msg = str(e).lower()

        # Handle specific error cases
        if "not found" in error_msg or "404" in error_msg:
            raise HTTPException(
                status_code=404,
                detail=f"Symbol {symbol} not found"
            )
        elif "rate limit" in error_msg or "429" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please try again later.",
                headers={"Retry-After": "60"}
            )
        else:
            logger.error(f"Schwab API error for {symbol}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Schwab API error: {str(e)}"
            )

    except Exception as e:
        logger.error(f"Unexpected error fetching quote for {symbol}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching quote: {str(e)}"
        )


@router.get("/quotes", response_model=SchwabQuotesResponse)
@limiter.limit("60/minute")
async def get_quotes_batch(
    request: Request,
    symbols: str = Query(..., description="Comma-separated list of symbols (e.g., AAPL,MSFT,GOOGL)")
):
    """
    Get real-time quotes for multiple symbols in a single request

    Args:
        symbols: Comma-separated ticker symbols (e.g., "AAPL,MSFT,GOOGL")

    Returns:
        Dictionary of quotes keyed by symbol

    Raises:
        400: Invalid symbols parameter
        401: Authentication error
        500: API error
    """
    # Parse symbols from comma-separated string
    if not symbols:
        raise HTTPException(
            status_code=400,
            detail="symbols parameter is required"
        )

    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]

    if not symbol_list:
        raise HTTPException(
            status_code=400,
            detail="At least one symbol is required"
        )

    # Limit to 50 symbols per request
    if len(symbol_list) > 50:
        raise HTTPException(
            status_code=400,
            detail="Maximum 50 symbols per request"
        )

    try:
        result = get_schwab_quotes(symbol_list)
        return {"quotes": result["data"], "cached": result["cached"]}

    except SchwabAuthError as e:
        logger.error(f"Schwab auth error: {e}")
        raise HTTPException(
            status_code=401,
            detail=f"Schwab authentication error: {str(e)}"
        )

    except SchwabAPIError as e:
        error_msg = str(e).lower()

        if "rate limit" in error_msg or "429" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please try again later.",
                headers={"Retry-After": "60"}
            )
        else:
            logger.error(f"Schwab API error for batch quotes: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Schwab API error: {str(e)}"
            )

    except Exception as e:
        logger.error(f"Unexpected error fetching batch quotes: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching quotes: {str(e)}"
        )


@router.get("/history/{symbol}", response_model=SchwabPriceHistoryResponse)
@limiter.limit("60/minute")
async def get_price_history(
    request: Request,
    symbol: str,
    period: str = Query(default="1mo", description="Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)"),
    interval: str = Query(default="1d", description="Data interval (1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo)")
):
    """
    Get historical price data for a symbol

    Args:
        symbol: Stock ticker symbol
        period: Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
        interval: Data interval (1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo)

    Returns:
        Historical OHLCV data

    Raises:
        400: Invalid period or interval
        404: Symbol not found
        401: Authentication error
        500: API error
    """
    symbol = symbol.upper()

    try:
        result = get_schwab_price_history(symbol, period, interval)
        return {"symbol": symbol, **result}

    except ValueError as e:
        # Invalid period or interval
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    except SchwabAuthError as e:
        logger.error(f"Schwab auth error: {e}")
        raise HTTPException(
            status_code=401,
            detail=f"Schwab authentication error: {str(e)}"
        )

    except SchwabAPIError as e:
        error_msg = str(e).lower()

        if "not found" in error_msg or "404" in error_msg:
            raise HTTPException(
                status_code=404,
                detail=f"Symbol {symbol} not found"
            )
        elif "rate limit" in error_msg or "429" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please try again later.",
                headers={"Retry-After": "60"}
            )
        else:
            logger.error(f"Schwab API error for {symbol} history: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Schwab API error: {str(e)}"
            )

    except Exception as e:
        logger.error(f"Unexpected error fetching history for {symbol}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching price history: {str(e)}"
        )


@router.get("/accounts")
@limiter.limit("30/minute")
async def get_accounts(request: Request):
    """
    Get all linked Schwab accounts

    Returns:
        List of accounts with basic information

    Raises:
        401: Authentication error
        500: API error
    """
    try:
        result = get_schwab_accounts()
        return result

    except SchwabAuthError as e:
        logger.error(f"Schwab auth error: {e}")
        raise HTTPException(
            status_code=401,
            detail=f"Schwab authentication error: {str(e)}"
        )

    except SchwabAPIError as e:
        logger.error(f"Schwab API error getting accounts: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Schwab API error: {str(e)}"
        )

    except Exception as e:
        logger.error(f"Unexpected error getting accounts: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching accounts: {str(e)}"
        )


@router.get("/accounts/{account_hash}/transactions")
@limiter.limit("30/minute")
async def get_transactions(
    request: Request,
    account_hash: str,
    start_date: str = Query(..., description="Start date YYYY-MM-DD"),
    end_date: str = Query(..., description="End date YYYY-MM-DD")
):
    """
    Get transaction history with realized gains/losses

    Args:
        account_hash: Encrypted account number
        start_date: Start date for transactions
        end_date: End date for transactions

    Returns:
        Transaction history with realized P/L calculations
    """
    try:
        result = get_schwab_transactions(account_hash, start_date, end_date)
        return result

    except SchwabAuthError as e:
        logger.error(f"Schwab auth error: {e}")
        raise HTTPException(
            status_code=401,
            detail=f"Schwab authentication error: {str(e)}"
        )

    except SchwabAPIError as e:
        logger.error(f"Schwab API error getting transactions: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Schwab API error: {str(e)}"
        )

    except Exception as e:
        logger.error(f"Unexpected error getting transactions: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching transactions: {str(e)}"
        )


@router.get("/accounts/{account_hash}/positions")
@limiter.limit("30/minute")
async def get_account_positions(request: Request, account_hash: str):
    """
    Get positions for a specific Schwab account

    Args:
        account_hash: Encrypted account number

    Returns:
        Account details with positions

    Raises:
        404: Account not found
        401: Authentication error
        500: API error
    """
    try:
        result = get_schwab_account_positions(account_hash)
        return result

    except SchwabAuthError as e:
        logger.error(f"Schwab auth error: {e}")
        raise HTTPException(
            status_code=401,
            detail=f"Schwab authentication error: {str(e)}"
        )

    except SchwabAPIError as e:
        error_msg = str(e).lower()

        if "not found" in error_msg or "404" in error_msg:
            raise HTTPException(
                status_code=404,
                detail=f"Account {account_hash} not found"
            )
        else:
            logger.error(f"Schwab API error for account {account_hash}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Schwab API error: {str(e)}"
            )

    except Exception as e:
        logger.error(f"Unexpected error getting positions for {account_hash}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching account positions: {str(e)}"
        )
