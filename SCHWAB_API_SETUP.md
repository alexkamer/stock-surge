# Schwab API Authentication Setup

This document describes the Schwab API authentication flow and token management.

## Overview

The Schwab API uses OAuth 2.0 with short-lived access tokens (30 minutes) and refresh tokens (7 days). To maintain continuous access, tokens must be refreshed before expiration.

## Files

- `get_token.py` - Initial OAuth authentication flow
- `get_refresh_token.py` - Token refresh script
- `tokens.json` - Stores current access and refresh tokens (git-ignored)

## Authentication Flow

### Initial Authentication

Run once to obtain initial tokens:

```bash
python get_token.py
```

This script:
1. Constructs OAuth URL using `SCHWAB_APP_KEY` from environment variables
2. Opens browser for Schwab account authentication
3. Prompts for the callback URL after authentication
4. Exchanges authorization code for access and refresh tokens
5. Saves tokens to `tokens.json`

The callback URL will look like:
```
https://127.0.0.1?code=XXXX%40...
```

### Token Refresh

Run every 29 minutes to maintain access:

```bash
python get_refresh_token.py
```

This script:
1. Loads existing refresh token from `tokens.json`
2. Requests new access and refresh tokens
3. Saves updated tokens to `tokens.json`

**Important**: The access token expires after 30 minutes. Run this script at least once every 29 minutes to avoid re-authentication.

## Environment Variables

Required in `.env`:
- `SCHWAB_APP_KEY` - Your Schwab API application key
- `SCHWAB_APP_SECRET` - Your Schwab API application secret

## Token Storage

`tokens.json` structure:
```json
{
    "expires_in": 1800,
    "token_type": "Bearer",
    "scope": "api",
    "refresh_token": "...",
    "access_token": "...",
    "id_token": "..."
}
```

## Automation Recommendations

For production use, consider:
1. Setting up a cron job or scheduled task to run `get_refresh_token.py` every 25-29 minutes
2. Implementing token refresh logic directly in the backend service
3. Adding token expiration monitoring and automatic refresh before expiry
4. Error handling for failed refresh attempts (requires re-authentication via `get_token.py`)

## Security Notes

- `tokens.json` is git-ignored to prevent accidental token exposure
- Keep `.env` file secure and never commit it
- Tokens grant full API access to your Schwab account
- Refresh tokens expire after 7 days of inactivity
