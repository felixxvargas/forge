# 🧪 How to Use Backend Verification

## Quick Start

1. **Open the verification page**:
   ```
   https://your-forge-app.com/verify-backend
   ```

2. **Click "🚀 Run All Tests"**

3. **Check the results**:
   - ✅ Green = Passed
   - ❌ Red = Failed
   - ⏭️ Yellow = Skipped

---

## 📊 What Gets Tested

### 1. **Health Check** ⚡
- Tests if your Edge Function is running
- **Endpoint:** `/make-server-17285bd7/health`
- **Expected:** 200 OK response

### 2. **Authentication Status** 🔑
- Checks if you're signed in
- **Checks:** localStorage for token and user ID
- **Note:** Some tests are skipped if not signed in

### 3. **JWT Validation** 🎫
- Validates your access token
- **Endpoint:** `/make-server-17285bd7/debug/validate-token`
- **Expected:** Token is valid and returns user ID
- **Skipped if:** Not signed in

### 4. **Topic Accounts** 📰
- Loads gaming media accounts (IGN, GameSpot, etc.)
- **Endpoint:** `/make-server-17285bd7/users/topic-accounts`
- **Expected:** Array of topic accounts

### 5. **Posts** 📝
- Fetches all posts from the feed
- **Endpoint:** `/make-server-17285bd7/posts`
- **Expected:** Array of posts

### 6. **User Profile** 👤
- Loads your user profile
- **Endpoint:** `/make-server-17285bd7/auth/me`
- **Expected:** Profile data with handle
- **Skipped if:** Not signed in

### 7. **Storage Buckets** 📦 *(NEW!)*
- Checks if all 5 storage buckets exist:
  - `forge-avatars`
  - `forge-banners`
  - `forge-post-media`
  - `forge-community-icons`
  - `forge-community-banners`
- **Expected:** All 5 buckets are present

---

## 🎯 Interpreting Results

### ✅ All Tests Passed
Your backend is configured correctly! You should see:
```
Passed: 7 (or 5 if not signed in)
Failed: 0
Pending: 0
```

**Everything working:**
- Edge Function responding
- Database connected
- Storage buckets created
- Authentication working (if signed in)

---

### ⚠️ Some Tests Failed

#### Common Issues:

**Storage Buckets Failed:**
```
❌ Missing buckets: forge-avatars, forge-banners
```
**Fix:** Check Edge Function logs - buckets should auto-create on startup

**Token Validation Failed:**
```
❌ Token invalid: Invalid JWT
```
**Fix:** You need to disable "Verify JWT with legacy secret" in Supabase Edge Function settings

**Profile Failed:**
```
❌ Failed with status 401
```
**Fix:** Same as token validation - disable legacy JWT verification

**Posts Failed:**
```
❌ Loaded 0 posts
```
**Fix:** This is actually OK! It means no posts exist yet, but the endpoint works

---

### ❌ All Tests Failed

**Edge Function Down:**
```
❌ Error: Failed to fetch
```
**Fix:** 
1. Check if your Supabase project is active
2. Verify Edge Function deployed successfully
3. Check browser console for CORS errors

---

## 🔍 Debugging Tips

### 1. Check Browser Console
Open DevTools (F12) and look for:
- Network errors (red requests)
- Console logs from the tests
- Detailed bucket lists

### 2. Check Edge Function Logs
In Supabase Dashboard:
1. Go to **Edge Functions**
2. Click **Logs**
3. Look for `[Storage]` messages

You should see:
```
[Storage] ✓ Bucket already exists: forge-avatars
[Storage] ✓ Bucket already exists: forge-banners
...
[Storage] ✅ All buckets initialized
```

### 3. Manual Storage Check
In Supabase Dashboard:
1. Go to **Storage**
2. You should see all 5 buckets listed
3. Each should have a 🌐 (public) icon

---

## 🚨 Troubleshooting Specific Tests

### Storage Test Shows Fewer Than 5 Buckets

**Problem:** Only seeing 2-3 buckets
**Cause:** Buckets weren't created on Edge Function startup
**Solution:**
1. Redeploy the Edge Function
2. OR manually create missing buckets:
   - Go to Storage → New bucket
   - Name: `forge-avatars` (or whichever is missing)
   - Public: ✅ Yes
   - File size limit: See `/STORAGE-BUCKETS-GUIDE.md`

---

### Token Validation Keeps Failing

**Problem:** Always getting 401 errors
**Cause:** Legacy JWT verification is ON
**Solution:**
1. Go to Supabase Dashboard
2. **Edge Functions** → `make-server-17285bd7`
3. Find "Verify JWT with legacy secret"
4. **Turn it OFF** ❌
5. Save and redeploy

---

### Tests Won't Run At All

**Problem:** Clicking "Run All Tests" does nothing
**Cause:** JavaScript error or import failure
**Solution:**
1. Check browser console for errors
2. Make sure `/utils/supabase/info` exists
3. Try hard refresh (Ctrl+Shift+R)

---

## 📱 Mobile Testing

The verification page works on mobile too!

1. Open your Forge app on mobile
2. Navigate to `/verify-backend`
3. Tap "🚀 Run All Tests"
4. Results may wrap on smaller screens

---

## 🔄 Running Tests Again

**Reset Everything:**
Click "🔄 Reset" button

**Run Again:**
Click "🚀 Run All Tests"

Tests run with 300ms delays between each for readability.

---

## 💡 Pro Tips

### 1. Sign In First
For best results:
1. Sign in to your Forge account
2. THEN run tests
3. This enables token and profile tests

### 2. Check Console Logs
The tests log detailed info to console:
```javascript
📦 Storage buckets: [...]
✅ All tests complete!
Passed: 7, Failed: 0
```

### 3. Bookmark It
Add `/verify-backend` to bookmarks for quick testing

### 4. After Major Changes
Run verification after:
- Deploying Edge Function updates
- Changing Supabase settings
- Adding new features
- Debugging authentication issues

---

## 📊 Test Coverage

| Category | Tests | Coverage |
|----------|-------|----------|
| **Backend** | 7 total | Edge Function, Auth, Storage |
| **Auth** | 3 tests | Token, Session, Profile |
| **Data** | 2 tests | Posts, Topic Accounts |
| **Storage** | 1 test | 5 buckets verified |
| **System** | 1 test | Health check |

---

## 🎨 Reading the UI

### Test Status Colors
- **Yellow border** 🟡 = Pending (waiting to run)
- **Green border** 🟢 = Success (test passed)
- **Red border** 🔴 = Error (test failed)

### Summary Boxes
Top cards show totals:
- **Passed** (green) - Number of successful tests
- **Failed** (red) - Number of errors
- **Pending** (yellow) - Tests not run yet

---

## 🆘 Still Having Issues?

### Get Help
1. Check Edge Function logs in Supabase
2. Review `/SUPABASE-SETUP-GUIDE.md`
3. Read `/STORAGE-BUCKETS-GUIDE.md` for storage issues
4. Look at browser console errors

### Common Quick Fixes
```bash
# 1. Disable legacy JWT (most common issue)
# 2. Check all 5 buckets exist
# 3. Verify Edge Function is deployed
# 4. Try signing out and back in
```

---

**Last Updated:** March 14, 2026  
**Version:** 2.0.0 (with storage bucket tests)