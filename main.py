"""
Stock Surge API - Efficient FastAPI backend for yfinance data
Features: Rate limiting, caching, error handling, optimized runtime
"""

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import yfinance as yf
from typing import Optional, List, Any, Dict
import redis
import json
import os
from datetime import datetime
import asyncio
from sqlalchemy.orm import Session

# Import auth and database modules
import auth
import models
from database import get_db, init_db

# Configure yfinance for optimal performance
yf.config.network.retries = 2  # Auto-retry transient errors
yf.config.debug.hide_exceptions = False  # Let FastAPI handle errors


# Pydantic models for request/response bodies
class TickersRequest(BaseModel):
    tickers: List[str] = Field(..., json_schema_extra={"example": ["AAPL", "MSFT", "GOOGL"]})


class TickersHistoryRequest(BaseModel):
    tickers: List[str] = Field(..., json_schema_extra={"example": ["AAPL", "MSFT"]})
    period: str = Field(default="1mo", json_schema_extra={"example": "1mo"})
    interval: str = Field(default="1d", json_schema_extra={"example": "1d"})


# Auth request/response models
class RegisterRequest(BaseModel):
    email: EmailStr = Field(..., json_schema_extra={"example": "user@example.com"})
    password: str = Field(..., min_length=8, json_schema_extra={"example": "password123"})
    name: Optional[str] = Field(None, json_schema_extra={"example": "John Doe"})


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str]
    created_at: str


class WatchlistItem(BaseModel):
    ticker: str = Field(..., json_schema_extra={"example": "AAPL"})
    position: Optional[int] = Field(None, json_schema_extra={"example": 0})


class PreferencesRequest(BaseModel):
    theme: Optional[str] = Field(None, json_schema_extra={"example": "dark"})
    chart_type: Optional[str] = Field(None, json_schema_extra={"example": "candlestick"})
    default_period: Optional[str] = Field(None, json_schema_extra={"example": "1mo"})
    default_interval: Optional[str] = Field(None, json_schema_extra={"example": "1d"})
    preferences: Optional[dict] = Field(None, json_schema_extra={"example": {}})


# Response models
class PriceData(BaseModel):
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
    ticker: str = Field(..., json_schema_extra={"example": "AAPL"})
    data: PriceData
    cached: bool = Field(..., json_schema_extra={"example": False})


class OHLCVData(BaseModel):
    date: str = Field(..., json_schema_extra={"example": "2026-02-04T00:00:00-05:00"})
    open: float = Field(..., json_schema_extra={"example": 272.31})
    high: float = Field(..., json_schema_extra={"example": 278.95})
    low: float = Field(..., json_schema_extra={"example": 272.29})
    close: float = Field(..., json_schema_extra={"example": 276.49})
    volume: int = Field(..., json_schema_extra={"example": 90320670})


class HistoryData(BaseModel):
    period: str = Field(..., json_schema_extra={"example": "1mo"})
    interval: str = Field(..., json_schema_extra={"example": "1d"})
    count: int = Field(..., json_schema_extra={"example": 20})
    data: List[OHLCVData]


class HistoryResponse(BaseModel):
    ticker: str = Field(..., json_schema_extra={"example": "AAPL"})
    data: HistoryData
    cached: bool = Field(..., json_schema_extra={"example": False})


class DividendData(BaseModel):
    date: str = Field(..., json_schema_extra={"example": "2025-11-10T00:00:00-05:00"})
    amount: float = Field(..., json_schema_extra={"example": 0.26})


class DividendsResponse(BaseModel):
    ticker: str = Field(..., json_schema_extra={"example": "AAPL"})
    data: List[DividendData]
    cached: bool = Field(..., json_schema_extra={"example": False})


class CompanyInfo(BaseModel):
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
    ticker: str = Field(..., json_schema_extra={"example": "AAPL"})
    data: CompanyInfo
    cached: bool = Field(..., json_schema_extra={"example": False})


class MarketIndexData(BaseModel):
    symbol: str = Field(..., json_schema_extra={"example": "^GSPC"})
    short_name: str = Field(..., json_schema_extra={"example": "S&P 500"})
    regular_market_price: float = Field(..., json_schema_extra={"example": 6798.4})
    regular_market_change: float = Field(..., json_schema_extra={"example": -84.32})
    regular_market_change_percent: float = Field(..., json_schema_extra={"example": -1.225})
    regular_market_previous_close: float = Field(..., json_schema_extra={"example": 6882.72})
    market_state: str = Field(..., json_schema_extra={"example": "POST"})


class MarketOverviewResponse(BaseModel):
    market_id: str = Field(..., json_schema_extra={"example": "US"})
    market_name: str = Field(..., json_schema_extra={"example": "U.S. markets"})
    status: str = Field(..., json_schema_extra={"example": "closed"})
    indices: Dict[str, MarketIndexData]
    cached: bool = Field(..., json_schema_extra={"example": False})


class AvailableMarket(BaseModel):
    id: str = Field(..., json_schema_extra={"example": "US"})
    name: str = Field(..., json_schema_extra={"example": "U.S. Markets"})
    description: str = Field(..., json_schema_extra={"example": "Major U.S. indices including S&P 500, Dow, and Nasdaq"})


class SectorOverview(BaseModel):
    companies_count: int
    market_cap: float
    description: str
    industries_count: int
    market_weight: float
    employee_count: int


class SectorResponse(BaseModel):
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
    companies_count: int
    market_cap: float
    description: str
    market_weight: float
    employee_count: int


class IndustryResponse(BaseModel):
    key: str
    name: str
    symbol: str
    sector_key: str
    sector_name: str
    overview: IndustryOverview
    top_performing_companies: List[Dict[str, Any]]
    top_growth_companies: List[Dict[str, Any]]
    cached: bool


def make_json_serializable(obj: Any) -> Any:
    """Convert non-JSON-serializable objects to serializable format"""
    import math
    import numpy as np

    if isinstance(obj, dict):
        return {k: make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [make_json_serializable(v) for v in obj]
    elif hasattr(obj, 'item'):  # numpy types
        val = obj.item()
        # Handle NaN and infinity
        if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
            return None
        return val
    elif isinstance(obj, float):
        # Handle NaN and infinity in regular floats
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif obj is None or isinstance(obj, (str, int, bool)):
        return obj
    else:
        return str(obj)


# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    print("✓ Database initialized")
    yield
    # Shutdown (if needed)


# Initialize FastAPI
app = FastAPI(
    title="Stock Surge API",
    version="1.0.0",
    description="Efficient stock data API powered by yfinance",
    lifespan=lifespan
)

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis cache setup (optional - falls back to in-memory if Redis unavailable)
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    redis_client.ping()
    USE_REDIS = True
    print("✓ Redis cache enabled")
except:
    USE_REDIS = False
    print("⚠ Redis not available, using in-memory cache only")
    # Simple in-memory fallback
    memory_cache = {}


def get_cache(key: str) -> Optional[dict]:
    """Get cached data with TTL awareness"""
    if USE_REDIS:
        data = redis_client.get(key)
        return json.loads(data) if data else None
    else:
        item = memory_cache.get(key)
        if item:
            data, expiry = item
            if datetime.now().timestamp() < expiry:
                return data
            else:
                del memory_cache[key]
    return None


def set_cache(key: str, value: dict, ttl_seconds: int):
    """Set cached data with TTL"""
    if USE_REDIS:
        redis_client.setex(key, ttl_seconds, json.dumps(value))
    else:
        expiry = datetime.now().timestamp() + ttl_seconds
        memory_cache[key] = (value, expiry)


@app.get("/")
def root():
    """API information and available endpoints"""
    return {
        "name": "Stock Surge API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "auth": {
                "register": "POST /auth/register - User registration",
                "login": "POST /auth/login - Login with email/password",
                "refresh": "POST /auth/refresh - Refresh access token",
                "me": "GET /auth/me - Get current user (requires auth)"
            },
            "user": {
                "watchlist_get": "GET /user/watchlist - Get user's watchlist (requires auth)",
                "watchlist_add": "POST /user/watchlist - Add ticker to watchlist (requires auth)",
                "watchlist_remove": "DELETE /user/watchlist/{ticker} - Remove from watchlist (requires auth)",
                "preferences_get": "GET /user/preferences - Get user preferences (requires auth)",
                "preferences_update": "PUT /user/preferences - Update preferences (requires auth)"
            },
            "core": {
                "price": "/stock/{ticker}/price - Current price (fast_info)",
                "info": "/stock/{ticker}/info - Company information",
                "history": "/stock/{ticker}/history?period=1mo&interval=1d - Historical OHLCV"
            },
            "corporate_actions": {
                "dividends": "/stock/{ticker}/dividends - Dividend history",
                "splits": "/stock/{ticker}/splits - Stock split history",
                "actions": "/stock/{ticker}/actions - All corporate actions"
            },
            "financials": {
                "income": "/stock/{ticker}/financials/income?frequency=yearly - Income statement",
                "balance": "/stock/{ticker}/financials/balance-sheet?frequency=yearly - Balance sheet",
                "cashflow": "/stock/{ticker}/financials/cash-flow?frequency=yearly - Cash flow"
            },
            "analyst_data": {
                "recommendations": "/stock/{ticker}/recommendations - Analyst ratings",
                "price_targets": "/stock/{ticker}/analyst-price-targets - Price targets",
                "upgrades_downgrades": "/stock/{ticker}/upgrades-downgrades - Rating changes",
                "earnings": "/stock/{ticker}/earnings - Earnings history",
                "earnings_dates": "/stock/{ticker}/earnings-dates - Earnings calendar",
                "earnings_estimate": "/stock/{ticker}/earnings-estimate - EPS forecasts",
                "revenue_estimate": "/stock/{ticker}/revenue-estimate - Revenue forecasts",
                "earnings_history": "/stock/{ticker}/earnings-history - Actual vs estimates",
                "eps_trend": "/stock/{ticker}/eps-trend - EPS estimate changes",
                "eps_revisions": "/stock/{ticker}/eps-revisions - Estimate revision counts",
                "growth_estimates": "/stock/{ticker}/growth-estimates - Growth projections"
            },
            "ownership": {
                "institutional": "/stock/{ticker}/institutional-holders - Institutional ownership",
                "major": "/stock/{ticker}/major-holders - Major shareholders",
                "mutualfund": "/stock/{ticker}/mutualfund-holders - Mutual fund ownership"
            },
            "insider_trading": {
                "transactions": "/stock/{ticker}/insider-transactions - All insider trades",
                "purchases": "/stock/{ticker}/insider-purchases - Insider buys only",
                "roster": "/stock/{ticker}/insider-roster - Company insiders list"
            },
            "options": {
                "dates": "/stock/{ticker}/options - Available expiration dates",
                "chain": "/stock/{ticker}/option-chain?date=YYYY-MM-DD - Options chain data"
            },
            "esg_compliance": {
                "sustainability": "/stock/{ticker}/sustainability - ESG ratings",
                "sec_filings": "/stock/{ticker}/sec-filings - Recent SEC filings"
            },
            "other": {
                "news": "/stock/{ticker}/news?count=10 - Recent news",
                "calendar": "/stock/{ticker}/calendar - Events calendar",
                "batch": "/stock/batch/history - Batch historical data"
            },
            "multi_ticker": {
                "tickers_news": "POST /tickers/news - Multi-ticker news (Tickers class)",
                "tickers_history": "POST /tickers/history - Multi-ticker history (Tickers class)",
                "compare": "GET /tickers/compare?tickers=AAPL,MSFT,GOOGL - Compare multiple tickers"
            },
            "real_time": {
                "websocket_live": "WS /ws/live/{tickers} - Real-time price streaming (WebSocket)"
            }
        },
        "features": [
            "Rate limiting per endpoint",
            "Smart caching with TTL",
            "Redis or in-memory cache",
            "Automatic retry on transient errors",
            "CORS enabled"
        ]
    }


# ===========================
# AUTHENTICATION ENDPOINTS
# ===========================

@app.post("/auth/register", response_model=UserResponse)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user account.
    Rate limited to 5 requests per minute to prevent abuse.
    """
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == body.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Create new user
    hashed_password = auth.hash_password(body.password)
    new_user = models.User(
        email=body.email,
        password_hash=hashed_password,
        name=body.name
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create default preferences
    preferences = models.UserPreferences(user_id=new_user.id)
    db.add(preferences)
    db.commit()

    return {
        "id": str(new_user.id),
        "email": new_user.email,
        "name": new_user.name,
        "created_at": new_user.created_at.isoformat()
    }


@app.post("/auth/login", response_model=LoginResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login with email and password.
    Returns access token (30 min) and refresh token (7 days).
    Rate limited to 10 requests per minute.
    """
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )

    # Create tokens
    access_token = auth.create_access_token(data={"sub": user.email})
    refresh_token = auth.create_refresh_token(data={"sub": user.email})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name
        }
    }


@app.post("/auth/refresh")
@limiter.limit("20/minute")
async def refresh_token(
    request: Request,
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token.
    Returns new access token.
    """
    try:
        payload = auth.verify_token(refresh_token, token_type="refresh")
        email = payload.get("sub")

        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Verify user still exists
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        # Create new access token
        new_access_token = auth.create_access_token(data={"sub": email})

        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }

    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")


@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: models.User = Depends(auth.get_current_user)):
    """
    Get current authenticated user information.
    Requires valid access token in Authorization header.
    """
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.name,
        "created_at": current_user.created_at.isoformat()
    }


# ===========================
# USER DATA ENDPOINTS
# ===========================

@app.get("/user/watchlist")
@limiter.limit("60/minute")
async def get_watchlist(
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's saved watchlist.
    Returns list of tickers sorted by position.
    """
    watchlist = db.query(models.Watchlist).filter(
        models.Watchlist.user_id == current_user.id
    ).order_by(models.Watchlist.position).all()

    return {
        "user_id": str(current_user.id),
        "tickers": [
            {
                "ticker": item.ticker,
                "position": item.position,
                "created_at": item.created_at.isoformat()
            }
            for item in watchlist
        ]
    }


@app.post("/user/watchlist")
@limiter.limit("60/minute")
async def add_to_watchlist(
    request: Request,
    body: WatchlistItem,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a ticker to user's watchlist.
    If ticker already exists, updates position.
    """
    ticker = body.ticker.upper()

    # Check if ticker already exists
    existing = db.query(models.Watchlist).filter(
        models.Watchlist.user_id == current_user.id,
        models.Watchlist.ticker == ticker
    ).first()

    if existing:
        # Update position if provided
        if body.position is not None:
            existing.position = body.position
            db.commit()
        return {"message": "Ticker already in watchlist", "ticker": ticker}

    # Get next position if not provided
    if body.position is None:
        max_position = db.query(models.Watchlist).filter(
            models.Watchlist.user_id == current_user.id
        ).count()
        position = max_position
    else:
        position = body.position

    # Add new watchlist item
    new_item = models.Watchlist(
        user_id=current_user.id,
        ticker=ticker,
        position=position
    )

    db.add(new_item)
    db.commit()

    return {
        "message": "Ticker added to watchlist",
        "ticker": ticker,
        "position": position
    }


@app.delete("/user/watchlist/{ticker}")
@limiter.limit("60/minute")
async def remove_from_watchlist(
    request: Request,
    ticker: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a ticker from user's watchlist.
    """
    ticker = ticker.upper()

    item = db.query(models.Watchlist).filter(
        models.Watchlist.user_id == current_user.id,
        models.Watchlist.ticker == ticker
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Ticker not in watchlist")

    db.delete(item)
    db.commit()

    return {"message": "Ticker removed from watchlist", "ticker": ticker}


@app.get("/user/preferences")
@limiter.limit("60/minute")
async def get_preferences(
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user preferences (theme, chart settings, etc.).
    """
    prefs = db.query(models.UserPreferences).filter(
        models.UserPreferences.user_id == current_user.id
    ).first()

    if not prefs:
        # Create default preferences if not exists
        prefs = models.UserPreferences(user_id=current_user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)

    return {
        "user_id": str(current_user.id),
        "theme": prefs.theme,
        "chart_type": prefs.chart_type,
        "default_period": prefs.default_period,
        "default_interval": prefs.default_interval,
        "preferences": prefs.preferences or {}
    }


@app.put("/user/preferences")
@limiter.limit("60/minute")
async def update_preferences(
    request: Request,
    body: PreferencesRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user preferences.
    """
    prefs = db.query(models.UserPreferences).filter(
        models.UserPreferences.user_id == current_user.id
    ).first()

    if not prefs:
        prefs = models.UserPreferences(user_id=current_user.id)
        db.add(prefs)

    # Update fields if provided
    if body.theme is not None:
        prefs.theme = body.theme
    if body.chart_type is not None:
        prefs.chart_type = body.chart_type
    if body.default_period is not None:
        prefs.default_period = body.default_period
    if body.default_interval is not None:
        prefs.default_interval = body.default_interval
    if body.preferences is not None:
        prefs.preferences = body.preferences

    db.commit()
    db.refresh(prefs)

    return {
        "message": "Preferences updated",
        "theme": prefs.theme,
        "chart_type": prefs.chart_type,
        "default_period": prefs.default_period,
        "default_interval": prefs.default_interval,
        "preferences": prefs.preferences or {}
    }


# ===========================
# STOCK DATA ENDPOINTS
# ===========================

@app.get("/markets/available")
@limiter.limit("30/minute")
async def get_available_markets(request: Request):
    """
    Get list of available markets that can be queried.
    """
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


@app.get("/market/{market_id}/overview", response_model=MarketOverviewResponse)
@limiter.limit("30/minute")
async def get_market_overview(request: Request, market_id: str = "US"):
    """
    Get market overview with major indices for a specific market.
    Uses yfinance Market API for efficient data retrieval.
    Cached for 60 seconds.

    Supported markets: US, GB, ASIA, EUROPE, RATES, COMMODITIES, CURRENCIES, CRYPTOCURRENCIES
    """
    market_id = market_id.upper()
    cache_key = f"market_overview:{market_id}"

    # Check cache
    cached = get_cache(cache_key)
    if cached:
        return {
            "market_id": market_id,
            "market_name": cached.get("market_name", market_id),
            "status": cached.get("status", "unknown"),
            "indices": cached.get("indices", {}),
            "cached": True
        }

    try:
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

        set_cache(cache_key, result, 60)  # 60 second cache
        return {
            "market_id": market_id,
            "market_name": result["market_name"],
            "status": result["status"],
            "indices": indices,
            "cached": False
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching market overview: {str(e)}"
        )


@app.get("/sector/{sector_key}", response_model=SectorResponse)
@limiter.limit("30/minute")
async def get_sector(request: Request, sector_key: str):
    """
    Get sector information including overview, top companies, industries, ETFs, and mutual funds.
    Cached for 1 hour.

    Common sector keys: technology, healthcare, financial-services, consumer-cyclical,
    industrials, communication-services, energy, basic-materials, consumer-defensive,
    real-estate, utilities
    """
    cache_key = f"sector:{sector_key}"

    # Check cache
    cached = get_cache(cache_key)
    if cached:
        return {**cached, "cached": True}

    try:
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

        set_cache(cache_key, result, 3600)  # 1 hour cache
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching sector data: {str(e)}"
        )


@app.get("/industry/{industry_key}", response_model=IndustryResponse)
@limiter.limit("30/minute")
async def get_industry(request: Request, industry_key: str):
    """
    Get industry information including overview, top performing and growth companies.
    Cached for 1 hour.

    Example industry keys: software-infrastructure, semiconductors,
    biotechnology, banks-regional, oil-gas-exploration
    """
    cache_key = f"industry:{industry_key}"

    # Check cache
    cached = get_cache(cache_key)
    if cached:
        return {**cached, "cached": True}

    try:
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

        set_cache(cache_key, result, 3600)  # 1 hour cache
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching industry data: {str(e)}"
        )


@app.get("/stock/{ticker}/price", response_model=PriceResponse)
@limiter.limit("60/minute")
async def get_current_price(request: Request, ticker: str):
    """
    Get current price using fast_info (optimized for speed).
    Cached for 30 seconds.
    """
    ticker = ticker.upper()
    cache_key = f"price:{ticker}"

    # Check cache
    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        fast_info = stock.fast_info

        # Extract data from fast_info
        result = {
            "last_price": fast_info.last_price,
            "open": fast_info.open,
            "day_high": fast_info.day_high,
            "day_low": fast_info.day_low,
            "previous_close": fast_info.previous_close,
            "volume": fast_info.last_volume,
            "currency": fast_info.currency,
            "exchange": fast_info.exchange,
            "market_cap": fast_info.market_cap,
            "timestamp": datetime.now().isoformat()
        }

        set_cache(cache_key, result, 30)  # 30 second cache
        return {"ticker": ticker, "data": result, "cached": False}

    except yf.YFRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": "60"}
        )
    except yf.YFTzMissingError:
        raise HTTPException(
            status_code=404,
            detail=f"Ticker {ticker} not found or delisted"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching price: {str(e)}"
        )


@app.get("/stock/{ticker}/info", response_model=InfoResponse)
@limiter.limit("30/minute")
async def get_stock_info(request: Request, ticker: str):
    """
    Get comprehensive company information.
    Cached for 5 minutes (less frequently changing data).
    """
    ticker = ticker.upper()
    cache_key = f"info:{ticker}"

    # Check cache
    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        info = stock.info

        # Extract key fields (avoid sending massive info dict)
        result = {
            "name": info.get("longName", "N/A"),
            "symbol": info.get("symbol", ticker),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "description": info.get("longBusinessSummary"),
            "website": info.get("website"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "forward_pe": info.get("forwardPE"),
            "dividend_yield": info.get("dividendYield"),
            "beta": info.get("beta"),
            "52_week_high": info.get("fiftyTwoWeekHigh"),
            "52_week_low": info.get("fiftyTwoWeekLow"),
            "employees": info.get("fullTimeEmployees"),
            "country": info.get("country"),
            "city": info.get("city"),
        }

        set_cache(cache_key, result, 300)  # 5 minute cache
        return {"ticker": ticker, "data": result, "cached": False}

    except yf.YFRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": "60"}
        )
    except yf.YFTzMissingError:
        raise HTTPException(
            status_code=404,
            detail=f"Ticker {ticker} not found"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching info: {str(e)}"
        )


@app.get("/stock/{ticker}/history", response_model=HistoryResponse)
@limiter.limit("30/minute")
async def get_stock_history(
    request: Request,
    ticker: str,
    period: str = "1mo",
    interval: str = "1d"
):
    """
    Get historical OHLCV data.

    Valid periods: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    Valid intervals: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo

    Note: Intraday data (1m-90m) only available for last 60 days.
    Cached based on data age (historical data cached longer).
    """
    ticker = ticker.upper()
    cache_key = f"history:{ticker}:{period}:{interval}"

    # Check cache
    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period, interval=interval, timeout=15)

        if hist.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No historical data found for {ticker}"
            )

        # Convert to JSON-friendly format
        result = {
            "period": period,
            "interval": interval,
            "count": len(hist),
            "data": [
                {
                    "date": index.isoformat(),
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "volume": int(row["Volume"]),
                }
                for index, row in hist.iterrows()
            ]
        }

        # Cache TTL based on interval (older data = longer cache)
        if interval in ["1m", "2m", "5m", "15m", "30m"]:
            cache_ttl = 60  # 1 minute for intraday
        elif interval in ["60m", "90m", "1h"]:
            cache_ttl = 300  # 5 minutes for hourly
        else:
            cache_ttl = 1800  # 30 minutes for daily+

        set_cache(cache_key, result, cache_ttl)
        return {"ticker": ticker, "data": result, "cached": False}

    except yf.YFInvalidPeriodError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid period or interval: {str(e)}"
        )
    except yf.YFRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": "60"}
        )
    except yf.YFTzMissingError:
        raise HTTPException(
            status_code=404,
            detail=f"Ticker {ticker} not found"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching history: {str(e)}"
        )


@app.post("/stock/batch/history")
@limiter.limit("10/minute")
async def get_batch_history(
    request: Request,
    tickers: List[str],
    period: str = "1mo",
    interval: str = "1d"
):
    """
    Get historical data for multiple tickers efficiently (uses threading).

    Request body: {"tickers": ["AAPL", "MSFT", "GOOGL"], "period": "1mo", "interval": "1d"}

    Limited to 10 requests/minute due to batch operation intensity.
    """
    if len(tickers) > 50:
        raise HTTPException(
            status_code=400,
            detail="Maximum 50 tickers per batch request"
        )

    tickers = [t.upper() for t in tickers]
    cache_key = f"batch:{','.join(sorted(tickers))}:{period}:{interval}"

    # Check cache
    cached = get_cache(cache_key)
    if cached:
        return {"tickers": tickers, "data": cached, "cached": True}

    try:
        # Use yfinance download with threading for efficiency
        data = yf.download(
            tickers,
            period=period,
            interval=interval,
            threads=True,
            progress=False,
            timeout=30
        )

        if data.empty:
            raise HTTPException(
                status_code=404,
                detail="No data found for provided tickers"
            )

        # Convert to JSON-friendly format
        result = {}
        for ticker in tickers:
            try:
                if len(tickers) == 1:
                    ticker_data = data
                else:
                    ticker_data = data.xs(ticker, level=1, axis=1)

                result[ticker] = [
                    {
                        "date": index.isoformat(),
                        "open": float(row["Open"]),
                        "high": float(row["High"]),
                        "low": float(row["Low"]),
                        "close": float(row["Close"]),
                        "volume": int(row["Volume"]),
                    }
                    for index, row in ticker_data.iterrows()
                ]
            except KeyError:
                result[ticker] = None  # Ticker not found

        response_data = {
            "period": period,
            "interval": interval,
            "data": result
        }

        # Cache for 30 minutes
        set_cache(cache_key, response_data, 1800)
        return {"tickers": tickers, "data": response_data, "cached": False}

    except yf.YFRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": "120"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching batch data: {str(e)}"
        )


@app.get("/stock/{ticker}/dividends", response_model=DividendsResponse)
@limiter.limit("30/minute")
async def get_dividends(request: Request, ticker: str, period: str = "max"):
    """
    Get dividend history for a ticker.
    Cached for 1 hour (dividends don't change frequently).
    """
    ticker = ticker.upper()
    cache_key = f"dividends:{ticker}:{period}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        dividends = stock.dividends

        if dividends.empty:
            return {"ticker": ticker, "data": [], "message": "No dividend history"}

        result = [
            {"date": index.isoformat(), "amount": float(value)}
            for index, value in dividends.items()
        ]

        set_cache(cache_key, result, 3600)  # 1 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching dividends: {str(e)}"
        )


@app.get("/stock/{ticker}/splits")
@limiter.limit("30/minute")
async def get_splits(request: Request, ticker: str):
    """
    Get stock split history.
    Cached for 1 hour.
    """
    ticker = ticker.upper()
    cache_key = f"splits:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        splits = stock.splits

        if splits.empty:
            return {"ticker": ticker, "data": [], "message": "No split history"}

        result = [
            {"date": index.isoformat(), "ratio": float(value)}
            for index, value in splits.items()
        ]

        set_cache(cache_key, result, 3600)  # 1 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching splits: {str(e)}"
        )


@app.get("/stock/{ticker}/actions")
@limiter.limit("30/minute")
async def get_actions(request: Request, ticker: str):
    """
    Get all corporate actions (dividends + splits combined).
    Cached for 1 hour.
    """
    ticker = ticker.upper()
    cache_key = f"actions:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        actions = stock.actions

        if actions.empty:
            return {"ticker": ticker, "data": [], "message": "No corporate actions"}

        result = [
            {
                "date": index.isoformat(),
                "dividends": float(row.get("Dividends", 0)) if "Dividends" in row else None,
                "stock_splits": float(row.get("Stock Splits", 0)) if "Stock Splits" in row else None,
            }
            for index, row in actions.iterrows()
        ]

        set_cache(cache_key, result, 3600)  # 1 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching actions: {str(e)}"
        )


@app.get("/stock/{ticker}/financials/income")
@limiter.limit("20/minute")
async def get_income_statement(
    request: Request,
    ticker: str,
    frequency: str = "yearly"
):
    """
    Get income statement.
    frequency: 'yearly', 'quarterly', or 'ttm' (trailing twelve months)
    Cached for 6 hours (financial data doesn't change often).
    """
    ticker = ticker.upper()
    cache_key = f"income:{ticker}:{frequency}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)

        if frequency == "quarterly":
            stmt = stock.quarterly_income_stmt
        elif frequency == "ttm":
            stmt = stock.ttm_income_stmt
        else:
            stmt = stock.income_stmt

        if stmt.empty:
            return {"ticker": ticker, "data": {}, "message": "No income statement data"}

        # Convert DataFrame columns (timestamps) to strings
        stmt.columns = [col.strftime('%Y-%m-%d') if hasattr(col, 'strftime') else str(col) for col in stmt.columns]

        # Convert to dict with proper serialization
        result = make_json_serializable(stmt.to_dict(orient='index'))

        set_cache(cache_key, result, 21600)  # 6 hour cache
        return {"ticker": ticker, "frequency": frequency, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching income statement: {str(e)}"
        )


@app.get("/stock/{ticker}/financials/balance-sheet")
@limiter.limit("20/minute")
async def get_balance_sheet(
    request: Request,
    ticker: str,
    frequency: str = "yearly"
):
    """
    Get balance sheet.
    frequency: 'yearly' or 'quarterly'
    Cached for 6 hours.
    """
    ticker = ticker.upper()
    cache_key = f"balance:{ticker}:{frequency}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)

        if frequency == "quarterly":
            stmt = stock.quarterly_balance_sheet
        else:
            stmt = stock.balance_sheet

        if stmt.empty:
            return {"ticker": ticker, "data": {}, "message": "No balance sheet data"}

        # Convert DataFrame columns (timestamps) to strings
        stmt.columns = [col.strftime('%Y-%m-%d') if hasattr(col, 'strftime') else str(col) for col in stmt.columns]

        # Convert to dict with proper serialization
        result = make_json_serializable(stmt.to_dict(orient='index'))

        set_cache(cache_key, result, 21600)  # 6 hour cache
        return {"ticker": ticker, "frequency": frequency, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching balance sheet: {str(e)}"
        )


@app.get("/stock/{ticker}/financials/cash-flow")
@limiter.limit("20/minute")
async def get_cash_flow(
    request: Request,
    ticker: str,
    frequency: str = "yearly"
):
    """
    Get cash flow statement.
    frequency: 'yearly', 'quarterly', or 'ttm'
    Cached for 6 hours.
    """
    ticker = ticker.upper()
    cache_key = f"cashflow:{ticker}:{frequency}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)

        if frequency == "quarterly":
            stmt = stock.quarterly_cash_flow
        elif frequency == "ttm":
            stmt = stock.ttm_cash_flow
        else:
            stmt = stock.cash_flow

        if stmt.empty:
            return {"ticker": ticker, "data": {}, "message": "No cash flow data"}

        # Convert DataFrame columns (timestamps) to strings
        stmt.columns = [col.strftime('%Y-%m-%d') if hasattr(col, 'strftime') else str(col) for col in stmt.columns]

        # Convert to dict with proper serialization
        result = make_json_serializable(stmt.to_dict(orient='index'))

        set_cache(cache_key, result, 21600)  # 6 hour cache
        return {"ticker": ticker, "frequency": frequency, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching cash flow: {str(e)}"
        )


@app.get("/stock/{ticker}/recommendations")
@limiter.limit("30/minute")
async def get_recommendations(request: Request, ticker: str):
    """
    Get analyst recommendations (buy/hold/sell ratings).
    Cached for 1 hour.
    """
    ticker = ticker.upper()
    cache_key = f"recommendations:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        recommendations = stock.recommendations

        if recommendations is None or recommendations.empty:
            return {"ticker": ticker, "data": [], "message": "No recommendations"}

        # Convert to list of dicts
        result = recommendations.reset_index().to_dict(orient="records")

        set_cache(cache_key, result, 3600)  # 1 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching recommendations: {str(e)}"
        )


@app.get("/stock/{ticker}/analyst-price-targets")
@limiter.limit("30/minute")
async def get_analyst_price_targets(request: Request, ticker: str):
    """
    Get analyst price targets (current, low, high, median).
    Cached for 1 hour.
    """
    ticker = ticker.upper()
    cache_key = f"price_targets:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        targets = stock.analyst_price_targets

        if not targets:
            return {"ticker": ticker, "data": {}, "message": "No price targets"}

        set_cache(cache_key, targets, 3600)  # 1 hour cache
        return {"ticker": ticker, "data": targets, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching price targets: {str(e)}"
        )


@app.get("/stock/{ticker}/earnings")
@limiter.limit("30/minute")
async def get_earnings(request: Request, ticker: str):
    """
    Get earnings history and dates.
    Cached for 6 hours.
    """
    ticker = ticker.upper()
    cache_key = f"earnings:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        earnings = stock.earnings

        if earnings is None or earnings.empty:
            return {"ticker": ticker, "data": {}, "message": "No earnings data"}

        # Convert DataFrame to dict with proper serialization
        earnings_reset = earnings.reset_index()
        result = earnings_reset.to_dict(orient="records")

        set_cache(cache_key, result, 21600)  # 6 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching earnings: {str(e)}"
        )


@app.get("/stock/{ticker}/earnings-dates")
@limiter.limit("30/minute")
async def get_earnings_dates(request: Request, ticker: str):
    """
    Get upcoming and historical earnings dates.
    Cached for 6 hours.
    """
    ticker = ticker.upper()
    cache_key = f"earnings_dates:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        dates = stock.earnings_dates

        if dates is None or dates.empty:
            return {"ticker": ticker, "data": [], "message": "No earnings dates"}

        result = dates.reset_index().to_dict(orient="records")

        set_cache(cache_key, result, 21600)  # 6 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching earnings dates: {str(e)}"
        )


@app.get("/stock/{ticker}/institutional-holders")
@limiter.limit("30/minute")
async def get_institutional_holders(request: Request, ticker: str):
    """
    Get institutional ownership data.
    Cached for 24 hours (ownership data updated infrequently).
    """
    ticker = ticker.upper()
    cache_key = f"institutional:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        holders = stock.institutional_holders

        if holders is None or holders.empty:
            return {"ticker": ticker, "data": [], "message": "No institutional holders"}

        result = holders.to_dict(orient="records")

        set_cache(cache_key, result, 86400)  # 24 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching institutional holders: {str(e)}"
        )


@app.get("/stock/{ticker}/major-holders")
@limiter.limit("30/minute")
async def get_major_holders(request: Request, ticker: str):
    """
    Get major shareholders breakdown.
    Cached for 24 hours.
    """
    ticker = ticker.upper()
    cache_key = f"major_holders:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        holders = stock.major_holders

        if holders is None or holders.empty:
            return {"ticker": ticker, "data": [], "message": "No major holders"}

        result = holders.to_dict(orient="records")

        set_cache(cache_key, result, 86400)  # 24 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching major holders: {str(e)}"
        )


@app.get("/stock/{ticker}/news")
@limiter.limit("40/minute")
async def get_news(request: Request, ticker: str, count: int = 10):
    """
    Get recent news articles for a ticker.
    Cached for 15 minutes (news updates frequently).
    """
    ticker = ticker.upper()
    cache_key = f"news:{ticker}:{count}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        news = stock.news

        if not news:
            return {"ticker": ticker, "data": [], "message": "No news available"}

        # Limit to requested count
        result = news[:count]

        set_cache(cache_key, result, 900)  # 15 minute cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching news: {str(e)}"
        )


@app.get("/stock/{ticker}/calendar")
@limiter.limit("30/minute")
async def get_calendar(request: Request, ticker: str):
    """
    Get upcoming events calendar (earnings, dividends, etc.).
    Cached for 6 hours.
    """
    ticker = ticker.upper()
    cache_key = f"calendar:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        calendar = stock.calendar

        if not calendar:
            return {"ticker": ticker, "data": {}, "message": "No calendar data"}

        set_cache(cache_key, calendar, 21600)  # 6 hour cache
        return {"ticker": ticker, "data": calendar, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching calendar: {str(e)}"
        )


@app.post("/tickers/news")
@limiter.limit("30/minute")
async def get_multi_ticker_news(request: Request, body: TickersRequest):
    """
    Get news for multiple tickers at once using yfinance.Tickers.
    More efficient than calling individual ticker news endpoints.

    Request body: {"tickers": ["AAPL", "MSFT", "GOOGL"]}
    Cached for 15 minutes.
    """
    tickers = [t.upper() for t in body.tickers]

    if len(tickers) > 20:
        raise HTTPException(
            status_code=400,
            detail="Maximum 20 tickers per request"
        )
    cache_key = f"multi_news:{','.join(sorted(tickers))}"

    cached = get_cache(cache_key)
    if cached:
        return {"tickers": tickers, "data": cached, "cached": True}

    try:
        # Use Tickers class for batch operations
        tickers_obj = yf.Tickers(' '.join(tickers))
        news_data = tickers_obj.news()

        if not news_data:
            return {"tickers": tickers, "data": {}, "message": "No news available"}

        set_cache(cache_key, news_data, 900)  # 15 minute cache
        return {"tickers": tickers, "data": news_data, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching multi-ticker news: {str(e)}"
        )


@app.post("/tickers/history")
@limiter.limit("10/minute")
async def get_multi_ticker_history(
    request: Request,
    body: TickersHistoryRequest
):
    """
    Get historical data for multiple tickers using yfinance.Tickers.
    This uses the Tickers.history() method which is optimized for batch operations.

    Request body: {"tickers": ["AAPL", "MSFT", "GOOGL"], "period": "1mo", "interval": "1d"}
    Cached for 30 minutes.

    Note: This is similar to the /stock/batch/history endpoint but uses the Tickers class.
    """
    tickers = [t.upper() for t in body.tickers]
    period = body.period
    interval = body.interval

    if len(tickers) > 50:
        raise HTTPException(
            status_code=400,
            detail="Maximum 50 tickers per request"
        )

    cache_key = f"tickers_history:{','.join(sorted(tickers))}:{period}:{interval}"

    cached = get_cache(cache_key)
    if cached:
        return {"tickers": tickers, "data": cached, "cached": True}

    try:
        # Use Tickers class
        tickers_obj = yf.Tickers(' '.join(tickers))

        # Call history method
        hist = tickers_obj.history(
            period=period,
            interval=interval,
            threads=True,
            progress=False,
            timeout=30
        )

        if hist.empty:
            raise HTTPException(
                status_code=404,
                detail="No historical data found"
            )

        # Convert to JSON-friendly format
        result = {}
        for ticker in tickers:
            try:
                if len(tickers) == 1:
                    ticker_data = hist
                else:
                    # Extract data for this ticker
                    ticker_data = hist.xs(ticker, level=1, axis=1)

                result[ticker] = [
                    {
                        "date": index.isoformat(),
                        "open": float(row["Open"]),
                        "high": float(row["High"]),
                        "low": float(row["Low"]),
                        "close": float(row["Close"]),
                        "volume": int(row["Volume"]),
                    }
                    for index, row in ticker_data.iterrows()
                ]
            except KeyError:
                result[ticker] = None  # Ticker not found

        response_data = {
            "period": period,
            "interval": interval,
            "data": result
        }

        set_cache(cache_key, response_data, 1800)  # 30 minute cache
        return {"tickers": tickers, "data": response_data, "cached": False}

    except yf.YFRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": "120"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching multi-ticker history: {str(e)}"
        )


@app.get("/tickers/compare")
@limiter.limit("20/minute")
async def compare_tickers(
    request: Request,
    tickers: str,
    period: str = "1mo",
    interval: str = "1d"
):
    """
    Compare multiple tickers side-by-side with key metrics.
    Query params: tickers=AAPL,MSFT,GOOGL&period=1mo&interval=1d

    Returns historical data plus current price and basic info for comparison.
    Cached for 5 minutes.
    """
    ticker_list = [t.strip().upper() for t in tickers.split(',')]

    if len(ticker_list) > 10:
        raise HTTPException(
            status_code=400,
            detail="Maximum 10 tickers for comparison"
        )

    cache_key = f"compare:{','.join(sorted(ticker_list))}:{period}:{interval}"

    cached = get_cache(cache_key)
    if cached:
        return {"tickers": ticker_list, "data": cached, "cached": True}

    try:
        # Use Tickers class
        tickers_obj = yf.Tickers(' '.join(ticker_list))

        # Get historical data
        hist = tickers_obj.history(
            period=period,
            interval=interval,
            threads=True,
            progress=False
        )

        result = {}

        for ticker in ticker_list:
            try:
                # Get individual ticker for fast_info
                ticker_obj = yf.Ticker(ticker)
                fast_info = ticker_obj.fast_info

                # Extract historical data
                if len(ticker_list) == 1:
                    ticker_hist = hist
                else:
                    ticker_hist = hist.xs(ticker, level=1, axis=1)

                # Calculate performance metrics
                if not ticker_hist.empty:
                    first_close = float(ticker_hist['Close'].iloc[0])
                    last_close = float(ticker_hist['Close'].iloc[-1])
                    period_return = ((last_close - first_close) / first_close) * 100
                    high = float(ticker_hist['High'].max())
                    low = float(ticker_hist['Low'].min())
                    avg_volume = int(ticker_hist['Volume'].mean())
                else:
                    period_return = None
                    high = None
                    low = None
                    avg_volume = None

                result[ticker] = {
                    "current_price": fast_info.last_price,
                    "market_cap": fast_info.market_cap,
                    "currency": fast_info.currency,
                    "period_return_pct": period_return,
                    "period_high": high,
                    "period_low": low,
                    "avg_volume": avg_volume,
                    "52_week_high": fast_info.year_high,
                    "52_week_low": fast_info.year_low,
                    "history": [
                        {
                            "date": index.isoformat(),
                            "close": float(row["Close"])
                        }
                        for index, row in ticker_hist.iterrows()
                    ]
                }

            except Exception as e:
                result[ticker] = {"error": str(e)}

        set_cache(cache_key, result, 300)  # 5 minute cache
        return {"tickers": ticker_list, "period": period, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error comparing tickers: {str(e)}"
        )


@app.get("/stock/{ticker}/options")
@limiter.limit("30/minute")
async def get_options_dates(request: Request, ticker: str):
    """
    Get available option expiration dates for a ticker.
    Cached for 1 hour (option dates don't change frequently).
    """
    ticker = ticker.upper()
    cache_key = f"options_dates:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        options_dates = stock.options

        if not options_dates:
            return {"ticker": ticker, "data": [], "message": "No options available"}

        result = list(options_dates)

        set_cache(cache_key, result, 3600)  # 1 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching options dates: {str(e)}"
        )


@app.get("/stock/{ticker}/option-chain")
@limiter.limit("30/minute")
async def get_option_chain(request: Request, ticker: str, date: Optional[str] = None):
    """
    Get options chain data for a specific expiration date.
    If no date provided, uses the nearest expiration.

    Returns both calls and puts with strike, bid, ask, volume, openInterest, impliedVolatility, etc.
    Cached for 5 minutes (options data updates frequently during market hours).
    """
    ticker = ticker.upper()
    cache_key = f"option_chain:{ticker}:{date}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)

        # Get option chain
        if date:
            chain = stock.option_chain(date)
        else:
            # Use nearest expiration if no date specified
            options_dates = stock.options
            if not options_dates:
                return {"ticker": ticker, "data": {}, "message": "No options available"}
            date = options_dates[0]
            chain = stock.option_chain(date)

        # Convert to JSON-friendly format
        result = {
            "expiration_date": date,
            "calls": chain.calls.to_dict(orient="records") if not chain.calls.empty else [],
            "puts": chain.puts.to_dict(orient="records") if not chain.puts.empty else []
        }

        # Clean up the data
        result = make_json_serializable(result)

        set_cache(cache_key, result, 300)  # 5 minute cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching option chain: {str(e)}"
        )


@app.get("/stock/{ticker}/upgrades-downgrades")
@limiter.limit("30/minute")
async def get_upgrades_downgrades(request: Request, ticker: str):
    """
    Get analyst upgrades and downgrades history.
    Shows firm, grade changes, and action taken.
    Cached for 1 hour.
    """
    ticker = ticker.upper()
    cache_key = f"upgrades_downgrades:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        upgrades = stock.upgrades_downgrades

        if upgrades is None or upgrades.empty:
            return {"ticker": ticker, "data": [], "message": "No upgrades/downgrades data"}

        result = upgrades.reset_index().to_dict(orient="records")

        set_cache(cache_key, result, 3600)  # 1 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching upgrades/downgrades: {str(e)}"
        )


@app.get("/stock/{ticker}/earnings-estimate")
@limiter.limit("30/minute")
async def get_earnings_estimate(request: Request, ticker: str):
    """
    Get analyst earnings estimates for current and future periods.
    Includes number of analysts, avg/low/high estimates, and growth projections.
    Cached for 6 hours.
    """
    ticker = ticker.upper()
    cache_key = f"earnings_estimate:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        estimate = stock.earnings_estimate

        if estimate is None or (hasattr(estimate, 'empty') and estimate.empty):
            return {"ticker": ticker, "data": {}, "message": "No earnings estimates"}

        # Handle DataFrame or dict
        if hasattr(estimate, 'to_dict'):
            result = estimate.to_dict()
        else:
            result = estimate

        set_cache(cache_key, result, 21600)  # 6 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching earnings estimate: {str(e)}"
        )


@app.get("/stock/{ticker}/revenue-estimate")
@limiter.limit("30/minute")
async def get_revenue_estimate(request: Request, ticker: str):
    """
    Get analyst revenue estimates for current and future periods.
    Cached for 6 hours.
    """
    ticker = ticker.upper()
    cache_key = f"revenue_estimate:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        estimate = stock.revenue_estimate

        if estimate is None or (hasattr(estimate, 'empty') and estimate.empty):
            return {"ticker": ticker, "data": {}, "message": "No revenue estimates"}

        # Handle DataFrame or dict
        if hasattr(estimate, 'to_dict'):
            result = estimate.to_dict()
        else:
            result = estimate

        set_cache(cache_key, result, 21600)  # 6 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching revenue estimate: {str(e)}"
        )


@app.get("/stock/{ticker}/earnings-history")
@limiter.limit("30/minute")
async def get_earnings_history(request: Request, ticker: str):
    """
    Get historical earnings vs estimates with surprise percentage.
    Shows epsEstimate, epsActual, epsDifference, and surprisePercent.
    Cached for 6 hours.
    """
    ticker = ticker.upper()
    cache_key = f"earnings_history:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        history = stock.earnings_history

        if history is None or (hasattr(history, 'empty') and history.empty):
            return {"ticker": ticker, "data": {}, "message": "No earnings history"}

        # Handle DataFrame or dict
        if hasattr(history, 'to_dict'):
            result = history.to_dict()
        else:
            result = history

        set_cache(cache_key, result, 21600)  # 6 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching earnings history: {str(e)}"
        )


@app.get("/stock/{ticker}/eps-trend")
@limiter.limit("30/minute")
async def get_eps_trend(request: Request, ticker: str):
    """
    Get EPS estimate trend showing how estimates have changed over time.
    Tracks current, 7/30/60/90 days ago estimates.
    Cached for 6 hours.
    """
    ticker = ticker.upper()
    cache_key = f"eps_trend:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        trend = stock.eps_trend

        if trend is None or (hasattr(trend, 'empty') and trend.empty):
            return {"ticker": ticker, "data": {}, "message": "No EPS trend data"}

        # Handle DataFrame or dict
        if hasattr(trend, 'to_dict'):
            result = trend.to_dict()
        else:
            result = trend

        set_cache(cache_key, result, 21600)  # 6 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching EPS trend: {str(e)}"
        )


@app.get("/stock/{ticker}/eps-revisions")
@limiter.limit("30/minute")
async def get_eps_revisions(request: Request, ticker: str):
    """
    Get EPS estimate revision counts.
    Shows upward/downward revisions in last 7 and 30 days.
    Cached for 6 hours.
    """
    ticker = ticker.upper()
    cache_key = f"eps_revisions:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        revisions = stock.eps_revisions

        if revisions is None or (hasattr(revisions, 'empty') and revisions.empty):
            return {"ticker": ticker, "data": {}, "message": "No EPS revisions data"}

        # Handle DataFrame or dict
        if hasattr(revisions, 'to_dict'):
            result = revisions.to_dict()
        else:
            result = revisions

        set_cache(cache_key, result, 21600)  # 6 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching EPS revisions: {str(e)}"
        )


@app.get("/stock/{ticker}/growth-estimates")
@limiter.limit("30/minute")
async def get_growth_estimates(request: Request, ticker: str):
    """
    Get growth estimates comparing stock vs industry/sector/market.
    Cached for 6 hours.
    """
    ticker = ticker.upper()
    cache_key = f"growth_estimates:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        estimates = stock.growth_estimates

        if estimates is None or (hasattr(estimates, 'empty') and estimates.empty):
            return {"ticker": ticker, "data": {}, "message": "No growth estimates"}

        # Handle DataFrame or dict
        if hasattr(estimates, 'to_dict'):
            result = estimates.to_dict()
        else:
            result = estimates

        set_cache(cache_key, result, 21600)  # 6 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching growth estimates: {str(e)}"
        )


@app.get("/stock/{ticker}/insider-transactions")
@limiter.limit("30/minute")
async def get_insider_transactions(request: Request, ticker: str):
    """
    Get all insider trading transactions (buys and sells).
    Cached for 24 hours.
    """
    ticker = ticker.upper()
    cache_key = f"insider_transactions:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        transactions = stock.insider_transactions

        if transactions is None or transactions.empty:
            return {"ticker": ticker, "data": [], "message": "No insider transactions"}

        result = transactions.reset_index().to_dict(orient="records")

        set_cache(cache_key, result, 86400)  # 24 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching insider transactions: {str(e)}"
        )


@app.get("/stock/{ticker}/insider-purchases")
@limiter.limit("30/minute")
async def get_insider_purchases(request: Request, ticker: str):
    """
    Get insider purchase transactions only (filtered for buys).
    Cached for 24 hours.
    """
    ticker = ticker.upper()
    cache_key = f"insider_purchases:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        purchases = stock.insider_purchases

        if purchases is None or purchases.empty:
            return {"ticker": ticker, "data": [], "message": "No insider purchases"}

        result = purchases.reset_index().to_dict(orient="records")

        set_cache(cache_key, result, 86400)  # 24 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching insider purchases: {str(e)}"
        )


@app.get("/stock/{ticker}/insider-roster")
@limiter.limit("30/minute")
async def get_insider_roster(request: Request, ticker: str):
    """
    Get company insider roster with positions and ownership details.
    Cached for 24 hours.
    """
    ticker = ticker.upper()
    cache_key = f"insider_roster:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        roster = stock.insider_roster_holders

        if roster is None or roster.empty:
            return {"ticker": ticker, "data": [], "message": "No insider roster"}

        result = roster.to_dict(orient="records")

        set_cache(cache_key, result, 86400)  # 24 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching insider roster: {str(e)}"
        )


@app.get("/stock/{ticker}/mutualfund-holders")
@limiter.limit("30/minute")
async def get_mutualfund_holders(request: Request, ticker: str):
    """
    Get mutual fund holders and their positions.
    Cached for 24 hours.
    """
    ticker = ticker.upper()
    cache_key = f"mutualfund_holders:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        holders = stock.mutualfund_holders

        if holders is None or holders.empty:
            return {"ticker": ticker, "data": [], "message": "No mutual fund holders"}

        result = holders.to_dict(orient="records")

        set_cache(cache_key, result, 86400)  # 24 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching mutual fund holders: {str(e)}"
        )


@app.get("/stock/{ticker}/sustainability")
@limiter.limit("30/minute")
async def get_sustainability(request: Request, ticker: str):
    """
    Get ESG (Environmental, Social, Governance) ratings and sustainability metrics.
    Cached for 24 hours.
    """
    ticker = ticker.upper()
    cache_key = f"sustainability:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        sustainability = stock.sustainability

        if sustainability is None or sustainability.empty:
            return {"ticker": ticker, "data": {}, "message": "No sustainability data"}

        result = sustainability.to_dict()

        set_cache(cache_key, result, 86400)  # 24 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching sustainability data: {str(e)}"
        )


@app.get("/stock/{ticker}/sec-filings")
@limiter.limit("30/minute")
async def get_sec_filings(request: Request, ticker: str):
    """
    Get recent SEC filings (10-K, 10-Q, 8-K, etc.).
    Cached for 6 hours.
    """
    ticker = ticker.upper()
    cache_key = f"sec_filings:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        filings = stock.sec_filings

        if filings is None or (isinstance(filings, list) and len(filings) == 0):
            return {"ticker": ticker, "data": [], "message": "No SEC filings"}

        set_cache(cache_key, filings, 21600)  # 6 hour cache
        return {"ticker": ticker, "data": filings, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching SEC filings: {str(e)}"
        )


@app.get("/stock/{ticker}/isin")
@limiter.limit("30/minute")
async def get_isin(request: Request, ticker: str):
    """
    Get ISIN (International Securities Identification Number) for a ticker.
    Cached for 24 hours (ISIN rarely changes).
    """
    ticker = ticker.upper()
    cache_key = f"isin:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        isin = stock.isin

        if not isin:
            return {"ticker": ticker, "data": None, "message": "No ISIN available"}

        set_cache(cache_key, isin, 86400)  # 24 hour cache
        return {"ticker": ticker, "data": {"isin": isin}, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching ISIN: {str(e)}"
        )


@app.get("/stock/{ticker}/shares")
@limiter.limit("30/minute")
async def get_shares(request: Request, ticker: str):
    """
    Get share count over time.
    Cached for 24 hours.
    """
    ticker = ticker.upper()
    cache_key = f"shares:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        shares = stock.shares

        if shares is None or (hasattr(shares, 'empty') and shares.empty):
            return {"ticker": ticker, "data": {}, "message": "No shares data"}

        # Convert to JSON-friendly format
        if hasattr(shares, 'to_dict'):
            result = make_json_serializable(shares.to_dict())
        else:
            result = shares

        set_cache(cache_key, result, 86400)  # 24 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching shares: {str(e)}"
        )


@app.get("/stock/{ticker}/shares-full")
@limiter.limit("20/minute")
async def get_shares_full(request: Request, ticker: str):
    """
    Get detailed share count data (more comprehensive than /shares).
    Cached for 24 hours.
    Note: This may take longer to fetch.
    """
    ticker = ticker.upper()
    cache_key = f"shares_full:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        shares = stock.get_shares_full()

        if shares is None or (hasattr(shares, 'empty') and shares.empty):
            return {"ticker": ticker, "data": {}, "message": "No detailed shares data"}

        # Convert to JSON-friendly format
        if hasattr(shares, 'to_dict'):
            result = make_json_serializable(shares.to_dict())
        else:
            result = shares

        set_cache(cache_key, result, 86400)  # 24 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching detailed shares: {str(e)}"
        )


@app.get("/stock/{ticker}/capital-gains")
@limiter.limit("30/minute")
async def get_capital_gains(request: Request, ticker: str):
    """
    Get capital gains data (primarily for funds).
    Cached for 24 hours.
    """
    ticker = ticker.upper()
    cache_key = f"capital_gains:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        capital_gains = stock.capital_gains

        if capital_gains is None or (hasattr(capital_gains, 'empty') and capital_gains.empty):
            return {"ticker": ticker, "data": [], "message": "No capital gains data"}

        # Convert to JSON-friendly format
        result = [
            {"date": index.isoformat(), "short_term": float(row.get("Short Term", 0)), "long_term": float(row.get("Long Term", 0))}
            for index, row in capital_gains.iterrows()
        ] if hasattr(capital_gains, 'iterrows') else capital_gains

        set_cache(cache_key, result, 86400)  # 24 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching capital gains: {str(e)}"
        )


@app.get("/stock/{ticker}/funds-data")
@limiter.limit("30/minute")
async def get_funds_data(request: Request, ticker: str):
    """
    Get mutual fund specific data (fund family, category, etc.).
    Cached for 24 hours.
    """
    ticker = ticker.upper()
    cache_key = f"funds_data:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        funds_data = stock.funds_data

        if not funds_data:
            return {"ticker": ticker, "data": {}, "message": "No fund data (not a mutual fund)"}

        set_cache(cache_key, funds_data, 86400)  # 24 hour cache
        return {"ticker": ticker, "data": funds_data, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching fund data: {str(e)}"
        )


@app.get("/stock/{ticker}/quarterly-earnings")
@limiter.limit("30/minute")
async def get_quarterly_earnings(request: Request, ticker: str):
    """
    Get quarterly earnings data.
    Cached for 6 hours.
    """
    ticker = ticker.upper()
    cache_key = f"quarterly_earnings:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        earnings = stock.quarterly_earnings

        if earnings is None or earnings.empty:
            return {"ticker": ticker, "data": {}, "message": "No quarterly earnings data"}

        # Convert DataFrame to dict
        earnings_reset = earnings.reset_index()
        result = earnings_reset.to_dict(orient="records")

        set_cache(cache_key, result, 21600)  # 6 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching quarterly earnings: {str(e)}"
        )


@app.get("/stock/{ticker}/recommendations-summary")
@limiter.limit("30/minute")
async def get_recommendations_summary(request: Request, ticker: str):
    """
    Get summary of analyst recommendations (aggregated counts).
    Cached for 1 hour.
    """
    ticker = ticker.upper()
    cache_key = f"recommendations_summary:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        summary = stock.recommendations_summary

        if summary is None or (hasattr(summary, 'empty') and summary.empty):
            return {"ticker": ticker, "data": {}, "message": "No recommendations summary"}

        # Convert to JSON-friendly format
        if hasattr(summary, 'to_dict'):
            result = summary.to_dict(orient='records')
        else:
            result = summary

        set_cache(cache_key, result, 3600)  # 1 hour cache
        return {"ticker": ticker, "data": result, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching recommendations summary: {str(e)}"
        )


@app.get("/stock/{ticker}/history-metadata")
@limiter.limit("30/minute")
async def get_history_metadata(request: Request, ticker: str):
    """
    Get metadata about historical data (exchange timezone, currency, etc.).
    Cached for 24 hours.
    """
    ticker = ticker.upper()
    cache_key = f"history_metadata:{ticker}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        stock = yf.Ticker(ticker)
        metadata = stock.history_metadata

        if not metadata:
            return {"ticker": ticker, "data": {}, "message": "No metadata available"}

        set_cache(cache_key, metadata, 86400)  # 24 hour cache
        return {"ticker": ticker, "data": metadata, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching history metadata: {str(e)}"
        )


# ============================================================================
# REDDIT SENTIMENT ENDPOINTS
# ============================================================================

@app.get("/reddit/trending")
@limiter.limit("30/minute")
async def get_reddit_trending(
    request: Request,
    timeframe: str = "24h",
    limit: int = 20
):
    """
    Get most mentioned tickers on Reddit in specified timeframe.

    Parameters:
    - timeframe: "24h", "7d", or "30d" (default: "24h")
    - limit: Number of tickers to return (default: 20, max: 50)

    Returns trending tickers with mention counts and sentiment scores.
    Cached for 5 minutes.
    """
    from reddit_tracker import tracker

    cache_key = f"reddit_trending:{timeframe}:{limit}"
    cached = get_cache(cache_key)
    if cached:
        return {"timeframe": timeframe, "data": cached, "cached": True}

    try:
        # Parse timeframe to hours
        if timeframe == "24h":
            hours = 24
        elif timeframe == "7d":
            hours = 168
        elif timeframe == "30d":
            hours = 720
        else:
            raise HTTPException(status_code=400, detail="Invalid timeframe. Use 24h, 7d, or 30d")

        if limit > 50:
            limit = 50

        trending = tracker.get_trending_tickers(limit=limit, timeframe_hours=hours)

        set_cache(cache_key, trending, 300)  # 5 minute cache
        return {"timeframe": timeframe, "data": trending, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching Reddit trending: {str(e)}"
        )


@app.get("/reddit/sentiment/{ticker}")
@limiter.limit("30/minute")
async def get_reddit_sentiment(
    request: Request,
    ticker: str,
    days: int = 7
):
    """
    Get sentiment analysis for specific ticker over time.

    Parameters:
    - ticker: Stock ticker symbol
    - days: Number of days to analyze (default: 7, max: 90)

    Returns sentiment scores, mention counts, and historical trend.
    Cached for 15 minutes.
    """
    from reddit_tracker import tracker

    ticker = ticker.upper()
    cache_key = f"reddit_sentiment:{ticker}:{days}"

    cached = get_cache(cache_key)
    if cached:
        return {**cached, "cached": True}

    try:
        if days > 90:
            days = 90

        sentiment_data = tracker.get_ticker_sentiment(ticker, days=days)

        set_cache(cache_key, sentiment_data, 900)  # 15 minute cache
        return {**sentiment_data, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching Reddit sentiment: {str(e)}"
        )


@app.get("/reddit/mentions/{ticker}")
@limiter.limit("30/minute")
async def get_reddit_mentions(
    request: Request,
    ticker: str,
    limit: int = 50
):
    """
    Get recent Reddit posts mentioning specific ticker.

    Parameters:
    - ticker: Stock ticker symbol
    - limit: Number of mentions to return (default: 50, max: 200)

    Returns list of posts with sentiment scores and links.
    Cached for 1 hour.
    """
    from reddit_tracker import tracker

    ticker = ticker.upper()
    cache_key = f"reddit_mentions:{ticker}:{limit}"

    cached = get_cache(cache_key)
    if cached:
        return {"ticker": ticker, "data": cached, "cached": True}

    try:
        if limit > 200:
            limit = 200

        mentions = tracker.get_ticker_mentions(ticker, limit=limit)

        # Convert datetime objects to strings for JSON
        for mention in mentions:
            if 'created_utc' in mention:
                mention['created_utc'] = mention['created_utc'].isoformat()
            if 'processed_at' in mention:
                mention['processed_at'] = mention['processed_at'].isoformat()

        set_cache(cache_key, mentions, 3600)  # 1 hour cache
        return {"ticker": ticker, "data": mentions, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching Reddit mentions: {str(e)}"
        )


@app.get("/reddit/stats")
@limiter.limit("60/minute")
async def get_reddit_stats(request: Request):
    """
    Get overall Reddit tracking statistics.

    Returns total mentions, unique tickers, and processing stats.
    Cached for 5 minutes.
    """
    from reddit_tracker import tracker

    cache_key = "reddit_stats"
    cached = get_cache(cache_key)
    if cached:
        return {**cached, "cached": True}

    try:
        stats = {
            "total_mentions": len(tracker.mentions),
            "unique_tickers": len(tracker.ticker_stats),
            "posts_processed": len(tracker.processed_ids),
            "subreddits_monitored": os.getenv("REDDIT_SUBREDDITS", "wallstreetbets+stocks+investing+StockMarket"),
            "last_updated": datetime.now().isoformat()
        }

        set_cache(cache_key, stats, 300)  # 5 minute cache
        return {**stats, "cached": False}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching Reddit stats: {str(e)}"
        )


@app.websocket("/ws/live/{tickers}")
async def websocket_live_prices(websocket: WebSocket, tickers: str):
    """
    WebSocket endpoint for real-time price streaming.

    Usage: ws://localhost:8000/ws/live/AAPL,MSFT,GOOGL

    Streams real-time price updates for the specified tickers using yfinance's live() method.
    The client will receive JSON messages with price updates as they happen.

    Example message format:
    {
        "id": "AAPL",
        "price": 276.49,
        "time": 1707073200,
        "currency": "USD",
        "exchange": "NMS",
        "quoteType": "EQUITY",
        "marketHours": "REGULAR_MARKET",
        "changePercent": 0.5234,
        "dayVolume": 45678900,
        "change": 0.93
    }
    """
    await websocket.accept()

    ticker_list = [t.strip().upper() for t in tickers.split(',')]

    if len(ticker_list) > 20:
        await websocket.send_json({
            "error": "Maximum 20 tickers allowed for live streaming"
        })
        await websocket.close()
        return

    try:
        # Send initial connection message
        await websocket.send_json({
            "status": "connected",
            "tickers": ticker_list,
            "message": "Live price stream started"
        })

        # Use yfinance Tickers with live streaming
        tickers_obj = yf.Tickers(' '.join(ticker_list))

        # Message handler that forwards to WebSocket
        async def message_handler(message):
            try:
                await websocket.send_json(message)
            except Exception as e:
                print(f"Error sending message: {e}")

        # Start live streaming - this will run until connection closes
        # Note: yfinance's live() is synchronous, so we need to run it in a way that doesn't block
        try:
            # Create a task to handle the live stream
            async def stream_data():
                try:
                    # The live() method blocks, so we can't use it directly in async
                    # For now, we'll use a polling approach with fast_info
                    while True:
                        for ticker in ticker_list:
                            try:
                                stock = yf.Ticker(ticker)
                                fast_info = stock.fast_info

                                message = {
                                    "id": ticker,
                                    "price": fast_info.last_price,
                                    "currency": fast_info.currency,
                                    "exchange": fast_info.exchange,
                                    "market_cap": fast_info.market_cap,
                                    "volume": fast_info.last_volume,
                                    "timestamp": datetime.now().isoformat()
                                }

                                await websocket.send_json(message)
                            except Exception as e:
                                await websocket.send_json({
                                    "error": f"Error fetching {ticker}: {str(e)}"
                                })

                        # Poll every 5 seconds (adjust as needed)
                        await asyncio.sleep(5)

                except WebSocketDisconnect:
                    print(f"Client disconnected from live stream: {ticker_list}")
                except Exception as e:
                    print(f"Stream error: {e}")

            # Run the streaming task
            await stream_data()

        except Exception as e:
            await websocket.send_json({
                "error": f"Streaming error: {str(e)}"
            })

    except WebSocketDisconnect:
        print(f"WebSocket disconnected: {ticker_list}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "error": str(e)
            })
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass


if __name__ == "__main__":
    import uvicorn
    print("Starting Stock Surge API...")
    print("Docs available at: http://localhost:8000/docs")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
