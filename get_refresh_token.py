import os
import json
import base64
import requests
from dotenv import load_dotenv
from loguru import logger

load_dotenv()

TOKEN_FILE = "tokens.json"


def load_tokens() -> dict:
    with open(TOKEN_FILE, "r") as f:
        return json.load(f)


def save_tokens(tokens: dict):
    with open(TOKEN_FILE, "w") as f:
        json.dump(tokens, f, indent=4)
    logger.info(f"Tokens saved to {TOKEN_FILE}")


def refresh_tokens():
    logger.info("Initializing...")

    app_key = os.getenv("SCHWAB_APP_KEY")
    app_secret = os.getenv("SCHWAB_APP_SECRET")

    # Pull this from the local file
    tokens = load_tokens()
    refresh_token_value = tokens.get("refresh_token")

    if not refresh_token_value:
        logger.error("No refresh token found in tokens.json")
        return None

    payload = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token_value,
    }
    headers = {
        "Authorization": f'Basic {base64.b64encode(f"{app_key}:{app_secret}".encode()).decode()}',
        "Content-Type": "application/x-www-form-urlencoded",
    }

    refresh_token_response = requests.post(
        url="https://api.schwabapi.com/v1/oauth/token",
        headers=headers,
        data=payload,
    )
    if refresh_token_response.status_code == 200:
        logger.info("Retrieved new tokens successfully using refresh token.")
    else:
        logger.error(
            f"Error refreshing access token: {refresh_token_response.text}"
        )
        return None

    refresh_token_dict = refresh_token_response.json()

    logger.debug(refresh_token_dict)
    save_tokens(refresh_token_dict)

    logger.info("Token dict refreshed.")

    return "Done!"

if __name__ == "__main__":
  refresh_tokens()