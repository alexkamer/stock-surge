"""
Pydantic schemas for chat API requests and responses
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


class MessageCreate(BaseModel):
    """Request body for sending a chat message"""
    content: str = Field(..., min_length=1, max_length=5000)


class MessageResponse(BaseModel):
    """Single chat message response"""
    id: UUID
    session_id: UUID
    role: str
    content: str
    context_data: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SessionCreate(BaseModel):
    """Request body for creating a new chat session"""
    title: Optional[str] = None


class SessionResponse(BaseModel):
    """Chat session response"""
    id: UUID
    user_id: UUID
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0

    class Config:
        from_attributes = True


class SessionWithMessages(SessionResponse):
    """Chat session with all messages"""
    messages: List[MessageResponse] = []


class ChatContextRequest(BaseModel):
    """Request for getting context data"""
    tickers: Optional[List[str]] = None
    include_watchlist: bool = True
    include_market_overview: bool = True
