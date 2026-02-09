"""
Stock Surge API - FastAPI backend for stock data
Reorganized with modular structure for better maintainability
"""

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import yfinance as yf

from .config import CORS_ORIGINS, YFINANCE_RETRIES, APP_NAME, APP_VERSION
from .database import init_db

# Import routers from modules
from .auth.routes import router as auth_router
from .users.routes import router as users_router
from .stocks.routes import router as stocks_router
from .market.routes import router as market_router
from .reddit.routes import router as reddit_router
from .ai.routes import router as ai_router
from .chat.routes import router as chat_router
from .ws.handlers import websocket_live_prices

# Configure yfinance for optimal performance
yf.config.network.retries = YFINANCE_RETRIES
yf.config.debug.hide_exceptions = False  # Let FastAPI handle errors


# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and other resources on startup"""
    # Startup
    init_db()
    print(f"✓ {APP_NAME} v{APP_VERSION} started")
    print("✓ Database initialized")
    print("✓ All modules loaded")

    yield

    # Shutdown
    print(f"✗ {APP_NAME} shutting down")


# Initialize FastAPI app
app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="Efficient FastAPI backend for yfinance data with rate limiting, caching, and error handling",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(stocks_router)
app.include_router(market_router)
app.include_router(reddit_router)
app.include_router(ai_router)
app.include_router(chat_router)

# WebSocket endpoint
@app.websocket("/ws/live/{tickers}")
async def websocket_endpoint(websocket: WebSocket, tickers: str):
    """WebSocket endpoint for live price streaming"""
    await websocket_live_prices(websocket, tickers)


# Health check endpoint
@app.get("/")
async def root():
    """Health check and API info"""
    return {
        "name": APP_NAME,
        "version": APP_VERSION,
        "status": "operational",
        "endpoints": {
            "auth": "/auth (register, login, refresh, me)",
            "users": "/user (watchlist, preferences)",
            "stocks": "/stock/{ticker} (price, info, history, dividends, financials, etc.)",
            "market": "/market, /sector, /industry",
            "chat": "/chat (sessions, messages, streaming AI responses)",
            "websocket": "/ws/live/{tickers}",
            "docs": "/docs (Swagger UI)",
            "redoc": "/redoc (ReDoc)"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
