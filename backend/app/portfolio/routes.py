"""Portfolio tracking endpoints"""

from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from datetime import datetime, timedelta
from typing import List
import yfinance as yf
import asyncio
from concurrent.futures import ThreadPoolExecutor
from loguru import logger

from ..database import get_db
from .. import models
from ..auth.auth import get_current_user
from ..stocks.service import get_stock_price, get_stock_info
from ..schwab.service import get_schwab_accounts, get_schwab_transactions
from ..utils.cache import get_cached_data, set_cached_data
from ..config import CACHE_TTL_MEDIUM
from .schemas import (
    PortfolioPositionCreate,
    PortfolioPositionUpdate,
    PortfolioPosition,
    PortfolioPositionWithMetrics,
    PortfolioSummary,
    PerformanceResponse,
    PerformanceDataPoint,
    SectorAllocation,
    PositionPerformance,
    AnalyticsResponse
)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/summary/schwab")
@limiter.limit("60/minute")
async def get_schwab_portfolio_summary(
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get portfolio summary using Schwab's actual reported P/L values"""
    try:
        schwab_data = get_schwab_accounts()
        if not schwab_data or "accounts" not in schwab_data:
            return {
                "total_value": 0.0,
                "total_day_pl": 0.0,
                "total_day_pl_percent": 0.0,
                "total_unrealized_pl": 0.0,
                "positions": []
            }

        total_value = 0.0
        total_day_pl = 0.0
        total_unrealized_pl = 0.0
        positions = []

        for account in schwab_data["accounts"]:
            if "positions" in account:
                for pos in account["positions"]:
                    total_value += pos.get("currentValue", 0)
                    total_day_pl += pos.get("currentDayProfitLoss", 0)
                    total_unrealized_pl += pos.get("longOpenProfitLoss", 0)

                    positions.append({
                        "symbol": pos.get("symbol"),
                        "quantity": pos.get("quantity"),
                        "current_value": pos.get("currentValue"),
                        "day_pl": pos.get("currentDayProfitLoss"),
                        "day_pl_percent": pos.get("currentDayProfitLossPercentage"),
                        "total_pl": pos.get("longOpenProfitLoss"),
                    })

        total_day_pl_percent = (total_day_pl / (total_value - total_day_pl) * 100) if (total_value - total_day_pl) > 0 else 0.0

        return {
            "total_value": round(total_value, 2),
            "total_day_pl": round(total_day_pl, 2),
            "total_day_pl_percent": round(total_day_pl_percent, 2),
            "total_unrealized_pl": round(total_unrealized_pl, 2),
            "positions": positions,
            "source": "schwab_reported"
        }
    except Exception as e:
        logger.error(f"Error fetching Schwab portfolio summary: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching Schwab data: {str(e)}")


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


@router.get("/analytics", response_model=AnalyticsResponse)
@limiter.limit("30/minute")
async def get_portfolio_analytics(
    request: Request,
    period: str = "1mo",
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get portfolio analytics with Schwab's actual reported values

    Uses Schwab's reported P/L for current values and sector allocation.
    Historical trends still use market data for visualization.
    """
    # Get manual portfolio positions
    positions = db.query(models.Portfolio).filter(
        models.Portfolio.user_id == current_user.id
    ).all()

    # Get Schwab positions with full P/L data
    schwab_positions = []
    schwab_positions_raw = []  # Keep raw data for accurate P/L
    total_realized_pl = 0.0  # Track realized gains from closed positions

    try:
        schwab_data = get_schwab_accounts()
        if schwab_data and "accounts" in schwab_data:
            for account in schwab_data["accounts"]:
                # Try to fetch realized gains from transactions
                # Note: Transactions API may not be available for all Schwab accounts
                account_hash = account.get("accountNumber") or account.get("accountHash")

                # Only fetch transactions for short periods where realized gains matter
                if account_hash and period in ["1d", "1w", "1mo"]:
                    try:
                        from datetime import datetime, timedelta
                        end_date = datetime.now().strftime("%Y-%m-%d")
                        days_map = {"1d": 1, "1w": 7, "1mo": 30}
                        days_back = days_map.get(period, 30)
                        start_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")

                        txn_data = get_schwab_transactions(account_hash, start_date, end_date)
                        realized_pl = txn_data.get("total_realized_pl", 0)

                        if realized_pl != 0:
                            total_realized_pl += realized_pl
                            logger.info(f"✓ Included ${realized_pl:.2f} realized P/L from closed positions")
                        else:
                            logger.info(f"No closed positions found in period {period}")

                    except Exception as e:
                        # Transactions API might not be available - this is OK
                        # Analytics will still work with open positions only
                        logger.debug(f"Transactions not available (closed positions won't be included): {e}")

                if "positions" in account and account["positions"]:
                    for pos in account["positions"]:
                        schwab_positions_raw.append(pos)

                        # Create a position-like object for historical data
                        class SchwabPosition:
                            def __init__(self, ticker, quantity, avg_price):
                                self.ticker = ticker
                                self.quantity = quantity
                                self.purchase_price = int(avg_price * 100)  # Convert to cents

                        schwab_positions.append(
                            SchwabPosition(
                                pos.get("symbol", ""),
                                pos.get("quantity", 0),
                                pos.get("averagePrice", 0)
                            )
                        )
    except Exception as e:
        logger.error(f"Error fetching Schwab data for analytics: {e}")
        pass

    # Combine both position types
    all_positions = list(positions) + schwab_positions

    if not all_positions:
        return {
            "performance": {
                "period": period,
                "data": []
            },
            "sector_allocation": [],
            "top_performers": [],
            "bottom_performers": []
        }

    # Map period to yfinance period and date range
    period_map = {
        "1d": ("1d", 1),
        "1w": ("5d", 5),
        "1mo": ("1mo", 30),
        "3mo": ("3mo", 90),
        "6mo": ("6mo", 180),
        "1y": ("1y", 365)
    }

    yf_period, days = period_map.get(period, ("1mo", 30))

    # Fetch historical data for all positions (with caching and parallel processing)
    def fetch_ticker_history(ticker: str, period: str):
        cache_key = f"history:{ticker}:{period}"
        cached = get_cached_data(cache_key)
        if cached:
            return ticker, cached

        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period=period)
            if not hist.empty:
                set_cached_data(cache_key, hist, CACHE_TTL_MEDIUM)
                return ticker, hist
        except Exception:
            pass
        return ticker, None

    # Use ThreadPoolExecutor for parallel fetching
    ticker_history = {}
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(fetch_ticker_history, pos.ticker, yf_period) for pos in all_positions]
        for future in futures:
            ticker, hist = future.result()
            if hist is not None:
                ticker_history[ticker] = hist

    # Calculate portfolio value over time
    performance_data = []
    if ticker_history:
        # Get all unique dates across all positions
        all_dates = sorted(set(
            date for hist in ticker_history.values()
            for date in hist.index
        ))

        # Calculate initial portfolio value (at start of period) for P/L calculation
        initial_portfolio_value = None

        for date in all_dates:
            total_value = 0.0
            total_cost_basis = 0.0  # Based on actual purchase price

            for pos in all_positions:
                if pos.ticker in ticker_history:
                    hist = ticker_history[pos.ticker]
                    # Get price on this date or nearest previous date
                    try:
                        if date in hist.index:
                            price = hist.loc[date]['Close']
                        else:
                            # Find nearest previous date
                            prev_dates = hist.index[hist.index <= date]
                            if len(prev_dates) > 0:
                                price = hist.loc[prev_dates[-1]]['Close']
                            else:
                                continue

                        total_value += pos.quantity * float(price)
                        total_cost_basis += pos.quantity * (pos.purchase_price / 100)
                    except Exception:
                        continue

            # Set initial value on first date for period-relative P/L
            if initial_portfolio_value is None and total_value > 0:
                initial_portfolio_value = total_value
                logger.info(f"Analytics period={period}: Initial portfolio value = ${initial_portfolio_value:.2f}")

            if initial_portfolio_value and initial_portfolio_value > 0:
                # P/L relative to start of period (shows gains/losses during this timeframe)
                period_pl = total_value - initial_portfolio_value
                period_pl_percent = (period_pl / initial_portfolio_value * 100)

                # Also calculate all-time P/L for reference
                alltime_pl = total_value - total_cost_basis
                alltime_pl_percent = (alltime_pl / total_cost_basis * 100) if total_cost_basis > 0 else 0.0

                performance_data.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "value": round(total_value, 2),
                    "pl": round(period_pl, 2),  # Period P/L (relative to start)
                    "pl_percent": round(period_pl_percent, 2),
                    "alltime_pl": round(alltime_pl, 2),  # All-time P/L (vs purchase price)
                    "alltime_pl_percent": round(alltime_pl_percent, 2)
                })

        logger.info(f"Analytics period={period}: Generated {len(performance_data)} data points. Latest value=${total_value:.2f}, Period P/L=${period_pl:.2f}")

    # Override the latest data point with Schwab's actual current values
    if schwab_positions_raw and performance_data:
        # Calculate actual current totals from Schwab
        schwab_current_value = sum(pos.get("currentValue", 0) for pos in schwab_positions_raw)
        schwab_current_pl = sum(pos.get("longOpenProfitLoss", 0) for pos in schwab_positions_raw)

        # Add realized P/L from closed positions
        schwab_current_pl += total_realized_pl

        # If we have Schwab data, use it for the latest point
        if schwab_current_value > 0 or total_realized_pl != 0:
            # Keep the initial value for period P/L calculation
            if initial_portfolio_value and initial_portfolio_value > 0:
                # Period P/L includes both open positions change AND realized gains
                period_pl = (schwab_current_value - initial_portfolio_value) + total_realized_pl
                period_pl_percent = (period_pl / initial_portfolio_value * 100)
            else:
                period_pl = total_realized_pl
                period_pl_percent = 0

            # Update or add latest data point
            latest_date = datetime.now().strftime("%Y-%m-%d")

            # Remove today's calculated point if it exists
            performance_data = [p for p in performance_data if p["date"] != latest_date]

            # Add Schwab's actual data including realized gains
            cost_basis_schwab = schwab_current_value - schwab_current_pl
            alltime_pl_percent = (schwab_current_pl / cost_basis_schwab * 100) if cost_basis_schwab > 0 else 0.0

            performance_data.append({
                "date": latest_date,
                "value": round(schwab_current_value, 2),
                "pl": round(period_pl, 2),
                "pl_percent": round(period_pl_percent, 2),
                "alltime_pl": round(schwab_current_pl, 2),  # Includes unrealized + realized
                "alltime_pl_percent": round(alltime_pl_percent, 2)
            })

            # Sort by date
            performance_data.sort(key=lambda x: x["date"])

            logger.info(f"Updated latest data point with Schwab actual: value=${schwab_current_value:.2f}, alltime_pl=${schwab_current_pl:.2f} (includes ${total_realized_pl:.2f} realized)")

    # Calculate sector allocation and performance using Schwab's actual values
    sector_data = {}
    position_performance = []

    # Process Schwab positions (use their actual P/L values)
    for pos_raw in schwab_positions_raw:
        ticker = pos_raw.get("symbol", "")
        current_value = pos_raw.get("currentValue", 0)

        # Use Schwab's actual P/L
        pl = pos_raw.get("longOpenProfitLoss", 0)
        cost_basis = current_value - pl
        pl_percent = (pl / cost_basis * 100) if cost_basis > 0 else 0.0

        # Get sector info
        try:
            info_data = get_stock_info(ticker)
            sector = info_data["data"].get("sector", "Unknown")
        except Exception:
            sector = "Unknown"

        position_performance.append({
            "ticker": ticker,
            "pl": pl,
            "pl_percent": pl_percent,
            "current_value": current_value
        })

        if sector:
            if sector not in sector_data:
                sector_data[sector] = 0.0
            sector_data[sector] += current_value

    # Process manual positions (calculate P/L)
    def fetch_manual_position_metrics(pos):
        try:
            price_data = get_stock_price(pos.ticker)
            info_data = get_stock_info(pos.ticker)

            current_price = price_data["data"]["last_price"]
            current_value = pos.quantity * current_price
            cost_basis = pos.quantity * (pos.purchase_price / 100)
            pl = current_value - cost_basis
            pl_percent = (pl / cost_basis * 100) if cost_basis > 0 else 0.0
            sector = info_data["data"].get("sector", "Unknown")

            return {
                "ticker": pos.ticker,
                "pl": pl,
                "pl_percent": pl_percent,
                "current_value": current_value,
                "sector": sector
            }
        except Exception:
            return None

    # Only process manual positions
    if positions:
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(fetch_manual_position_metrics, pos) for pos in positions]
            for future in futures:
                result = future.result()
                if result:
                    position_performance.append({
                        "ticker": result["ticker"],
                        "pl": result["pl"],
                        "pl_percent": result["pl_percent"],
                        "current_value": result["current_value"]
                    })

                    sector = result["sector"]
                    if sector:
                        if sector not in sector_data:
                            sector_data[sector] = 0.0
                        sector_data[sector] += result["current_value"]

    # Calculate sector percentages
    total_portfolio_value = sum(sector_data.values())
    sector_allocation = [
        {
            "sector": sector,
            "value": round(value, 2),
            "percent": round((value / total_portfolio_value * 100) if total_portfolio_value > 0 else 0.0, 2)
        }
        for sector, value in sector_data.items()
    ]
    sector_allocation.sort(key=lambda x: x["value"], reverse=True)

    # Sort performers
    position_performance.sort(key=lambda x: x["pl"], reverse=True)
    top_performers = position_performance[:5]
    bottom_performers = sorted(position_performance, key=lambda x: x["pl"])[:5]

    return {
        "performance": {
            "period": period,
            "data": performance_data
        },
        "sector_allocation": sector_allocation,
        "top_performers": top_performers,
        "bottom_performers": bottom_performers
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


@router.get("/analytics/debug")
@limiter.limit("30/minute")
async def debug_portfolio_analytics(
    request: Request,
    period: str = "1mo",
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug endpoint to see detailed analytics calculations"""
    # Get manual portfolio positions
    positions = db.query(models.Portfolio).filter(
        models.Portfolio.user_id == current_user.id
    ).all()

    # Get Schwab positions
    schwab_positions = []
    schwab_raw = []
    try:
        schwab_data = get_schwab_accounts()
        if schwab_data and "accounts" in schwab_data:
            for account in schwab_data["accounts"]:
                if "positions" in account and account["positions"]:
                    for pos in account["positions"]:
                        schwab_raw.append({
                            "symbol": pos.get("symbol"),
                            "quantity": pos.get("quantity"),
                            "averagePrice": pos.get("averagePrice"),
                            "currentValue": pos.get("currentValue")
                        })
                        class SchwabPosition:
                            def __init__(self, ticker, quantity, avg_price):
                                self.ticker = ticker
                                self.quantity = quantity
                                self.purchase_price = int(avg_price * 100)
                        schwab_positions.append(
                            SchwabPosition(
                                pos.get("symbol", ""),
                                pos.get("quantity", 0),
                                pos.get("averagePrice", 0)
                            )
                        )
    except Exception as e:
        pass

    all_positions = list(positions) + schwab_positions

    return {
        "period": period,
        "manual_positions_count": len(positions),
        "schwab_positions_count": len(schwab_positions),
        "schwab_raw_data": schwab_raw,
        "total_positions": len(all_positions),
        "position_details": [
            {
                "ticker": pos.ticker,
                "quantity": pos.quantity,
                "purchase_price_dollars": pos.purchase_price / 100
            }
            for pos in all_positions
        ]
    }
