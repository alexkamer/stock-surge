"""
Configuration module for Stock Surge API
Centralizes environment variables and application constants
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Get the project root directory (two levels up from this file)
PROJECT_ROOT = Path(__file__).parent.parent.parent

# Load environment variables from .env file in project root
load_dotenv(PROJECT_ROOT / ".env")

# Redis Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

# Redis TTL settings (in seconds)
CACHE_TTL_SHORT = 30  # 30 seconds for real-time data (aligns with frontend refetch interval)
CACHE_TTL_MEDIUM = 300  # 5 minutes for frequently updated data
CACHE_TTL_LONG = 3600  # 1 hour for static data

# Database Configuration (points to main directory)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{PROJECT_ROOT}/stock_surge.db")

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# CORS Configuration
CORS_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:5174",  # Vite dev server (alternative port)
    "http://localhost:3000",  # Alternative frontend port
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
]

# Rate Limiting Configuration
RATE_LIMIT_DEFAULT = "100/minute"
RATE_LIMIT_STRICT = "10/minute"  # For expensive endpoints

# yfinance Configuration
YFINANCE_RETRIES = 2
YFINANCE_TIMEOUT = 10

# Application Settings
APP_NAME = "Stock Surge API"
APP_VERSION = "1.0.0"
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# Article Scraper Settings
ARTICLE_SCRAPER_USE_JS = os.getenv("ARTICLE_SCRAPER_USE_JS", "True").lower() == "true"
ARTICLE_SCRAPER_TIMEOUT = int(os.getenv("ARTICLE_SCRAPER_TIMEOUT", "15"))

# Ollama AI Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "60"))

# Schwab API Configuration
SCHWAB_APP_KEY = os.getenv("SCHWAB_APP_KEY")
SCHWAB_APP_SECRET = os.getenv("SCHWAB_APP_SECRET")
SCHWAB_API_BASE_URL = "https://api.schwabapi.com"
SCHWAB_TOKEN_ENDPOINT = f"{SCHWAB_API_BASE_URL}/v1/oauth/token"
SCHWAB_AUTH_ENDPOINT = f"{SCHWAB_API_BASE_URL}/v1/oauth/authorize"
SCHWAB_REDIRECT_URI = os.getenv("SCHWAB_REDIRECT_URI", "https://127.0.0.1")

# Token refresh settings
SCHWAB_TOKEN_REFRESH_BUFFER = 300  # Refresh if < 5 minutes remaining
SCHWAB_TOKEN_EXPIRY = 1800  # 30 minutes

# Development mode - use tokens.json
SCHWAB_DEV_MODE = os.getenv("SCHWAB_DEV_MODE", "true").lower() == "true"
SCHWAB_TOKEN_FILE = PROJECT_ROOT / "tokens.json"
