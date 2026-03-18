# Completed Updates - March 2026

**Status**: ✅ All completed  
**Date**: March 12-13, 2026

---

## Summary of Major Updates

### 1. IGDB Integration (Replaced MobyGames) ✅
- **Updated**: `/supabase/functions/server/games.tsx`
  - Switched from MobyGames API to IGDB API
  - Added OAuth token fetching for IGDB authentication
  - Updated game data structure to use `igdb_id` instead of `moby_id`
  - Cover art now uses IGDB's high-resolution image URLs
  - Added screenshot support from IGDB

- **Updated**: `/DATABASE_SCHEMA.sql`
  - Changed `moby_id` field to `igdb_id`
  - Updated indexes and comments to reflect IGDB usage

- **Secrets Created**:
  - `IGDB_CLIENT_ID` - IGDB API Client ID
  - `IGDB_CLIENT_SECRET` - IGDB API Client Secret

### 2. Search Bar Moved to Top ✅
- **Updated**: `/src/app/pages/Explore.tsx`
  - Moved search bar from fixed bottom position to top of page
  - No longer covered by mobile on-screen keyboard
  - Maintains same functionality with improved UX

### 3. Example Content Toggle ✅
- **Updated**: `/src/app/pages/Settings.tsx`
  - Added "Show Example Content" toggle in Preferences section
  - Stored in localStorage as `forge-show-example-content`
  - Page refreshes when toggle is changed to apply immediately
  - **Note**: This feature deprecated - all mock data removed

### 4. Interests Management ✅
- **Updated**: `/src/app/pages/Settings.tsx`
  - Removed "Reset Onboarding" option from Developer section
  - Added "Gaming Interests" option in new Preferences section
  - Navigates to `/onboarding?step=interests` to update interests

- **Updated**: `/src/app/pages/Onboarding.tsx`
  - Added support for query parameter `?step=interests`
  - When coming from settings, saves interests and returns to settings
  - Skips full onboarding flow when only updating interests

### 5. Placeholder Profile Pictures ✅
- **Created**: `/src/app/components/ProfileAvatar.tsx`
  - New component that generates profile avatars
  - Shows first letter of username when no profile picture exists
  - Uses accessible background colors (good contrast with white text)
  - Consistent color for same username (hash-based)
  - Supports multiple sizes: sm, md, lg, xl

### 6. Bluesky Integration for Topic Accounts ✅
- **Updated**: `/src/app/pages/Explore.tsx`
  - Added real Bluesky post fetching for gaming media accounts
  - Topic accounts: IGN, GameSpot, PC Gamer, Polygon, Kotaku, Eurogamer, etc.
  - Posts pulled from actual Bluesky accounts
  - Displays with platform attribution (Bluesky icon)

- **Created**: `/src/app/utils/bluesky.ts`
  - Topic account mappings to Bluesky handles
  - Includes caching to avoid excessive API calls (5-minute TTL)
  - Public API integration (no authentication required)

### 7. Removed Example User Data ✅
- **Updated**: `/src/app/data/mockData.ts`
  - Replaced all mock users with minimal placeholders
  - currentUser now has empty fields filled from backend
  - No game lists, platforms, or social accounts by default
  - Only topic accounts and real users remain

- **Updated**: `/src/app/pages/Login.tsx`
  - Removed fake credential bypass
  - Google OAuth now shows proper error message requiring setup
  - Email/password authentication required for all accounts

### 8. Fixed Platform Icons ✅
- **Updated**: `/src/app/components/PlatformIcon.tsx`
  - Updated all platform SVG paths with correct Material Design Icons paths
  - Fixed: Steam, PlayStation, Nintendo, Xbox, Battle.net, Riot, PC, Epic, EA, GOG, Ubisoft, Rockstar
  - Icons now render correctly with proper paths

### 9. Additional Features Completed
- **@mentions with autocomplete** ✅
  - Real-time user search while typing @
  - Clickable mention links
  - Highlights mentioned users

- **Mute posts functionality** ✅
  - Separate from muting users
  - Mutes specific threads to stop notifications
  - Toggle on/off per post

- **Admin panel database seeding** ✅
  - One-click topic account creation
  - Seeds @forge account
  - Creates @forge → @felix follow relationship
  - Posts welcome message

- **Navigation restructure** ✅
  - Messages moved to bottom nav
  - Notifications moved to header
  - Improved mobile UX

- **Toast notification settings** ✅
  - In-app toggle for toast notifications
  - Persists across sessions
  - Located in Settings

---

## Configuration Required

### IGDB API Keys (Already Configured) ✅
1. Visit https://api.igdb.com/
2. Create a Twitch Developer account
3. Register your application
4. Secrets added:
   - `IGDB_CLIENT_ID`: Configured ✅
   - `IGDB_CLIENT_SECRET`: Configured ✅

### Google OAuth (Optional)
Requires manual configuration in Supabase dashboard
See: `/docs/SETUP_INSTRUCTIONS.md` for details

---

## Testing Checklist

- [x] IGDB game artwork fetching works
- [x] Search bar stays visible on mobile keyboards
- [x] Interests can be updated from settings
- [x] Profile avatars generate correctly
- [x] Bluesky posts load for Topic accounts
- [x] Login requires actual credentials
- [x] Platform icons render correctly
- [x] @mentions with autocomplete works
- [x] Mute posts functionality works
- [x] Admin panel seeding works
- [x] Messages in bottom nav
- [x] Toast notification toggle works

---

## Notes

- All changes maintain backward compatibility with existing data
- Settings changes apply immediately
- Bluesky integration uses public API (no authentication required)
- Profile avatars automatically generate for new accounts without photos
- IGDB provides high-quality game artwork and metadata
- All mock data removed - only real users and topic accounts remain

---

**Part of the Forge update series** - See also: COMPLETED_FEATURES.md, COMPLETED_FIXES_PART2.md, COMPLETED_FIXES_PART3.md
