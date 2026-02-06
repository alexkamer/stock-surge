# 🚀 Quick Run Instructions

## Step 1: Start the Backend

Open Terminal 1:
```bash
cd /Users/alexkamer/stock-surge
uv run python main.py

# Or use the start script:
# ./start-backend.sh
```

✅ Backend will start at: **http://localhost:8000**

You should see:
```
✓ Database initialized
✓ Redis cache enabled (or warning if not available - that's OK!)
Starting Stock Surge API...
Docs available at: http://localhost:8000/docs
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

## Step 2: Start the Frontend

Open Terminal 2:
```bash
cd /Users/alexkamer/stock-surge/frontend
npm run dev

# Or use the start script:
# ./start-frontend.sh
```

✅ Frontend will start at: **http://localhost:5173**

You should see:
```
VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

---

## Step 3: Test the Application

### Open Your Browser
Navigate to: **http://localhost:5173**

### Create an Account
1. Click **"Sign up"**
2. Enter:
   - Email: your@email.com
   - Password: password123 (min 8 characters)
   - Name: Your Name (optional)
3. Click **"Sign up"**
4. You'll be automatically logged in and redirected to the Dashboard

### Test Authentication
- ✅ You should see: "Welcome, [your name/email]"
- ✅ Try clicking **Logout** and logging back in
- ✅ Try accessing /dashboard when logged out (should redirect to login)

### Test Stock Data (Backend)
Open http://localhost:8000/docs and try:
- `GET /stock/AAPL/price` - Get Apple's current price
- `GET /stock/MSFT/info` - Get Microsoft company info
- `GET /stock/TSLA/history` - Get Tesla's price history

---

## Troubleshooting

### Backend won't start
```bash
# Make sure you're in the right directory
cd /Users/alexkamer/stock-surge

# Check dependencies
uv sync

# Try again
uv run python main.py
```

### Frontend won't start
```bash
# Make sure you're in the frontend directory
cd /Users/alexkamer/stock-surge/frontend

# Install dependencies if needed
npm install

# Try again
npm run dev
```

### Can't log in
- Check browser console for errors (F12 → Console tab)
- Make sure both backend and frontend are running
- Try creating a new account instead

### CORS errors
- Ensure backend is running on port 8000
- Ensure frontend is running on port 5173
- Check that `.env.local` exists in frontend directory

---

## Quick Commands Reference

### Backend
```bash
cd /Users/alexkamer/stock-surge
uv run python main.py          # Start server
uv sync                         # Install dependencies
```

### Frontend
```bash
cd /Users/alexkamer/stock-surge/frontend
npm run dev                     # Start dev server
npm install                     # Install dependencies
npm run build                   # Build for production
```

---

## What's Working Right Now

✅ **Authentication**
- User registration
- Login/logout
- JWT tokens with auto-refresh
- Protected routes

✅ **Backend API**
- All stock data endpoints
- User watchlist endpoints (ready for UI)
- User preferences endpoints (ready for UI)
- WebSocket support

✅ **Frontend**
- Beautiful Bloomberg-inspired UI
- Login and Signup pages
- Basic Dashboard
- Route protection
- API client with auth interceptors

---

## Next Steps

The MVP is complete! Now you can:

1. **Test the current features** - Make sure auth works perfectly
2. **Explore the API** - Visit http://localhost:8000/docs
3. **Build Phase 2** - Add stock search, charts, and real-time data
4. **Customize** - Modify colors, add features, make it your own!

---

## Need Help?

- 📖 Read: [README.md](README.md) - Full project documentation
- 📝 Read: [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) - Detailed setup guide
- 🔗 Visit: http://localhost:8000/docs - Interactive API documentation
- 🐛 Check: Browser console and terminal output for errors

---

**Happy Trading! 📈**
