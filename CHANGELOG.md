# Changelog

## [1.0.0] - 2026-02-04

### 🎉 Phase 1 Complete - MVP Release

#### Added - Backend
- **Authentication System**
  - JWT-based authentication with access and refresh tokens
  - User registration endpoint (`POST /auth/register`)
  - Login endpoint (`POST /auth/login`)
  - Token refresh endpoint (`POST /auth/refresh`)
  - Get current user endpoint (`GET /auth/me`)
  - Secure password hashing with bcrypt
  - Automatic token refresh on expiration

- **Database Models**
  - User model with email, password, and profile data
  - Watchlist model for user stock lists
  - UserPreferences model for settings
  - SQLAlchemy ORM with SQLite database
  - Automatic database initialization

- **User Endpoints**
  - Get user watchlist (`GET /user/watchlist`)
  - Add to watchlist (`POST /user/watchlist`)
  - Remove from watchlist (`DELETE /user/watchlist/{ticker}`)
  - Get user preferences (`GET /user/preferences`)
  - Update user preferences (`PUT /user/preferences`)

- **Stock Data Endpoints** (Existing)
  - Current price with fast_info
  - Company information
  - Historical OHLCV data
  - News articles
  - Financial statements (income, balance, cash flow)
  - Analyst recommendations and price targets
  - Earnings data and estimates
  - Institutional holders
  - Insider trading data
  - Options chains
  - WebSocket support for real-time updates

#### Added - Frontend
- **Core Setup**
  - Vite + React 18 + TypeScript
  - Tailwind CSS with Bloomberg-inspired dark theme
  - React Router v6 with route protection
  - TanStack Query for server state
  - Zustand for client state
  - Axios with authentication interceptors

- **Authentication**
  - Login page with form validation
  - Signup page with user registration
  - Authentication context with hooks
  - Protected route wrapper
  - Automatic token refresh
  - Logout functionality

- **Pages**
  - Login page with error handling
  - Signup page with validation
  - Dashboard page with welcome message
  - Protected routes (redirect to login if not authenticated)

- **State Management**
  - Watchlist store with localStorage persistence
  - UI store for sidebar and modal state
  - Auth context for user state

- **API Integration**
  - API client with base URL configuration
  - Auth endpoints (register, login, refresh, me)
  - Stock endpoints (price, info, history, news)
  - User endpoints (watchlist, preferences)
  - Automatic token injection in requests

- **Hooks**
  - useWebSocket for real-time data
  - useDebounce for search optimization
  - useAuth for authentication state

- **Utilities**
  - Currency, number, and date formatters
  - Color coding for gains/losses
  - Class name utilities (cn)
  - API constants and configuration

#### Fixed
- **Pydantic v2 Compatibility**
  - Updated all `Field(example=X)` to `Field(json_schema_extra={"example": X})`
  - Replaced `class Config` with `model_config = ConfigDict()`
  - Migrated from `@app.on_event()` to modern `lifespan` context manager
  - Added `email-validator` dependency for EmailStr validation

- **Security**
  - JWT token storage in memory (not localStorage)
  - Refresh token for long-lived sessions
  - Protected API endpoints with authentication
  - CORS configuration for frontend
  - Secure password hashing with bcrypt

#### Documentation
- `README.md` - Complete project documentation
- `SETUP_INSTRUCTIONS.md` - Detailed phase-by-phase setup guide
- `RUN_INSTRUCTIONS.md` - Quick start commands
- `QUICK_START.md` - Fast getting started guide
- `API_DOCS.md` - API endpoint reference
- `CHANGELOG.md` - This file

#### Scripts
- `start-backend.sh` - Quick backend startup script
- `frontend/start-frontend.sh` - Quick frontend startup script

---

## Roadmap

### Phase 2: Stock Interface (Next)
- [ ] Stock search component with autocomplete
- [ ] Stock detail page with tabs
- [ ] TradingView Lightweight Charts integration
- [ ] Metrics grid component
- [ ] Real-time price updates via WebSocket

### Phase 3: Watchlist Management
- [ ] Watchlist sidebar UI
- [ ] Add/remove stocks from UI
- [ ] Drag-and-drop reordering
- [ ] Live price updates in watchlist
- [ ] Watchlist sync with backend

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
- [ ] Mobile responsive design
- [ ] Performance optimization
- [ ] Unit tests
- [ ] E2E tests
- [ ] Deployment guides
- [ ] CI/CD pipeline

---

## Technical Stack

### Backend
- FastAPI 0.128.1
- Python 3.12+
- SQLAlchemy 2.0.46
- SQLite (swappable to PostgreSQL)
- python-jose 3.5.0 (JWT)
- passlib 1.7.4 (password hashing)
- yfinance 1.1.0 (stock data)
- Redis 7.1.0 (optional caching)

### Frontend
- React 18
- TypeScript 5
- Vite 5
- Tailwind CSS 3
- TanStack Query v5
- Zustand 4
- React Router v6
- Axios 1.6
- date-fns 3
- Lucide React (icons)

---

## Breaking Changes

None - this is the initial release.

---

## Known Issues

- Redis not available warning is expected (falls back to in-memory cache)
- WebSocket implementation uses polling instead of true streaming (will be fixed in Phase 2)
- Mobile responsive design not yet implemented (Phase 5)

---

## Contributors

- Built with Claude Code
- Based on Bloomberg Terminal design inspiration
- Stock data powered by yfinance

---

## License

MIT License
