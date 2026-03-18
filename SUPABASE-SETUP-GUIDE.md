# Forge - Supabase Backend Setup Guide

## 🎯 Quick Fix for 401/404 Errors

### Step 1: Disable Platform JWT Verification
1. Go to Supabase Dashboard → **Edge Functions**
2. Click on `make-server-17285bd7`
3. Go to **Details** tab
4. Find **"Verify JWT with legacy secret"**
5. **TURN IT OFF** (disable the toggle)
6. Click **Save changes**

**Why?** Your app uses user session JWTs (from sign-in), not the legacy JWT secret. The code already validates JWTs manually using `anonClient.auth.getUser()`.

---

### Step 2: Verify Storage Buckets
1. Go to Supabase Dashboard → **Storage**
2. The Edge Function will automatically create these buckets:
   - `forge-avatars` - Profile pictures (5MB limit)
   - `forge-banners` - Profile banners (10MB limit)
   - `forge-post-media` - Post images/videos/gifs (50MB limit)
   - `forge-community-icons` - Community icons (2MB limit)
   - `forge-community-banners` - Community banners (10MB limit)
3. All buckets are **PUBLIC** for easy access
4. If buckets don't exist, they'll be created on first function run

**Bucket Organization:**
- ✅ All buckets are **PUBLIC**
- ✅ Each has specific file size limits and allowed types
- ✅ Files organized by user ID: `{user-id}/{random-uuid}.{ext}`
- ✅ Clear separation of content types

---

## 📋 Your Current Architecture

### ✅ Single Edge Function (Correct!)
You have **ONE** Edge Function (`make-server-17285bd7`) that handles everything:
- ✅ Authentication (sign up, sign in, get current user)
- ✅ User management (profiles, handles, follows)
- ✅ Posts (create, delete, like, unlike)
- ✅ File uploads (avatars, images)
- ✅ Communities
- ✅ User safety (blocking, muting, reporting)

**This is the RIGHT approach!** One function with multiple routes is:
- ✅ Easier to manage
- ✅ Better for CORS and configuration
- ✅ Lower cold-start overhead
- ✅ Simpler deployment

---

## 🔧 How JWT Validation Works

### Frontend (Your App)
1. User signs in → Gets JWT access token
2. Token stored in `localStorage` as `forge-access-token`
3. Every API request includes: `Authorization: Bearer <token>`

### Backend (Edge Function)
1. Request arrives with `Authorization` header
2. Code extracts the token
3. Creates anon client: `createClient(URL, ANON_KEY)`
4. Validates token: `anonClient.auth.getUser(token)`
5. If valid → Process request
6. If invalid → Return 401 error

**Platform JWT Verification should be OFF** to avoid conflicts!

---

## 🐛 Debugging Tools

### 1. Debug Token Page
Open: `/debug-token.html`

This page lets you:
- ✅ Check your current session
- ✅ Test JWT validation
- ✅ Test file uploads
- ✅ See detailed error messages

### 2. Server Logs
The Edge Function logs detailed information:
```
[Upload] Authorization header: Present
[Upload] Token length: 563
[Upload] Token preview: eyJhbGciOiJFUzI1NiIsImtpZCI6...
[Upload] Attempting to validate JWT...
[Upload] ✓ User authenticated successfully: a963388b-ed7b-4458-ad36-676c6000d7e0
```

### 3. Debug Endpoint
Test token validation directly:
```bash
POST https://xmxeafjpscgqprrreulh.supabase.co/functions/v1/make-server-17285bd7/debug/validate-token
Authorization: Bearer <your-token>
```

---

## 📊 Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 401 | Unauthorized - Invalid or expired token | Sign out and sign in again |
| 404 | Endpoint not found | Check the URL is correct |
| 403 | Forbidden - Not your resource | Can't edit someone else's profile/posts |
| 500 | Server error | Check server logs for details |

---

## 🔐 Storage Bucket Permissions

The `avatars` bucket is PUBLIC, which means:
- ✅ Anyone can view uploaded images
- ❌ Only authenticated users can upload
- ✅ Users can only upload to their own folder (`user-id/filename.png`)

---

## 🚀 After Making Changes

When you update the Edge Function code:
1. The changes deploy automatically (if using Figma Make)
2. OR manually deploy: `supabase functions deploy make-server-17285bd7`
3. Check the **Invocations** tab to see logs
4. Test with the debug page

---

## ✅ Checklist

Before testing uploads:
- [ ] Platform JWT verification is **OFF**
- [ ] You're signed in (check localStorage for `forge-access-token`)
- [ ] The `avatars` bucket exists in Storage
- [ ] The bucket is set to **PUBLIC**
- [ ] You've redeployed the Edge Function (if you made code changes)

---

## 📞 Still Having Issues?

1. **Check the debug page** (`/debug-token.html`)
2. **View server logs** in Supabase Dashboard → Functions → make-server-17285bd7 → Invocations
3. **Check browser console** for frontend errors
4. **Verify storage bucket** exists and is public

---

## 🎉 Expected Behavior After Fix

### Posting
1. Write a post
2. Click "Post"
3. ✅ Post appears immediately in your feed
4. ✅ No 401 error

### Profile Upload
1. Click "Edit Profile"
2. Click profile picture to upload
3. Select an image
4. ✅ Image uploads successfully
5. ✅ Your avatar updates immediately
6. ✅ No 401 error

---

**Last Updated:** March 14, 2026  
**Edge Function:** `make-server-17285bd7`  
**Storage Bucket:** `avatars`
