"""
Redis caching utilities for Stock Surge API
Handles connection and caching operations
"""

import redis
import json
from typing import Optional, Any
from ..config import REDIS_HOST, REDIS_PORT, REDIS_DB, REDIS_PASSWORD

# Initialize Redis client
try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        password=REDIS_PASSWORD,
        decode_responses=True
    )
    redis_client.ping()
    REDIS_AVAILABLE = True
except (redis.ConnectionError, redis.RedisError):
    redis_client = None
    REDIS_AVAILABLE = False


def get_cached_data(key: str) -> Optional[Any]:
    """
    Retrieve data from Redis cache

    Args:
        key: Cache key

    Returns:
        Cached data if found, None otherwise
    """
    if not REDIS_AVAILABLE or not redis_client:
        return None

    try:
        cached = redis_client.get(key)
        if cached:
            return json.loads(cached)
    except (redis.RedisError, json.JSONDecodeError):
        pass

    return None


def set_cached_data(key: str, data: Any, ttl: int) -> bool:
    """
    Store data in Redis cache with TTL

    Args:
        key: Cache key
        data: Data to cache (must be JSON-serializable)
        ttl: Time-to-live in seconds

    Returns:
        True if successful, False otherwise
    """
    if not REDIS_AVAILABLE or not redis_client:
        return False

    try:
        redis_client.setex(key, ttl, json.dumps(data))
        return True
    except (redis.RedisError, TypeError):
        return False


def delete_cached_data(key: str) -> bool:
    """
    Delete data from Redis cache

    Args:
        key: Cache key

    Returns:
        True if successful, False otherwise
    """
    if not REDIS_AVAILABLE or not redis_client:
        return False

    try:
        redis_client.delete(key)
        return True
    except redis.RedisError:
        return False


def clear_cache_pattern(pattern: str) -> int:
    """
    Delete all keys matching a pattern

    Args:
        pattern: Redis key pattern (e.g., "stock:*")

    Returns:
        Number of keys deleted
    """
    if not REDIS_AVAILABLE or not redis_client:
        return 0

    try:
        keys = redis_client.keys(pattern)
        if keys:
            return redis_client.delete(*keys)
    except redis.RedisError:
        pass

    return 0
