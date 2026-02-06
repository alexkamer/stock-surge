# Stock Surge - Setup Instructions

## Phase 1: Backend + Frontend MVP (COMPLETED)

### What's Been Built

**Backend (FastAPI):**
- ✅ Complete authentication system (JWT tokens, register, login, refresh)
- ✅ User database models (Users, Watchlists, Preferences)
- ✅ Protected user endpoints (watchlist CRUD, preferences)
- ✅ All existing stock data endpoints (prices, history, info, news, etc.)
- ✅ WebSocket support for real-time price updates
- ✅ SQLite database with SQLAlchemy ORM

**Frontend (React + TypeScript):**
- ✅ Vite + React 18 + TypeScript setup
- ✅ Tailwind CSS with Bloomberg-inspired dark theme
- ✅ Authentication context and protected routes
- ✅ API client with axios and automatic token refresh
- ✅ Zustand stores for watchlist and UI state
- ✅ TanStack Query for server state management
- ✅ Login and Signup pages
- ✅ Basic Dashboard page
- ✅ WebSocket hook for real-time data

---

## How to Run

### Terminal 1: Start Backend

```bash
cd /Users/alexkamer/stock-surge

# Make sure dependencies are installed
uv sync

# Start the FastAPI server
uv run python main.py
```

The backend will start on: **http://localhost:8000**
- API Docs: http://localhost:8000/docs
- Database file will be created: `stock_surge.db`

### Terminal 2: Start Frontend

```bash
cd /Users/alexkamer/stock-surge/frontend

# Make sure dependencies are installed (already done)
# npm install

# Start the development server
npm run dev
```

The frontend will start on: **http://localhost:5173**

---

## Testing the Application

### 1. Create an Account
1. Open http://localhost:5173 in your browser
2. Click "Sign up"
3. Enter email, password (min 8 chars), and optional name
4. Submit to create account (auto-logs you in)

### 2. Test Authentication
- You should be redirected to the Dashboard after signup/login
- Try logging out and logging back in
- Try accessing /dashboard without logging in (should redirect to login)

### 3. Backend API Testing
Test auth endpoints with curl:

```bash
# Register a user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123"

# Get current user (replace TOKEN with access_token from login)
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer TOKEN"

# Get stock price (no auth required)
curl http://localhost:8000/stock/AAPL/price
```

---

## Next Steps (Phase 2-5)

### Phase 2: Stock Search & Display
- [ ] Stock search component with autocomplete
- [ ] Stock detail page with tabs
- [ ] Price chart component (TradingView Lightweight Charts)
- [ ] Metrics grid component
- [ ] Real-time price updates via WebSocket

### Phase 3: Watchlist Management
- [ ] Watchlist sidebar component
- [ ] Add/remove stocks from watchlist
- [ ] Sync watchlist with backend
- [ ] Drag-and-drop reordering

### Phase 4: Advanced Features
- [ ] Financial statements viewer
- [ ] Analyst ratings visualization
- [ ] News feed with infinite scroll
- [ ] Options chain viewer
- [ ] Compare stocks feature
- [ ] Settings page

### Phase 5: Polish
- [ ] Loading skeletons
- [ ] Error boundaries
- [ ] Responsive mobile design
- [ ] Performance optimization
- [ ] Unit tests

---

## Project Structure

```
stock-surge/
├── backend files (root directory)
│   ├── main.py                 # FastAPI app with all endpoints
│   ├── auth.py                 # JWT auth utilities
│   ├── database.py             # SQLAlchemy setup
│   ├── models.py               # Database models
│   ├── stock_surge.db          # SQLite database (created on first run)
│   └── pyproject.toml          # Python dependencies
│
└── frontend/
    ├── src/
    │   ├── api/                # API client and endpoints
    │   ├── components/         # Reusable components
    │   ├── features/           # Feature modules (auth, etc.)
    │   ├── hooks/              # Custom React hooks
    │   ├── layouts/            # Page layouts
    │   ├── pages/              # Route pages
    │   ├── store/              # Zustand stores
    │   ├── lib/                # Utilities
    │   ├── App.tsx             # Main app component
    │   ├── main.tsx            # Entry point
    │   └── router.tsx          # Route configuration
    ├── .env.local              # Environment variables
    ├── tailwind.config.js      # Tailwind configuration
    └── package.json            # npm dependencies
```

---

## Technology Stack

**Backend:**
- FastAPI (Python web framework)
- SQLAlchemy (ORM)
- SQLite (database)
- yfinance (stock data)
- python-jose (JWT tokens)
- passlib (password hashing)

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- TanStack Query (server state)
- Zustand (client state)
- React Router (routing)
- Axios (HTTP client)

---

## Environment Variables

**Frontend (.env.local):**
```
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_ENV=development
```

**Backend (optional):**
Create a `.env` file in the root:
```
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///./stock_surge.db
```

---

## Troubleshooting

### Backend won't start
- Make sure you're in the correct directory
- Check that all dependencies are installed: `uv sync`
- Check if port 8000 is already in use

### Frontend won't start
- Make sure you're in the `frontend/` directory
- Check that node_modules exists: `npm install`
- Check if port 5173 is already in use

### CORS errors
- Make sure backend is running on port 8000
- Check that frontend .env.local has correct API URL

### Authentication not working
- Check browser console for errors
- Verify tokens are being stored (check Network tab)
- Try clearing browser storage and logging in again

---

## Database

The SQLite database (`stock_surge.db`) is created automatically on first run.

Tables:
- `users` - User accounts
- `watchlists` - User watchlists
- `user_preferences` - User settings

To reset the database:
```bash
rm stock_surge.db
# Restart the backend to recreate
```

---

## What Works Right Now

✅ User registration and login
✅ JWT authentication with automatic token refresh
✅ Protected routes (dashboard requires login)
✅ Logout functionality
✅ Beautiful Bloomberg-inspired dark theme
✅ All backend stock data endpoints (price, history, news, etc.)
✅ Watchlist backend API (not yet connected to UI)
✅ User preferences backend API (not yet connected to UI)

## What's Next

The foundation is complete! Next up is building the actual trading interface:
- Stock search and detail pages
- Interactive charts
- Real-time price updates
- Full watchlist functionality

---

Ready to continue building? Let me know which feature you'd like to implement next!
