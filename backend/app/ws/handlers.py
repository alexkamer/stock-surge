"""
WebSocket handlers for live price streaming
"""

from fastapi import WebSocket, WebSocketDisconnect
import yfinance as yf
import asyncio
from datetime import datetime


async def websocket_live_prices(websocket: WebSocket, tickers: str):
    """
    WebSocket endpoint for real-time price streaming.

    Usage: ws://localhost:8000/ws/live/AAPL,MSFT,GOOGL

    Streams real-time price updates for the specified tickers using yfinance's fast_info.
    Polls every 5 seconds and sends updates to connected clients.
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

        # Stream data using polling approach
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

            # Poll every 5 seconds
            await asyncio.sleep(5)

    except WebSocketDisconnect:
        print(f"Client disconnected from live stream: {ticker_list}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "error": f"Streaming error: {str(e)}"
            })
        except:
            pass
