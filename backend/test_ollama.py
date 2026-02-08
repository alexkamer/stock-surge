#!/usr/bin/env python3
"""
Simple test script for Ollama integration
Run this to verify Ollama is working before starting the main app
"""

import asyncio
import sys
from app.ai.ollama_service import ollama_service


async def main():
    print("Testing Ollama integration...\n")

    # Test 1: Check availability
    print("1. Checking if Ollama is available...")
    is_available = await ollama_service.is_available()

    if not is_available:
        print("❌ Ollama is not available")
        print("\nMake sure Ollama is running:")
        print("  $ ollama serve")
        print("\nAnd that you have pulled a model:")
        print("  $ ollama pull llama3.2")
        print("\nSee docs/OLLAMA_SETUP.md for more information")
        sys.exit(1)

    print(f"✓ Ollama is available at {ollama_service.base_url}")
    print(f"  Using model: {ollama_service.model}\n")

    # Test 2: Generate a simple summary
    print("2. Testing article summarization...")

    test_article = {
        "title": "Apple Reports Record Quarterly Revenue",
        "content": """
        Apple Inc. announced record-breaking quarterly revenue today, exceeding analyst
        expectations. The company reported $123 billion in revenue for the quarter,
        driven by strong iPhone sales and growth in its services segment. CEO Tim Cook
        highlighted the company's continued innovation in AI and upcoming product releases.
        The stock rose 5% in after-hours trading following the announcement.
        """
    }

    print(f"Summarizing: {test_article['title']}")
    print("Please wait... (this may take 10-30 seconds)")

    result = await ollama_service.summarize_article(
        title=test_article["title"],
        content=test_article["content"],
        max_length=100
    )

    if result.get("success"):
        print("\n✓ Summary generated successfully!")
        print(f"\nSummary ({result['word_count']} words):")
        print("-" * 60)
        print(result["summary"])
        print("-" * 60)
        if result.get("key_takeaway"):
            print(f"\nKey Takeaway: {result['key_takeaway']}")
        print(f"\nModel used: {result['model']}")
    else:
        print(f"\n❌ Failed to generate summary: {result.get('error')}")
        sys.exit(1)

    # Test 3: Extract key points
    print("\n3. Testing key points extraction...")

    result = await ollama_service.generate_key_points(
        title=test_article["title"],
        content=test_article["content"],
        num_points=3
    )

    if result.get("success"):
        print("\n✓ Key points extracted successfully!")
        print(f"\nKey Points:")
        for i, point in enumerate(result["key_points"], 1):
            print(f"  {i}. {point}")
    else:
        print(f"\n❌ Failed to extract key points: {result.get('error')}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("✓ All tests passed! Ollama integration is working correctly.")
    print("=" * 60)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
