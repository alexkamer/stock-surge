"""
User Schwab account linking endpoints
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from datetime import datetime, timedelta
from pydantic import BaseModel
import base64
import httpx
from urllib.parse import unquote

from ..database import get_db
from .. import models
from ..auth.auth import get_current_user
from ..config import (
    SCHWAB_APP_KEY,
    SCHWAB_APP_SECRET,
    SCHWAB_REDIRECT_URI,
    SCHWAB_AUTH_ENDPOINT,
    SCHWAB_TOKEN_ENDPOINT
)

router = APIRouter(prefix="/user/schwab", tags=["user-schwab"])
limiter = Limiter(key_func=get_remote_address)


class LinkSchwabRequest(BaseModel):
    code: str  # Authorization code from OAuth callback


class SchwabStatusResponse(BaseModel):
    linked: bool
    expires_at: str = None


@router.get("/status", response_model=SchwabStatusResponse)
@limiter.limit("60/minute")
async def get_schwab_status(
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user has linked Schwab account"""
    schwab_token = db.query(models.SchwabToken).filter(
        models.SchwabToken.user_id == current_user.id
    ).first()

    if not schwab_token:
        return {"linked": False}

    return {
        "linked": True,
        "expires_at": schwab_token.expires_at.isoformat()
    }


@router.get("/authorize")
@limiter.limit("10/minute")
async def authorize_schwab(
    request: Request,
    current_user: models.User = Depends(get_current_user)
):
    """Redirect to Schwab OAuth authorization page"""
    if not SCHWAB_APP_KEY:
        raise HTTPException(status_code=500, detail="Schwab API not configured")

    auth_url = (
        f"{SCHWAB_AUTH_ENDPOINT}"
        f"?client_id={SCHWAB_APP_KEY}"
        f"&redirect_uri={SCHWAB_REDIRECT_URI}"
        f"&response_type=code"
    )

    return {"authorization_url": auth_url}


@router.post("/link")
@limiter.limit("10/minute")
async def link_schwab_account(
    request: Request,
    body: LinkSchwabRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Link Schwab account using authorization code"""
    if not SCHWAB_APP_KEY or not SCHWAB_APP_SECRET:
        raise HTTPException(status_code=500, detail="Schwab API not configured")

    # URL decode the authorization code
    decoded_code = unquote(body.code)

    # Exchange authorization code for tokens
    auth_string = f"{SCHWAB_APP_KEY}:{SCHWAB_APP_SECRET}"
    auth_b64 = base64.b64encode(auth_string.encode()).decode()

    headers = {
        "Authorization": f"Basic {auth_b64}",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    payload = {
        "grant_type": "authorization_code",
        "code": decoded_code,
        "redirect_uri": SCHWAB_REDIRECT_URI
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                SCHWAB_TOKEN_ENDPOINT,
                headers=headers,
                data=payload,
                timeout=10.0
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to exchange code for tokens: {response.text}"
            )

        token_data = response.json()

        # Calculate expiry time
        expires_in = token_data.get("expires_in", 1800)
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        # Store or update tokens in database
        schwab_token = db.query(models.SchwabToken).filter(
            models.SchwabToken.user_id == current_user.id
        ).first()

        if schwab_token:
            # Update existing
            schwab_token.access_token = token_data["access_token"]
            schwab_token.refresh_token = token_data["refresh_token"]
            schwab_token.expires_at = expires_at
            schwab_token.token_type = token_data.get("token_type", "Bearer")
            schwab_token.scope = token_data.get("scope", "api")
        else:
            # Create new
            schwab_token = models.SchwabToken(
                user_id=current_user.id,
                access_token=token_data["access_token"],
                refresh_token=token_data["refresh_token"],
                expires_at=expires_at,
                token_type=token_data.get("token_type", "Bearer"),
                scope=token_data.get("scope", "api")
            )
            db.add(schwab_token)

        db.commit()

        return {
            "message": "Schwab account linked successfully",
            "expires_at": expires_at.isoformat()
        }

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Network error connecting to Schwab: {str(e)}"
        )


@router.delete("/unlink")
@limiter.limit("10/minute")
async def unlink_schwab_account(
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unlink Schwab account"""
    schwab_token = db.query(models.SchwabToken).filter(
        models.SchwabToken.user_id == current_user.id
    ).first()

    if not schwab_token:
        raise HTTPException(status_code=404, detail="No Schwab account linked")

    db.delete(schwab_token)
    db.commit()

    return {"message": "Schwab account unlinked"}
