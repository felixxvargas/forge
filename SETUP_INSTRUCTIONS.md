# Forge Setup Instructions

## Topic Accounts Seeding

All topic accounts have been created in the backend with a seed endpoint. To initialize them in the database:

### 1. Seed Topic Accounts

Call this endpoint once to create all topic accounts in Supabase:

```bash
curl -X POST https://<your-project-id>.supabase.co/functions/v1/make-server-17285bd7/seed/topic-accounts
```

This will create the following accounts:
- @ign (user-ign)
- @gamespot (user-gamespot)
- @pcgamer (user-pcgamer)
- @polygon (user-polygon)
- @kotaku (user-kotaku)
- @eurogamer (user-eurogamer)
- @destructoid (user-destructoid)
- @rockpapershotgun (user-rockpapershotgun)
- @massivelyop@massivelyop.com (user-massivelyop)
- @forge (user-forge)

### 2. Felix Account Setup

To create or verify the felixvgiles@gmail.com account:

**Option A: Sign up through the app**
1. Go to the login page
2. Click "Sign up"
3. Enter:
   - Email: felixvgiles@gmail.com
   - Password: (create a secure password - minimum 8 characters, uppercase, lowercase, number)
   - Complete onboarding to set username to @felix

**Option B: Check if account exists**
Query Supabase auth.users table or use this API endpoint:
```bash
curl https://<your-project-id>.supabase.co/functions/v1/make-server-17285bd7/users/handle/@felix
```

### 3. Google OAuth Setup

Google OAuth requires configuration in your Supabase dashboard. The app is ready but needs OAuth credentials configured.

**Setup Steps:**

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Follow the guide at: https://supabase.com/docs/guides/auth/social-login/auth-google
4. You'll need to:
   - Create a Google Cloud Project
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `https://<your-project-id>.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (for local testing)
   - Copy Client ID and Client Secret to Supabase

**Callback URL Configuration:**
The app uses `/auth/callback` route which is already implemented in `/src/app/pages/AuthCallback.tsx`

**Current Status:**
- ✅ Frontend Google OAuth button implemented
- ✅ Backend handles Google OAuth users automatically
- ✅ Callback route handles OAuth flow
- ⚠️ **Requires Google OAuth credentials in Supabase dashboard**

**Error Handling:**
If Google OAuth is not configured, users will see this helpful message:
"Google sign-in requires setup in Supabase dashboard. Please follow instructions at: https://supabase.com/docs/guides/auth/social-login/auth-google"

## Mock Data Removal

All mock users have been removed from the codebase. The application now only includes:
1. **Topic Accounts** - Gaming media accounts that pull real data from Bluesky
2. **@forge** - The official Forge account
3. **Real Users** - Users who sign up through the app (like @felix)

### Changes Made:
- Removed all mock/fake user accounts
- Removed follower counts from topic accounts (will be calculated from real follows)
- Topic accounts are properly marked with `accountType: 'topic'` in the database
- All posts now come from:
  - Real Bluesky feeds for topic accounts
  - User-created posts through the app

## Testing the App

### 1. First Run
```bash
# Make sure topic accounts are seeded
curl -X POST https://<your-project-id>.supabase.co/functions/v1/make-server-17285bd7/seed/topic-accounts
```

### 2. Create User Account
- Sign up with email/password
- Complete onboarding (interests, follow suggestions, username)
- Username must be unique (e.g., @felix)

### 3. Verify Google OAuth (Optional)
- Configure Google OAuth in Supabase dashboard
- Test sign-in with Google
- Should create account and redirect to onboarding if first time

## Password Requirements

When creating accounts:
- Minimum 8 characters
- Maximum 64 characters  
- At least one uppercase letter
- At least one lowercase letter
- At least one number

## Troubleshooting

### Google OAuth not working
1. Check Supabase Dashboard → Authentication → Providers → Google is enabled
2. Verify Client ID and Client Secret are correct
3. Ensure redirect URIs are properly configured in Google Cloud Console
4. Check browser console for error messages

### Topic accounts showing as @user
- Run the seed endpoint to create profiles in database
- Topic accounts need profiles to display properly in feeds/explore

### Can't sign in with existing account
- Verify email and password are correct
- Check if account exists in Supabase auth.users table
- Look at browser console and network tab for error details

## Admin Operations

### Update User Handle
If a user needs their handle changed:
```bash
curl -X POST https://<your-project-id>.supabase.co/functions/v1/make-server-17285bd7/admin/update-handle \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "newHandle": "@newhandle"}'
```

### Check Handle Availability
```bash
curl https://<your-project-id>.supabase.co/functions/v1/make-server-17285bd7/users/check-handle/@handlename
```

## Database Schema

### User Profile (KV Store)
```
Key: user:{userId}
Value: {
  id: string,
  handle: string,
  displayName: string,
  pronouns?: string,
  bio: string,
  about?: string,
  profilePicture: string,
  email?: string,
  platforms: Platform[],
  platformHandles: Record<Platform, string>,
  showPlatformHandles: Record<Platform, boolean>,
  socialPlatforms: SocialPlatform[],
  socialHandles: Record<SocialPlatform, string>,
  showSocialHandles: Record<SocialPlatform, boolean>,
  gameLists: {
    recentlyPlayed: Game[],
    library: Game[],
    favorites: Game[],
    wishlist: Game[]
  },
  followerCount: number,
  followingCount: number,
  communities: CommunityMembership[],
  displayedCommunities: string[],
  interests: Interest[],
  accountType?: 'topic' | 'user',
  authProvider?: 'email' | 'google',
  createdAt: string
}
```

### Handle Lookup (KV Store)
```
Key: user:handle:{@handle}
Value: userId
```
