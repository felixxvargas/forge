# 🔥 Forge Backend - Complete Summary

## 📦 What's Ready to Deploy

All backend code has been prepared and is ready for deployment to your Supabase project.

---

## 🗂️ Backend File Structure

```
/supabase/
├── config.toml                    # Edge function configuration
└── functions/
    └── server/
        ├── index.tsx              # Main server (47 endpoints)
        ├── games.tsx              # IGDB & MobyGames integration
        └── kv_store.tsx           # Database utilities (protected)
```

---

## 🚀 Deployment Options

### **Option 1: Supabase Dashboard** ⭐ RECOMMENDED

**Easiest and fastest method:**

1. Visit: https://supabase.com/dashboard
2. Select your Forge project
3. Navigate to **Edge Functions** in sidebar
4. Find `make-server-17285bd7`
5. Click **Deploy** or **Redeploy**
6. Wait 30-60 seconds for deployment

✅ **This is the simplest way and requires no terminal commands!**

---

### **Option 2: CLI Deployment Script**

If you prefer using the command line:

```bash
# Make the script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The script will:
- Check if Supabase CLI is installed
- Login to Supabase (if needed)
- Link your project (if needed)
- Deploy the edge function
- Provide next steps

---

### **Option 3: Manual CLI Commands**

```bash
# 1. Install Supabase CLI (if not installed)
npm install -g supabase

# 2. Login
supabase login

# 3. Link project
supabase link --project-ref YOUR_PROJECT_ID

# 4. Deploy
supabase functions deploy make-server-17285bd7
```

---

## 📋 Complete Endpoint List (47 Total)

### **Authentication (4 endpoints)**
```
POST   /auth/signup          - Create new account
POST   /auth/signin          - Sign in with email/password  
GET    /auth/me              - Get current user (requires auth)
GET    /health               - Health check
```

### **User Management (7 endpoints)**
```
GET    /users/:userId                - Get user by ID
GET    /users/handle/:handle         - Get user by handle
GET    /users/check-handle/:handle   - Check handle availability
PUT    /users/:userId                - Update user (requires auth)
GET    /users/topic-accounts         - Get all topic accounts
GET    /users/:userId/followers      - Get user's followers
GET    /users/:userId/following      - Get users they follow
```

### **Posts (8 endpoints)**
```
GET    /posts                        - Get all posts
GET    /posts/user/:userId           - Get user's posts
POST   /posts                        - Create post (requires auth)
DELETE /posts/:postId                - Delete post (requires auth)
POST   /posts/:postId/like           - Like post (requires auth)
DELETE /posts/:postId/like           - Unlike post (requires auth)
GET    /users/:userId/likes          - Get user's liked post IDs
POST   /posts/:postId/mute           - Mute post (requires auth)
DELETE /posts/:postId/mute           - Unmute post (requires auth)
```

### **Social/Following (4 endpoints)**
```
POST   /users/:targetUserId/follow   - Follow user (requires auth)
DELETE /users/:targetUserId/follow   - Unfollow user (requires auth)
GET    /users/:targetUserId/is-following - Check if following
GET    /users/me/following           - Get my following list
```

### **Safety (8 endpoints)**
```
POST   /users/:targetUserId/block    - Block user (requires auth)
DELETE /users/:targetUserId/block    - Unblock user (requires auth)
POST   /users/:targetUserId/mute     - Mute user (requires auth)
DELETE /users/:targetUserId/mute     - Unmute user (requires auth)
POST   /users/:targetUserId/report   - Report user (requires auth)
GET    /users/me/blocks              - Get blocked users
GET    /users/me/mutes               - Get muted users
GET    /users/me/muted-posts         - Get muted posts
```

### **File Upload (1 endpoint)**
```
POST   /upload                       - Upload file (requires auth)
                                     - Uses "avatars" bucket
                                     - Returns public URL
```

### **Games (6 endpoints)**
```
GET    /games/:gameId                - Get game by ID
POST   /games/search/:query          - Search games
POST   /games/batch                  - Get multiple games
POST   /games/moby                   - Get/create from MobyGames
POST   /games/:gameId/artwork        - Add game artwork
GET    /games/search/:query          - Search (GET version)
```

### **Bluesky Integration (2 endpoints)**
```
GET    /bluesky/profile/:handle      - Get Bluesky profile
GET    /bluesky/posts/:handle        - Get Bluesky posts
```

### **Admin Tools (6 endpoints)**
```
GET    /admin/check-user/:email      - Check user account
POST   /admin/update-password        - Update user password
POST   /admin/update-profile         - Update user profile
POST   /admin/create-profile         - Create profile for auth user
POST   /admin/complete-onboarding    - Mark onboarding complete
POST   /seed/topic-accounts          - Seed gaming media accounts
```

### **Seed Data (1 endpoint)**
```
POST   /seed/topic-accounts          - Create topic accounts
```

---

## 🔐 Authentication & Security

### **JWT Verification: ENABLED** ✅

All endpoints marked "requires auth" validate JWT tokens using:
```javascript
const accessToken = c.req.header('Authorization')?.split(' ')[1];
const { data: { user }, error } = await supabase.auth.getUser(accessToken);
```

### **Public Endpoints**
These work without authentication:
- GET /posts (view all posts)
- GET /users/:userId (view profiles)
- GET /users/handle/:handle (lookup by handle)
- GET /health (health check)
- GET /games/* (game data)
- GET /bluesky/* (Bluesky data)

### **Protected Endpoints**  
These require valid access token:
- All POST/PUT/DELETE operations
- /auth/me (current user)
- User modifications
- Following/blocking/muting
- Creating posts
- File uploads

---

## 🗄️ Storage Configuration

### **Required Bucket: `avatars`**

**Settings:**
- Name: `avatars`
- Access: **PUBLIC**
- Files: User profile pictures
- Path: `{userId}/{randomUUID}.{extension}`

**How to Create:**
1. Supabase Dashboard → Storage
2. New bucket → Name: "avatars"
3. Set to PUBLIC
4. Save

**File Upload Flow:**
```
Frontend → POST /upload (with FormData)
         ↓
Server validates JWT token
         ↓
Upload to avatars bucket
         ↓
Return public URL
         ↓
Frontend updates profile with URL
```

---

## 🔑 Environment Variables

These are **already configured** in your Supabase project:

| Variable | Status | Purpose |
|----------|--------|---------|
| `SUPABASE_URL` | ✅ Set | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ Set | Public anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set | Admin key (server-side only) |
| `SUPABASE_DB_URL` | ✅ Set | Database connection string |
| `IGDB_CLIENT_ID` | ✅ Set | IGDB API client ID |
| `IGDB_CLIENT_SECRET` | ✅ Set | IGDB API secret |

**These are automatically injected into your edge function at runtime.**

---

## 🧪 Testing Your Deployment

### **Method 1: Use the Test Page**

1. Open `/test-backend.html` in your browser
2. Enter your Supabase Project ID
3. Click "Run Tests"
4. Review results

### **Method 2: Browser Console**

```javascript
// Check if you have an access token
console.log('Token exists:', !!localStorage.getItem('forge-access-token'));

// Test public endpoint (no auth)
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-17285bd7/posts')
  .then(r => r.json())
  .then(console.log);

// Test authenticated endpoint
const token = localStorage.getItem('forge-access-token');
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-17285bd7/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
})
  .then(r => r.json())
  .then(console.log);
```

### **Method 3: In-App Testing**

After deployment:

1. **Sign out completely** (clears old tokens)
2. **Sign in again** (gets fresh token)
3. **Try posting** - Click purple "+" button
4. **Try uploading profile picture** - Settings → Edit Profile
5. **Try following a user** - Visit profile → Follow
6. **Try liking a post** - Click heart icon

---

## 🐛 Common Issues & Fixes

### ❌ **401 Unauthorized Error**

**Problem:** Access token missing or expired

**Fix:**
1. Sign out
2. Clear localStorage: `localStorage.clear()`
3. Sign in again
4. New token will be generated

---

### ❌ **404 Not Found on Uploads**

**Problem:** "avatars" bucket doesn't exist

**Fix:**
1. Supabase Dashboard → Storage
2. Create "avatars" bucket
3. Set to **PUBLIC**
4. Try upload again

---

### ❌ **Edge Function Not Responding**

**Problem:** Function not deployed or cached

**Fix:**
1. Redeploy via Supabase Dashboard
2. Wait 60 seconds for propagation
3. Hard refresh browser (Ctrl+Shift+R)
4. Check function logs in dashboard

---

### ❌ **CORS Errors**

**Problem:** Frontend origin not allowed

**Fix:**
Edge function already has CORS enabled:
```javascript
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));
```

If still seeing errors:
1. Check Supabase Dashboard → Settings → API
2. Verify allowed origins

---

## 📊 Database Keys (KV Store)

The backend uses these key patterns:

```
user:{userId}                  → User profile
user:handle:{handle}           → Handle lookup
user:email:{email}             → Email lookup
post:{postId}                  → Post data
follow:{userId}:{targetUserId} → Follow relationship
like:{userId}:{postId}         → Like relationship
block:{userId}:{targetUserId}  → Block relationship
mute:{userId}:{targetUserId}   → Mute relationship
mute:post:{userId}:{postId}    → Muted post
report:{reportId}              → User report
game:{gameId}                  → Game data
topic:account:{userId}         → Topic account flag
```

**Protected:** The `/supabase/functions/server/kv_store.tsx` file provides utilities for these operations and is **read-only**.

---

## 🎯 Next Steps After Deployment

1. ✅ Deploy edge function (via dashboard or CLI)
2. ✅ Verify "avatars" bucket exists and is public
3. ✅ Sign out and sign in to get fresh token
4. ✅ Test posting functionality
5. ✅ Test profile picture upload
6. ✅ Test follow/like features
7. ✅ Check edge function logs for errors

---

## 📞 Monitoring & Logs

### **View Logs:**
1. Supabase Dashboard
2. Edge Functions → `make-server-17285bd7`
3. Click "Logs" tab
4. Real-time request/error monitoring

### **Log Format:**
```
[POST /posts] Authorization header: Present
[POST /posts] User authenticated: abc-123-def
Create post error: <details if any>
```

---

## ✅ Deployment Checklist

Before deploying:
- [x] All backend code ready in `/supabase/functions/server/`
- [x] config.toml configured with JWT verification
- [x] Environment variables set in Supabase
- [ ] Edge function deployed
- [ ] "avatars" bucket created (public)

After deploying:
- [ ] Sign out and sign in to refresh token
- [ ] Test creating a post
- [ ] Test uploading profile picture
- [ ] Test following a user
- [ ] Test liking a post
- [ ] Verify no 401/404 errors

---

## 🎉 Success Indicators

**You'll know it's working when:**

✅ Posts load on feed page  
✅ Can create new posts  
✅ Can upload profile pictures  
✅ Follow button works  
✅ Like button works  
✅ No 401 errors in console  
✅ No 404 errors in console  

---

## 📚 Documentation Files

- `/DEPLOYMENT_GUIDE.md` - Full deployment instructions
- `/BACKEND_SUMMARY.md` - This file (overview)
- `/deploy.sh` - Quick deployment script
- `/test-backend.html` - Backend testing tool
- `/docs/PROJECT_SPEC.md` - Complete project specification

---

**Last Updated:** March 13, 2026  
**Edge Function:** make-server-17285bd7 (47 endpoints)  
**Storage:** avatars bucket (public)  
**Auth:** JWT verification enabled  
**Status:** ✅ Ready to deploy
