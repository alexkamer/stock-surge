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
    "http://localhost:3000",  # Alternative frontend port
    "http://127.0.0.1:5173",
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
