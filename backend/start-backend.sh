#!/bin/bash
# Start the Stock Surge backend

echo "🚀 Starting Stock Surge Backend..."
echo ""
echo "Backend will run on: http://localhost:8000"
echo "API Docs available at: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Change to backend directory
cd "$(dirname "$0")"

# Activate the main venv (in parent directory)
source ../.venv/bin/activate

# Run the backend using uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
