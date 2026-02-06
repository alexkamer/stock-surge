# Troubleshooting Guide

## Issues Fixed So Far

### ✅ Backend Issues (All Fixed)

1. **Missing email-validator**
   - **Error**: `ModuleNotFoundError: No module named 'email_validator'`
   - **Fix**: Added `email-validator` dependency with `uv add email-validator`

2. **Pydantic v2 Deprecation Warnings**
   - **Error**: `PydanticDeprecatedSince20: Using extra keyword arguments on Field is deprecated`
   - **Fix**: Updated all `Field(example=X)` to `Field(json_schema_extra={"example": X})`

3. **Pydantic Config Deprecation**
   - **Error**: `Support for class-based config is deprecated`
   - **Fix**: Changed `class Config:` to `model_config = ConfigDict()`

4. **FastAPI on_event Deprecation**
   - **Error**: `on_event is deprecated, use lifespan event handlers instead`
   - **Fix**: Migrated to modern `lifespan` context manager

### ✅ Frontend Issues (All Fixed)

1. **Tailwind CSS v4 PostCSS Error**
   - **Error**: `It looks like you're trying to use tailwindcss directly as a PostCSS plugin`
   - **Fix**:
     - Installed `@tailwindcss/postcss`
     - Updated `postcss.config.js` to use new plugin
     - Migrated CSS to Tailwind v4 syntax with `@theme`

2. **Axios Import Error**
   - **Error**: `does not provide an export named 'InternalAxiosRequestConfig'`
   - **Fix**: Changed to use `AxiosRequestConfig` instead

---

## Current Status

### Backend ✅ WORKING
- No warnings or errors
- Database initialized
- All endpoints functional
- JWT authentication working

### Frontend ✅ WORKING
- Vite dev server running
- Tailwind CSS v4 configured
- Axios client fixed
- React Router configured

---

## Common Issues & Solutions

### Backend Won't Start

**Issue**: Port 8000 already in use
```bash
# Kill the process
lsof -ti:8000 | xargs kill -9
# Or use a different port in main.py
```

**Issue**: Database errors
```bash
# Reset database
rm stock_surge.db
# Restart backend
uv run python main.py
```

**Issue**: Module import errors
```bash
# Reinstall dependencies
uv sync
```

---

### Frontend Won't Start

**Issue**: Port 5173 already in use
```bash
# Kill the process
lsof -ti:5173 | xargs kill -9
```

**Issue**: Module errors after updates
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Issue**: Vite cache issues
```bash
cd frontend
rm -rf node_modules/.vite
npm run dev
```

---

### CORS Errors

**Symptom**: Browser console shows CORS errors

**Solution**:
1. Make sure backend is running on port 8000
2. Make sure frontend is running on port 5173
3. Check `.env.local` has correct URLs:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

---

### Authentication Issues

**Issue**: Can't log in / tokens not working

**Solutions**:
1. Clear browser storage (Application → Storage → Clear site data)
2. Check backend logs for errors
3. Verify user exists in database
4. Try creating a new account

**Issue**: Automatic logout

**Cause**: Token expired and refresh failed

**Solution**:
- Log in again
- Check backend is running
- Check network tab for 401 errors

---

### TypeScript Errors

**Issue**: Type errors in IDE

**Solution**:
```bash
cd frontend
npm run type-check
# Or restart TypeScript server in your IDE
```

---

### Build Errors

**Issue**: Production build fails

**Solution**:
```bash
cd frontend
npm run build
# Check for type errors or missing dependencies
```

---

## Verification Checklist

Use this to verify everything is working:

### Backend Verification
- [ ] Backend starts without errors
- [ ] Can access http://localhost:8000/docs
- [ ] Can see "✓ Database initialized" message
- [ ] No deprecation warnings in terminal
- [ ] `stock_surge.db` file created

### Frontend Verification
- [ ] Frontend starts without errors
- [ ] Can access http://localhost:5173
- [ ] See Vite ready message
- [ ] No console errors in browser
- [ ] Can see login page

### Authentication Verification
- [ ] Can create a new account
- [ ] Can log in with credentials
- [ ] Redirected to dashboard after login
- [ ] Can log out
- [ ] Redirected to login when accessing /dashboard while logged out

### API Verification
```bash
# Test stock endpoint
curl http://localhost:8000/stock/AAPL/price

# Should return Apple stock data
```

---

## Clean Restart Procedure

If all else fails, start fresh:

### 1. Stop Everything
```bash
# Kill all processes
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### 2. Clean Backend
```bash
cd /Users/alexkamer/stock-surge
rm stock_surge.db
uv sync
```

### 3. Clean Frontend
```bash
cd /Users/alexkamer/stock-surge/frontend
rm -rf node_modules package-lock.json .vite
npm install
```

### 4. Start Fresh
```bash
# Terminal 1
cd /Users/alexkamer/stock-surge
uv run python main.py

# Terminal 2
cd /Users/alexkamer/stock-surge/frontend
npm run dev
```

---

## Getting Help

If you're still stuck:

1. **Check the logs**:
   - Backend: Terminal running `uv run python main.py`
   - Frontend: Terminal running `npm run dev`
   - Browser: F12 → Console tab

2. **Check the docs**:
   - `README.md` - Full documentation
   - `QUICK_START.md` - Quick start guide
   - `SETUP_INSTRUCTIONS.md` - Detailed setup

3. **API Documentation**:
   - http://localhost:8000/docs (when backend is running)

---

## Debug Mode

### Enable Verbose Logging

**Backend**:
```python
# Add to main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

**Frontend**:
```typescript
// Add to client.ts
apiClient.interceptors.request.use(config => {
  console.log('Request:', config);
  return config;
});
```

---

**Remember**: Most issues can be solved by restarting the servers or clearing cache! 🔄
