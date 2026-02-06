"""
Test script for Reddit Stock Tracker
Tests tracker functionality without needing Reddit API credentials
"""
import sys
import os

# Mock environment variables for testing
os.environ["REDDIT_CLIENT_ID"] = "test_client_id"
os.environ["REDDIT_CLIENT_SECRET"] = "test_client_secret"
os.environ["REDDIT_USER_AGENT"] = "test-agent"

from reddit_tracker import (
    TickerValidator,
    SentimentAnalyzer,
    TICKER_PATTERN,
    TICKER_BLACKLIST
)
import re


def test_ticker_extraction():
    """Test ticker extraction from text"""
    print("\n" + "="*60)
    print("Testing Ticker Extraction")
    print("="*60)

    test_cases = [
        ("$AAPL to the moon 🚀", ["AAPL"]),
        ("TSLA and NVDA are looking good", ["TSLA", "NVDA"]),
        ("$SPY $QQQ bullish", ["SPY", "QQQ"]),
        ("CEO announces new product", []),  # Blacklisted
        ("FOR the best DD on AMD", ["AMD"]),  # FOR is blacklisted
        ("I bought MSFT calls", ["MSFT"]),
    ]

    for text, expected in test_cases:
        matches = re.findall(TICKER_PATTERN, text)
        tickers = []
        for match in matches:
            ticker = match[0] if match[0] else match[1]
            if ticker and ticker.upper() not in TICKER_BLACKLIST:
                tickers.append(ticker.upper())

        tickers = list(set(tickers))
        status = "✅" if set(tickers) == set(expected) else "❌"
        print(f"{status} Text: '{text}'")
        print(f"   Found: {tickers} | Expected: {expected}")


def test_sentiment_analysis():
    """Test sentiment analysis"""
    print("\n" + "="*60)
    print("Testing Sentiment Analysis")
    print("="*60)

    analyzer = SentimentAnalyzer()

    test_cases = [
        ("AAPL to the moon 🚀🚀🚀 calls printing!", "Bullish"),
        ("TSLA is dumping hard, puts are printing 💩", "Bearish"),
        ("MSFT earnings beat expectations, very bullish", "Bullish"),
        ("Market crash incoming, sell everything", "Bearish"),
        ("Holding my shares, not sure what to do", "Neutral"),
        ("Great company, strong fundamentals 📈", "Bullish"),
    ]

    for text, expected_label in test_cases:
        score = analyzer.analyze(text)
        label = analyzer.get_sentiment_label(score)
        status = "✅" if label == expected_label else "❌"

        print(f"{status} Text: '{text}'")
        print(f"   Score: {score:.2f} | Label: {label} | Expected: {expected_label}")


def test_ticker_validation():
    """Test ticker validation (requires internet)"""
    print("\n" + "="*60)
    print("Testing Ticker Validation")
    print("="*60)

    validator = TickerValidator()

    valid_tickers = ["AAPL", "MSFT", "GOOGL", "TSLA", "SPY"]
    invalid_tickers = ["FAKE", "NOTREAL", "CEO", "DD"]

    print("\nTesting valid tickers:")
    for ticker in valid_tickers:
        try:
            is_valid = validator.is_valid_ticker(ticker)
            status = "✅" if is_valid else "❌"
            print(f"  {status} {ticker}: {'Valid' if is_valid else 'Invalid'}")
        except Exception as e:
            print(f"  ⚠️  {ticker}: Error - {e}")

    print("\nTesting invalid tickers:")
    for ticker in invalid_tickers:
        try:
            is_valid = validator.is_valid_ticker(ticker)
            status = "✅" if not is_valid else "❌"
            print(f"  {status} {ticker}: {'Invalid' if not is_valid else 'Valid'} (expected invalid)")
        except Exception as e:
            print(f"  ⚠️  {ticker}: Error - {e}")


def test_comprehensive():
    """Run comprehensive test simulating actual usage"""
    print("\n" + "="*60)
    print("Comprehensive Test - Simulated Reddit Post Processing")
    print("="*60)

    analyzer = SentimentAnalyzer()

    # Simulate Reddit posts
    simulated_posts = [
        {
            "title": "$NVDA earnings beat expectations 🚀",
            "body": "Datacenter revenue up 200% YoY. This is huge for AI. Going all in on calls!",
            "score": 1247,
            "comments": 234
        },
        {
            "title": "TSLA recall announcement",
            "body": "Tesla recalling 10k vehicles. Stock might dump tomorrow. Buying puts.",
            "score": 456,
            "comments": 89
        },
        {
            "title": "AAPL new product launch",
            "body": "Apple just announced Vision Pro 2. Looks amazing. Bullish on AAPL 📈",
            "score": 892,
            "comments": 156
        },
    ]

    for i, post in enumerate(simulated_posts, 1):
        print(f"\nPost {i}:")
        print(f"  Title: {post['title']}")

        # Extract tickers
        full_text = f"{post['title']} {post['body']}"
        matches = re.findall(TICKER_PATTERN, full_text)
        tickers = []
        for match in matches:
            ticker = match[0] if match[0] else match[1]
            if ticker and ticker.upper() not in TICKER_BLACKLIST:
                tickers.append(ticker.upper())
        tickers = list(set(tickers))

        # Analyze sentiment
        sentiment_score = analyzer.analyze(full_text)
        sentiment_label = analyzer.get_sentiment_label(sentiment_score)

        print(f"  Tickers: {', '.join(tickers)}")
        print(f"  Sentiment: {sentiment_label} ({sentiment_score:.2f})")
        print(f"  Engagement: {post['score']} upvotes, {post['comments']} comments")


def main():
    """Run all tests"""
    print("\n🧪 Reddit Stock Tracker Test Suite")
    print("="*60)

    try:
        test_ticker_extraction()
        test_sentiment_analysis()

        print("\n⚠️  Ticker validation requires internet connection and may be slow...")
        test_ticker_validation()

        test_comprehensive()

        print("\n" + "="*60)
        print("✅ All tests completed!")
        print("="*60)

        print("\n💡 Next steps:")
        print("  1. Set up Reddit API credentials in .env file")
        print("  2. Run: python reddit_tracker.py --mode scan")
        print("  3. Start the API: uv run main.py")
        print("  4. Test endpoint: curl http://localhost:8000/reddit/trending")

    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
