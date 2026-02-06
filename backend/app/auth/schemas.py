"""
Pydantic schemas for authentication endpoints
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional


class RegisterRequest(BaseModel):
    """Request model for user registration"""
    email: EmailStr = Field(..., json_schema_extra={"example": "user@example.com"})
    password: str = Field(..., min_length=8, json_schema_extra={"example": "password123"})
    name: Optional[str] = Field(None, json_schema_extra={"example": "John Doe"})


class LoginResponse(BaseModel):
    """Response model for login endpoint"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    """Response model for user information"""
    id: str
    email: str
    name: Optional[str]
    created_at: str


class RefreshTokenRequest(BaseModel):
    """Request model for token refresh"""
    refresh_token: str = Field(..., json_schema_extra={"example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."})


class TokenResponse(BaseModel):
    """Response model for token operations"""
    access_token: str
    token_type: str = "bearer"
