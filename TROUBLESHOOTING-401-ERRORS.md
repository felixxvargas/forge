# 🚨 CRITICAL: Fixing 401 Errors in Forge

## Problem Summary
All Edge Function endpoints are returning **401 Unauthorized** errors, even though:
- ✅ You are signed in (authentication is working)
- ✅ RLS policies have been created
- ✅ Storage buckets exist

## Root Cause
**The Edge Function is NOT deployed or NOT running properly.**

When you created RLS policies in Supabase, the Edge Function needs to be **redeployed** to pick up the new database configuration.

---

## ✅ SOLUTION: Redeploy Edge Function

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your Forge project
3. Click **"Edge Functions"** in the left sidebar

### Step 2: Find Your Edge Function
Look for the function named: **`make-server-17285bd7`**

### Step 3: Redeploy
- Click on the function name
- Look for a **"Redeploy"** or **"Deploy"** button
- Click it and wait for deployment to complete (~30 seconds)
- You should see a ✅ success message

### Step 4: Verify Deployment
After redeployment:
1. Go back to Forge at `/verify-backend`
2. Click **"🚀 Run All Tests"**
3. Check if tests now pass

---

## 📊 Expected Results After Redeployment

You should see **8/8 tests passing**:

| Test | Status |
|------|--------|
| Health Check | ✅ Edge Function is running! |
| Database Access | ✅ Service role can query database |
| Authentication Status | ✅ Signed in as user a96... |
| JWT Validation | ✅ Token valid |
| Topic Accounts Endpoint | ✅ Loaded 10 topic accounts |
| Posts Endpoint | ✅ Loaded X posts |
| User Profile | ✅ Loaded profile |
| Storage Buckets | ✅ All 5 buckets exist |

---

## 🔍 If Tests Still Fail After Redeployment

### Check Edge Function Logs

1. **Go to:** Supabase → Edge Functions → `make-server-17285bd7` → **Logs** tab
2. **Look for errors** containing:
   - "permission denied"
   - "RLS policy"
   - "Missing authorization header"
   - "401"

### Check RLS Policies

1. **Go to:** Supabase → Table Editor → `kv_store_17285bd7` → **RLS** tab
2. **Verify these 4 policies exist:**
   - ✅ "Enable read access for all users" (FOR SELECT)
   - ✅ "Enable insert for authenticated users only" (FOR INSERT)
   - ✅ "Enable update for users based on user_id" (FOR UPDATE)
   - ✅ "Enable delete for users based on user_id" (FOR DELETE)
3. **Verify RLS is ENABLED** (toggle should be ON)

### Temporarily Disable RLS (Testing Only)

⚠️ **WARNING: Only use for debugging! Makes database publicly writable!**

```sql
-- TEMPORARILY disable RLS (NOT FOR PRODUCTION!)
ALTER TABLE public.kv_store_17285bd7 DISABLE ROW LEVEL SECURITY;
```

**Test if Forge works:**
- If it works → RLS policies are the problem
- If it still fails → Edge Function deployment is the problem

**Re-enable RLS:**
```sql
ALTER TABLE public.kv_store_17285bd7 ENABLE ROW LEVEL SECURITY;
```

---

## 🔧 Alternative: Check Environment Variables

The Edge Function uses these environment variables (should be auto-configured):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_DB_URL`

**To check:**
1. Go to: Supabase → Edge Functions → `make-server-17285bd7` → **Settings**
2. Verify all 4 variables are present (values should be hidden)

---

## 📱 Quick Diagnostic Checklist

Run through this before asking for help:

- [ ] **Redeployed Edge Function** in Supabase dashboard
- [ ] **Waited 30 seconds** after redeployment
- [ ] **Refreshed Forge** in browser (hard refresh: Ctrl+Shift+R)
- [ ] **Checked Edge Function logs** for errors
- [ ] **Verified RLS policies exist** (4 policies for kv_store)
- [ ] **Verified RLS is enabled** (toggle is ON)
- [ ] **Ran verify-backend tests** (`/verify-backend`)

---

## 🆘 Still Not Working?

If you've done all the above and it's still broken, the issue might be:

### 1. Edge Function Not Deployed At All
- **Solution:** You may need to deploy from CLI using Supabase CLI
- **Command:** `supabase functions deploy make-server-17285bd7`

### 2. Incorrect Supabase Project
- **Check:** Verify `/utils/supabase/info.tsx` has correct `projectId`
- **Verify:** Project ID matches your Supabase dashboard URL

### 3. Edge Functions Disabled
- **Check:** Your Supabase plan includes Edge Functions (should be in all plans)
- **Verify:** Go to Supabase Dashboard → Edge Functions (shouldn't show upgrade prompt)

### 4. Network/CORS Issues
- **Check browser console** for CORS errors
- **Look for:** "Access-Control-Allow-Origin" errors

---

## 💡 Why This Happened

The Edge Function has **two Supabase clients**:

1. **Service Role Client** (lines 10-13 in index.tsx)
   - Has **full database access**
   - **Should bypass RLS**
   - Used for system operations (loading posts, topic accounts, etc.)

2. **Anon Client** (created per-request)
   - Has **user-level access**
   - **Respects RLS policies**
   - Used for user-specific operations

When you created RLS policies:
- The service role client should still work (bypasses RLS)
- But the Edge Function needs redeployment to refresh its database connection

---

## 📝 Next Steps

1. ✅ **Redeploy Edge Function** (most important!)
2. ✅ **Run verify-backend tests**
3. ✅ **Check Edge Function logs** if tests fail
4. ✅ **Report specific error messages** if still broken

---

**Last Updated:** March 14, 2026  
**Status:** Awaiting Edge Function redeployment
