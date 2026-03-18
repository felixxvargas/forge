# Google OAuth Troubleshooting Guide

**Last Updated**: March 13, 2026

---

## Current Status
✅ Frontend code is ready  
✅ Backend handles Google OAuth users  
✅ Callback route is implemented (`/auth/callback`)  
⚠️ Requires proper configuration in Supabase Dashboard

---

## Quick Setup Guide

### Required Steps:
1. **Enable Google OAuth in Supabase** → Authentication → Providers → Google
2. **Create Google Cloud Project** → https://console.cloud.google.com
3. **Add OAuth Credentials** → Copy Client ID and Secret to Supabase
4. **Configure Redirect URIs** → Add Supabase callback URL to Google Cloud

**Detailed guide**: https://supabase.com/docs/guides/auth/social-login/auth-google

---

## Common Issues & Solutions

### Issue 1: "Provider is not enabled" Error

**Cause**: Google OAuth provider not properly configured in Supabase

**Solution**:
1. Go to Supabase Dashboard → Authentication → Providers
2. Find "Google" in the list
3. Toggle it ON
4. Add Client ID and Client Secret (from Google Cloud Console)
5. Click "Save"

---

### Issue 2: Redirect URI Mismatch

**Cause**: The redirect URL in Google Cloud Console doesn't match Supabase's callback URL

**Required Redirect URIs** (add BOTH):
```
https://xmxeafjpscgqprrreulh.supabase.co/auth/v1/callback
http://localhost:3000/auth/callback
```

**Steps**:
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Navigate to APIs & Services → Credentials
3. Click on your OAuth 2.0 Client ID
4. Under "Authorized redirect URIs", add both URLs above
5. Click "Save"

**Note**: The first URL is Supabase's auth callback, the second is for local development.

---

### Issue 3: Site URL Not Configured

**Cause**: Supabase Site URL is not set correctly

**Solution**:
1. Go to Supabase Dashboard → Settings → URL Configuration
2. Set "Site URL" to your app's URL:
   - Development: `http://localhost:3000`
   - Production: Your production URL (from Figma Make)
3. Add both to "Redirect URLs" list
4. Click "Save"

---

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

---

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

---

## Complete Setup Checklist

### Step 1: Google Cloud Console
- [ ] Create a project (or use existing)
- [ ] Enable Google+ API (or Google Identity Services)
- [ ] Create OAuth 2.0 credentials
- [ ] Set Application type to "Web application"
- [ ] Add authorized redirect URIs:
  - [ ] `https://xmxeafjpscgqprrreulh.supabase.co/auth/v1/callback`
  - [ ] `http://localhost:3000/auth/callback` (optional, for local dev)
- [ ] Copy Client ID and Client Secret

### Step 2: Supabase Dashboard  
- [ ] Go to Authentication → Providers
- [ ] Enable Google provider
- [ ] Add Client ID (from Google Cloud Console)
- [ ] Add Client Secret (from Google Cloud Console)
- [ ] Save changes
- [ ] Go to Settings → URL Configuration
- [ ] Set Site URL to your app URL
- [ ] Add redirect URLs (if needed)
- [ ] Save changes

### Step 3: Test
- [ ] Open app and click "Continue with Google"
- [ ] Check browser console for redirect URL
- [ ] Verify you're redirected to Google login
- [ ] After login, verify redirect back to `/auth/callback`
- [ ] Verify user is logged in and sent to feed or onboarding

---

## Debugging Steps

### 1. Check Browser Console
Look for these log messages:
```
Initiating Google OAuth with redirect to: http://localhost:3000/auth/callback
Google OAuth initiated successfully
```

If you see errors, they'll indicate the problem (provider not enabled, redirect mismatch, etc.)

### 2. Check Network Tab
1. Open DevTools → Network
2. Click Google login button
3. Look for requests to:
   - `auth/v1/authorize` (Supabase)
   - `accounts.google.com` (Google login)
4. Check for error responses (400, 401, 403, etc.)

### 3. Check Supabase Logs
1. Go to Supabase Dashboard → Logs
2. Filter by "Auth"
3. Look for OAuth-related errors
4. Check timestamp to match your test attempt

### 4. Common Error Messages

**"OAuth provider not enabled"**  
→ Enable Google in Supabase Dashboard → Authentication → Providers

**"redirect_uri_mismatch"**  
→ Add correct redirect URI to Google Cloud Console (exact match required)

**"unauthorized_client"**  
→ Check Client ID and Secret are correct in Supabase

**"access_denied"**  
→ User denied permission or Google account issue

**"invalid_client"**  
→ Client ID or Secret is incorrect

---

## Testing OAuth Flow

### Expected Flow:
1. User clicks "Continue with Google" button
2. App redirects to Google login (`accounts.google.com`)
3. User logs in with Google account
4. User grants permissions
5. Google redirects to Supabase (`/auth/v1/callback`)
6. Supabase processes auth and redirects to app (`/auth/callback`)
7. App checks if profile exists:
   - **New user**: Redirect to `/splash` (onboarding)
   - **Returning user**: Redirect to `/feed`

### Expected Console Logs:
```
Initiating Google OAuth with redirect to: http://localhost:3000/auth/callback
Google OAuth initiated successfully
// ... redirect to Google ...
// ... redirect back ...
Auth callback handling...
User session found
Profile exists: true/false
Redirecting to: /feed or /splash
```

---

## Advanced: Custom Domain Setup

If using a custom domain (not Figma Make default):

1. Update Site URL in Supabase to your domain
2. Add your domain to Google Cloud Console authorized origins:
   ```
   https://yourdomain.com
   ```
3. Add your callback to authorized redirect URIs:
   ```
   https://yourdomain.com/auth/callback
   ```
4. Update both Supabase redirect URLs and Google Cloud redirect URIs

---

## Still Not Working?

### Double-check these:
- [ ] Google Cloud Console project has OAuth consent screen configured
- [ ] Your email is added as a test user (if app is in testing mode)
- [ ] App is published (or you're a test user) in OAuth consent screen
- [ ] Supabase project is not paused
- [ ] No browser extensions blocking popups/redirects
- [ ] Cookies are enabled in browser
- [ ] Not using incognito/private mode (can cause session issues)
- [ ] Correct project selected in Google Cloud Console
- [ ] Client ID/Secret copied correctly (no extra spaces)

### Get More Help:
- Check Supabase auth logs in dashboard for detailed errors
- Check Google Cloud Console OAuth consent screen status
- Try different browser to rule out extension conflicts
- Clear cookies and cache
- Test with a different Google account
- Check if email/password login works (to isolate OAuth issue)

---

## Additional Resources

- **Supabase OAuth Guide**: https://supabase.com/docs/guides/auth/social-login/auth-google
- **Google Cloud Console**: https://console.cloud.google.com
- **OAuth 2.0 Playground**: https://developers.google.com/oauthplayground/ (for testing)

---

## Notes

- Google OAuth is **optional** - email/password authentication works without it
- If not configured, users see a helpful error message with setup link
- OAuth consent screen must be configured in Google Cloud Console
- Test users can be added in OAuth consent screen during development
- Production apps require verification from Google (can take several days)

---

**Need help?** Check the [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) for more details.
