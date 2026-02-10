"""
Token management for Schwab API OAuth 2.0
Handles token lifecycle: loading, validation, and automatic refresh
"""

import os
import json
import base64
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional
import httpx
from loguru import logger

from ..config import PROJECT_ROOT


class SchwabAuthError(Exception):
    """Raised when authentication fails"""
    pass


class TokenManager:
    """
    Manages Schwab API OAuth tokens with automatic refresh
    Thread-safe implementation for concurrent requests
    """

    def __init__(
        self,
        app_key: str,
        app_secret: str,
        token_file: Optional[Path] = None,
        dev_mode: bool = True
    ):
        """
        Initialize token manager

        Args:
            app_key: Schwab API app key
            app_secret: Schwab API app secret
            token_file: Path to tokens.json file (dev mode)
            dev_mode: Use file-based storage (True) or database (False)
        """
        self.app_key = app_key
        self.app_secret = app_secret
        self.token_file = token_file or PROJECT_ROOT / "tokens.json"
        self.dev_mode = dev_mode
        self._lock = threading.Lock()
        self._tokens: Optional[Dict] = None
        self._expires_at: Optional[datetime] = None

        # Token refresh buffer: refresh if less than 5 minutes remaining
        self.refresh_buffer = timedelta(seconds=300)

        # Schwab OAuth endpoint
        self.token_endpoint = "https://api.schwabapi.com/v1/oauth/token"

    def get_valid_token(self) -> str:
        """
        Get a valid access token, refreshing if necessary

        Returns:
            Valid access token

        Raises:
            SchwabAuthError: If token refresh fails
        """
        with self._lock:
            # Load tokens if not already loaded
            if self._tokens is None:
                self._load_tokens()

            # Check if token needs refresh
            if self._needs_refresh():
                self._refresh_token()

            return self._tokens["access_token"]

    def _load_tokens(self) -> None:
        """
        Load tokens from file (dev mode) or database (production)

        Raises:
            SchwabAuthError: If tokens cannot be loaded
        """
        if self.dev_mode:
            self._load_tokens_from_file()
        else:
            # Future: Load from database
            raise NotImplementedError("Database token storage not yet implemented")

    def _load_tokens_from_file(self) -> None:
        """
        Load tokens from tokens.json file

        Raises:
            SchwabAuthError: If file doesn't exist or is invalid
        """
        if not self.token_file.exists():
            raise SchwabAuthError(
                f"Token file not found: {self.token_file}. "
                "Run get_token.py to initialize OAuth flow."
            )

        try:
            with open(self.token_file, "r") as f:
                self._tokens = json.load(f)

            # Calculate expiry time
            # Tokens expire in 30 minutes (1800 seconds)
            expires_in = self._tokens.get("expires_in", 1800)
            self._expires_at = datetime.now() + timedelta(seconds=expires_in)

            logger.info(
                "Schwab tokens loaded from file",
                expires_at=self._expires_at.isoformat()
            )

        except (json.JSONDecodeError, KeyError) as e:
            raise SchwabAuthError(f"Invalid token file format: {e}")

    def _needs_refresh(self) -> bool:
        """
        Check if token needs to be refreshed

        Returns:
            True if token is expired or within refresh buffer
        """
        if self._expires_at is None:
            return True

        # Refresh if expiry is within buffer window
        return datetime.now() + self.refresh_buffer >= self._expires_at

    def _refresh_token(self) -> None:
        """
        Refresh access token using refresh token

        Raises:
            SchwabAuthError: If refresh fails
        """
        if not self._tokens or "refresh_token" not in self._tokens:
            raise SchwabAuthError("No refresh token available")

        refresh_token_value = self._tokens["refresh_token"]

        # Prepare request
        payload = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token_value,
        }

        # Basic auth header
        auth_string = f"{self.app_key}:{self.app_secret}"
        auth_b64 = base64.b64encode(auth_string.encode()).decode()

        headers = {
            "Authorization": f"Basic {auth_b64}",
            "Content-Type": "application/x-www-form-urlencoded",
        }

        try:
            logger.info("Refreshing Schwab access token")

            # Make request with retry logic
            response = self._make_refresh_request(headers, payload)

            if response.status_code == 200:
                new_tokens = response.json()
                self._update_tokens(new_tokens)
                logger.info(
                    "Schwab token refreshed successfully",
                    expires_at=self._expires_at.isoformat()
                )
            elif response.status_code == 401:
                # Refresh token expired - user needs to re-authenticate
                raise SchwabAuthError(
                    "Refresh token expired. Please run get_token.py to re-authenticate."
                )
            else:
                raise SchwabAuthError(
                    f"Token refresh failed: {response.status_code} - {response.text}"
                )

        except httpx.HTTPError as e:
            raise SchwabAuthError(f"Network error during token refresh: {e}")

    def _make_refresh_request(
        self,
        headers: Dict[str, str],
        payload: Dict[str, str],
        max_retries: int = 3
    ) -> httpx.Response:
        """
        Make token refresh request with retry logic

        Args:
            headers: Request headers
            payload: Request payload
            max_retries: Maximum number of retry attempts

        Returns:
            HTTP response

        Raises:
            httpx.HTTPError: If all retries fail
        """
        for attempt in range(max_retries):
            try:
                with httpx.Client(timeout=10.0) as client:
                    response = client.post(
                        self.token_endpoint,
                        headers=headers,
                        data=payload
                    )
                return response

            except httpx.HTTPError as e:
                if attempt == max_retries - 1:
                    raise
                logger.warning(
                    f"Token refresh attempt {attempt + 1} failed, retrying",
                    error=str(e)
                )

    def _update_tokens(self, new_tokens: Dict) -> None:
        """
        Update tokens in memory and persist to storage

        Args:
            new_tokens: New token dictionary from Schwab API
        """
        self._tokens = new_tokens

        # Calculate new expiry time
        expires_in = new_tokens.get("expires_in", 1800)
        self._expires_at = datetime.now() + timedelta(seconds=expires_in)

        # Persist tokens
        if self.dev_mode:
            self._save_tokens_to_file()
        else:
            # Future: Save to database
            pass

    def _save_tokens_to_file(self) -> None:
        """Save tokens to tokens.json file"""
        try:
            with open(self.token_file, "w") as f:
                json.dump(self._tokens, f, indent=4)
            logger.debug(f"Tokens saved to {self.token_file}")
        except IOError as e:
            logger.error(f"Failed to save tokens to file: {e}")

    def mask_token(self, token: str) -> str:
        """
        Mask token for logging (show only first 8 characters)

        Args:
            token: Token to mask

        Returns:
            Masked token string
        """
        if not token or len(token) <= 8:
            return "***"
        return f"{token[:8]}..."


# Singleton instance
_token_manager: Optional[TokenManager] = None


def get_token_manager() -> TokenManager:
    """
    Get or create singleton TokenManager instance

    Returns:
        TokenManager instance

    Raises:
        SchwabAuthError: If environment variables are not set
    """
    global _token_manager

    if _token_manager is None:
        app_key = os.getenv("SCHWAB_APP_KEY")
        app_secret = os.getenv("SCHWAB_APP_SECRET")
        dev_mode = os.getenv("SCHWAB_DEV_MODE", "true").lower() == "true"

        if not app_key or not app_secret:
            raise SchwabAuthError(
                "SCHWAB_APP_KEY and SCHWAB_APP_SECRET must be set in environment"
            )

        _token_manager = TokenManager(
            app_key=app_key,
            app_secret=app_secret,
            dev_mode=dev_mode
        )

    return _token_manager
