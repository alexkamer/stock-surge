# Stock-Focused Chat Enhancement - Testing Guide

## Quick Test Scenarios

### 1. Ticker Cards Test

**Test Input:**
```
How is $AAPL performing today? Also check MSFT and GOOGL.
```

**Expected Result:**
- Three ticker cards appear (AAPL, MSFT, GOOGL)
- Cards show current price with color-coded change percentage
- Mini sparkline chart for 7-day trend
- Key metrics (Volume, Market Cap, etc.)
- Add to watchlist button present
- View Details link works

**Alternative Input:**
```
Compare the tech giants: Apple (AAPL), Microsoft (MSFT), and Google (GOOGL)
```

---

### 2. Stock Comparison Test

**Test Input:**
```
Compare AAPL vs MSFT performance
```

**Expected Result:**
- Stock comparison chart appears
- Two lines showing percentage-based performance
- Color-coded legends (green for AAPL, blue for MSFT)
- Metrics table below with prices, changes, volume, market cap
- Charts are synchronized

**Alternative Inputs:**
- `compare AAPL and MSFT`
- `AAPL versus MSFT`
- `How does TSLA compare to NIO and RIVN?`

---

### 3. Article Summarization Test

**Test Input:**
```
Check out this article: https://finance.yahoo.com/news/apple-stock-latest-earnings
```

**Expected Result:**
- Article summary card appears
- Sentiment badge (Bullish/Bearish/Neutral)
- Summary text
- Key takeaway highlighted in blue box
- Reading time estimate
- Word count comparison
- "Show Key Points" button
- "Read Full Article" link
- Expandable "More Info" section

**Test Key Points:**
1. Click "Show Key Points" button
2. Wait for loading
3. Numbered list of key insights appears

---

### 4. Code Copy Test

**Test Input:**
```
Here's a Python example:
```python
def calculate_rsi(prices, period=14):
    gains = []
    losses = []
    for i in range(1, len(prices)):
        change = prices[i] - prices[i-1]
        if change > 0:
            gains.append(change)
            losses.append(0)
        else:
            gains.append(0)
            losses.append(abs(change))
    return 100 - (100 / (1 + avg(gains) / avg(losses)))
```py
```

**Expected Result:**
1. Code block appears with syntax highlighting
2. Hover over code block
3. Copy button appears in top-right corner
4. Click copy button
5. Checkmark appears for 2 seconds
6. Code is in clipboard

---

### 5. Message Actions Test

**Test Input:**
Send any message and get a response from AI.

**Expected Result:**
1. **User Message:**
   - Hover over your message
   - Action buttons appear (copy icon)
   - Click copy → text copied to clipboard

2. **Assistant Message:**
   - Hover over AI response
   - Action buttons appear (copy as text, copy as markdown)
   - Click copy → text copied
   - Click markdown → markdown format copied

---

### 6. Search Test

**Test Input:**
1. Have a conversation with multiple messages
2. Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux)

**Expected Result:**
- Search modal appears at top
- Type search term (e.g., "AAPL")
- Results counter shows "X / Y"
- Press Enter to go to next result
- Press Shift+Enter to go to previous result
- Press Esc to close

**Manual Test:**
1. Click "Search" button in toolbar
2. Same behavior as keyboard shortcut

---

### 7. Export Test

**Test Input:**
1. Have a conversation with several messages
2. Press `Cmd+E` (Mac) or `Ctrl+E` (Windows/Linux)

**Expected Result:**
- Export modal appears
- Three format options: Markdown, JSON, Plain Text
- "Include timestamps" checkbox
- Export details show message count
- Click export → file downloads

**Format Tests:**
- **Markdown**: Opens in text editor with proper formatting
- **JSON**: Valid JSON with structured data
- **Text**: Plain text with separators

**Manual Test:**
1. Click "Export" button in toolbar
2. Same behavior as keyboard shortcut

---

### 8. Keyboard Shortcuts Test

Test each shortcut:

| Shortcut | Action | Expected Result |
|----------|--------|-----------------|
| `Cmd+K` / `Ctrl+K` | Search | Search modal opens |
| `Cmd+N` / `Ctrl+N` | New Chat | New chat session created |
| `Cmd+E` / `Ctrl+E` | Export | Export modal opens |
| `Cmd+/` / `Ctrl+/` | Focus Input | Textarea receives focus |
| `Esc` | Clear Focus | Input loses focus (if focused) |

---

### 9. Technical Indicators Test (Future - Requires AI Training)

**Test Input:**
```
What's the RSI for AAPL? Also show me MACD signals.
```

**Expected Result (When AI is trained):**
- Indicator badges appear
- RSI badge shows:
  - Visual bar (0-100)
  - Value (e.g., 68.5)
  - Level (Overbought/Oversold/Neutral)
- MACD badge shows:
  - Signal (Bullish/Bearish/Neutral)
  - Trend arrow

---

## Edge Cases to Test

### 1. No Data Available
**Test:** Mention an invalid ticker like `$ABCD123`

**Expected:**
- Ticker card shows "Data unavailable"
- No crash, graceful error handling

---

### 2. Long Conversations
**Test:** Have 50+ messages in conversation

**Expected:**
- Search still works
- Export works
- No performance degradation
- Scroll is smooth

---

### 3. Multiple URLs
**Test:**
```
Check these articles:
https://example.com/article1
https://example.com/article2
```

**Expected:**
- Two article summary cards appear
- Both load independently
- No conflicts

---

### 4. Mixed Content
**Test:**
```
$AAPL is up today. Compare it to $MSFT. Here's an article: https://example.com/news

Also, here's code:
```python
print("hello")
```py
```

**Expected:**
- Ticker cards for AAPL and MSFT
- Comparison chart (since "compare" keyword present)
- Article summary card
- Code block with copy button
- All render correctly together

---

### 5. Rapid Typing
**Test:** Type messages quickly one after another

**Expected:**
- All messages render
- No race conditions
- Ticker cards load independently
- No duplicate cards

---

### 6. Streaming Response with Tickers
**Test:** Ask AI a question that will mention stocks in response

**Expected:**
- Response streams in
- Ticker cards appear after streaming completes
- No flickering

---

## Accessibility Testing

### Keyboard Navigation
1. Tab through all interactive elements
2. Should reach: buttons, links, inputs, ticker cards
3. Focus indicators visible
4. Enter/Space activates buttons

### Screen Reader
1. Enable VoiceOver (Mac) or NVDA (Windows)
2. Navigate through chat
3. All elements should be announced
4. ARIA labels present on icon buttons

### Color Contrast
1. Use browser DevTools Accessibility panel
2. Check all text has sufficient contrast
3. Positive (green) and negative (red) indicators visible

---

## Performance Testing

### Load Time
1. Open chat page
2. Time to interactive: < 3 seconds
3. No blocking operations

### Chart Rendering
1. Display ticker cards with charts
2. Charts render in < 500ms
3. Smooth animations

### Search Performance
1. Search in conversation with 100+ messages
2. Results appear instantly (< 200ms)
3. No lag when typing

---

## Browser Testing

Test in:
- ✅ Chrome/Brave (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Edge

Features to verify:
- All keyboard shortcuts work
- Copy to clipboard works
- Download exports works
- Charts render correctly

---

## Mobile Testing (If Responsive)

1. Open on mobile device
2. Ticker cards should adapt
3. Touch interactions work
4. Search modal usable
5. Export works

---

## Integration Testing with Backend

### 1. Test with Ollama Running
**Setup:** Ensure Ollama is running with qwen2.5-coder:7b

**Test:**
1. Send message mentioning stocks
2. Verify AI response
3. Verify ticker detection in response

### 2. Test with Ollama Stopped
**Setup:** Stop Ollama service

**Test:**
1. Send message
2. Verify error handling
3. Error message displayed
4. No crash

### 3. Test Article Scraping
**Various URLs:**
- News sites (Yahoo Finance, Bloomberg)
- Paywalled content (expect graceful failure)
- Invalid URLs (expect error)

---

## Regression Testing

Test existing features still work:
1. ✅ Chat sessions load
2. ✅ Message history persists
3. ✅ Sidebar conversation list
4. ✅ New chat creation
5. ✅ Session deletion
6. ✅ Anonymous mode
7. ✅ Markdown rendering (headers, lists, links, bold, italic)
8. ✅ Streaming responses
9. ✅ Error handling

---

## Known Limitations

1. **Watchlist Integration**: Add to watchlist button is UI-only (backend pending)
2. **Message Regeneration**: Button present but not functional (backend pending)
3. **Price Alerts**: Not implemented (future feature)
4. **Ticker Limits**: Maximum 10 tickers per message (prevents overload)
5. **Article Limits**: Maximum 2 articles per message (prevents clutter)
6. **Comparison Limit**: 2-4 stocks only (chart readability)

---

## Debug Tips

### Charts Not Showing
1. Check browser console for errors
2. Verify lightweight-charts is installed
3. Check if data is loading (Network tab)

### Ticker Cards Not Appearing
1. Verify ticker format ($AAPL or plain AAPL)
2. Check if ticker is in FALSE_POSITIVES list
3. Verify backend `/stock/{ticker}/price` endpoint works

### Article Summary Not Loading
1. Check if Ollama is running
2. Verify `/ai/summarize` endpoint
3. Check URL is accessible

### Keyboard Shortcuts Not Working
1. Verify no input is focused (except where expected)
2. Check if browser/OS has conflicting shortcuts
3. Test in incognito mode (extensions can interfere)

---

## Success Criteria

✅ **Must Pass:**
- Ticker detection works for $AAPL format
- Code copy button appears and works
- Search modal opens with Cmd+K
- Export modal opens with Cmd+E
- Message actions appear on hover
- No TypeScript errors in console
- No React warnings in console

✅ **Should Pass:**
- Article summarization works (when URL is accessible)
- Comparison chart appears for "compare" queries
- Charts render smoothly
- All keyboard shortcuts work
- Export downloads files

✅ **Nice to Have:**
- Ticker cards show sparklines
- Article sentiment is accurate
- Key points extraction works
- Search highlights matches

---

## Feedback Collection

After testing, note:
1. What works well?
2. What feels slow or laggy?
3. Any confusing UX?
4. Missing features?
5. Bugs or errors?

Report issues with:
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/console logs
