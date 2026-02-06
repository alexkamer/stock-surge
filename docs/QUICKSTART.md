# ⚡ Stock Surge - Quick Start Guide

## ✅ All Fixed and Ready!

The application is now fully configured and ready to run. All dependencies are installed and Pydantic v2 warnings are resolved.

---

## 🚀 Start the Application (2 Simple Steps)

### Terminal 1 - Backend:
```bash
cd /Users/alexkamer/stock-surge
uv run python main.py
```

**Expected Output:**
```
⚠ Redis not available, using in-memory cache only  [This is OK!]
✓ Database initialized
Starting Stock Surge API...
Docs available at: http://localhost:8000/docs
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2 - Frontend:
```bash
cd /Users/alexkamer/stock-surge/frontend
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

---

## 🎉 Test It Out!

1. **Open your browser:** http://localhost:5173

2. **Sign up for an account:**
   - Click "Sign up"
   - Email: your@email.com
   - Password: password123 (or any 8+ chars)
   - Name: Your Name (optional)
   - Click "Sign up"

3. **You're in!** You should see the Dashboard with:
   - "Welcome, [your name]" message
   - Market Overview section
   - Watchlist sidebar (empty for now)
   - Success message confirming backend connection

4. **Test logout/login:**
   - Click "Logout" button
   - Try logging back in with your credentials

---

## 📖 Explore the API

Visit: **http://localhost:8000/docs**

Try these endpoints:
- `GET /stock/AAPL/price` - Get Apple's current price
- `GET /stock/TSLA/info` - Get Tesla company info
- `GET /stock/MSFT/history?period=1mo` - Get Microsoft price history
- `GET /auth/me` - Get your user info (requires login)

---

## 🎯 What's Working

### ✅ Backend
- JWT authentication with token refresh
- User registration and login
- Protected API endpoints
- Stock data (price, history, info, news, financials, etc.)
- Watchlist API (backend ready)
- User preferences API (backend ready)
- WebSocket support for real-time data
- SQLite database with automatic setup

### ✅ Frontend
- Beautiful Bloomberg-inspired dark theme
- User authentication (login/signup)
- Protected routes (dashboard requires auth)
- API client with automatic token refresh
- State management (Zustand + TanStack Query)
- Responsive design with Tailwind CSS

---

## 🛠️ Project Structure

```
stock-surge/
├── Backend (Python FastAPI)
│   ├── main.py              # Main API (✨ with auth endpoints)
│   ├── auth.py              # JWT utilities
│   ├── database.py          # Database setup
│   ├── models.py            # User, Watchlist, Preferences models
│   └── stock_surge.db       # SQLite database (auto-created)
│
└── Frontend (React TypeScript)
    ├── src/
    │   ├── api/             # API client & endpoints
    │   ├── features/auth/   # Auth context
    │   ├── pages/           # Login, Signup, Dashboard
    │   ├── store/           # State management
    │   ├── hooks/           # WebSocket, debounce hooks
    │   └── lib/             # Utils, formatters, constants
    └── .env.local           # API URLs (already configured)
```

---

## 📝 Next Steps (Phases 2-5)

The foundation is complete! Here's what's coming:

### Phase 2: Stock Interface
- [ ] Stock search with autocomplete
- [ ] Stock detail pages
- [ ] TradingView charts (candlestick/line)
- [ ] Metrics grid (P/E, market cap, volume, etc.)
- [ ] Real-time price updates via WebSocket

### Phase 3: Watchlist
- [ ] Watchlist sidebar UI
- [ ] Add/remove stocks
- [ ] Drag-and-drop reordering
- [ ] Sync with backend
- [ ] Live price updates in watchlist

### Phase 4: Advanced Features
- [ ] Financial statements tables
- [ ] Analyst ratings visualization
- [ ] News feed with infinite scroll
- [ ] Options chain viewer
- [ ] Compare multiple stocks
- [ ] User settings page

### Phase 5: Production Ready
- [ ] Loading skeletons
- [ ] Error boundaries
- [ ] Mobile responsive
- [ ] Performance optimization
- [ ] Unit tests
- [ ] Deployment guides

---

## 🐛 Troubleshooting

### Backend won't start
```bash
cd /Users/alexkamer/stock-surge
uv sync  # Reinstall dependencies
uv run python main.py
```

### Frontend won't start
```bash
cd /Users/alexkamer/stock-surge/frontend
npm install  # Reinstall dependencies
npm run dev
```

### Can't log in
1. Check browser console (F12 → Console)
2. Verify backend is running on port 8000
3. Clear browser storage and try again

### Port already in use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

---

## 💡 Pro Tips

- **Redis Warning is OK**: The app falls back to in-memory cache
- **Database Reset**: Delete `stock_surge.db` to reset all data
- **Hot Reload**: Both backend and frontend auto-reload on code changes
- **API Testing**: Use the interactive docs at http://localhost:8000/docs

---

## 📚 Documentation Files

- `README.md` - Full project documentation
- `SETUP_INSTRUCTIONS.md` - Detailed setup with all phases
- `RUN_INSTRUCTIONS.md` - Step-by-step run guide
- `API_DOCS.md` - API endpoint reference
- `QUICK_START.md` - This file!

---

## 🎓 What You've Built

You now have a **production-grade foundation** for a stock trading platform:

✅ Secure authentication system
✅ RESTful API with comprehensive stock data
✅ Modern React frontend with state management
✅ Real-time capabilities via WebSocket
✅ Database with user management
✅ Professional UI/UX design
✅ Type-safe TypeScript throughout

**Ready to add features?** Start with Phase 2 - stock search and charts!

---

## 🚀 Ready to Start?

Open two terminal windows and run:

**Terminal 1:**
```bash
cd /Users/alexkamer/stock-surge && uv run python main.py
```

**Terminal 2:**
```bash
cd /Users/alexkamer/stock-surge/frontend && npm run dev
```

Then visit: **http://localhost:5173**

---

**Happy Trading! 📈**
