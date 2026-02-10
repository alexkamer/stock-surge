"""Portfolio tracking endpoints"""

from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from datetime import datetime
from typing import List

from ..database import get_db
from .. import models
from ..auth.auth import get_current_user
from ..stocks.service import get_stock_price
from .schemas import (
    PortfolioPositionCreate,
    PortfolioPositionUpdate,
    PortfolioPosition,
    PortfolioPositionWithMetrics,
    PortfolioSummary
)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/", response_model=PortfolioSummary)
@limiter.limit("60/minute")
async def get_portfolio(
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's portfolio with real-time valuations"""
    positions = db.query(models.Portfolio).filter(
        models.Portfolio.user_id == current_user.id
    ).all()

    if not positions:
        return {
            "user_id": str(current_user.id),
            "total_positions": 0,
            "total_value": 0.0,
            "total_cost_basis": 0.0,
            "total_unrealized_pl": 0.0,
            "total_unrealized_pl_percent": 0.0,
            "total_day_change": 0.0,
            "total_day_change_percent": 0.0,
            "positions": []
        }

    # Fetch current prices for all positions
    enriched_positions = []
    total_value = 0.0
    total_cost_basis = 0.0
    total_day_change = 0.0

    for pos in positions:
        try:
            # Get current price (uses Schwab with fallback to yfinance)
            price_data = get_stock_price(pos.ticker)

            current_price = price_data["last_price"]
            purchase_price = pos.purchase_price / 100  # Convert cents to dollars

            current_value = pos.quantity * current_price
            cost_basis = pos.quantity * purchase_price
            unrealized_pl = current_value - cost_basis
            unrealized_pl_percent = (unrealized_pl / cost_basis * 100) if cost_basis > 0 else 0.0

            day_change = (current_price - price_data["previous_close"]) * pos.quantity
            day_change_percent = ((current_price - price_data["previous_close"]) / price_data["previous_close"] * 100) if price_data["previous_close"] > 0 else 0.0

            enriched_positions.append({
                "id": str(pos.id),
                "ticker": pos.ticker,
                "quantity": pos.quantity,
                "purchase_price": purchase_price,
                "purchase_date": pos.purchase_date,
                "notes": pos.notes,
                "created_at": pos.created_at,
                "updated_at": pos.updated_at,
                "current_price": current_price,
                "current_value": current_value,
                "cost_basis": cost_basis,
                "unrealized_pl": unrealized_pl,
                "unrealized_pl_percent": unrealized_pl_percent,
                "day_change": day_change,
                "day_change_percent": day_change_percent
            })

            total_value += current_value
            total_cost_basis += cost_basis
            total_day_change += day_change

        except Exception as e:
            # If price fetch fails, return position without metrics
            purchase_price = pos.purchase_price / 100
            enriched_positions.append({
                "id": str(pos.id),
                "ticker": pos.ticker,
                "quantity": pos.quantity,
                "purchase_price": purchase_price,
                "purchase_date": pos.purchase_date,
                "notes": pos.notes,
                "created_at": pos.created_at,
                "updated_at": pos.updated_at,
                "current_price": 0.0,
                "current_value": 0.0,
                "cost_basis": pos.quantity * purchase_price,
                "unrealized_pl": 0.0,
                "unrealized_pl_percent": 0.0,
                "day_change": 0.0,
                "day_change_percent": 0.0
            })

    total_unrealized_pl = total_value - total_cost_basis
    total_unrealized_pl_percent = (total_unrealized_pl / total_cost_basis * 100) if total_cost_basis > 0 else 0.0
    total_day_change_percent = (total_day_change / total_cost_basis * 100) if total_cost_basis > 0 else 0.0

    return {
        "user_id": str(current_user.id),
        "total_positions": len(positions),
        "total_value": total_value,
        "total_cost_basis": total_cost_basis,
        "total_unrealized_pl": total_unrealized_pl,
        "total_unrealized_pl_percent": total_unrealized_pl_percent,
        "total_day_change": total_day_change,
        "total_day_change_percent": total_day_change_percent,
        "positions": enriched_positions
    }


@router.post("/", response_model=PortfolioPosition)
@limiter.limit("60/minute")
async def add_position(
    request: Request,
    body: PortfolioPositionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new position to portfolio"""
    ticker = body.ticker.upper()

    # Store price in cents to avoid floating point issues
    purchase_price_cents = int(body.purchase_price * 100)

    new_position = models.Portfolio(
        user_id=current_user.id,
        ticker=ticker,
        quantity=body.quantity,
        purchase_price=purchase_price_cents,
        purchase_date=body.purchase_date,
        notes=body.notes
    )

    db.add(new_position)
    db.commit()
    db.refresh(new_position)

    return {
        "id": str(new_position.id),
        "ticker": new_position.ticker,
        "quantity": new_position.quantity,
        "purchase_price": new_position.purchase_price / 100,
        "purchase_date": new_position.purchase_date,
        "notes": new_position.notes,
        "created_at": new_position.created_at,
        "updated_at": new_position.updated_at
    }


@router.put("/{position_id}", response_model=PortfolioPosition)
@limiter.limit("60/minute")
async def update_position(
    request: Request,
    position_id: str,
    body: PortfolioPositionUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing position"""
    position = db.query(models.Portfolio).filter(
        models.Portfolio.id == position_id,
        models.Portfolio.user_id == current_user.id
    ).first()

    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    if body.quantity is not None:
        position.quantity = body.quantity
    if body.purchase_price is not None:
        position.purchase_price = int(body.purchase_price * 100)
    if body.purchase_date is not None:
        position.purchase_date = body.purchase_date
    if body.notes is not None:
        position.notes = body.notes

    db.commit()
    db.refresh(position)

    return {
        "id": str(position.id),
        "ticker": position.ticker,
        "quantity": position.quantity,
        "purchase_price": position.purchase_price / 100,
        "purchase_date": position.purchase_date,
        "notes": position.notes,
        "created_at": position.created_at,
        "updated_at": position.updated_at
    }


@router.delete("/{position_id}")
@limiter.limit("60/minute")
async def delete_position(
    request: Request,
    position_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a position from portfolio"""
    position = db.query(models.Portfolio).filter(
        models.Portfolio.id == position_id,
        models.Portfolio.user_id == current_user.id
    ).first()

    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    ticker = position.ticker
    db.delete(position)
    db.commit()

    return {"message": "Position deleted", "ticker": ticker}
