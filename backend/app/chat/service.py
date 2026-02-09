"""
Chat service for handling AI conversations with streaming support
"""

import asyncio
import re
from functools import partial
from typing import AsyncGenerator, List, Dict, Any, Optional
from ollama import chat, Client
from ..config import OLLAMA_BASE_URL, OLLAMA_MODEL
from .context_provider import context_provider


class ChatService:
    """Service for AI-powered chat conversations"""

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "llama3.2"
    ):
        self.base_url = base_url.rstrip('/')
        self.model = model
        self.client = Client(host=base_url)

    async def is_available(self) -> bool:
        """Check if Ollama server is available"""
        try:
            self.client.list()
            return True
        except Exception:
            return False

    def _build_system_prompt(self, context: str = "") -> str:
        """Build the system prompt with context"""
        base_prompt = """You are a knowledgeable stock market assistant for Stock Surge, a stock analysis platform.

Your role is to:
1. Answer questions about stocks, markets, and investing
2. Analyze specific stocks using the provided real-time data
3. Compare multiple stocks and provide insights
4. Explain financial concepts in clear, simple terms
5. Help users make informed investment decisions

Guidelines:
- Always use the provided market data when available
- Be objective and data-driven in your analysis
- Mention both opportunities and risks
- Use simple language, avoid unnecessary jargon
- Format numbers clearly (use $ for prices, % for percentages)
- When mentioning stocks, use ticker symbols (e.g., $AAPL)
- Never give specific buy/sell advice - provide analysis instead

Formatting:
- Use **bold** for important metrics and key points
- Use bullet points for lists of information
- Use headings (##) to organize longer responses
- Use `inline code` for ticker symbols when appropriate
- Format prices as **$XXX.XX** and percentages as **X.XX%**
- Keep responses well-structured and easy to scan

"""
        if context:
            base_prompt += f"\n\nCURRENT CONTEXT:\n{context}\n"

        return base_prompt

    async def _extract_tickers_with_ai(self, message: str) -> List[str]:
        """Use AI to extract stock ticker symbols from natural language"""
        extraction_prompt = f"""Extract stock ticker symbols from this message. If the user mentions a company by name (like "Apple", "Microsoft", "Tesla"), provide the ticker symbol (AAPL, MSFT, TSLA).

User message: "{message}"

Return ONLY a JSON array of ticker symbols (uppercase, no $), or empty array if none mentioned.
Examples:
- "What is Apple's price?" → ["AAPL"]
- "Compare Tesla and Ford" → ["TSLA", "F"]
- "How is the market?" → []

Respond with just the JSON array, nothing else:"""

        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                partial(
                    chat,
                    model=self.model,
                    messages=[{
                        'role': 'user',
                        'content': extraction_prompt
                    }],
                    options={
                        'temperature': 0.3,
                        'num_predict': 50,
                    }
                )
            )

            # Parse the response
            import json
            content = response.message.content.strip()
            print(f"[DEBUG] AI extraction response: {content}")

            # Try to extract JSON array from response
            # Handle cases like: ["AAPL"] or just AAPL or ["AAPL", "MSFT"]
            if '[' in content and ']' in content:
                start = content.index('[')
                end = content.rindex(']') + 1
                json_str = content[start:end]
                tickers = json.loads(json_str)
                # Ensure all are uppercase and valid
                result = [t.upper().replace('$', '') for t in tickers if isinstance(t, str) and len(t) <= 5]
                print(f"[DEBUG] Parsed tickers from AI: {result}")
                return result

            print(f"[DEBUG] No JSON array found in AI response")
            return []

        except Exception as e:
            print(f"Error extracting tickers with AI: {e}")
            # Fallback to simple regex
            return self._extract_tickers_simple(message)

    def _extract_tickers_simple(self, message: str) -> List[str]:
        """Simple fallback regex extraction"""
        # Match $TICKER (explicit ticker symbol with $)
        explicit_pattern = r'\$([A-Z]{1,5})\b'
        explicit_matches = re.findall(explicit_pattern, message.upper())

        # Match ALL CAPS words that are 4-5 characters
        caps_pattern = r'\b([A-Z]{4,5})\b'
        caps_matches = re.findall(caps_pattern, message)

        tickers = list(set(explicit_matches + caps_matches))
        return tickers

    async def _build_context(
        self,
        message: str,
        watchlist: Optional[List[str]] = None,
        include_market: bool = True
    ) -> str:
        """Build context string from message and user data"""

        # Extract mentioned tickers using AI
        mentioned_tickers = await self._extract_tickers_with_ai(message)
        print(f"[DEBUG] Extracted tickers: {mentioned_tickers}")

        # Get market overview if requested
        market_overview = None
        if include_market:
            try:
                market_overview = await context_provider.get_market_overview()
            except Exception as e:
                print(f"Error getting market overview: {e}")

        # Get stock context for mentioned tickers
        stock_context = None
        comparison_context = None

        if len(mentioned_tickers) == 1:
            # Single stock - get detailed context
            print(f"[DEBUG] Fetching context for {mentioned_tickers[0]}")
            stock_context = await context_provider.get_stock_context(mentioned_tickers[0])
            print(f"[DEBUG] Stock context: {stock_context}")
        elif len(mentioned_tickers) > 1:
            # Multiple stocks - get comparison context
            print(f"[DEBUG] Fetching comparison context for {mentioned_tickers}")
            comparison_context = await context_provider.get_comparison_context(mentioned_tickers)
            print(f"[DEBUG] Comparison context: {comparison_context}")

        # Format context
        context_str = context_provider.format_context_for_prompt(
            stock_context=stock_context,
            comparison_context=comparison_context,
            market_overview=market_overview,
            watchlist=watchlist
        )

        print(f"[DEBUG] Final context length: {len(context_str)} chars")
        if context_str:
            print(f"[DEBUG] Context preview: {context_str[:200]}")

        return context_str

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        watchlist: Optional[List[str]] = None,
        include_market: bool = True
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat responses from Ollama

        Args:
            messages: List of message dicts with 'role' and 'content'
            watchlist: User's watchlist tickers
            include_market: Whether to include market overview in context

        Yields:
            String chunks of the AI response
        """

        # Build context from the last user message
        last_message = messages[-1]["content"] if messages else ""
        context = await self._build_context(last_message, watchlist, include_market)

        # Build system prompt with context
        system_prompt = self._build_system_prompt(context)

        # Prepare messages with system prompt
        full_messages = [
            {"role": "system", "content": system_prompt},
            *messages
        ]

        try:
            # Stream response from Ollama
            # Run in executor since ollama.chat is synchronous
            loop = asyncio.get_event_loop()

            # Create a queue for streaming chunks
            queue = asyncio.Queue()

            def stream_callback():
                """Synchronous callback that streams chunks"""
                try:
                    stream = self.client.chat(
                        model=self.model,
                        messages=full_messages,
                        stream=True,
                        options={
                            'temperature': 0.7,
                            'num_predict': 1000,
                        }
                    )

                    for chunk in stream:
                        content = chunk.get('message', {}).get('content', '')
                        if content:
                            # Put chunk in queue (thread-safe)
                            asyncio.run_coroutine_threadsafe(
                                queue.put(content),
                                loop
                            )

                    # Signal end of stream
                    asyncio.run_coroutine_threadsafe(
                        queue.put(None),
                        loop
                    )

                except Exception as e:
                    asyncio.run_coroutine_threadsafe(
                        queue.put(f"[ERROR: {str(e)}]"),
                        loop
                    )
                    asyncio.run_coroutine_threadsafe(
                        queue.put(None),
                        loop
                    )

            # Start streaming in background thread
            loop.run_in_executor(None, stream_callback)

            # Yield chunks from queue
            while True:
                chunk = await queue.get()
                if chunk is None:  # End of stream
                    break
                yield chunk

        except ConnectionError:
            yield "[ERROR: Could not connect to Ollama server. Make sure Ollama is running: ollama serve]"
        except Exception as e:
            error_str = str(e)
            if "not found" in error_str.lower() and "404" in error_str:
                yield f"[ERROR: Model '{self.model}' not found. Pull it with: ollama pull {self.model}]"
            else:
                yield f"[ERROR: Failed to generate response: {error_str}]"

    async def generate_title(self, first_message: str) -> str:
        """Generate a short title for a chat session based on the first message"""
        try:
            prompt = f"Generate a very short title (3-6 words max) for a conversation that starts with: '{first_message[:100]}'. Just return the title, nothing else."

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
                    options={
                        'temperature': 0.5,
                        'num_predict': 20,
                    }
                )
            )

            title = response.message.content.strip().strip('"\'')
            return title[:100]  # Limit length

        except Exception as e:
            print(f"Error generating title: {e}")
            # Fallback: use first few words of message
            words = first_message.split()[:5]
            return " ".join(words) + "..."


# Singleton instance
def get_chat_service() -> ChatService:
    """Get configured chat service instance"""
    from ..config import OLLAMA_BASE_URL, OLLAMA_MODEL
    return ChatService(
        base_url=OLLAMA_BASE_URL,
        model=OLLAMA_MODEL
    )


chat_service = get_chat_service()
