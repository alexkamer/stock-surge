# Stock Surge 📈

A professional Bloomberg Terminal-inspired stock trading dashboard with real-time data, authentication, and comprehensive market analysis.

![Stack](https://img.shields.io/badge/Stack-FastAPI%20%2B%20React%20%2B%20TypeScript-blue)
![Python](https://img.shields.io/badge/Python-3.12%2B-green)
![React](https://img.shields.io/badge/React-18-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

### ✅ Phase 1 Complete (MVP)
- **Full Authentication System**
  - JWT-based auth with access and refresh tokens
  - User registration and login
  - Protected routes and API endpoints
  - Automatic token refresh on expiration

- **Professional UI**
  - Bloomberg-inspired dark theme
  - Responsive design with Tailwind CSS
  - Modern React 18 + TypeScript
  - TanStack Query for efficient data fetching

- **Comprehensive Stock Data API**
  - Real-time stock prices (via yfinance)
  - Historical OHLCV data with configurable periods
  - Company information and financials
  - News, analyst ratings, and recommendations
  - Options chains and insider trading data
  - WebSocket support for live updates

- **User Features**
  - Personal watchlists (backend ready)
  - User preferences (backend ready)
  - Persistent state management with Zustand

### 🚧 Coming Next (Phases 2-5)
- Interactive TradingView charts
- Stock search with autocomplete
- Watchlist management UI
- Financial statements viewer
- Real-time price updates via WebSocket
- News feed and analyst ratings
- Mobile responsive design

---

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- Redis (optional, for caching)

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd stock-surge
```

### 2. Start Backend (Terminal 1)

```bash
# Install Python dependencies
uv sync

# Start FastAPI server
uv run python main.py
```

Backend runs at: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Interactive API: http://localhost:8000/redoc

### 3. Start Frontend (Terminal 2)

```bash
cd frontend

# Install dependencies (if not done)
npm install

# Start dev server
npm run dev
```

Frontend runs at: http://localhost:5173

### 4. Create Your Account
1. Open http://localhost:5173
2. Click "Sign up"
3. Enter your email and password
4. Start exploring!

---

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - SQL toolkit and ORM
- **SQLite** - Database (easily swappable to PostgreSQL)
- **yfinance** - Real-time stock data from Yahoo Finance
- **python-jose** - JWT token handling
- **passlib** - Secure password hashing
- **Redis** - Optional caching layer
- **WebSockets** - Real-time price streaming

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **React Router** - Routing
- **Axios** - HTTP client with interceptors
- **Lightweight Charts** - TradingView charts (coming soon)
- **Recharts** - Dashboard charts (coming soon)

---

## Project Structure

```
stock-surge/
├── Backend (Python/FastAPI)
│   ├── main.py                 # Main FastAPI app with all endpoints
│   ├── auth.py                 # JWT authentication utilities
│   ├── database.py             # SQLAlchemy configuration
│   ├── models.py               # Database models (User, Watchlist, Preferences)
│   ├── pyproject.toml          # Python dependencies
│   └── stock_surge.db          # SQLite database (created on first run)
│
└── Frontend (React/TypeScript)
    ├── src/
    │   ├── api/                # API client and endpoint definitions
    │   │   ├── client.ts       # Axios instance with auth interceptors
    │   │   └── endpoints/      # Auth, stocks, user APIs
    │   ├── components/         # Reusable UI components
    │   │   ├── ui/             # Base components (buttons, cards, etc.)
    │   │   ├── charts/         # Chart components
    │   │   └── stock/          # Stock-specific components
    │   ├── features/           # Feature-based modules
    │   │   └── auth/           # Authentication feature
    │   ├── hooks/              # Custom React hooks
    │   │   ├── useWebSocket.ts # WebSocket management
    │   │   └── useDebounce.ts  # Debounce utility
    │   ├── layouts/            # Page layouts and route guards
    │   ├── pages/              # Route pages (Login, Dashboard, etc.)
    │   ├── store/              # Zustand stores
    │   │   ├── watchlistStore.ts
    │   │   └── uiStore.ts
    │   ├── lib/                # Utilities and constants
    │   ├── App.tsx             # Main app with providers
    │   ├── main.tsx            # Entry point
    │   └── router.tsx          # Route configuration
    ├── .env.local              # Environment variables
    ├── tailwind.config.js      # Tailwind configuration
    ├── package.json            # npm dependencies
    └── tsconfig.json           # TypeScript configuration
```

---

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user

### User Data
- `GET /user/watchlist` - Get user's watchlist
- `POST /user/watchlist` - Add ticker to watchlist
- `DELETE /user/watchlist/{ticker}` - Remove from watchlist
- `GET /user/preferences` - Get user preferences
- `PUT /user/preferences` - Update preferences

### Stock Data
- `GET /stock/{ticker}/price` - Current price (fast)
- `GET /stock/{ticker}/info` - Company information
- `GET /stock/{ticker}/history` - Historical OHLCV data
- `GET /stock/{ticker}/news` - Recent news articles
- `GET /stock/{ticker}/recommendations` - Analyst ratings
- `GET /stock/{ticker}/financials/*` - Financial statements
- `GET /stock/{ticker}/options` - Options chain
- `WS /ws/live/{tickers}` - Real-time price streaming

See full API docs at: http://localhost:8000/docs

---

## Configuration

### Backend Environment Variables
Create a `.env` file in the root directory:

```env
SECRET_KEY=your-secret-key-change-in-production
DATABASE_URL=sqlite:///./stock_surge.db
# For PostgreSQL: DATABASE_URL=postgresql://user:password@localhost/dbname
```

### Frontend Environment Variables
Already created at `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_ENV=development
```

---

## Development

### Backend Development
```bash
# Install dependencies
uv sync

# Add new dependency
uv add package-name

# Run with auto-reload (default)
uv run python main.py

# Format code
uv run black .

# Type checking
uv run mypy .
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Start dev server (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check
```

---

## Database Management

The app uses SQLite by default. The database file (`stock_surge.db`) is created automatically on first run.

### Tables
- `users` - User accounts with email/password
- `watchlists` - User watchlists with ticker symbols
- `user_preferences` - User settings (theme, chart type, etc.)

### Reset Database
```bash
rm stock_surge.db
# Restart backend to recreate
```

### Switch to PostgreSQL
1. Install PostgreSQL dependencies:
   ```bash
   uv add psycopg2-binary
   ```

2. Update `database.py`:
   ```python
   SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/stock_surge"
   ```

3. Restart the backend

---

## Testing

### Manual API Testing
```bash
# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123"

# Get stock price
curl http://localhost:8000/stock/AAPL/price

# Get user info (replace TOKEN)
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer TOKEN"
```

### Frontend Testing
1. Open http://localhost:5173
2. Test user registration and login
3. Verify dashboard loads after authentication
4. Test logout functionality
5. Verify protected route redirects to login

---

## Deployment

### Backend Deployment (Railway, Render, Fly.io)
1. Set environment variables (SECRET_KEY, DATABASE_URL)
2. Use PostgreSQL instead of SQLite
3. Update CORS origins in `main.py`
4. Deploy with: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend Deployment (Vercel, Netlify)
1. Update `.env.production` with production API URL
2. Build: `npm run build`
3. Deploy `dist/` folder
4. Configure environment variables in hosting platform

---

## Contributing

Contributions are welcome! This project is in active development.

### Roadmap
- [ ] Phase 2: Stock search and detail pages
- [ ] Phase 3: Interactive charts with TradingView
- [ ] Phase 4: Real-time WebSocket integration
- [ ] Phase 5: Advanced features (options, compare, etc.)
- [ ] Phase 6: Mobile optimization
- [ ] Phase 7: Testing and production deployment

---

## Troubleshooting

### Backend Issues
- **Port 8000 in use**: Kill the process or change port in `main.py`
- **Database errors**: Delete `stock_surge.db` and restart
- **Import errors**: Run `uv sync` to install dependencies

### Frontend Issues
- **Module not found**: Run `npm install`
- **CORS errors**: Ensure backend is running and API URL is correct
- **Auth not working**: Clear browser storage and try again

### Common Issues
- **Redis not available**: App falls back to in-memory cache automatically
- **yfinance rate limits**: Wait a minute before retrying
- **WebSocket disconnects**: Auto-reconnects after 5 seconds

---

## License

MIT License - feel free to use this project for learning or commercial purposes.

---

## Acknowledgments

- [yfinance](https://github.com/ranaroussi/yfinance) - Stock data provider
- [FastAPI](https://fastapi.tiangolo.com/) - Backend framework
- [React](https://react.dev/) - UI library
- [TradingView](https://www.tradingview.com/) - Chart inspiration
- [Bloomberg Terminal](https://www.bloomberg.com/professional/solution/bloomberg-terminal/) - Design inspiration

---

## Support

For detailed setup instructions, see [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)

Found a bug? Open an issue on GitHub!

---

**Built with ❤️ for traders and developers**
