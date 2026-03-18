# Forge Setup Instructions

**Last Updated**: March 13, 2026

---

## Quick Start

### Option 1: Use Admin Panel (Recommended)
1. Navigate to `/admin` in the app
2. Click "Seed Database" button
3. Wait for success confirmation
4. Database is now initialized with all topic accounts, @forge account, and welcome post

### Option 2: Manual API Call
```bash
curl -X POST https://xmxeafjpscgqprrreulh.supabase.co/functions/v1/make-server-17285bd7/seed/topic-accounts
```

---

## Topic Accounts Seeding

The seed endpoint creates all topic accounts in one operation.

### What Gets Created:

**Gaming Media Accounts** (from Bluesky):
- @ign (user-ign) - IGN
- @gamespot (user-gamespot) - GameSpot
- @pcgamer (user-pcgamer) - PC Gamer
- @polygon (user-polygon) - Polygon
- @kotaku (user-kotaku) - Kotaku
- @eurogamer (user-eurogamer) - Eurogamer
- @destructoid (user-destructoid) - Destructoid
- @rockpapershotgun (user-rockpapershotgun) - Rock Paper Shotgun
- @massivelyop (user-massivelyop) - MassivelyOP

**Platform Accounts**:
- @forge (user-forge) - Official Forge account
  - Purple profile picture
  - Bio: "The official Forge account. Welcome to the community!"
  - Follows @felix automatically
  - Posts welcome message

### What the Seed Does:
1. Creates all topic account profiles with proper metadata
2. Links Bluesky handles for real-time post integration
3. Creates @forge account with branding
4. Establishes @forge → @felix follow relationship
5. Posts welcome message from @forge

---

## User Account Setup

### Create Your Account

**Via App (Recommended)**:
1. Go to login page
2. Click "Sign up"
3. Enter email and password (see requirements below)
4. Complete onboarding:
   - Select gaming interests
   - Follow suggested users
   - Create unique @handle

**Via Google OAuth**:
1. Click "Continue with Google"
2. Authorize with Google account
3. Complete onboarding if first time
4. Profile created automatically

### Password Requirements
- Minimum 8 characters
- Maximum 64 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Example: Felix Account
Email: `felixvgiles@gmail.com`  
Handle: `@felix`  
Created via: Email/password sign up

**Check if exists**:
```bash
curl https://xmxeafjpscgqprrreulh.supabase.co/functions/v1/make-server-17285bd7/users/handle/@felix
```

---

## Google OAuth Setup

Google OAuth is **optional** but requires Supabase dashboard configuration.

### Setup Steps:

1. **Go to Supabase Dashboard**  
   - Navigate to Authentication → Providers
   - Find "Google" in the providers list

2. **Create Google Cloud Project**
   - Visit [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing
   - Enable Google+ API

3. **Create OAuth 2.0 Credentials**
   - Go to APIs & Services → Credentials
   - Create OAuth 2.0 Client ID
   - Application type: Web application
   
4. **Configure Redirect URIs**
   Add these URLs:
   ```
   https://xmxeafjpscgqprrreulh.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback (for local testing)
   ```

5. **Copy Credentials to Supabase**
   - Copy Client ID and Client Secret from Google Cloud
   - Paste into Supabase Google provider settings
   - Save changes

### Current Status:
- ✅ Frontend: Google OAuth button implemented
- ✅ Backend: OAuth user handling complete
- ✅ Callback route: `/auth/callback` handles OAuth flow
- ⚠️ **Requires manual configuration in Supabase dashboard**

### Without OAuth Configuration:
Users will see a helpful error message with setup instructions.

**Full Guide**: https://supabase.com/docs/guides/auth/social-login/auth-google

---

## Database Architecture

### Data Storage
- **Supabase PostgreSQL**: Authentication (auth.users table)
- **Key-Value Store**: All app data (profiles, posts, follows, etc.)
- **Supabase Storage**: Profile pictures and post images

### Key-Value Store Keys

**User Profile**:
```
Key: user:{userId}
Value: Full user profile object
```

**Handle Lookup**:
```
Key: user:handle:{@handle}
Value: userId
```

**Posts**:
```
Key: post:{postId}
Value: Post object
```

**Follows**:
```
Key: follow:{followerId}:{followingId}
Value: Follow relationship data
```

**Likes**:
```
Key: like:{userId}:{postId}
Value: Like data
```

**Blocks**:
```
Key: block:{userId}:{blockedId}
Value: Block data
```

**Mutes (Users)**:
```
Key: mute:{userId}:{mutedId}
Value: Mute data
```

**Mutes (Posts)**:
```
Key: mute-post:{userId}:{postId}
Value: Post mute data
```

See [DATABASE_SCHEMA.sql](/docs/DATABASE_SCHEMA.sql) for full schema.

---

## Testing the App

### 1. First-Time Setup
```bash
# Seed the database (via admin panel or API)
# Then create your account and complete onboarding
```

### 2. Test User Account
- Sign up with email/password
- Complete all onboarding steps
- Create unique @handle
- Follow topic accounts
- Create first post

### 3. Test Features
- [ ] Create post with text
- [ ] Create post with image
- [ ] Like/unlike posts
- [ ] Repost posts
- [ ] Follow/unfollow users
- [ ] Edit profile
- [ ] Upload profile picture
- [ ] Join community
- [ ] Search users
- [ ] Toggle dark/light mode

### 4. Verify Integrations
- [ ] Real Bluesky posts appear in feed
- [ ] Topic account profile pictures load
- [ ] IGDB game artwork displays
- [ ] @mentions work and are clickable
- [ ] Share functionality works

---

## Admin Operations

### Via Admin Panel (`/admin`)

**Check User**:
- Enter email to view auth and profile status
- See if onboarding is complete
- Check profile data

**Update Password**:
- Reset password for any user email
- Useful for account recovery

**Update Profile**:
- Change display name or handle
- Fix incorrect profile data

**Complete Onboarding**:
- Mark onboarding as complete
- Fix stuck onboarding states

**Seed Database**:
- One-click topic account creation
- Initializes @forge and welcome post

### Via API

**Check Handle Availability**:
```bash
curl https://xmxeafjpscgqprrreulh.supabase.co/functions/v1/make-server-17285bd7/users/check-handle/@newhandle
```

**Update User Handle** (via admin):
```bash
curl -X POST https://xmxeafjpscgqprrreulh.supabase.co/functions/v1/make-server-17285bd7/admin/update-profile \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "handle": "@newhandle"}'
```

---

## Troubleshooting

### Google OAuth Not Working
1. Check Supabase Dashboard → Authentication → Providers → Google is enabled
2. Verify Client ID and Client Secret are correct
3. Ensure redirect URIs match exactly in Google Cloud Console
4. Check browser console for detailed error messages
5. Test with a different Google account

### Topic Accounts Not Showing
- Run seed endpoint via admin panel or API
- Check browser console for errors
- Verify edge function is warm (run `deploymentCheck()`)
- Clear localStorage and refresh

### Can't Sign In
- Verify email and password are correct
- Check if account exists in Supabase auth.users table
- Look at browser console and network tab for errors
- Try password reset via admin panel
- Check if onboarding is stuck (use admin panel to complete)

### Posts Not Creating
- Edge function might be cold - run `deploymentCheck()` first
- Check for 404 errors in network tab
- Verify access token is valid (re-login if needed)
- Check browser console for errors

### Profile Picture Upload Fails
- Edge function needs to be warm
- Check Supabase Storage bucket exists
- Verify file size is under limit (5MB recommended)
- Check network tab for detailed error

### Real-Time Bluesky Posts Not Appearing
- Bluesky API uses 5-minute cache
- Wait a few minutes and refresh
- Check if topic accounts are seeded
- Verify Bluesky handles are correct

---

## Environment Variables

### Already Configured Secrets:
- ✅ `SUPABASE_URL` - Supabase project URL
- ✅ `SUPABASE_ANON_KEY` - Public anonymous key
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)
- ✅ `SUPABASE_DB_URL` - Database connection string
- ✅ `IGDB_CLIENT_ID` - IGDB API client ID
- ✅ `IGDB_CLIENT_SECRET` - IGDB API client secret

**Note**: These are configured in Supabase and do not need manual setup.

---

## Mock Data Removal

All mock/fake users have been removed. The app now contains only:

### Real Data:
1. **Topic Accounts** - Gaming media from Bluesky (IGN, Polygon, etc.)
2. **@forge** - Official Forge account
3. **Real Users** - Accounts created via sign up (@felix, etc.)

### What Was Removed:
- ❌ Mock users (@gamebeez, @rpgmaster, etc.)
- ❌ Fake follower counts
- ❌ Hardcoded posts
- ❌ Placeholder profile pictures

### What's Real:
- ✅ Bluesky posts from gaming media
- ✅ User-created posts
- ✅ Real profile pictures via Supabase Storage
- ✅ Actual follow relationships
- ✅ Live IGDB game data

---

## Next Steps After Setup

1. **Seed Database** - Use admin panel to initialize
2. **Create Account** - Sign up with email or Google
3. **Complete Onboarding** - Select interests and create handle
4. **Follow Topic Accounts** - Get gaming news in your feed
5. **Create First Post** - Share your gaming thoughts
6. **Join Communities** - Find your gaming groups
7. **Build Game Library** - Add games via IGDB search

---

## Support Resources

- **Project Spec**: [PROJECT_SPEC.md](/docs/PROJECT_SPEC.md)
- **Development Guidelines**: [Guidelines.md](/docs/Guidelines.md)
- **Deployment Status**: [DEPLOYMENT_STATUS.md](/docs/DEPLOYMENT_STATUS.md)
- **Supabase Docs**: https://supabase.com/docs
- **React Router Docs**: https://reactrouter.com

---

**Ready to start?** Visit `/admin` and click "Seed Database" to initialize! 🚀
