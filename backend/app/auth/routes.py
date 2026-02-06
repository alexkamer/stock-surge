"""
Authentication endpoints
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import get_db
from .. import models
from . import auth
from .schemas import RegisterRequest, LoginResponse, UserResponse, TokenResponse

# Create router
router = APIRouter(prefix="/auth", tags=["authentication"])

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=UserResponse)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user account.
    Rate limited to 5 requests per minute to prevent abuse.
    """
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == body.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Create new user
    hashed_password = auth.hash_password(body.password)
    new_user = models.User(
        email=body.email,
        password_hash=hashed_password,
        name=body.name
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create default preferences
    preferences = models.UserPreferences(user_id=new_user.id)
    db.add(preferences)
    db.commit()

    return {
        "id": str(new_user.id),
        "email": new_user.email,
        "name": new_user.name,
        "created_at": new_user.created_at.isoformat()
    }


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login with email and password.
    Returns access token (30 min) and refresh token (7 days).
    Rate limited to 10 requests per minute.
    """
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )

    # Create tokens
    access_token = auth.create_access_token(data={"sub": user.email})
    refresh_token = auth.create_refresh_token(data={"sub": user.email})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name
        }
    }


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("20/minute")
async def refresh_token(
    request: Request,
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token.
    Returns new access token.
    """
    try:
        payload = auth.verify_token(refresh_token, token_type="refresh")
        email = payload.get("sub")

        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Verify user still exists
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        # Create new access token
        new_access_token = auth.create_access_token(data={"sub": email})

        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }

    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: models.User = Depends(auth.get_current_user)):
    """
    Get current authenticated user information.
    Requires valid access token in Authorization header.
    """
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.name,
        "created_at": current_user.created_at.isoformat()
    }
