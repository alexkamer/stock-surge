"""
SQLAlchemy ORM models for database tables
"""

from sqlalchemy import Column, String, Integer, ForeignKey, JSON, DateTime, UUID as SQLUUID
from sqlalchemy.sql import func
from database import Base
import uuid


class User(Base):
    __tablename__ = "users"

    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(SQLUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(10), nullable=False)
    position = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        # Unique constraint on user_id and ticker combination
        {'sqlite_autoincrement': True},
    )


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    user_id = Column(SQLUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    theme = Column(String(20), default="dark")
    chart_type = Column(String(20), default="candlestick")
    default_period = Column(String(10), default="1mo")
    default_interval = Column(String(10), default="1d")
    preferences = Column(JSON, default={})
