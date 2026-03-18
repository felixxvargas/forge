# Google OAuth Troubleshooting Guide

## Current Status
✅ Frontend code is ready
✅ Backend handles Google OAuth users
✅ Callback route is implemented
⚠️ Requires proper configuration in Supabase

## Common Issues & Solutions

### Issue 1: "Provider is not enabled" Error

**Cause**: Google OAuth provider not properly configured in Supabase

**Solution**:
1. Go to Supabase Dashboard → Authentication → Providers
2. Find "Google" in the list
3. Toggle it ON
4. Click "Save"

### Issue 2: Redirect URI Mismatch

**Cause**: The redirect URL in Google Cloud Console doesn't match Supabase's callback URL

**Required Redirect URIs** (add BOTH):
```
https://<your-project-id>.supabase.co/auth/v1/callback
http://localhost:3000/auth/callback
```

**Steps**:
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Navigate to APIs & Services → Credentials
3. Click on your OAuth 2.0 Client ID
4. Under "Authorized redirect URIs", add both URLs above
5. Click "Save"

### Issue 3: Site URL Not Configured

**Cause**: Supabase Site URL is not set correctly

**Solution**:
1. Go to Supabase Dashboard → Settings → URL Configuration
2. Set "Site URL" to your app's URL:
   - Development: `http://localhost:3000`
   - Production: Your production URL
3. Add both to "Redirect URLs" list
4. Click "Save"

### Issue 4: OAuth Credentials Not in Supabase

**Cause**: Client ID and Secret not added to Supabase

**Solution**:
1. Get your credentials from Google Cloud Console:
   - Go to APIs & Services → Credentials
   - Copy "Client ID" and "Client secret"
2. In Supabase Dashboard → Authentication → Providers → Google:
   - Paste "Authorized Client ID"
   - Paste "Client Secret (for OAuth)"
3. Click "Save"

### Issue 5: "Invalid OAuth Callback URL" Error

**Cause**: Using wrong callback URL in the app code

**Current Implementation**:
```typescript
// In Login.tsx
redirectTo: `${window.location.origin}/auth/callback`
```

This should automatically use:
- `http://localhost:3000/auth/callback` (development)
- `https://yourdomain.com/auth/callback` (production)

**Verify**:
- Check browser console for the logged redirect URL
- Make sure it matches one of the authorized URLs in Google Cloud Console

## Complete Setup Checklist

### Step 1: Google Cloud Console
- [ ] Create a project (or use existing)
- [ ] Enable Google+ API
- [ ] Create OAuth 2.0 credentials
- [ ] Add authorized redirect URIs:
  - [ ] `https://<project-id>.supabase.co/auth/v1/callback`
  - [ ] `http://localhost:3000/auth/callback`
- [ ] Copy Client ID and Client Secret

### Step 2: Supabase Dashboard  
- [ ] Go to Authentication → Providers
- [ ] Enable Google provider
- [ ] Add Client ID
- [ ] Add Client Secret
- [ ] Save changes
- [ ] Go to Settings → URL Configuration
- [ ] Set Site URL
- [ ] Add redirect URLs
- [ ] Save changes

### Step 3: Test
- [ ] Open app and click "Continue with Google"
- [ ] Check browser console for redirect URL
- [ ] Verify you're redirected to Google login
- [ ] After login, verify redirect back to `/auth/callback`
- [ ] Verify user is logged in and sent to feed or onboarding

## Debugging Steps

### 1. Check Browser Console
Look for these log messages:
```
Initiating Google OAuth with redirect to: http://localhost:3000/auth/callback
Google OAuth initiated successfully
```

### 2. Check Network Tab
1. Open DevTools → Network
2. Click Google login button
3. Look for requests to:
   - `auth/v1/authorize` (Supabase)
   - `accounts.google.com` (Google login)
4. Check for error responses

### 3. Check Supabase Logs
1. Go to Supabase Dashboard → Logs
2. Filter by "Auth"
3. Look for OAuth-related errors

### 4. Common Error Messages

**"OAuth provider not enabled"**
→ Enable Google in Supabase Dashboard

**"redirect_uri_mismatch"**
→ Add correct redirect URI to Google Cloud Console

**"unauthorized_client"**
→ Check Client ID and Secret are correct

**"access_denied"**
→ User denied permission or account issue

## Testing OAuth Flow

### Manual Test:
1. Click "Continue with Google" button
2. Should redirect to Google login
3. Login with Google account
4. Grant permissions
5. Should redirect to `/auth/callback`
6. Should then redirect to either:
   - `/splash` (new user, needs onboarding)
   - `/feed` (returning user with completed profile)

### Expected Console Logs:
```
Initiating Google OAuth with redirect to: http://localhost:3000/auth/callback
Google OAuth initiated successfully
// ... redirect to Google ...
// ... redirect back ...
Auth callback handling...
User session found
Profile loaded: { handle: '@user', ... }
```

## Advanced: Custom Domain Setup

If using a custom domain:

1. Update Site URL in Supabase to your domain
2. Add your domain to Google Cloud Console authorized origins:
   ```
   https://yourdomain.com
   ```
3. Add your callback to authorized redirect URIs:
   ```
   https://yourdomain.com/auth/callback
   ```

## Still Not Working?

### Double-check these:
1. Google Cloud Console project has OAuth consent screen configured
2. Your email is added as a test user (if app is in testing mode)
3. Supabase project is not paused
4. No browser extensions blocking popups/redirects
5. Cookies are enabled in browser
6. Not using incognito/private mode (can cause issues)

### Get More Help:
- Check Supabase auth logs in dashboard
- Check Google Cloud Console OAuth consent screen status
- Try different browser
- Clear cookies and cache
- Check if other OAuth providers work (to isolate issue)
