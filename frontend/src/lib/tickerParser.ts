/**
 * Ticker detection and parsing utilities for chat messages
 */

// Common words that might be mistaken for tickers
const FALSE_POSITIVES = new Set([
  'A', 'I', 'AM', 'AN', 'AS', 'AT', 'BE', 'BY', 'DO', 'GO', 'HE', 'IF', 'IN', 'IS', 'IT',
  'ME', 'MY', 'NO', 'OF', 'ON', 'OR', 'SO', 'TO', 'UP', 'US', 'WE',
  'ALL', 'AND', 'ARE', 'BUT', 'CAN', 'FOR', 'GET', 'HAS', 'HAD', 'HER', 'HIM', 'HIS',
  'HOW', 'ITS', 'MAY', 'NEW', 'NOT', 'NOW', 'OUR', 'OUT', 'SEE', 'SHE', 'THE', 'TWO',
  'WAY', 'WHO', 'WHY', 'YOU', 'NEXT', 'VERY', 'NEAR', 'ONCE', 'OPEN', 'GOOD', 'BEST',
]);

export interface TickerMatch {
  ticker: string;
  index: number;
  hasPrefix: boolean; // Whether it was prefixed with $
}

/**
 * Detect stock tickers in text
 * Supports both $AAPL and AAPL formats, but requires $ prefix for short symbols to avoid false positives
 */
export function detectTickers(text: string): TickerMatch[] {
  const matches: TickerMatch[] = [];
  const seen = new Set<string>();

  // Pattern 1: $TICKER format (1-5 uppercase letters)
  const dollarPattern = /\$([A-Z]{1,5})\b/g;
  let match;

  while ((match = dollarPattern.exec(text)) !== null) {
    const ticker = match[1];
    if (!seen.has(ticker) && !FALSE_POSITIVES.has(ticker)) {
      matches.push({
        ticker,
        index: match.index,
        hasPrefix: true,
      });
      seen.add(ticker);
    }
  }

  // Pattern 2: Ticker in parentheses like (NVDA) or (AAPL)
  // This is very common in financial text: "NVIDIA Corporation (NVDA)"
  const parenPattern = /\(([A-Z]{2,5})\)/g;

  while ((match = parenPattern.exec(text)) !== null) {
    const ticker = match[1];
    if (!seen.has(ticker) && !FALSE_POSITIVES.has(ticker)) {
      matches.push({
        ticker,
        index: match.index,
        hasPrefix: false,
      });
      seen.add(ticker);
    }
  }

  // Pattern 3: Plain TICKER format (3-5 uppercase letters only, to reduce false positives)
  // Must be surrounded by word boundaries and not preceded by $
  const plainPattern = /(?<!\$)\b([A-Z]{3,5})\b/g;

  while ((match = plainPattern.exec(text)) !== null) {
    const ticker = match[1];
    if (!seen.has(ticker) && !FALSE_POSITIVES.has(ticker) && isLikelyTicker(ticker, text, match.index)) {
      matches.push({
        ticker,
        index: match.index,
        hasPrefix: false,
      });
      seen.add(ticker);
    }
  }

  // Sort by index to maintain order in text
  return matches.sort((a, b) => a.index - b.index);
}

/**
 * Additional heuristics to determine if a word is likely a ticker
 */
function isLikelyTicker(word: string, text: string, index: number): boolean {
  // Check context around the word for stock-related keywords
  const contextStart = Math.max(0, index - 50);
  const contextEnd = Math.min(text.length, index + word.length + 50);
  const context = text.slice(contextStart, contextEnd).toLowerCase();

  const stockKeywords = [
    'stock', 'share', 'ticker', 'price', 'trade', 'market', 'company',
    'earnings', 'revenue', 'profit', 'dividend', 'pe ratio', 'volume',
    'analysis', 'buy', 'sell', 'investment', 'portfolio', 'vs', 'versus',
    'compare', 'performance', 'returns', 'gain', 'loss',
  ];

  const hasStockContext = stockKeywords.some(keyword => context.includes(keyword));

  // Also allow if surrounded by other likely tickers
  const nearbyTickers = /\$[A-Z]{1,5}|\b[A-Z]{3,5}\b/g;
  const matches = text.slice(contextStart, contextEnd).match(nearbyTickers);
  const hasManyTickers = Boolean(matches && matches.length >= 3);

  return hasStockContext || hasManyTickers;
}

/**
 * Validate if a ticker symbol is valid (basic validation)
 */
export function isValidTicker(ticker: string): boolean {
  if (!ticker || ticker.length < 1 || ticker.length > 5) {
    return false;
  }

  // Must be all uppercase letters
  if (!/^[A-Z]+$/.test(ticker)) {
    return false;
  }

  // Check against false positives
  if (FALSE_POSITIVES.has(ticker)) {
    return false;
  }

  return true;
}

/**
 * Extract unique tickers from text with validation
 */
export function extractTickers(text: string, maxTickers: number = 10): string[] {
  const matches = detectTickers(text);
  const validTickers = matches
    .map(m => m.ticker)
    .filter(isValidTicker)
    .slice(0, maxTickers);

  return Array.from(new Set(validTickers));
}

/**
 * Parse text and split into segments with ticker markers
 * Used for rendering inline ticker cards
 */
export interface TextSegment {
  type: 'text' | 'ticker';
  content: string;
  ticker?: string;
}

export function parseTextWithTickers(text: string): TextSegment[] {
  const matches = detectTickers(text);

  if (matches.length === 0) {
    return [{ type: 'text', content: text }];
  }

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    // Add text before ticker
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    // Add ticker segment
    const tickerLength = match.hasPrefix ? match.ticker.length + 1 : match.ticker.length;
    segments.push({
      type: 'ticker',
      content: text.slice(match.index, match.index + tickerLength),
      ticker: match.ticker,
    });

    lastIndex = match.index + tickerLength;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Detect URLs in text for article summarization
 */
export function detectUrls(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s<>]+/g;
  const matches = text.match(urlPattern) || [];
  return matches.map(url => url.replace(/[.,;!?)]+$/, '')); // Remove trailing punctuation
}

/**
 * Detect comparison intent in text
 * Returns array of tickers if comparison is detected, or undefined if no comparison detected
 */
export function detectComparison(text: string): string[] | undefined {
  const comparisonKeywords = /\b(compare|versus|vs\.?|compared to|better than)\b/i;

  if (!comparisonKeywords.test(text)) {
    return undefined;
  }

  const tickers = extractTickers(text);

  // Need at least 2 tickers for comparison
  if (tickers.length >= 2 && tickers.length <= 4) {
    return tickers;
  }

  return undefined;
}
