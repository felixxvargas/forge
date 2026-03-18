# Forge - Supabase Backend Deployment Guide

## 🎯 Quick Deploy Instructions

### Method 1: Supabase Dashboard (Recommended - Easiest)

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your Forge project

2. **Navigate to Edge Functions**
   - Click "Edge Functions" in the left sidebar
   - Find `make-server-17285bd7` function

3. **Redeploy the Function**
   - Click on the function name
   - Look for a "Deploy" or "Redeploy" button
   - Click to deploy the latest changes

4. **Verify Deployment**
   - Check that the deployment status shows "Active"
   - Note the deployment timestamp

---

### Method 2: Supabase CLI (Advanced)

If dashboard deployment doesn't work, use the CLI:

#### Prerequisites
```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Or using Homebrew (Mac)
brew install supabase/tap/supabase
```

#### Deployment Steps

1. **Login to Supabase**
   ```bash
   supabase login
   ```

2. **Link Your Project**
   ```bash
   supabase link --project-ref YOUR_PROJECT_ID
   ```
   
   Find your project ID in the Supabase Dashboard URL:
   `https://supabase.com/dashboard/project/YOUR_PROJECT_ID`

3. **Deploy Edge Functions**
   ```bash
   supabase functions deploy make-server-17285bd7
   ```

4. **Set Environment Variables** (if needed)
   ```bash
   supabase secrets set IGDB_CLIENT_ID=your_client_id
   supabase secrets set IGDB_CLIENT_SECRET=your_client_secret
   ```

---

## 📋 Backend Features Checklist

### ✅ Authentication System
- [x] Sign up with email/password
- [x] Sign in with email/password  
- [x] Google OAuth support (requires setup)
- [x] Session management with JWT
- [x] Automatic profile creation on first sign-in
- [x] Access token storage and validation

### ✅ User Management
- [x] Get user by ID
- [x] Get user by handle
- [x] Update user profile
- [x] Check handle availability
- [x] Topic accounts (gaming media)
- [x] Automatic profile picture generation

### ✅ Post System
- [x] Create posts
- [x] Delete posts
- [x] Like/unlike posts
- [x] Get all posts
- [x] Get posts by user
- [x] Get user's liked posts
- [x] Image/media support
- [x] Link previews
- [x] Community tagging

### ✅ Social Features
- [x] Follow/unfollow users
- [x] Get followers list
- [x] Get following list
- [x] Check follow status

### ✅ Safety Features
- [x] Block users
- [x] Unblock users
- [x] Mute users
- [x] Unmute users
- [x] Mute posts
- [x] Report users
- [x] Get blocked/muted lists

### ✅ File Upload
- [x] Upload to "avatars" bucket (public)
- [x] Automatic file naming
- [x] User-specific folders
- [x] Public URL generation
- [x] JWT authentication required

### ✅ Games Integration
- [x] IGDB API integration
- [x] Search games
- [x] Get game details
- [x] Batch game fetching
- [x] Game artwork (cover art, screenshots)
- [x] MobyGames fallback

### ✅ Bluesky Integration
- [x] Fetch Bluesky profiles
- [x] Fetch Bluesky posts
- [x] Topic account cross-posting
- [x] Media content mirroring

### ✅ Admin Tools
- [x] Check user accounts
- [x] Update passwords
- [x] Update profiles
- [x] Create profiles
- [x] Complete onboarding
- [x] Seed topic accounts

---

## 🗄️ Storage Buckets Required

Make sure these storage buckets exist in your Supabase project:

### 1. `avatars` (Public Bucket)
- **Purpose**: User profile pictures and avatars
- **Access**: Public
- **Path Structure**: `{userId}/{randomUUID}.{extension}`

#### How to Create:
1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `avatars`
4. Set to **Public**
5. Click "Create bucket"

---

## 🔑 Required Environment Variables

These secrets should already be set in your Supabase project:

```
SUPABASE_URL              ✅ (Auto-configured)
SUPABASE_ANON_KEY         ✅ (Auto-configured)
SUPABASE_SERVICE_ROLE_KEY ✅ (Auto-configured)
SUPABASE_DB_URL           ✅ (Auto-configured)
IGDB_CLIENT_ID            ✅ (Already set)
IGDB_CLIENT_SECRET        ✅ (Already set)
```

---

## 🔧 Configuration Files

### `/supabase/config.toml`
```toml
[edge_runtime]
policy = "per_worker"

[[edge_functions]]
name = "make-server-17285bd7"
verify_jwt = true

[auth]
enabled = true
```

**Key Settings:**
- `verify_jwt = true` - Validates JWT tokens for authenticated requests
- This is why redeployment is critical after enabling JWT verification

---

## 🧪 Post-Deployment Testing

After deployment, test these features:

### 1. Authentication
```javascript
// In browser console
localStorage.getItem('forge-access-token') // Should exist after login
```

### 2. Create Post
- Sign in to your account
- Click the purple "+" button
- Write a post and submit
- Should succeed without 401 error

### 3. Upload Profile Picture
- Go to Settings → Edit Profile
- Click "Change Picture"
- Upload an image
- Should upload to "avatars" bucket

### 4. Follow Users
- Visit any user profile
- Click "Follow" button
- Should work without errors

### 5. Like Posts
- Click heart icon on any post
- Should turn lime green
- Like count should increase

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized Errors

**Cause:** Access token missing or invalid

**Solution:**
1. Sign out completely
2. Clear browser data:
   ```javascript
   localStorage.clear()
   ```
3. Sign in again
4. Fresh token will be generated

---

### Issue: 404 Not Found on Profile Uploads

**Cause:** "avatars" bucket doesn't exist

**Solution:**
1. Go to Supabase Dashboard → Storage
2. Create "avatars" bucket (make it public)
3. Try upload again

---

### Issue: Edge Function Not Updating

**Cause:** Cached function or deployment didn't complete

**Solution:**
1. Redeploy via dashboard
2. Wait 30-60 seconds for propagation
3. Hard refresh your app (Ctrl+Shift+R)
4. Check deployment logs in Supabase

---

### Issue: CORS Errors

**Cause:** Frontend domain not whitelisted

**Solution:**
1. Supabase Dashboard → Settings → API
2. Add your frontend URL to allowed origins
3. Redeploy function

---

## 📊 Database Structure

### KV Store Keys

The app uses a key-value store with these key patterns:

```
user:{userId}                  - User profile data
user:handle:{handle}           - Handle to userId mapping
post:{postId}                  - Post data
follow:{userId}:{targetUserId} - Follow relationships
like:{userId}:{postId}         - Like relationships
block:{userId}:{targetUserId}  - Block relationships
mute:{userId}:{targetUserId}   - Mute relationships
mute:post:{userId}:{postId}    - Muted posts
report:{reportId}              - User reports
game:{gameId}                  - Game data
```

---

## 🚀 Performance Optimization

### Caching Strategy
- Posts are fetched once on app load
- User data is cached in React Context
- Game artwork cached in browser

### Rate Limiting
- IGDB API: ~4 requests/second
- Bluesky API: Public endpoint limits apply

---

## 📞 Support

### Edge Function Logs
View real-time logs in Supabase Dashboard:
1. Edge Functions → make-server-17285bd7
2. Click "Logs" tab
3. Monitor requests and errors

### Console Commands
Use these in your browser console:

```javascript
// Check authentication
localStorage.getItem('forge-access-token')
localStorage.getItem('forge-user-id')

// Test API endpoint
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-17285bd7/posts', {
  headers: { 
    'Authorization': 'Bearer ' + localStorage.getItem('forge-access-token') 
  }
}).then(r => r.json()).then(console.log)
```

---

## ✅ Deployment Verification

After deploying, verify these endpoints work:

1. **GET /posts** - Should return array of posts
2. **POST /posts** - Should create post (requires auth)
3. **POST /upload** - Should upload to avatars bucket
4. **GET /auth/me** - Should return current user (requires auth)
5. **POST /users/:id/follow** - Should follow user (requires auth)

---

## 🎉 Success Indicators

You'll know deployment succeeded when:

- ✅ No 401 errors when posting
- ✅ No 404 errors when uploading profile pictures
- ✅ Follow button works
- ✅ Like button works
- ✅ New posts appear in feed
- ✅ Profile pictures upload successfully

---

**Last Updated:** March 13, 2026
**Edge Function:** make-server-17285bd7
**Storage Bucket:** avatars (public)
**JWT Verification:** Enabled
