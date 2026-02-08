"""
Article scraper service to fetch and parse article content from URLs
"""

import httpx
from bs4 import BeautifulSoup
from typing import Dict, Any, Optional
from urllib.parse import urlparse
import re
import asyncio
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout


class ArticleScraper:
    """Scrapes and extracts article content from news URLs"""

    # Common article content selectors for popular news sites
    CONTENT_SELECTORS = [
        '.caas-body',  # Yahoo Finance/News specific
        '.article-wrap',  # Yahoo Finance specific
        'article',
        '[role="article"]',
        '.article-content',
        '.article-body',
        '.story-body',
        '.post-content',
        '.entry-content',
        'main',
    ]

    # Tags to remove (ads, social media, etc.)
    JUNK_TAGS = ['script', 'style', 'aside', 'nav', 'header', 'footer', 'iframe', 'form']

    # Classes/IDs to remove
    # Use word boundaries to avoid false matches (e.g., "ad-" shouldn't match "read")
    JUNK_PATTERNS = [
        r'\bad-',  # Matches "ad-" at word boundary
        r'\badvertisement\b',
        r'\bsocial\b',
        r'\bshare\b',
        r'\bcomment\b',
        r'\brelated\b',
        r'\bsidebar\b',
        r'\bnewsletter\b',
        r'\bpromo\b',
    ]

    def __init__(self, timeout: int = 10, use_js_rendering: bool = True):
        self.timeout = timeout
        self.use_js_rendering = use_js_rendering
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        }

        # Sites known to need JavaScript rendering
        self.js_required_domains = [
            'yahoo.com',
            'bloomberg.com',
            'wsj.com',
            'ft.com',
        ]

    def _should_use_js_rendering(self, url: str) -> bool:
        """Check if URL is from a site that needs JavaScript rendering"""
        if not self.use_js_rendering:
            return False

        parsed = urlparse(url)
        domain = parsed.netloc.lower()

        for js_domain in self.js_required_domains:
            if js_domain in domain:
                return True

        return False

    async def scrape_article(self, url: str) -> Dict[str, Any]:
        """
        Scrape article content from a URL

        Args:
            url: Article URL to scrape

        Returns:
            Dictionary with article content and metadata
        """
        # Use Playwright for JS-heavy sites
        if self._should_use_js_rendering(url):
            return await self._scrape_with_playwright(url)

        # Use httpx for simple sites (faster)
        return await self._scrape_with_httpx(url)

    async def _scrape_with_httpx(self, url: str) -> Dict[str, Any]:
        """Scrape using httpx (no JavaScript execution)"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()

            # Try lxml first, fallback to html.parser if not available
            try:
                soup = BeautifulSoup(response.text, 'lxml')
            except:
                soup = BeautifulSoup(response.text, 'html.parser')

            # Extract content
            article_content = self._extract_content(soup)

            # Extract metadata
            title = self._extract_title(soup)
            author = self._extract_author(soup)
            publish_date = self._extract_publish_date(soup)

            return {
                "success": True,
                "url": url,
                "title": title,
                "author": author,
                "publish_date": publish_date,
                "content": article_content,
                "word_count": len(article_content.split()) if article_content else 0,
            }

        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "Request timed out. The article may be unavailable or blocked.",
                "url": url,
            }
        except httpx.HTTPStatusError as e:
            return {
                "success": False,
                "error": f"HTTP error: {e.response.status_code}",
                "url": url,
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to scrape article: {str(e)}",
                "url": url,
            }

    async def _scrape_with_playwright(self, url: str) -> Dict[str, Any]:
        """Scrape using Playwright (with JavaScript execution)"""
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent=self.headers['User-Agent'],
                    viewport={'width': 1280, 'height': 720}
                )
                page = await context.new_page()

                # Navigate to URL
                await page.goto(url, wait_until='domcontentloaded', timeout=self.timeout * 1000)

                # Wait for article content to load
                try:
                    await page.wait_for_selector('article, .article-body, .caas-body', timeout=3000)
                except PlaywrightTimeout:
                    pass  # Continue even if selector not found

                # Try to click "show more" or "read more" buttons
                # First try text-based selectors
                show_more_texts = [
                    'Show more',
                    'Read more',
                    'Continue reading',
                    'Show full article',
                    'Read full story',
                ]

                clicked = False
                for text in show_more_texts:
                    try:
                        # Try both button and any clickable element with this text
                        for elem_type in ['button', 'a', 'div[role="button"]', 'span[role="button"]']:
                            selector = f'{elem_type}:has-text("{text}")'
                            button = page.locator(selector).first
                            if await button.count() > 0 and await button.is_visible(timeout=500):
                                print(f"Clicking: {text}")
                                await button.click()
                                await page.wait_for_timeout(1500)
                                clicked = True
                                break
                        if clicked:
                            break
                    except Exception as e:
                        continue

                # Also try class-based selectors
                if not clicked:
                    class_selectors = [
                        '[class*="show-more"]',
                        '[class*="read-more"]',
                        '[class*="expand"]',
                        '[class*="showMore"]',
                        '[class*="readMore"]',
                    ]
                    for selector in class_selectors:
                        try:
                            button = page.locator(selector).first
                            if await button.count() > 0 and await button.is_visible(timeout=500):
                                await button.click()
                                await page.wait_for_timeout(1500)
                                break
                        except:
                            continue

                # Get the page HTML
                html = await page.content()
                await browser.close()

                # Parse with BeautifulSoup
                try:
                    soup = BeautifulSoup(html, 'lxml')
                except:
                    soup = BeautifulSoup(html, 'html.parser')

                # Extract content
                article_content = self._extract_content(soup)

                # Extract metadata
                title = self._extract_title(soup)
                author = self._extract_author(soup)
                publish_date = self._extract_publish_date(soup)

                return {
                    "success": True,
                    "url": url,
                    "title": title,
                    "author": author,
                    "publish_date": publish_date,
                    "content": article_content,
                    "word_count": len(article_content.split()) if article_content else 0,
                    "rendered_with_js": True,
                }

        except PlaywrightTimeout:
            return {
                "success": False,
                "error": "Page took too long to load",
                "url": url,
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to scrape article with browser: {str(e)}",
                "url": url,
            }

    def _extract_content(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract main article content from parsed HTML"""
        try:
            # Try to find article container using common selectors
            article_container = None
            for selector in self.CONTENT_SELECTORS:
                try:
                    article_container = soup.select_one(selector)
                    if article_container:
                        break
                except Exception:
                    continue

            if not article_container:
                # Fallback: use body
                article_container = soup.body

            if not article_container:
                return None

            # Remove junk elements
            for tag in self.JUNK_TAGS:
                try:
                    for element in article_container.find_all(tag):
                        element.decompose()
                except Exception:
                    continue

            # Remove elements with junk classes/ids
            try:
                for element in article_container.find_all():
                    if self._is_junk_element(element):
                        element.decompose()
            except Exception:
                pass

            # Extract paragraphs - extract ALL content including hidden divs
            paragraphs = []
            seen_hashes = set()  # Use hash to avoid exact duplicates while allowing similar text

            try:
                # Extract all paragraph and heading elements in order
                # This includes content in hidden divs (display:none) which we want to capture
                for elem in article_container.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
                    try:
                        # Get text content
                        text = elem.get_text(separator=' ', strip=True)

                        # Skip if empty or too short
                        if not text or len(text) < 15:
                            continue

                        # Use hash for duplicate detection to be more lenient
                        text_hash = hash(text)
                        if text_hash in seen_hashes:
                            continue

                        seen_hashes.add(text_hash)

                        if elem.name and elem.name.startswith('h'):
                            # Add formatting for headers
                            paragraphs.append(f"\n## {text}\n")
                        else:
                            paragraphs.append(text)
                    except Exception:
                        continue
            except Exception:
                pass

            content = '\n\n'.join(paragraphs)
            return content if content else None
        except Exception:
            return None

    def _is_junk_element(self, element) -> bool:
        """Check if element is likely junk (ads, etc.)"""
        try:
            class_list = element.get('class', [])
            if class_list is None:
                class_list = []
            class_str = ' '.join(class_list) if isinstance(class_list, list) else str(class_list)

            id_str = element.get('id', '') or ''
            combined = f"{class_str} {id_str}".lower()

            for pattern in self.JUNK_PATTERNS:
                if re.search(pattern, combined):
                    return True
        except Exception:
            pass
        return False

    def _extract_title(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract article title"""
        try:
            # Try meta tags first
            meta_title = soup.find('meta', property='og:title')
            if meta_title and meta_title.get('content'):
                return meta_title.get('content')

            # Try h1 in article
            h1 = soup.find('h1')
            if h1:
                return h1.get_text(strip=True)

            # Fallback to page title
            title = soup.find('title')
            if title:
                return title.get_text(strip=True)
        except Exception:
            pass

        return None

    def _extract_author(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract article author"""
        try:
            # Try meta tags
            meta_author = soup.find('meta', attrs={'name': 'author'})
            if meta_author and meta_author.get('content'):
                return meta_author.get('content')

            # Try common author selectors
            author_selectors = [
                '.author',
                '.byline',
                '[rel="author"]',
                '[itemprop="author"]',
            ]

            for selector in author_selectors:
                author = soup.select_one(selector)
                if author:
                    text = author.get_text(strip=True)
                    if text:
                        return text
        except Exception:
            pass

        return None

    def _extract_publish_date(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract publish date"""
        try:
            # Try meta tags
            meta_date = soup.find('meta', property='article:published_time')
            if meta_date and meta_date.get('content'):
                return meta_date.get('content')

            # Try time element
            time = soup.find('time')
            if time:
                datetime_attr = time.get('datetime')
                if datetime_attr:
                    return datetime_attr
                text = time.get_text(strip=True)
                if text:
                    return text
        except Exception:
            pass

        return None


# Singleton instance - import config at module level to avoid circular imports
def get_article_scraper():
    """Get configured article scraper instance"""
    from ..config import ARTICLE_SCRAPER_USE_JS, ARTICLE_SCRAPER_TIMEOUT
    return ArticleScraper(timeout=ARTICLE_SCRAPER_TIMEOUT, use_js_rendering=ARTICLE_SCRAPER_USE_JS)


# Default instance
article_scraper = get_article_scraper()
