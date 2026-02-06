"""
User endpoints for watchlist and preferences management
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import get_db
from .. import models
from ..auth.auth import get_current_user
from .schemas import WatchlistItem, WatchlistResponse, PreferencesRequest, PreferencesResponse

# Create router
router = APIRouter(prefix="/user", tags=["user"])

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@router.get("/watchlist", response_model=WatchlistResponse)
@limiter.limit("60/minute")
async def get_watchlist(
    request: Request,
    current_user: models.User = Depends(get_current_user),
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


@router.post("/watchlist")
@limiter.limit("60/minute")
async def add_to_watchlist(
    request: Request,
    body: WatchlistItem,
    current_user: models.User = Depends(get_current_user),
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


@router.delete("/watchlist/{ticker}")
@limiter.limit("60/minute")
async def remove_from_watchlist(
    request: Request,
    ticker: str,
    current_user: models.User = Depends(get_current_user),
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


@router.get("/preferences", response_model=PreferencesResponse)
@limiter.limit("60/minute")
async def get_preferences(
    request: Request,
    current_user: models.User = Depends(get_current_user),
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


@router.put("/preferences", response_model=PreferencesResponse)
@limiter.limit("60/minute")
async def update_preferences(
    request: Request,
    body: PreferencesRequest,
    current_user: models.User = Depends(get_current_user),
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
