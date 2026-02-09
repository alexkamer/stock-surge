"""
Chat API endpoints
"""

import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from uuid import UUID

from ..database import get_db
from ..auth.auth import get_current_user, get_current_user_optional
from ..models import User, ChatSession, ChatMessage, Watchlist
from .schemas import (
    SessionCreate,
    SessionResponse,
    SessionWithMessages,
    MessageCreate,
    MessageResponse,
    ChatContextRequest
)
from .service import chat_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_data: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new chat session"""
    new_session = ChatSession(
        user_id=current_user.id,
        title=session_data.title
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return SessionResponse(
        id=new_session.id,
        user_id=new_session.user_id,
        title=new_session.title,
        created_at=new_session.created_at,
        updated_at=new_session.updated_at,
        message_count=0
    )


@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all chat sessions for the current user"""
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(desc(ChatSession.updated_at))
        .limit(limit)
        .all()
    )

    # Get message counts for each session
    result = []
    for session in sessions:
        message_count = (
            db.query(func.count(ChatMessage.id))
            .filter(ChatMessage.session_id == session.id)
            .scalar()
        )
        result.append(
            SessionResponse(
                id=session.id,
                user_id=session.user_id,
                title=session.title,
                created_at=session.created_at,
                updated_at=session.updated_at,
                message_count=message_count
            )
        )

    return result


@router.get("/sessions/{session_id}", response_model=SessionWithMessages)
async def get_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a chat session with all messages"""
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Get all messages for this session
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )

    return SessionWithMessages(
        id=session.id,
        user_id=session.user_id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=len(messages),
        messages=[
            MessageResponse(
                id=msg.id,
                session_id=msg.session_id,
                role=msg.role,
                content=msg.content,
                context_data=msg.context_data,
                created_at=msg.created_at
            )
            for msg in messages
        ]
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a chat session"""
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    db.delete(session)
    db.commit()
    return None


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: UUID,
    message: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message and stream the AI response"""

    # Verify session exists and belongs to user
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Save user message
    user_message = ChatMessage(
        session_id=session_id,
        role="user",
        content=message.content
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    # Generate title if this is the first message
    if not session.title:
        try:
            title = await chat_service.generate_title(message.content)
            session.title = title
            db.commit()
        except Exception as e:
            print(f"Error generating title: {e}")

    # Get conversation history
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )

    # Build message list for AI (exclude the system messages)
    message_list = [
        {"role": msg.role, "content": msg.content}
        for msg in messages
        if msg.role in ["user", "assistant"]
    ]

    # Get user's watchlist
    watchlist_items = (
        db.query(Watchlist.ticker)
        .filter(Watchlist.user_id == current_user.id)
        .all()
    )
    watchlist = [item[0] for item in watchlist_items]

    # Stream response
    async def generate():
        assistant_content = ""

        try:
            # Stream chunks from AI
            async for chunk in chat_service.chat_stream(
                messages=message_list,
                watchlist=watchlist,
                include_market=True
            ):
                assistant_content += chunk
                # Send as SSE format
                yield f"data: {json.dumps({'content': chunk})}\n\n"

            # Save assistant message to database
            assistant_message = ChatMessage(
                session_id=session_id,
                role="assistant",
                content=assistant_content
            )
            db.add(assistant_message)

            # Update session timestamp
            session.updated_at = func.now()
            db.commit()

            # Send completion signal
            yield "data: [DONE]\n\n"

        except Exception as e:
            error_msg = f"Error generating response: {str(e)}"
            yield f"data: {json.dumps({'error': error_msg})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


@router.get("/context")
async def get_context(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current market context and user watchlist"""
    from .context_provider import context_provider

    # Get watchlist
    watchlist_items = (
        db.query(Watchlist.ticker)
        .filter(Watchlist.user_id == current_user.id)
        .all()
    )
    watchlist = [item[0] for item in watchlist_items]

    # Get market overview
    market_overview = await context_provider.get_market_overview()

    return {
        "watchlist": watchlist,
        "market_overview": market_overview
    }


@router.post("/anonymous/message")
async def send_anonymous_message(
    message: MessageCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Send a message without session persistence (for anonymous users).
    Returns a streaming response.
    """

    # Get user's watchlist if authenticated
    watchlist = []
    if current_user:
        watchlist_items = (
            db.query(Watchlist.ticker)
            .filter(Watchlist.user_id == current_user.id)
            .all()
        )
        watchlist = [item[0] for item in watchlist_items]

    # Stream response without saving to database
    async def generate():
        try:
            # Stream chunks from AI
            async for chunk in chat_service.chat_stream(
                messages=[{"role": "user", "content": message.content}],
                watchlist=watchlist,
                include_market=True
            ):
                # Send as SSE format
                yield f"data: {json.dumps({'content': chunk})}\n\n"

            # Send completion signal
            yield "data: [DONE]\n\n"

        except Exception as e:
            error_msg = f"Error generating response: {str(e)}"
            yield f"data: {json.dumps({'error': error_msg})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )
