"""
Ollama service for AI-powered article summarization
"""

import asyncio
from functools import partial
from ollama import chat, Client
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from ..config import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT


class ArticleSummary(BaseModel):
    """Structured output for article summary"""
    summary: str = Field(description="Concise summary of the article focusing on key facts for investors")
    key_takeaway: str = Field(description="Single most important point from the article")
    sentiment: str = Field(description="Overall sentiment of the article for investors. Must be one of: bullish, bearish, neutral")


class KeyPointsList(BaseModel):
    """Structured output for key points extraction"""
    points: List[str] = Field(description="List of key points from the article")


class OllamaService:
    """Service for interacting with Ollama for text generation"""

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "llama3.2",
        timeout: int = 60
    ):
        self.base_url = base_url.rstrip('/')
        self.model = model
        self.timeout = timeout
        self.client = Client(host=base_url)

    async def is_available(self) -> bool:
        """Check if Ollama server is available"""
        try:
            # Try to list models to check if server is up
            self.client.list()
            return True
        except Exception:
            return False

    async def summarize_article(
        self,
        title: str,
        content: str,
        max_length: int = 200
    ) -> Dict[str, Any]:
        """
        Summarize an article using Ollama with structured output

        Args:
            title: Article title
            content: Full article content
            max_length: Maximum length of summary in words (approximate)

        Returns:
            Dictionary with summary and metadata
        """
        if not content:
            return {
                "success": False,
                "error": "No content provided to summarize"
            }

        # Truncate content if too long (keep first ~8000 chars for context)
        content_preview = content[:8000] if len(content) > 8000 else content

        # Build the prompt
        prompt = f"""Summarize this financial news article in approximately {max_length} words. Focus on key facts and important details for stock investors. Be concise and objective.

Also determine the overall sentiment for investors as one of: bullish (positive for stock price), bearish (negative for stock price), or neutral.

Title: {title}

Article:
{content_preview}"""

        try:
            # Use structured output for better consistency
            # Run the synchronous chat() function in an executor to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                partial(
                    chat,
                    model=self.model,
                    messages=[{
                        'role': 'user',
                        'content': prompt
                    }],
                    format=ArticleSummary.model_json_schema(),
                    options={
                        'temperature': 0.7,
                        'num_predict': 300,
                    }
                )
            )

            # Parse structured response
            result = ArticleSummary.model_validate_json(response.message.content)

            return {
                "success": True,
                "summary": result.summary,
                "key_takeaway": result.key_takeaway,
                "sentiment": result.sentiment.lower(),  # Normalize to lowercase
                "model": self.model,
                "word_count": len(result.summary.split())
            }

        except ConnectionError:
            return {
                "success": False,
                "error": "Could not connect to Ollama server. Make sure Ollama is running: ollama serve"
            }
        except TimeoutError:
            return {
                "success": False,
                "error": "Request timed out. The model may be too slow or unresponsive."
            }
        except Exception as e:
            error_str = str(e)
            # Check for common errors and provide helpful messages
            if "not found" in error_str.lower() and "404" in error_str:
                return {
                    "success": False,
                    "error": f"Model '{self.model}' not found. Pull it with: ollama pull {self.model}"
                }
            return {
                "success": False,
                "error": f"Failed to generate summary: {error_str}"
            }

    async def generate_key_points(
        self,
        title: str,
        content: str,
        num_points: int = 5
    ) -> Dict[str, Any]:
        """
        Extract key points from an article using structured output

        Args:
            title: Article title
            content: Full article content
            num_points: Number of key points to extract

        Returns:
            Dictionary with key points list
        """
        if not content:
            return {
                "success": False,
                "error": "No content provided"
            }

        # Truncate content if too long
        content_preview = content[:8000] if len(content) > 8000 else content

        prompt = f"""Extract {num_points} key points from this financial news article. Each point should be a concise statement about important information for investors.

Title: {title}

Article:
{content_preview}"""

        try:
            # Use structured output for consistent formatting
            # Run the synchronous chat() function in an executor to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                partial(
                    chat,
                    model=self.model,
                    messages=[{
                        'role': 'user',
                        'content': prompt
                    }],
                    format=KeyPointsList.model_json_schema(),
                    options={
                        'temperature': 0.5,
                        'num_predict': 250,
                    }
                )
            )

            # Parse structured response
            result = KeyPointsList.model_validate_json(response.message.content)

            return {
                "success": True,
                "key_points": result.points[:num_points],  # Limit to requested number
                "model": self.model
            }

        except ConnectionError:
            return {
                "success": False,
                "error": "Could not connect to Ollama server. Make sure Ollama is running: ollama serve"
            }
        except Exception as e:
            error_str = str(e)
            # Check for common errors and provide helpful messages
            if "not found" in error_str.lower() and "404" in error_str:
                return {
                    "success": False,
                    "error": f"Model '{self.model}' not found. Pull it with: ollama pull {self.model}"
                }
            return {
                "success": False,
                "error": f"Failed to extract key points: {error_str}"
            }


# Singleton instance
def get_ollama_service() -> OllamaService:
    """Get configured Ollama service instance"""
    from ..config import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT
    return OllamaService(
        base_url=OLLAMA_BASE_URL,
        model=OLLAMA_MODEL,
        timeout=OLLAMA_TIMEOUT
    )


# Default instance
ollama_service = get_ollama_service()
