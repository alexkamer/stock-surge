"""
Reddit Stock Mention Tracker
Monitors financial subreddits for stock mentions and sentiment
"""
import os
import re
import time
import asyncio
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from typing import List, Dict, Optional, Set
import logging

import praw
from prawcore.exceptions import ResponseException, RequestException
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import yfinance as yf

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
SUBREDDITS = os.getenv("REDDIT_SUBREDDITS", "wallstreetbets+stocks+investing+StockMarket")
MIN_SCORE = int(os.getenv("REDDIT_MIN_SCORE", "10"))
STREAM_ENABLED = os.getenv("REDDIT_STREAM_ENABLED", "true").lower() == "true"

# Ticker extraction regex - matches $AAPL or standalone AAPL
TICKER_PATTERN = r'\$([A-Z]{1,5})\b|(?<!\w)([A-Z]{2,5})(?!\w)'

# Blacklist common false positives
TICKER_BLACKLIST = {
    "CEO", "DD", "IMO", "IPO", "EOD", "FOR", "ALL", "NEW", "USA",
    "ETF", "ATH", "ATL", "PM", "AH", "ER", "IV", "PT", "EPS",
    "PE", "PS", "PB", "ROE", "ROI", "YOY", "QOQ", "TTM", "GDP",
    "CPI", "FOMC", "FED", "SEC", "IRS", "LLC", "INC", "LTD",
    "YOLO", "WSB", "TBH", "IMO", "FOMO", "FUD", "HODL",
    "THE", "AND", "BUT", "NOT", "OUT", "NOW", "SEE", "GET",
    "HAS", "HAD", "DID", "CAN", "MAY", "ONE", "TWO", "TOP"
}

# Bullish/bearish keywords for sentiment boosting
BULLISH_KEYWORDS = ['moon', 'rocket', 'bull', 'calls', 'long', 'buy', 'bullish', 'gap up']
BEARISH_KEYWORDS = ['dump', 'crash', 'bear', 'puts', 'short', 'sell', 'bearish', 'gap down']


class TickerValidator:
    """Validates if a string is a real stock ticker"""

    def __init__(self):
        self.valid_cache: Set[str] = set()
        self.invalid_cache: Set[str] = set()
        self.cache_size_limit = 1000

    def is_valid_ticker(self, ticker: str) -> bool:
        """Check if ticker is valid using yfinance"""
        ticker = ticker.upper()

        # Check blacklist first
        if ticker in TICKER_BLACKLIST:
            return False

        # Check caches
        if ticker in self.valid_cache:
            return True
        if ticker in self.invalid_cache:
            return False

        # Validate with yfinance
        try:
            stock = yf.Ticker(ticker)
            info = stock.info

            # Check if it has basic stock data
            is_valid = bool(info and ('regularMarketPrice' in info or 'currentPrice' in info))

            if is_valid:
                self.valid_cache.add(ticker)
                # Limit cache size
                if len(self.valid_cache) > self.cache_size_limit:
                    self.valid_cache.pop()
            else:
                self.invalid_cache.add(ticker)
                if len(self.invalid_cache) > self.cache_size_limit:
                    self.invalid_cache.pop()

            return is_valid

        except Exception as e:
            logger.debug(f"Error validating ticker {ticker}: {e}")
            self.invalid_cache.add(ticker)
            return False


class SentimentAnalyzer:
    """Analyzes sentiment of Reddit posts"""

    def __init__(self):
        self.vader = SentimentIntensityAnalyzer()

    def analyze(self, text: str) -> float:
        """
        Analyze sentiment of text
        Returns: -1.0 (very bearish) to 1.0 (very bullish)
        """
        if not text:
            return 0.0

        # Get VADER compound score
        scores = self.vader.polarity_scores(text)
        sentiment = scores['compound']

        # Boost for bullish indicators
        text_lower = text.lower()
        if any(keyword in text_lower for keyword in BULLISH_KEYWORDS):
            sentiment = min(sentiment + 0.15, 1.0)

        # Check for rocket emojis
        if '🚀' in text or '📈' in text or '💎' in text:
            sentiment = min(sentiment + 0.2, 1.0)

        # Reduce for bearish indicators
        if any(keyword in text_lower for keyword in BEARISH_KEYWORDS):
            sentiment = max(sentiment - 0.15, -1.0)

        # Check for bearish emojis
        if '💩' in text or '📉' in text or '🤡' in text:
            sentiment = max(sentiment - 0.2, -1.0)

        return round(sentiment, 3)

    def get_sentiment_label(self, score: float) -> str:
        """Convert sentiment score to label"""
        if score >= 0.3:
            return "Bullish"
        elif score <= -0.3:
            return "Bearish"
        else:
            return "Neutral"


class RedditStockTracker:
    """Main tracker for Reddit stock mentions"""

    def __init__(self):
        # Initialize Reddit client
        self.reddit = praw.Reddit(
            client_id=os.getenv("REDDIT_CLIENT_ID"),
            client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
            user_agent=os.getenv("REDDIT_USER_AGENT", "stock-surge:v1.0"),
            ratelimit_seconds=300
        )

        # Initialize helpers
        self.validator = TickerValidator()
        self.sentiment_analyzer = SentimentAnalyzer()

        # Data storage (in-memory for now, will move to DB)
        self.mentions: List[Dict] = []
        self.processed_ids: Set[str] = set()
        self.ticker_stats: Dict[str, Dict] = defaultdict(lambda: {
            'count': 0,
            'sentiment_sum': 0.0,
            'total_score': 0,
            'total_comments': 0,
            'posts': []
        })

        logger.info(f"Reddit tracker initialized. Monitoring: {SUBREDDITS}")
        logger.info(f"Read-only mode: {self.reddit.read_only}")

    def extract_tickers(self, text: str) -> List[str]:
        """Extract valid stock tickers from text"""
        if not text:
            return []

        # Find all potential ticker matches
        matches = re.findall(TICKER_PATTERN, text)

        # Flatten tuples from regex groups
        potential_tickers = []
        for match in matches:
            ticker = match[0] if match[0] else match[1]
            if ticker:
                potential_tickers.append(ticker.upper())

        # Remove duplicates and validate
        unique_tickers = list(set(potential_tickers))
        valid_tickers = [t for t in unique_tickers if self.validator.is_valid_ticker(t)]

        return valid_tickers

    def process_submission(self, submission) -> Optional[Dict]:
        """Process a Reddit submission for stock mentions"""
        try:
            # Skip if already processed
            if submission.id in self.processed_ids:
                return None

            # Skip if below minimum score
            if submission.score < MIN_SCORE:
                return None

            # Extract tickers from title and body
            title_tickers = self.extract_tickers(submission.title)

            body_text = ""
            if submission.is_self and submission.selftext:
                body_text = submission.selftext
                body_tickers = self.extract_tickers(submission.selftext)
            else:
                body_tickers = []

            all_tickers = list(set(title_tickers + body_tickers))

            if not all_tickers:
                self.processed_ids.add(submission.id)
                return None

            # Analyze sentiment
            full_text = f"{submission.title} {body_text}"
            sentiment_score = self.sentiment_analyzer.analyze(full_text)
            sentiment_label = self.sentiment_analyzer.get_sentiment_label(sentiment_score)

            # Create mention record
            mention = {
                'post_id': submission.id,
                'tickers': all_tickers,
                'title': submission.title,
                'body': body_text[:500] if body_text else "",  # Truncate body
                'score': submission.score,
                'num_comments': submission.num_comments,
                'sentiment_score': sentiment_score,
                'sentiment_label': sentiment_label,
                'subreddit': str(submission.subreddit),
                'author': str(submission.author) if submission.author else "[deleted]",
                'created_utc': datetime.fromtimestamp(submission.created_utc),
                'permalink': f"https://reddit.com{submission.permalink}",
                'processed_at': datetime.now()
            }

            # Store mention
            self.mentions.append(mention)

            # Update stats for each ticker
            for ticker in all_tickers:
                stats = self.ticker_stats[ticker]
                stats['count'] += 1
                stats['sentiment_sum'] += sentiment_score
                stats['total_score'] += submission.score
                stats['total_comments'] += submission.num_comments
                stats['posts'].append({
                    'post_id': submission.id,
                    'title': submission.title,
                    'score': submission.score,
                    'sentiment': sentiment_score,
                    'permalink': mention['permalink']
                })

            # Mark as processed
            self.processed_ids.add(submission.id)

            # Log
            logger.info(
                f"Found {len(all_tickers)} ticker(s): {', '.join(all_tickers)} | "
                f"Sentiment: {sentiment_label} ({sentiment_score:.2f}) | "
                f"r/{submission.subreddit} | Score: {submission.score}"
            )

            return mention

        except Exception as e:
            logger.error(f"Error processing submission {submission.id}: {e}")
            return None

    def get_trending_tickers(self, limit: int = 20, timeframe_hours: int = 24) -> List[Dict]:
        """Get most mentioned tickers in timeframe"""
        cutoff_time = datetime.now() - timedelta(hours=timeframe_hours)

        # Filter mentions by time
        recent_mentions = [
            m for m in self.mentions
            if m['created_utc'] >= cutoff_time
        ]

        # Aggregate by ticker
        ticker_data = defaultdict(lambda: {
            'mentions': 0,
            'sentiment_sum': 0.0,
            'total_score': 0,
            'posts': []
        })

        for mention in recent_mentions:
            for ticker in mention['tickers']:
                ticker_data[ticker]['mentions'] += 1
                ticker_data[ticker]['sentiment_sum'] += mention['sentiment_score']
                ticker_data[ticker]['total_score'] += mention['score']
                ticker_data[ticker]['posts'].append({
                    'title': mention['title'],
                    'score': mention['score'],
                    'sentiment': mention['sentiment_score']
                })

        # Calculate averages and sort
        trending = []
        for ticker, data in ticker_data.items():
            avg_sentiment = data['sentiment_sum'] / data['mentions']
            avg_score = data['total_score'] / data['mentions']

            trending.append({
                'ticker': ticker,
                'mentions': data['mentions'],
                'sentiment': round(avg_sentiment, 3),
                'sentiment_label': self.sentiment_analyzer.get_sentiment_label(avg_sentiment),
                'avg_score': int(avg_score),
                'top_post': max(data['posts'], key=lambda p: p['score'])
            })

        # Sort by mention count
        trending.sort(key=lambda x: x['mentions'], reverse=True)

        return trending[:limit]

    def get_ticker_mentions(self, ticker: str, limit: int = 50) -> List[Dict]:
        """Get recent mentions for specific ticker"""
        ticker = ticker.upper()

        ticker_mentions = [
            m for m in self.mentions
            if ticker in m['tickers']
        ]

        # Sort by created time (most recent first)
        ticker_mentions.sort(key=lambda m: m['created_utc'], reverse=True)

        return ticker_mentions[:limit]

    def get_ticker_sentiment(self, ticker: str, days: int = 7) -> Dict:
        """Get sentiment analysis for ticker over time"""
        ticker = ticker.upper()
        cutoff_time = datetime.now() - timedelta(days=days)

        # Filter mentions
        ticker_mentions = [
            m for m in self.mentions
            if ticker in m['tickers'] and m['created_utc'] >= cutoff_time
        ]

        if not ticker_mentions:
            return {
                'ticker': ticker,
                'mention_count': 0,
                'current_sentiment': 0.0,
                'sentiment_history': []
            }

        # Calculate current sentiment (weighted by score)
        total_weight = sum(m['score'] + m['num_comments'] for m in ticker_mentions)
        weighted_sentiment = sum(
            m['sentiment_score'] * (m['score'] + m['num_comments'])
            for m in ticker_mentions
        )
        current_sentiment = weighted_sentiment / total_weight if total_weight > 0 else 0.0

        # Group by day for history
        daily_data = defaultdict(lambda: {'sentiment_sum': 0.0, 'count': 0})

        for mention in ticker_mentions:
            date_key = mention['created_utc'].date()
            daily_data[date_key]['sentiment_sum'] += mention['sentiment_score']
            daily_data[date_key]['count'] += 1

        # Build history
        sentiment_history = []
        for date, data in sorted(daily_data.items()):
            avg_sentiment = data['sentiment_sum'] / data['count']
            sentiment_history.append({
                'date': date.isoformat(),
                'sentiment': round(avg_sentiment, 3),
                'mentions': data['count']
            })

        return {
            'ticker': ticker,
            'mention_count': len(ticker_mentions),
            'current_sentiment': round(current_sentiment, 3),
            'sentiment_label': self.sentiment_analyzer.get_sentiment_label(current_sentiment),
            'sentiment_history': sentiment_history
        }

    def scan_recent_posts(self, limit: int = 100):
        """Scan recent posts from subreddits (one-time scan)"""
        logger.info(f"Scanning recent posts from r/{SUBREDDITS}")

        subreddit = self.reddit.subreddit(SUBREDDITS)
        processed_count = 0

        try:
            for submission in subreddit.hot(limit=limit):
                result = self.process_submission(submission)
                if result:
                    processed_count += 1

            logger.info(f"Scan complete. Processed {processed_count} posts with valid tickers")

        except Exception as e:
            logger.error(f"Error during scan: {e}")

    def stream_submissions(self):
        """Stream new submissions in real-time"""
        logger.info(f"Starting real-time stream from r/{SUBREDDITS}")

        subreddit = self.reddit.subreddit(SUBREDDITS)
        retry_count = 0
        max_retries = 5

        while True:
            try:
                for submission in subreddit.stream.submissions(skip_existing=True):
                    self.process_submission(submission)
                    retry_count = 0  # Reset on success

                    # Periodic stats
                    if len(self.processed_ids) % 100 == 0:
                        self.log_stats()

            except (ResponseException, RequestException) as e:
                logger.error(f"API error: {e}")
                retry_count += 1

                if retry_count < max_retries:
                    wait_time = 60 * retry_count
                    logger.info(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    logger.error("Max retries exceeded. Exiting.")
                    break

            except KeyboardInterrupt:
                logger.info("Stream stopped by user")
                break

            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                time.sleep(120)

    def log_stats(self):
        """Log current tracking statistics"""
        logger.info(f"\n{'='*60}")
        logger.info(f"Total posts processed: {len(self.processed_ids)}")
        logger.info(f"Total mentions: {len(self.mentions)}")
        logger.info(f"Unique tickers tracked: {len(self.ticker_stats)}")

        if self.ticker_stats:
            top_tickers = sorted(
                self.ticker_stats.items(),
                key=lambda x: x[1]['count'],
                reverse=True
            )[:10]

            logger.info("\nTop 10 mentioned tickers:")
            for ticker, stats in top_tickers:
                avg_sentiment = stats['sentiment_sum'] / stats['count']
                logger.info(
                    f"  ${ticker}: {stats['count']} mentions | "
                    f"Sentiment: {avg_sentiment:.2f}"
                )
        logger.info(f"{'='*60}\n")


# Global tracker instance
tracker = RedditStockTracker()


def main():
    """Main entry point for running tracker"""
    import argparse

    parser = argparse.ArgumentParser(description="Reddit Stock Mention Tracker")
    parser.add_argument(
        '--mode',
        choices=['scan', 'stream'],
        default='scan',
        help='Scan recent posts or stream new posts'
    )
    parser.add_argument(
        '--limit',
        type=int,
        default=100,
        help='Number of posts to scan (scan mode only)'
    )

    args = parser.parse_args()

    if args.mode == 'scan':
        tracker.scan_recent_posts(limit=args.limit)
        tracker.log_stats()
    else:
        tracker.stream_submissions()


if __name__ == "__main__":
    main()
