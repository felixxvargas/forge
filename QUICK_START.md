# 🚀 Forge Backend - Quick Start Guide

## ⚡ 3-Step Deployment (Easiest Way)

### Step 1: Deploy Edge Function
**Via Supabase Dashboard (No terminal needed!):**

1. Go to: https://supabase.com/dashboard
2. Select your Forge project
3. Click "Edge Functions" in left sidebar
4. Find `make-server-17285bd7`
5. Click "Deploy" button
6. ✅ Done! Wait 60 seconds

---

### Step 2: Create Avatars Bucket

1. Still in Supabase Dashboard
2. Click "Storage" in left sidebar
3. Click "New bucket" button
4. Name: `avatars`
5. ⚠️ **Important:** Set to **PUBLIC**
6. Click "Create bucket"
7. ✅ Done!

---

### Step 3: Refresh Your Session

1. Go back to your Forge app
2. Sign out completely
3. Sign in again
4. ✅ Done! You now have a fresh access token

---

## 🧪 Quick Test

After completing the 3 steps above, test these:

### ✓ Create a Post
- Click the purple "+" button (bottom right)
- Type something
- Click "Post"
- Should work without errors ✅

### ✓ Upload Profile Picture
- Go to Settings → Edit Profile
- Click "Change Picture"
- Select an image
- Should upload successfully ✅

### ✓ Follow Someone
- Visit any user profile
- Click "Follow" button
- Should turn lime green ✅

### ✓ Like a Post
- Click heart icon on any post
- Should turn lime green
- Number should increase ✅

---

## 🆘 If Something Doesn't Work

### Problem: Still getting 401 errors

**Solution:**
```javascript
// Open browser console (F12) and run:
localStorage.clear()
// Then sign in again
```

### Problem: Profile pictures won't upload

**Check:**
1. Supabase Dashboard → Storage
2. Is "avatars" bucket there? ✅
3. Is it set to PUBLIC? ⚠️ Must be public!

### Problem: Edge function not updating

**Solution:**
1. Redeploy via dashboard again
2. Wait 60 seconds
3. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

---

## 📊 Check Logs (If Needed)

**View edge function logs:**
1. Supabase Dashboard
2. Edge Functions → `make-server-17285bd7`
3. Click "Logs" tab
4. Look for red error messages

---

## ✅ Success Checklist

After following the 3 steps, you should have:

- ✅ Edge function deployed and active
- ✅ "avatars" bucket created (public)
- ✅ Fresh access token from new sign-in
- ✅ Can create posts without errors
- ✅ Can upload profile pictures
- ✅ Can follow/unfollow users
- ✅ Can like/unlike posts

---

## 📚 More Help

- **Full guide:** See `/DEPLOYMENT_GUIDE.md`
- **Backend details:** See `/BACKEND_SUMMARY.md`
- **Test tool:** Open `/test-backend.html` in browser
- **CLI deployment:** Run `./deploy.sh`

---

## 🎯 That's It!

Your backend should now be fully synced and working. If you followed all 3 steps and still have issues, check the logs in Supabase Dashboard.

**Total time:** ~5 minutes ⏱️

---

**Need more help?** Check the detailed troubleshooting in `/DEPLOYMENT_GUIDE.md`
