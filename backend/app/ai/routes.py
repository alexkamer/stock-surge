"""
AI-powered endpoints for article summarization
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, HttpUrl
from slowapi import Limiter
from slowapi.util import get_remote_address

from .ollama_service import ollama_service
from ..stocks.article_scraper import article_scraper


# Create router
router = APIRouter(tags=["ai"])

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


class SummarizeRequest(BaseModel):
    """Request model for article summarization"""
    url: str
    max_length: int = 200


class SummarizeContentRequest(BaseModel):
    """Request model for direct content summarization"""
    title: str
    content: str
    max_length: int = 200


class KeyPointsRequest(BaseModel):
    """Request model for key points extraction"""
    url: str
    num_points: int = 5


@router.get("/ai/status")
async def check_ollama_status():
    """Check if Ollama service is available"""
    is_available = await ollama_service.is_available()
    return {
        "available": is_available,
        "model": ollama_service.model,
        "base_url": ollama_service.base_url
    }


@router.post("/ai/summarize")
@limiter.limit("10/minute")
async def summarize_article_from_url(request: Request, body: SummarizeRequest):
    """
    Scrape and summarize an article from a URL

    This endpoint:
    1. Scrapes the article content from the provided URL
    2. Uses Ollama to generate a concise summary
    """
    # Check if Ollama is available
    if not await ollama_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="Ollama service is not available. Make sure Ollama is running."
        )

    # First, scrape the article
    article_result = await article_scraper.scrape_article(body.url)

    if not article_result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=f"Failed to scrape article: {article_result.get('error', 'Unknown error')}"
        )

    # Extract content
    title = article_result.get("title", "Untitled")
    content = article_result.get("content")

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Article content is empty or could not be extracted"
        )

    # Generate summary
    summary_result = await ollama_service.summarize_article(
        title=title,
        content=content,
        max_length=body.max_length
    )

    if not summary_result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {summary_result.get('error', 'Unknown error')}"
        )

    return {
        "success": True,
        "url": body.url,
        "title": title,
        "summary": summary_result["summary"],
        "key_takeaway": summary_result.get("key_takeaway"),
        "sentiment": summary_result.get("sentiment"),
        "word_count": summary_result["word_count"],
        "model": summary_result["model"],
        "original_word_count": article_result.get("word_count", 0)
    }


@router.post("/ai/summarize-content")
@limiter.limit("10/minute")
async def summarize_content(request: Request, body: SummarizeContentRequest):
    """
    Summarize article content directly (without scraping)

    Use this when you already have the article content
    """
    # Check if Ollama is available
    if not await ollama_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="Ollama service is not available. Make sure Ollama is running."
        )

    # Generate summary
    summary_result = await ollama_service.summarize_article(
        title=body.title,
        content=body.content,
        max_length=body.max_length
    )

    if not summary_result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {summary_result.get('error', 'Unknown error')}"
        )

    return {
        "success": True,
        "title": body.title,
        "summary": summary_result["summary"],
        "word_count": summary_result["word_count"],
        "model": summary_result["model"]
    }


@router.post("/ai/key-points")
@limiter.limit("10/minute")
async def extract_key_points(request: Request, body: KeyPointsRequest):
    """
    Extract key points from an article URL
    """
    # Check if Ollama is available
    if not await ollama_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="Ollama service is not available. Make sure Ollama is running."
        )

    # First, scrape the article
    article_result = await article_scraper.scrape_article(body.url)

    if not article_result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=f"Failed to scrape article: {article_result.get('error', 'Unknown error')}"
        )

    # Extract content
    title = article_result.get("title", "Untitled")
    content = article_result.get("content")

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Article content is empty or could not be extracted"
        )

    # Generate key points
    result = await ollama_service.generate_key_points(
        title=title,
        content=content,
        num_points=body.num_points
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract key points: {result.get('error', 'Unknown error')}"
        )

    return {
        "success": True,
        "url": body.url,
        "title": title,
        "key_points": result["key_points"],
        "model": result["model"]
    }
