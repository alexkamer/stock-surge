"""
HTTP client for Schwab API interactions
Handles authentication, rate limiting, and error handling
"""

import time
from typing import Dict, List, Any, Optional
import httpx
from loguru import logger

from .token_manager import get_token_manager, SchwabAuthError
from .constants import SCHWAB_API_BASE_URL


class SchwabAPIError(Exception):
    """Raised when Schwab API returns an error"""
    pass


class SchwabClient:
    """
    HTTP client for Schwab API with automatic token refresh and retry logic
    """

    def __init__(self):
        """Initialize Schwab client with session management"""
        self.base_url = SCHWAB_API_BASE_URL
        self.token_manager = get_token_manager()
        self._client: Optional[httpx.Client] = None

    def _get_client(self) -> httpx.Client:
        """
        Get or create HTTP client with connection pooling

        Returns:
            httpx.Client instance
        """
        if self._client is None:
            self._client = httpx.Client(
                base_url=self.base_url,
                timeout=10.0,
                limits=httpx.Limits(max_connections=10, max_keepalive_connections=5)
            )
        return self._client

    def _get_headers(self) -> Dict[str, str]:
        """
        Get request headers with valid access token

        Returns:
            Dictionary of HTTP headers
        """
        token = self.token_manager.get_valid_token()
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }

    def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        retry_on_401: bool = True
    ) -> Dict[str, Any]:
        """
        Make HTTP request to Schwab API with error handling

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            params: Query parameters
            retry_on_401: Retry once on 401 error with token refresh

        Returns:
            API response as dictionary

        Raises:
            SchwabAPIError: If API returns error
            SchwabAuthError: If authentication fails
        """
        client = self._get_client()
        headers = self._get_headers()

        try:
            response = client.request(
                method=method,
                url=endpoint,
                headers=headers,
                params=params
            )

            # Handle 401 Unauthorized - token may have expired
            if response.status_code == 401 and retry_on_401:
                logger.warning("Received 401, refreshing token and retrying")
                # Force token refresh
                self.token_manager._needs_refresh = lambda: True
                headers = self._get_headers()

                # Retry request with new token
                response = client.request(
                    method=method,
                    url=endpoint,
                    headers=headers,
                    params=params
                )

            # Handle 429 Rate Limit
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", 60))
                logger.warning(
                    f"Schwab rate limit hit, waiting {retry_after} seconds",
                    retry_after=retry_after
                )
                time.sleep(retry_after)

                # Retry after waiting
                return self._make_request(method, endpoint, params, retry_on_401=False)

            # Handle other errors
            if response.status_code >= 400:
                error_msg = f"Schwab API error: {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg = f"{error_msg} - {error_data}"
                except:
                    error_msg = f"{error_msg} - {response.text}"

                logger.error(
                    "Schwab API error",
                    status_code=response.status_code,
                    endpoint=endpoint,
                    error=error_msg
                )

                raise SchwabAPIError(error_msg)

            # Success - return JSON response
            return response.json()

        except httpx.HTTPError as e:
            logger.error(f"Network error calling Schwab API: {e}")
            raise SchwabAPIError(f"Network error: {e}")

    def get_quote(self, symbol: str) -> Dict[str, Any]:
        """
        Get quote for a single symbol

        Args:
            symbol: Stock ticker symbol (e.g., "AAPL")

        Returns:
            Quote data dictionary

        Raises:
            SchwabAPIError: If API call fails
        """
        endpoint = f"/marketdata/v1/{symbol}/quotes"
        response = self._make_request("GET", endpoint)

        # Response format: {symbol: {quote_data}}
        # Extract the quote data for the symbol
        if symbol in response:
            return response[symbol]
        elif symbol.upper() in response:
            return response[symbol.upper()]

        raise SchwabAPIError(f"Symbol {symbol} not found in response")

    def get_quotes(self, symbols: List[str]) -> Dict[str, Any]:
        """
        Get quotes for multiple symbols in a single request

        Args:
            symbols: List of stock ticker symbols

        Returns:
            Dictionary mapping symbols to quote data

        Raises:
            SchwabAPIError: If API call fails
        """
        # Schwab API accepts comma-separated symbols in query param
        symbols_param = ",".join(symbols)
        endpoint = "/marketdata/v1/quotes"
        params = {"symbols": symbols_param}

        response = self._make_request("GET", endpoint, params=params)
        return response

    def get_price_history(
        self,
        symbol: str,
        period_type: str,
        period: int,
        frequency_type: str,
        frequency: int
    ) -> Dict[str, Any]:
        """
        Get historical price data for a symbol

        Args:
            symbol: Stock ticker symbol
            period_type: Period type (day, month, year, ytd)
            period: Number of periods
            frequency_type: Frequency type (minute, daily, weekly, monthly)
            frequency: Frequency value

        Returns:
            Price history data dictionary

        Raises:
            SchwabAPIError: If API call fails
        """
        endpoint = f"/marketdata/v1/pricehistory"
        params = {
            "symbol": symbol,
            "periodType": period_type,
            "period": period,
            "frequencyType": frequency_type,
            "frequency": frequency
        }

        response = self._make_request("GET", endpoint, params=params)
        return response

    def get_accounts(self, include_positions: bool = False) -> List[Dict[str, Any]]:
        """
        Get all linked Schwab accounts

        Args:
            include_positions: Whether to include position details for all accounts

        Returns:
            List of account dictionaries with account numbers and types

        Raises:
            SchwabAPIError: If API call fails
        """
        endpoint = "/trader/v1/accounts"
        params = {"fields": "positions"} if include_positions else {}
        response = self._make_request("GET", endpoint, params=params)
        return response if isinstance(response, list) else []

    def get_orders(
        self,
        account_hash: str,
        from_date: str,
        to_date: str,
        status: str = "FILLED"
    ) -> List[Dict[str, Any]]:
        """
        Get orders for an account

        Args:
            account_hash: Encrypted account number
            from_date: From date in ISO format (YYYY-MM-DD)
            to_date: To date in ISO format (YYYY-MM-DD)
            status: Order status filter (FILLED, CANCELED, REJECTED, etc.)

        Returns:
            List of order dictionaries

        Raises:
            SchwabAPIError: If API call fails
        """
        from datetime import datetime

        # Parse and format dates
        from_dt = datetime.strptime(from_date, "%Y-%m-%d")
        to_dt = datetime.strptime(to_date, "%Y-%m-%d")

        # Format as ISO 8601 with timezone
        from_iso = from_dt.strftime("%Y-%m-%dT00:00:00.000Z")
        to_iso = to_dt.strftime("%Y-%m-%dT23:59:59.999Z")

        endpoint = f"/trader/v1/accounts/{account_hash}/orders"
        params = {
            "fromEnteredTime": from_iso,
            "toEnteredTime": to_iso,
            "status": status
        }

        logger.info(f"Fetching orders: {from_iso} to {to_iso}, status={status}")
        response = self._make_request("GET", endpoint, params=params)
        return response if isinstance(response, list) else []

    def get_transactions(
        self,
        account_hash: str,
        start_date: str,
        end_date: str,
        types: Optional[str] = "TRADE"
    ) -> List[Dict[str, Any]]:
        """
        Get transaction history for an account

        Args:
            account_hash: Encrypted account number
            start_date: Start date in ISO format (YYYY-MM-DD)
            end_date: End date in ISO format (YYYY-MM-DD)
            types: Transaction types (TRADE, RECEIVE_AND_DELIVER, DIVIDEND, etc.)

        Returns:
            List of transaction dictionaries

        Raises:
            SchwabAPIError: If API call fails
        """
        # Convert YYYY-MM-DD to ISO 8601 format with timezone
        # Schwab expects: YYYY-MM-DDTHH:MM:SS.SSSZ
        from datetime import datetime

        # Parse and format dates
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")

        # Format as ISO 8601 with timezone
        start_iso = start_dt.strftime("%Y-%m-%dT00:00:00.000Z")
        end_iso = end_dt.strftime("%Y-%m-%dT23:59:59.999Z")

        endpoint = f"/trader/v1/accounts/{account_hash}/transactions"
        params = {
            "startDate": start_iso,
            "endDate": end_iso,
            "types": types
        }

        logger.info(f"Fetching transactions: {start_iso} to {end_iso}")
        response = self._make_request("GET", endpoint, params=params)
        return response if isinstance(response, list) else []

    def get_account_details(self, account_hash: str, include_positions: bool = True) -> Dict[str, Any]:
        """
        Get detailed information for a specific account including positions

        Args:
            account_hash: Encrypted account number
            include_positions: Whether to include position details

        Returns:
            Account details with positions

        Raises:
            SchwabAPIError: If API call fails
        """
        endpoint = f"/trader/v1/accounts/{account_hash}"
        params = {"fields": "positions"} if include_positions else {}
        response = self._make_request("GET", endpoint, params=params)
        return response

    def close(self):
        """Close HTTP client and cleanup resources"""
        if self._client:
            self._client.close()
            self._client = None


# Singleton instance
_schwab_client: Optional[SchwabClient] = None


def get_schwab_client() -> SchwabClient:
    """
    Get or create singleton SchwabClient instance

    Returns:
        SchwabClient instance
    """
    global _schwab_client

    if _schwab_client is None:
        _schwab_client = SchwabClient()

    return _schwab_client
