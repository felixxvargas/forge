# Fixes In Progress

## ✅ COMPLETED

### 1. Interests Page from Settings
- ✅ Fixed: Now skips splash animation and username screen when accessed via Settings
- ✅ Navigates directly to Interests screen and returns to Settings after saving

### 2. NewPost Page
- ✅ Removed "Tap outside keyboard to close" text from bottom toolbar

### 3. Admin Panel & Settings
- ✅ Removed "Review Submissions" from Settings
- ✅ Added "Review Indie Game Submissions" button to Admin panel Quick Actions

### 4. Explore Page Icons
- Users tab currently uses `Users` icon
- Groups tab uses `UsersRound` icon
- **Note:** These ARE different icons already - Users is multiple person silhouettes, UsersRound is people in a circle. This should be sufficiently differentiated.

---

## 🔄 STILL TODO (Remaining Issues)

### HIGH PRIORITY (Blocking Functionality)

#### 1. Following Error
**Issue:** Following serves an error (401/404)
**Status:** Needs backend deployment to work
**Files to check:** 
- `/src/app/components/FollowButton.tsx`
- `/src/app/utils/api.ts` (followAPI)
- Backend endpoint: `/users/:userId/follow`

#### 2. Posting doesn't work for @felix
**Issue:** @felix cannot create posts
**Diagnosis needed:** Check if it's permissions, auth token, or backend issue
**Files to check:**
- `/src/app/pages/NewPost.tsx`
- `/src/app/context/AppDataContext.tsx` (createPost function)
- Backend endpoint: `/posts` POST

#### 3. Can't access Game Detail pages from Explore
**Issue:** Game pages unreachable
**Files to check:**
- `/src/app/pages/Explore.tsx` (Games tab rendering)
- `/src/app/pages/GameDetail.tsx`
- Routing in `/src/app/routes.tsx`

#### 4. Profile pictures on Game Detail not loading
**Issue:** Avatar/profile images broken on game detail pages
**Files to check:**
- `/src/app/pages/GameDetail.tsx`
- Image loading logic

#### 5. Profile picture uploads not working
**Issue:** Upload functionality broken
**Files to check:**
- `/src/app/components/ImageUpload.tsx`
- `/src/app/utils/api.ts` (uploadAPI)
- Backend endpoint: `/upload`

---

### MEDIUM PRIORITY (UX & Visual)

#### 6. Create profile picture for @forge account
**Task:** Generate or find a purple-themed avatar for @forge
**File to update:** `/src/app/data/data.ts` (forge account profilePicture)

#### 7. Fix Rock Paper Shotgun username wrapping
**Issue:** Long username causes awkward two-line wrap in posts
**File to fix:** `/src/app/components/PostCard.tsx`
**Solution:** Add CSS to handle long usernames (truncate, smaller font, etc.)

#### 8. Unify platforms on Edit Profile and Interests pages
**Issue:** Platform lists/selections inconsistent between pages
**Files to update:**
- `/src/app/components/EditProfileModal.tsx`
- `/src/app/components/onboarding/InterestsScreen.tsx`
**Task:** Make sure both use same platform list and styling

#### 9. Notification indicator should only show when new notifications exist
**Issue:** Indicator always shows (or never shows?)
**Files to check:**
- `/src/app/components/Header.tsx` (notification bell)
- `/src/app/context/AppDataContext.tsx` (notifications state)
**Solution:** Track unread count and only show indicator if > 0

---

### NEW FEATURES TO IMPLEMENT

#### 10. Tag other accounts when writing a post
**Requirements:**
- Detect @mentions in post text
- Auto-complete/suggest users as they type
- Create notifications for tagged users
**Files to update:**
- `/src/app/pages/NewPost.tsx` (add mention detection)
- `/src/app/components/WritePostModal.tsx` (same)
- Backend: Create notifications for mentions
- `/src/app/data/data.ts` (notification type for mentions)

#### 11. Ability to mute posts (no more notifications from thread)
**Requirements:**
- Add "Mute post" option to post menu
- Track muted posts in context/backend
- Filter out notifications from muted posts
**Files to update:**
- `/src/app/components/PostCard.tsx` (add mute action)
- `/src/app/context/AppDataContext.tsx` (muted posts state)
- Backend: `/posts/:postId/mute` endpoint

#### 12. Make @forge follow @felix
**Task:** Add @felix to @forge's following list
**File to update:** `/src/app/data/data.ts` OR use backend API

#### 13. Make a post on @forge account
**Task:** Create a welcome/intro post from @forge
**Options:**
1. Add to seed data
2. Use admin panel to create post
3. Add to backend topic accounts setup

---

## 📋 IMPLEMENTATION NOTES

### For Following/Posting Issues:
- These likely stem from edge function not being deployed
- Once backend deploys, test these first
- May need to check access token handling

### For Profile Picture Uploads:
- Check if Supabase Storage bucket exists
- Verify upload endpoint permissions
- Test with different file sizes/types

### For Game Detail Pages:
- Verify route exists in routes.tsx
- Check if game IDs are being passed correctly
- Ensure game data is available from backend

### For @mentions Feature:
- Consider using a library like `react-mentions` or `draft-js`
- Simple regex approach: `/(@[a-zA-Z0-9_]+)/g`
- Store mention

s as array in post metadata

### For Mute Feature:
- Store as Set or array in context
- Persist to localStorage
- Sync with backend for cross-device

---

## 🎯 RECOMMENDED ORDER

1. **Wait for backend deployment** - Will fix following, posting
2. **Fix Game Detail access** - Routing issue likely
3. **Fix profile picture uploads** - Critical UX
4. **Create @forge profile picture** - Quick win
5. **Fix Rock Paper Shotgun wrapping** - CSS tweak
6. **Unify platforms** - Data consistency
7. **Notification indicator** - State management
8. **Add @mentions** - New feature (complex)
9. **Add mute functionality** - New feature
10. **@forge follows @felix + post** - Data/seeding

---

## 🔧 QUICK REFERENCE

**Backend Status:** Not deployed (404/401 errors)
**Console Commands:** Not available yet (deployment needed)
**Access Token:** Check localStorage 'forge-access-token'
**Current User:** @felix (if logged in)

**Admin Panel:** `/admin` (navigate after login)
**Review Submissions:** `/review-submissions` (linked from Admin)

