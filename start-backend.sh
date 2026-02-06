#!/bin/bash
# Start the Stock Surge backend

echo "🚀 Starting Stock Surge Backend..."
echo ""
echo "Backend will run on: http://localhost:8000"
echo "API Docs available at: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""

cd /Users/alexkamer/stock-surge
uv run python main.py
