# Vercel Serverless Proxy Setup Guide

## Overview

This implementation uses a **Vercel serverless function** as an HTTPS proxy to securely connect your HTTPS frontend (Vercel) to your HTTP backend (Azure VM). This eliminates mixed content errors without requiring any changes to your backend.

## Architecture

```
Frontend (HTTPS) 
  → /api/backend/room (HTTPS, same origin)
    → Vercel Serverless Function (Node.js)
      → http://51.124.124.18/room (HTTP, server-to-server)
        → Backend Response
          → Vercel Serverless Function
            → Frontend (HTTPS)
```

## What Was Implemented

### 1. Serverless Function Proxy
**File:** `api/backend/[...path].js`

- **Route Pattern:** `/api/backend/*` (catch-all)
- **Functionality:**
  - Receives HTTPS requests from frontend
  - Forwards them to HTTP backend (Azure VM)
  - Returns backend responses transparently
  - Handles all HTTP methods (GET, POST, PUT, DELETE, OPTIONS)
  - Preserves query parameters and request bodies
  - Sets proper CORS headers

### 2. Frontend Configuration
**File:** `src/utils/apiConfig.js`

- Updated to use `/api/backend` as the base URL on Vercel
- Automatically detects Vercel by hostname
- Falls back to `VITE_BACKEND_URL` or `localhost:8000` in development

### 3. Vercel Configuration
**File:** `vercel.json`

- Removed old rewrites (serverless functions take precedence)
- Kept SPA rewrite for React Router

## Environment Variables Required

### In Vercel Dashboard:

1. **Go to:** https://vercel.com/dashboard
2. **Select your project:** `Raghav-s-Hear-me-project`
3. **Go to:** Settings → Environment Variables
4. **Add/Update:**

| Variable Name | Value | Environment | Required |
|--------------|-------|-------------|----------|
| `BACKEND_URL` | `http://51.124.124.18` | Production, Preview, Development | ✅ Yes |
| `VITE_BACKEND_URL` | (Remove or leave empty) | All | ❌ No (optional) |

### Why `BACKEND_URL`?

- The serverless function uses `BACKEND_URL` to know where to proxy requests
- Defaults to `http://51.124.124.18` if not set, but it's better to set it explicitly
- This is a **server-side** environment variable (not exposed to frontend)

### Why Remove `VITE_BACKEND_URL`?

- The frontend now uses `/api/backend` automatically on Vercel
- If `VITE_BACKEND_URL` is set to an HTTP URL, it could cause issues
- Safe to remove or leave empty

## API Base URL Configuration

### On Vercel (Production):
- **Base URL:** `/api/backend`
- **Example:** `/api/backend/room` → Proxies to → `http://51.124.124.18/room`
- **Automatic:** No configuration needed, detected by hostname

### In Development (Localhost):
- **Base URL:** `http://localhost:8000` (or `VITE_BACKEND_URL` if set)
- **Direct connection:** No proxy needed

## How It Works

### Request Flow Example:

1. **Frontend makes request:**
   ```javascript
   fetch('/api/backend/room', {
     method: 'POST',
     body: JSON.stringify({ roomId: 'ABC123' })
   })
   ```

2. **Vercel routes to serverless function:**
   - URL: `https://your-app.vercel.app/api/backend/room`
   - Matches: `/api/backend/[...path]`
   - Extracts path: `room`

3. **Serverless function proxies:**
   - Constructs: `http://51.124.124.18/room`
   - Forwards: Method, headers, body
   - Waits for response

4. **Backend responds:**
   - Returns JSON: `{ "roomId": "ABC123", ... }`

5. **Serverless function returns:**
   - Forwards response to frontend
   - Sets CORS headers
   - Returns same status code and body

## Testing

### After Deployment:

1. **Wait for Vercel to redeploy** (1-2 minutes after push)

2. **Test in browser console:**
   ```javascript
   // Test health check
   fetch('/api/backend/')
     .then(r => r.json())
     .then(data => console.log('✅ Backend accessible:', data))
     .catch(err => console.error('❌ Error:', err));
   
   // Test room creation
   fetch('/api/backend/room', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ roomId: 'TEST123' })
   })
     .then(r => r.json())
     .then(data => console.log('✅ Room created:', data))
     .catch(err => console.error('❌ Error:', err));
   ```

3. **Check browser console:**
   - Should see: `🔒 Vercel/HTTPS detected, using /api/backend serverless proxy`
   - No mixed content errors
   - Successful API responses

### Expected Console Output:

```
🔒 Vercel/HTTPS detected, using /api/backend serverless proxy
[Proxy] POST /api/backend/room -> http://51.124.124.18/room
✅ Room created: { roomId: "TEST123", ... }
```

## Supported Endpoints

All your existing endpoints work through the proxy:

| Frontend Call | Proxies To | Backend Endpoint |
|--------------|------------|------------------|
| `/api/backend/` | `http://51.124.124.18/` | Health check |
| `/api/backend/token` | `http://51.124.124.18/token` | Get Azure token |
| `/api/backend/room` | `http://51.124.124.18/room` | Create room |
| `/api/backend/room/ABC123` | `http://51.124.124.18/room/ABC123` | Get room |
| `/api/backend/predict` | `http://51.124.124.18/predict` | ASL prediction |
| `/api/backend/transcription/ABC123` | `http://51.124.124.18/transcription/ABC123` | Transcription relay |
| `/api/backend/gesture/ABC123` | `http://51.124.124.18/gesture/ABC123` | Gesture relay |

## Limitations & Considerations

### 1. **Serverless Function Cold Starts**
- First request after inactivity may be slower (~1-2 seconds)
- Subsequent requests are fast (~100-200ms)
- **Mitigation:** Keep functions warm with periodic health checks

### 2. **Request Timeout**
- Vercel serverless functions have a 10-second timeout (Hobby plan)
- 60 seconds on Pro plan
- **Impact:** Long-running backend operations may timeout
- **Your endpoints:** Should be fine (room creation, predictions are fast)

### 3. **Request Size Limits**
- Vercel has a 4.5MB request body limit
- **Your use case:** Should be fine (JSON payloads are small)

### 4. **Backend Must Be Accessible**
- Azure VM must be accessible from Vercel's servers
- Ensure firewall allows inbound connections
- **Check:** Test with `curl http://51.124.124.18/` from external network

### 5. **No WebSocket Support**
- Serverless functions are HTTP-only
- **Impact:** If you need WebSockets, you'd need a different solution
- **Your use case:** HTTP polling works fine for transcription/gesture relay

### 6. **Cost Considerations**
- Vercel Hobby plan: 100GB-hours/month (usually enough)
- Each API call uses serverless function execution time
- **Your use case:** Should be well within free tier limits

## Troubleshooting

### Issue: "502 Bad Gateway"
**Cause:** Backend not accessible from Vercel servers
**Fix:**
1. Check if backend is running: `curl http://51.124.124.18/`
2. Check Azure VM firewall rules
3. Verify `BACKEND_URL` environment variable is set correctly

### Issue: "Function not found"
**Cause:** Serverless function not deployed
**Fix:**
1. Ensure `api/backend/[...path].js` exists in repository
2. Check Vercel deployment logs
3. Redeploy if needed

### Issue: "CORS errors"
**Cause:** CORS headers not set correctly
**Fix:**
- The serverless function sets CORS headers automatically
- Check browser console for specific error
- Verify backend CORS settings (though proxy should handle this)

### Issue: "Request timeout"
**Cause:** Backend taking too long to respond
**Fix:**
1. Check backend logs for slow operations
2. Optimize backend response times
3. Consider upgrading Vercel plan for longer timeouts

## Migration Notes

### What Changed:
- ✅ Frontend now uses `/api/backend/*` instead of `/api/*`
- ✅ Serverless function handles all proxying
- ✅ No direct HTTP calls from frontend
- ✅ Backend remains completely unchanged

### What Stayed the Same:
- ✅ All API endpoints work the same way
- ✅ Request/response formats unchanged
- ✅ Backend code untouched
- ✅ Application flow identical

## Next Steps

1. ✅ **Set `BACKEND_URL` in Vercel** (if not already set)
2. ✅ **Remove `VITE_BACKEND_URL`** (optional, but recommended)
3. ✅ **Wait for Vercel redeploy** (automatic after git push)
4. ✅ **Test the proxy** using browser console commands above
5. ✅ **Verify no mixed content errors** in browser console

## Summary

This solution provides a **production-safe, temporary workaround** for the mixed content issue. It:
- ✅ Eliminates mixed content errors
- ✅ Requires no backend changes
- ✅ Works with all existing endpoints
- ✅ Is transparent to the frontend code
- ✅ Can be easily replaced with HTTPS backend later

The serverless function acts as a secure bridge between your HTTPS frontend and HTTP backend, ensuring all browser communication is over HTTPS while allowing server-to-server HTTP communication.

