# 🚀 Deployment Help & Debugging Guide

**Last Updated**: March 13, 2026  
**Status**: Most issues resolved, cold start problems remain

---

## 🎯 Current Status

The Forge app edge function **is deployed** but experiences **cold start 404 errors**.

**What this means:**
- Backend works correctly after warmup
- First requests after inactivity fail with 404
- All features work once function is warm
- Warmup typically takes 1-2 requests

---

## ✅ What's Working

### Backend Deployed:
- ✅ All endpoints exist and function correctly (after warmup)
- ✅ Authentication (email/password, Google OAuth)
- ✅ User profiles and profile picture uploads
- ✅ Post creation, likes, reposts, comments
- ✅ Follow/unfollow users
- ✅ Block/mute/report users
- ✅ Communities (Groups) system
- ✅ Real-time Bluesky integration
- ✅ IGDB game artwork

### Frontend Deployed:
- ✅ All UI components working
- ✅ Routing with React Router v7
- ✅ Dark/light mode toggle
- ✅ Toast notifications
- ✅ Error boundaries
- ✅ Responsive design

### Data:
- ✅ Mock data removed
- ✅ Real user accounts only
- ✅ Topic accounts with Bluesky posts
- ✅ Database seeding automated

---

## 🚨 Known Issue: Cold Start 404s

### Problem:
After period of inactivity (~5-10 minutes), the edge function "goes cold" and returns 404 errors on first request.

### Symptoms:
```
❌ 404: /users/topic-accounts
❌ 404: /auth/me
❌ 404: /users/me/following-ids
```

### Workaround:
Run this in browser console (F12) before using the app:
```javascript
deploymentCheck()
```

Wait for response (5-10 seconds), then try your action again.

---

## 🧪 Testing Deployment

### Test 1: Health Check
Open this URL in browser:
```
https://xmxeafjpscgqprrreulh.supabase.co/functions/v1/make-server-17285bd7/health
```

**Expected Response:**
- `{"status": "ok"}` - Function is warm ✅
- `404 Not Found` - Function is cold, try again ⚠️

### Test 2: Console Commands
Open browser console (F12) and run:
```javascript
// Check deployment status
deploymentCheck()

// Expected output:
// ✅ Health check passed
// ✅ Topic accounts loaded
// ... etc
```

### Test 3: Feature Testing
Try these actions in order:
1. Sign in with existing account
2. Create a post
3. Like a post
4. Follow a user
5. Edit your profile

If any fail with 404, run `deploymentCheck()` and try again.

---

## 💡 Quick Fixes

### Clear Cache
If you see old data (like @gamebeez or @rpgmaster):
```javascript
// Open console (F12) and run:
localStorage.clear()
location.reload()
```

### Reset Session
If authentication fails:
1. Open DevTools (F12)
2. Go to Application → Storage → Local Storage
3. Delete all `forge-*` keys
4. Refresh page and sign in again

### Warm Up Function
Before using the app after inactivity:
```javascript
deploymentCheck()
```
Wait for completion, then proceed.

---

## 🔍 Debugging Steps

### Check Browser Console
1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Look for error messages
4. Check network requests in **Network** tab

### Common Error Messages:

**"404 Not Found"**  
→ Edge function is cold, run `deploymentCheck()` to warm it up

**"401 Unauthorized"**  
→ Session expired, sign in again

**"Failed to fetch"**  
→ Network error or CORS issue, check internet connection

**"TypeError: Cannot read property"**  
→ Data structure mismatch, try clearing cache

### Check Network Tab:
1. Open DevTools → Network
2. Look for failed requests (red)
3. Click on failed request
4. Check response for detailed error
5. Look at request headers (Authorization header present?)

---

## 🎯 What Should Work (After Warmup)

### User Features:
- ✅ Sign up with email/password
- ✅ Sign in with Google OAuth (if configured)
- ✅ Complete onboarding
- ✅ Edit profile
- ✅ Upload profile picture
- ✅ Build game library

### Social Features:
- ✅ Create posts (text, images, links)
- ✅ Like/unlike posts
- ✅ Repost/unrepost posts
- ✅ Comment on posts
- ✅ Share posts
- ✅ @mention users with autocomplete
- ✅ Follow/unfollow users

### Discovery:
- ✅ Explore page (Posts, Users, Groups tabs)
- ✅ Search users
- ✅ Real Bluesky posts from gaming media
- ✅ Follow suggestions

### Safety:
- ✅ Block users
- ✅ Mute users
- ✅ Mute posts
- ✅ Report users

### Admin:
- ✅ Admin panel at `/admin`
- ✅ User management
- ✅ Database seeding
- ✅ Indie game reviews

---

## 📋 Environment Check

### Required Secrets (All Configured):
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `SUPABASE_DB_URL`
- ✅ `IGDB_CLIENT_ID`
- ✅ `IGDB_CLIENT_SECRET`

### Optional Configuration:
- ⚠️ Google OAuth (requires Supabase dashboard setup)
  - See: [GOOGLE_OAUTH_TROUBLESHOOTING.md](GOOGLE_OAUTH_TROUBLESHOOTING.md)

---

## 🎓 Understanding the Architecture

```
┌─────────────────┐
│     Browser     │ ← Frontend (React)
│  (Forge App)    │
└────────┬────────┘
         │
         │ HTTPS Requests
         ↓
┌─────────────────────────────────┐
│  Supabase Edge Function         │ ← Backend (Hono server)
│  make-server-17285bd7           │   (Cold start issue here)
└────────┬────────────────────────┘
         │
         │ Database Queries
         ↓
┌─────────────────────────────────┐
│  Supabase PostgreSQL            │ ← Database (Always running)
│  KV Store + Auth                │
└─────────────────────────────────┘
         │
         │ External APIs
         ↓
┌─────────────────────────────────┐
│  Bluesky API + IGDB API         │ ← External services
└─────────────────────────────────┘
```

**The Issue:** Edge function "sleeps" after inactivity and takes ~1-2 requests to wake up.

---

## ✨ Expected User Experience

### First-Time User:
1. Visit app
2. Click "Sign up"
3. Enter email/password
4. Complete onboarding:
   - View splash screen
   - Select gaming interests
   - Follow suggested users
   - Create unique @handle
5. Arrive at feed with gaming news
6. Create first post
7. Follow topic accounts
8. Join communities

### Returning User:
1. Visit app
2. Sign in (if needed, or session continues)
3. See feed with posts from followed users and topic accounts
4. Interact with posts (like, repost, comment)
5. Check notifications
6. Send messages
7. Explore new users and communities

---

## 🆘 If Issues Persist

### Try These Steps:

1. **Hard Refresh**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. **Clear Cache**: Run `localStorage.clear()` in console
3. **Warm Function**: Run `deploymentCheck()` in console
4. **Different Browser**: Test in Chrome, Firefox, or Safari
5. **Incognito Mode**: Rules out browser extension conflicts

### Check These:

- [ ] Internet connection is stable
- [ ] Browser cookies are enabled
- [ ] Not using VPN (can cause connection issues)
- [ ] Supabase status: https://status.supabase.com
- [ ] Browser console shows no critical errors

### Report These:

If problems continue, gather this information:
1. Browser and version (Chrome 120, Firefox 121, etc.)
2. Error messages from console (exact text)
3. Network tab screenshot showing failed request
4. Steps to reproduce the issue
5. Does `deploymentCheck()` work?

---

## 📞 Additional Resources

- **Project Spec**: [PROJECT_SPEC.md](PROJECT_SPEC.md)
- **Setup Guide**: [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)
- **Deployment Status**: [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md)
- **Google OAuth Help**: [GOOGLE_OAUTH_TROUBLESHOOTING.md](GOOGLE_OAUTH_TROUBLESHOOTING.md)

---

## 🎉 What's Been Completed

All requested features and fixes are complete:
- ✅ All 17 fixes from original list
- ✅ @mentions with autocomplete
- ✅ Mute posts functionality
- ✅ Admin panel with database seeding
- ✅ Navigation restructure (Messages in bottom nav)
- ✅ Toast notification settings
- ✅ Real Bluesky integration
- ✅ IGDB game artwork
- ✅ Profile picture uploads
- ✅ Error handling and boundaries
- ✅ Responsive design
- ✅ Accessibility features

**Only remaining issue: Edge function cold starts**

---

**Need immediate help?** Run `deploymentCheck()` in console to diagnose issues! 🚀
