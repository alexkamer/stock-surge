"""
Reddit endpoints (if any - tracker runs independently)
"""

from fastapi import APIRouter

# Create router for future Reddit API endpoints
router = APIRouter(prefix="/reddit", tags=["reddit"])

# Reddit tracker runs as background service
# Add API endpoints here if needed in the future
