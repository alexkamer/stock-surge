"""
Context provider for chat - fetches relevant stock data and market info
"""

import asyncio
from functools import partial
from typing import Dict, Any, List, Optional
from datetime import datetime
import yfinance as yf
from ..stocks.service import get_stock_info, get_stock_price


class ChatContextProvider:
    """Provides context data for chat conversations"""

    async def get_stock_context(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive stock context for a single ticker"""
        try:
            # Get basic price info (run sync function in executor)
            loop = asyncio.get_event_loop()
            price_response = await loop.run_in_executor(None, partial(get_stock_price, ticker))
            if not price_response or not price_response.get("data"):
                return None

            # Extract the actual data from the response
            price_data = price_response.get("data", {})

            # Get company info
            info_response = await loop.run_in_executor(None, partial(get_stock_info, ticker))
            info_data = info_response.get("data", {}) if info_response else {}

            # Calculate change
            change = price_data.get("last_price", 0) - price_data.get("previous_close", 0)
            change_percent = (change / price_data.get("previous_close", 1)) * 100 if price_data.get("previous_close") else 0

            return {
                "ticker": ticker,
                "price": price_data.get("last_price"),
                "change": change,
                "change_percent": change_percent,
                "volume": price_data.get("volume"),
                "market_cap": info_data.get("market_cap") if info_data else None,
                "sector": info_data.get("sector") if info_data else None,
                "industry": info_data.get("industry") if info_data else None,
                "pe_ratio": info_data.get("pe_ratio") if info_data else None,
            }
        except Exception as e:
            print(f"Error getting stock context for {ticker}: {e}")
            return None

    async def get_comparison_context(self, tickers: List[str]) -> Dict[str, Any]:
        """Get comparison data for multiple stocks"""
        stocks_data = {}

        for ticker in tickers:
            data = await self.get_stock_context(ticker)
            if data:
                stocks_data[ticker] = data

        return {
            "stocks": stocks_data,
            "comparison_count": len(stocks_data),
            "timestamp": datetime.utcnow().isoformat()
        }

    async def get_market_overview(self) -> Dict[str, Any]:
        """Get current market overview (major indices)"""
        indices = {
            "^GSPC": "S&P 500",
            "^DJI": "Dow Jones",
            "^IXIC": "NASDAQ",
        }

        overview = {}

        for symbol, name in indices.items():
            try:
                ticker_obj = yf.Ticker(symbol)
                info = ticker_obj.info

                current_price = info.get("regularMarketPrice") or info.get("currentPrice", 0)
                previous_close = info.get("previousClose", 0)
                change = current_price - previous_close
                change_percent = (change / previous_close * 100) if previous_close else 0

                overview[name] = {
                    "symbol": symbol,
                    "price": current_price,
                    "change": change,
                    "change_percent": change_percent,
                }
            except Exception as e:
                print(f"Error fetching {name}: {e}")
                continue

        return overview

    def format_context_for_prompt(
        self,
        stock_context: Optional[Dict[str, Any]] = None,
        comparison_context: Optional[Dict[str, Any]] = None,
        market_overview: Optional[Dict[str, Any]] = None,
        watchlist: Optional[List[str]] = None
    ) -> str:
        """Format context data into a string for the AI prompt"""

        context_parts = []

        # Add market overview
        if market_overview:
            context_parts.append("CURRENT MARKET:")
            for name, data in market_overview.items():
                if data.get('price') is not None and data.get('change_percent') is not None:
                    change_sign = "+" if data.get("change", 0) >= 0 else ""
                    context_parts.append(
                        f"- {name}: ${data['price']:.2f} ({change_sign}{data['change_percent']:.2f}%)"
                    )
            context_parts.append("")

        # Add watchlist
        if watchlist and len(watchlist) > 0:
            context_parts.append(f"USER'S WATCHLIST: {', '.join(watchlist)}")
            context_parts.append("")

        # Add specific stock context
        if stock_context:
            ticker = stock_context["ticker"]
            context_parts.append(f"STOCK DATA FOR {ticker}:")

            if stock_context.get('price') is not None:
                context_parts.append(f"- Price: ${stock_context['price']:.2f}")

            if stock_context.get('change') is not None and stock_context.get('change_percent') is not None:
                change_sign = "+" if stock_context["change"] >= 0 else ""
                context_parts.append(
                    f"- Change: {change_sign}${stock_context['change']:.2f} ({change_sign}{stock_context['change_percent']:.2f}%)"
                )

            if stock_context.get("market_cap"):
                context_parts.append(f"- Market Cap: ${stock_context['market_cap']:,.0f}")
            if stock_context.get("sector"):
                context_parts.append(f"- Sector: {stock_context['sector']}")
            if stock_context.get("industry"):
                context_parts.append(f"- Industry: {stock_context['industry']}")
            if stock_context.get("pe_ratio") is not None:
                context_parts.append(f"- P/E Ratio: {stock_context['pe_ratio']:.2f}")
            context_parts.append("")

        # Add comparison context
        if comparison_context and comparison_context.get("stocks"):
            context_parts.append("STOCK COMPARISON:")
            for ticker, data in comparison_context["stocks"].items():
                if data.get('price') is not None and data.get('change_percent') is not None:
                    change_sign = "+" if data.get("change", 0) >= 0 else ""
                    context_parts.append(
                        f"- {ticker}: ${data['price']:.2f} ({change_sign}{data['change_percent']:.2f}%) "
                        f"| Sector: {data.get('sector', 'N/A')}"
                    )
            context_parts.append("")

        return "\n".join(context_parts)


# Singleton instance
context_provider = ChatContextProvider()
