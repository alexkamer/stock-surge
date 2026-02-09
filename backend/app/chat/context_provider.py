"""
Context provider for chat - fetches relevant stock data and market info
"""

import asyncio
from functools import partial
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import yfinance as yf
from ..stocks.service import get_stock_info, get_stock_price
from ..stocks.technical_indicators import get_technical_indicators


class ChatContextProvider:
    """Provides context data for chat conversations"""

    async def get_stock_context(self, ticker: str, include_technicals: bool = True) -> Optional[Dict[str, Any]]:
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

            context = {
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

            # Get technical indicators if requested
            if include_technicals:
                try:
                    indicators = await loop.run_in_executor(
                        None,
                        partial(get_technical_indicators, ticker, "3mo")
                    )
                    print(f"[DEBUG] Technical indicators for {ticker}: {indicators.get('indicators', {}) if indicators else 'None'}")
                    if indicators and "error" not in indicators:
                        context["technical_indicators"] = indicators.get("indicators", {})
                        print(f"[DEBUG] Added technical indicators to context for {ticker}")
                    else:
                        print(f"[DEBUG] No technical indicators for {ticker}: {indicators.get('error') if indicators else 'No data'}")
                except Exception as e:
                    print(f"Error getting technical indicators for {ticker}: {e}")

            return context
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

        # Add timestamp
        context_parts.append(f"DATA TIMESTAMP: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
        context_parts.append("")

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

            # Add technical indicators if available
            if stock_context.get("technical_indicators"):
                indicators = stock_context["technical_indicators"]
                context_parts.append("\nTECHNICAL INDICATORS (3-month data):")

                # RSI
                if indicators.get("rsi") and indicators["rsi"].get("value") is not None:
                    rsi_val = indicators["rsi"]["value"]
                    rsi_signal = indicators["rsi"].get("signal", "neutral")
                    context_parts.append(f"- RSI (14): {rsi_val:.2f} (Signal: {rsi_signal})")

                # MACD
                if indicators.get("macd"):
                    macd = indicators["macd"]
                    if macd.get("macd") is not None and macd.get("signal") is not None:
                        histogram = macd.get("histogram")
                        hist_str = f", Histogram: {histogram:.2f}" if histogram is not None else ""
                        context_parts.append(
                            f"- MACD: {macd['macd']:.2f}, Signal Line: {macd['signal']:.2f}{hist_str}"
                        )

                # Moving Averages - Show all available
                if indicators.get("moving_averages"):
                    ma = indicators["moving_averages"]
                    sma = ma.get("sma", {})

                    sma_values = []
                    if sma.get("sma_20") is not None:
                        sma_values.append(f"SMA20: ${sma['sma_20']:.2f}")
                    if sma.get("sma_50") is not None:
                        sma_values.append(f"SMA50: ${sma['sma_50']:.2f}")
                    if sma.get("sma_200") is not None:
                        sma_values.append(f"SMA200: ${sma['sma_200']:.2f}")

                    if sma_values:
                        context_parts.append(f"- Moving Averages: {', '.join(sma_values)}")

                    # Price position vs moving averages
                    if ma.get("price_vs_sma50") is not None:
                        pos = ma["price_vs_sma50"]
                        context_parts.append(f"  - Price is {pos:+.2f}% vs SMA50")
                    if ma.get("price_vs_sma200") is not None:
                        pos = ma["price_vs_sma200"]
                        context_parts.append(f"  - Price is {pos:+.2f}% vs SMA200")

                # Bollinger Bands
                if indicators.get("bollinger_bands"):
                    bb = indicators["bollinger_bands"]
                    if bb.get("upper") and bb.get("middle") and bb.get("lower"):
                        context_parts.append(
                            f"- Bollinger Bands: Upper ${bb['upper']:.2f}, Middle ${bb['middle']:.2f}, Lower ${bb['lower']:.2f}"
                        )
                    if bb.get("position"):
                        context_parts.append(f"  - Position: {bb['position']}")

                # Stochastic
                if indicators.get("stochastic"):
                    stoch = indicators["stochastic"]
                    if stoch.get("k") is not None and stoch.get("d") is not None:
                        context_parts.append(f"- Stochastic: %K {stoch['k']:.2f}, %D {stoch['d']:.2f}")

                # ATR
                if indicators.get("atr") is not None:
                    context_parts.append(f"- ATR (14): {indicators['atr']:.2f}")

                # Volume
                if indicators.get("volume") and indicators["volume"].get("ratio") is not None:
                    vol_ratio = indicators["volume"]["ratio"]
                    context_parts.append(f"- Volume: {vol_ratio:.2f}x average")

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
