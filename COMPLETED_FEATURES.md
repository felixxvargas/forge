# Forge - Completed Features

## ✅ Bluesky Integration (COMPLETE)
- Created `/src/app/utils/bluesky.ts` with API utilities
- Created `/src/app/hooks/useBlueskyData.ts` hook for fetching Bluesky data
- Backend endpoints:
  - `GET /bluesky/profile/:handle` - Fetches Bluesky profile (avatar, banner, etc.)
  - `GET /bluesky/posts/:handle` - Fetches recent posts with images
- Profile page now uses real Bluesky avatars for Topic accounts
- Caching system (5min TTL) to reduce API calls
- Mapped Topic account IDs to Bluesky handles

## ✅ Interest Tags in About Tab (COMPLETE)
- Added `interests` field to User interface
- Displays interests grouped by category (Genre, Platform, Playstyle)
- Clean chip-style UI in Profile → About tab

## ✅ Onboarding Chip Styling (COMPLETE)
- Changed from solid neon green to subtle accent border
- Selected: `bg-accent/20 text-accent border-2 border-accent`
- Unselected: `bg-card border-2 border-transparent`

## ✅ OSK Toolbar Positioning (COMPLETE)
- Added helpful tip text in NewPost toolbar
- Made toolbar responsive for desktop

## ✅ Previous Polish Items (COMPLETE)
- Discord in social platforms ✅
- Platform tags visual consistency ✅
- Share button sizing (w-5 h-5) ✅
- Quill icon for Write Post button ✅
- Remove "Extended Description" text ✅
- Prevent double-posting ✅
- Profile picture - images only ✅
- K/M number formatting ✅

## 🚧 Next Up (In Progress)
- Follow button UI improvements
- Search functionality
- Notifications improvements
- Messages improvements
- Settings improvements
- Game artwork from MobyGames
