# 🔍 How to Check Deployment Status

**Last Updated**: March 13, 2026  
**Current Status**: Deployed ✅ (with cold start issues)

---

## Quick Health Check

### Method 1: Browser Test
Open this URL in your browser:
```
https://xmxeafjpscgqprrreulh.supabase.co/functions/v1/make-server-17285bd7/health
```

**Responses:**
- `{"status": "ok"}` → Function is deployed and warm ✅
- `404 Not Found` → Function is cold (wait 5 seconds and try again) ⚠️
- Connection error → Network or Supabase issue ❌

### Method 2: Console Command
1. Open Forge app
2. Press F12 to open DevTools
3. Go to Console tab
4. Run this command:
```javascript
deploymentCheck()
```

**Expected Output:**
```
🚀 Forge Deployment Check
━━━━━━━━━━━━━━━━━━━━━━━━

✅ Health check passed
✅ Topic accounts loaded
✅ Following IDs loaded
✅ All core endpoints working

━━━━━━━━━━━━━━━━━━━━━━━━
✅ Deployment is healthy!
```

---

## What to Check If Things Aren't Working

### 1. Browser Console (F12)
Look for error messages:
- **404 errors**: Function is cold, run `deploymentCheck()` to warm it up
- **401 errors**: Not signed in or session expired
- **Failed to fetch**: Network issue or CORS problem

### 2. Network Tab (DevTools)
1. Open DevTools → Network
2. Filter by "Fetch/XHR"
3. Look for requests to `supabase.co/functions/v1/make-server-17285bd7`
4. Check status codes:
   - **200**: Success ✅
   - **401**: Unauthorized (need to sign in)
   - **404**: Function cold or endpoint doesn't exist
   - **500**: Server error

### 3. Application Storage
Check localStorage for cached data:
1. DevTools → Application → Local Storage
2. Look for keys starting with `forge-`
3. If you see old data, clear it:
```javascript
localStorage.clear()
location.reload()
```

---

## Understanding Deployment States

### ✅ Fully Deployed (Warm)
- All endpoints return 200 status
- Health check returns `{"status": "ok"}`
- `deploymentCheck()` shows all green
- Features work immediately

### ⚠️ Deployed but Cold
- First requests return 404
- Subsequent requests work fine
- Need to warm up with `deploymentCheck()`
- Happens after ~5-10 minutes of inactivity

### ❌ Not Deployed
- All requests return 404
- Health check fails consistently
- `deploymentCheck()` function not available
- Need to trigger deployment

---

## Triggering a Deployment

### If Using Figma Make:
1. Look for deployment status indicator in UI
2. Find "Deploy", "Build", or "Publish" button
3. Click it and wait 1-2 minutes
4. Refresh your app and test again

### If Using Supabase Dashboard:
1. Go to Edge Functions section
2. Find `make-server-17285bd7` function
3. Click "Deploy" or "Redeploy"
4. Wait for deployment to complete
5. Test health endpoint

---

## Common Deployment Issues

### Issue: "404 Not Found" on All Endpoints

**Cause**: Function is cold or not deployed

**Solution**:
1. Run `deploymentCheck()` in console
2. Wait 5-10 seconds
3. Try action again
4. If still failing, function may not be deployed

### Issue: "401 Unauthorized"

**Cause**: Not signed in or session expired

**Solution**:
1. Sign in again
2. Check localStorage for `forge-access-token`
3. If missing, sign in to get new token

### Issue: Features Work Sometimes

**Cause**: Cold start behavior

**Solution**:
- Run `deploymentCheck()` before using app
- Keep app active (prevents cold starts)
- Accept 5-10 second warmup time

---

## Testing Individual Endpoints

### Test Topic Accounts:
```javascript
fetch('https://xmxeafjpscgqprrreulh.supabase.co/functions/v1/make-server-17285bd7/users/topic-accounts')
  .then(r => r.json())
  .then(console.log)
```

### Test Authentication:
```javascript
// Replace TOKEN with your access token from localStorage
fetch('https://xmxeafjpscgqprrreulh.supabase.co/functions/v1/make-server-17285bd7/auth/me', {
  headers: { 'Authorization': 'Bearer TOKEN' }
})
  .then(r => r.json())
  .then(console.log)
```

### Test Health:
```javascript
fetch('https://xmxeafjpscgqprrreulh.supabase.co/functions/v1/make-server-17285bd7/health')
  .then(r => r.json())
  .then(console.log)
```

---

## Expected Behavior After Deployment

### On App Load:
1. Request topic accounts (may 404 if cold)
2. Check authentication status
3. Load user profile
4. Load following list
5. Load feed posts

### If Cold Start:
1. First request fails with 404
2. App shows cached data or empty state
3. Run `deploymentCheck()` to warm up
4. Retry failed actions
5. Everything works normally

### When Warm:
1. All requests succeed immediately
2. No 404 errors
3. Fast response times (<500ms)
4. Full functionality available

---

## Monitoring Deployment Health

### Regular Checks:
- Visit health endpoint periodically
- Run `deploymentCheck()` if app inactive
- Monitor browser console for errors
- Check Supabase dashboard for function stats

### Signs of Healthy Deployment:
- ✅ Health endpoint returns 200
- ✅ No 404 errors in console
- ✅ Features work without warmup
- ✅ Fast API response times

### Signs of Issues:
- ❌ Consistent 404 errors
- ❌ Health endpoint always fails
- ❌ `deploymentCheck()` unavailable
- ❌ Long warmup times (>30 seconds)

---

## Additional Resources

- **Deployment Status**: [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md)
- **Deployment Help**: [DEPLOYMENT_HELP.md](DEPLOYMENT_HELP.md)
- **Setup Instructions**: [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)
- **Project Spec**: [PROJECT_SPEC.md](PROJECT_SPEC.md)

---

**TL;DR**: Run `deploymentCheck()` in console. If it works, deployment is good. If not, wait 10 seconds and try again. 🚀
