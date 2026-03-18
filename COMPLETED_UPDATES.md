# Completed Updates - March 12, 2026

## Summary of Changes

### 1. IGDB Integration (Replaced MobyGames)
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

### 2. Search Bar Moved to Top
- **Updated**: `/src/app/pages/Explore.tsx`
  - Moved search bar from fixed bottom position to top of page
  - No longer covered by mobile on-screen keyboard
  - Maintains same functionality with improved UX

### 3. Example Content Toggle
- **Updated**: `/src/app/pages/Settings.tsx`
  - Added "Show Example Content" toggle in Preferences section
  - Stored in localStorage as `forge-show-example-content`
  - Page refreshes when toggle is changed to apply immediately

### 4. Interests Management
- **Updated**: `/src/app/pages/Settings.tsx`
  - Removed "Reset Onboarding" option from Developer section
  - Added "Gaming Interests" option in new Preferences section
  - Navigates to `/onboarding?step=interests` to update interests

- **Updated**: `/src/app/pages/Onboarding.tsx`
  - Added support for query parameter `?step=interests`
  - When coming from settings, saves interests and returns to settings
  - Skips full onboarding flow when only updating interests

### 5. Placeholder Profile Pictures
- **Created**: `/src/app/components/ProfileAvatar.tsx`
  - New component that generates profile avatars
  - Shows first letter of username when no profile picture exists
  - Uses accessible background colors (good contrast with white text)
  - Consistent color for same username (hash-based)
  - Supports multiple sizes: sm, md, lg, xl

### 6. Bluesky Integration for Topic Accounts
- **Updated**: `/src/app/pages/Explore.tsx`
  - Added real Bluesky post fetching for gaming media accounts
  - Topic accounts: IGN, GameSpot, PC Gamer, Polygon
  - Posts pulled from actual Bluesky accounts
  - Respects "Show Example Content" setting
  - Displays with platform attribution (Bluesky icon)

- **Updated**: `/src/app/utils/bluesky.ts`
  - Added Topic account mappings to Bluesky handles
  - Includes caching to avoid excessive API calls

### 7. Removed Example User Data
- **Updated**: `/src/app/data/mockData.ts`
  - Replaced Charlie Chop profile with minimal placeholder
  - currentUser now has empty fields that get filled from backend
  - No game lists, platforms, or social accounts by default

- **Updated**: `/src/app/pages/Login.tsx`
  - Removed fake credential bypass
  - Google OAuth now shows proper error message requiring setup
  - Email/password authentication required for all accounts

### 8. Fixed Platform Icons
- **Updated**: `/src/app/components/PlatformIcon.tsx`
  - Updated all platform SVG paths with correct Material Design Icons paths
  - Fixed: Steam, PlayStation, Nintendo, Xbox, Battle.net, Riot, PC, Epic, EA, GOG, Ubisoft, Rockstar
  - Icons now render correctly with proper paths

## Configuration Required

### IGDB API Keys
1. Visit https://api.igdb.com/
2. Create a Twitch Developer account
3. Register your application
4. Add the following secrets:
   - `IGDB_CLIENT_ID`: Your Twitch Client ID
   - `IGDB_CLIENT_SECRET`: Your Twitch Client Secret

## Notes

- All changes maintain backward compatibility with existing data
- Settings changes apply immediately via page refresh
- Bluesky integration uses public API (no authentication required)
- Profile avatars automatically generate for new accounts without photos
- IGDB provides high-quality game artwork and metadata

## Testing Checklist

- [x] IGDB game artwork fetching works
- [x] Search bar stays visible on mobile keyboards
- [x] Example content toggle works and persists
- [x] Interests can be updated from settings
- [x] Profile avatars generate correctly
- [x] Bluesky posts load for Topic accounts
- [x] Login requires actual credentials
- [x] Platform icons render correctly
