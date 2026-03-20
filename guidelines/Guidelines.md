# Forge - Gaming Social App Guidelines

## Overview
Forge is a mobile-first gaming social application that connects gamers across different gaming platforms and social media websites. This document outlines the app's architecture, features, and development guidelines.

## Table of Contents
1. [Core Concept](#core-concept)
2. [Design System](#design-system)
3. [Architecture](#architecture)
4. [Features](#features)
5. [Data Models](#data-models)
6. [Development Guidelines](#development-guidelines)
7. [Component Patterns](#component-patterns)
8. [State Management](#state-management)

---

## Core Concept

Forge bridges the gap between different gaming ecosystems and social media platforms, allowing gamers to:
- Connect their gaming platforms (Nintendo, PlayStation, Steam, PC, Battle.net, Riot, Xbox)
- Integrate social media accounts (Bluesky, Tumblr, X, TikTok, Instagram, Threads, Red Note, Upscrolled)
- Share gaming experiences across platforms
- Join and create gaming communities
- Discover games, players, and content

---

## Design System

### Color Theme
- **Primary Color**: Dark purple (#7C3AED variants)
- **Accent Color**: Lime green (#84CC16 variants)
- **Background**: Dark mode optimized
- **Light Mode**: Optional toggle available in settings

### Typography
- **Font Family**: Poppins (applied across the entire app)
- **Font Sizes**: Use Tailwind default classes sparingly; custom sizes defined in theme.css
- **Font Weights**: Defined in theme.css; avoid Tailwind font-weight classes unless overriding

### Visual Elements
- **Logo**: Thunderbolt/Zap icon (used in navigation and splash screen)
- **Rounded Corners**: Consistent use of rounded-lg, rounded-xl, and rounded-full
- **Shadows**: Subtle elevation with shadow-lg
- **Spacing**: 4px grid system (gap-2, gap-4, etc.)

### Accessibility
- High contrast ratios for text readability
- Light/dark mode toggle
- Semantic HTML elements
- ARIA labels where appropriate
- Keyboard navigation support

---

## Architecture

### Tech Stack
- **Framework**: React 18 + TypeScript 5
- **Build Tool**: Vite 6
- **Router**: React Router v7 (Data mode pattern)
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- **Animation**: Motion (motion/react)
- **State Management**: React Context API
- **Backend**: Supabase (Postgres + Auth + Storage)
- **Edge Functions**: Deno + Hono at `supabase/functions/make-server-17285bd7/index.ts`
- **Deployment**: Vercel (frontend) + Supabase (backend)

### File Structure
```
/src
  /app
    /components       # Reusable UI components
      /onboarding    # Onboarding-specific components
    /context         # React Context providers (AppDataContext, ThemeContext)
    /data            # Type definitions (mockData.ts for types only)
    /pages           # Route pages/screens
    /styles          # Global styles and theme
    /utils
      api.ts         # HTTP client for edge function + Supabase Storage uploads
      supabase.ts    # Supabase JS client singleton + typed helpers
/supabase
  /functions
    /make-server-17285bd7  # Hono edge function — canonical source AND deploy slug
/guidelines          # This documentation
```

### Routing Pattern
The app uses React Router's Data mode with a Layout component that wraps all authenticated routes:
- **Login/Onboarding**: Standalone routes without layout
- **Main App**: Wrapped in Layout with BottomNav and AppDataProvider
- **Protected Routes**: Check for authentication and onboarding completion
- **Auth Callback** (`/auth/callback`): Handles Google OAuth redirect, stores tokens, upserts profile

### Backend Architecture

#### Supabase Database (Postgres)
All data is stored in Supabase. Key tables:
- `profiles` — user profiles (snake_case columns)
- `posts` — user posts with optional image arrays
- `follows` — follower/following relationships
- `likes` — post likes
- `reposts` — post reposts
- `communities` / `community_members` — community data
- `notifications` — user notifications
- `blocked_users` / `muted_users` — safety features

#### Supabase Storage
File uploads go directly to Supabase Storage via the REST API (bypassing the edge function):
- `forge-avatars` — profile pictures (`avatars/<userId>.<ext>`)
- `forge-banners` — profile banners (`banners/<userId>.<ext>`)
- `forge-post-media` — post images/videos
- `forge-community-icons` — community icons
- `forge-community-banners` — community banners

#### Edge Function
A single Hono app at `supabase/functions/make-server-17285bd7/index.ts` handles:
- `/auth/signup`, `/auth/signin`, `/auth/me`
- `/users/*` — user CRUD, follow/unfollow, block/mute, handle check
- `/posts/*` — post CRUD, likes
- `/games/*` — game search and batch fetch (MobyGames integration)
- `/admin/*` — admin utilities

**Deploy command:**
```bash
npx supabase functions deploy make-server-17285bd7 \
  --project-ref xmxeafjpscgqprrreulh \
  --use-api \
  --no-verify-jwt
```

> The directory name (`make-server-17285bd7`) matches the function slug exactly — no copying required.

---

## Authentication

### Flows
1. **Email/Password**: `authAPI.signin` / `authAPI.signup` → calls edge function → stores tokens in localStorage
2. **Google OAuth**: `supabase.auth.signInWithOAuth` → redirect to `/auth/callback` → `AuthCallback.tsx` stores tokens in localStorage

### Token Storage (localStorage)
| Key | Value |
|-----|-------|
| `forge-access-token` | Supabase JWT (expires ~1 hour) |
| `forge-refresh-token` | Supabase refresh token (long-lived) |
| `forge-user-id` | Authenticated user's UUID |
| `forge-logged-in` | `'true'` when authenticated |
| `forge-onboarding-complete` | `'true'` when onboarding done |

### Token Refresh
`getValidToken()` in `api.ts` automatically:
1. Returns the stored token if not expired
2. Calls the Supabase Auth REST API with the refresh token if expired
3. Falls back to `supabase.auth.getSession()` for Google OAuth sessions

---

## Features

### 1. Authentication & Onboarding
**Flow**:
1. **Login Screen**: Email/password or Google OAuth
2. **Splash Screen**: Animated logo and app name
3. **Interest Selection**: Choose gaming interests and preferences
4. **Follow Suggestions**: Recommended users to follow based on interests
5. **Username Creation**: Real-time handle validation and uniqueness check

**Implementation**:
- Tokens and user ID persisted in localStorage
- Sequential screens with AnimatePresence for smooth transitions
- `AuthCallback.tsx` handles Google OAuth, upserts profile row, stores tokens

### 2. User Profiles
**Features**:
- Profile picture and banner
- Display name, handle (@username), pronouns (optional)
- Bio and About sections
- Gaming platform badges
- Social media integrations
- Game library (Recently Played, Library, Favorites, Wishlist)
- Community memberships (max 3 displayed, customizable)
- Follower/following counts

**Edit Profile**:
- `profilePictureRef` (useRef) tracks uploaded URL synchronously — prevents stale closure reads in `handleSave`
- Save button disabled while image is uploading (`isImageUploading` state)
- All fields saved as snake_case to Supabase `profiles` table

### 3. Social Feed
**Two main feeds**:
- **Following**: Posts from users you follow
- **For You**: Algorithmic/curated content

**Post Features**:
- Text content (with platform attribution)
- Image support (single or multiple)
- GIF and video support
- Link previews
- Community tags
- Timestamp (relative formatting: "2h ago", "3d ago")
- Like, Repost, Comment interactions

**Account Types**:
- **Standard**: User-created or claimed account
- **Topic (Unclaimed)**: Gaming websites and studios (IGN, PlayStation, Nintendo, Blizzard, etc.) — auto-cross-post from other platforms

### 4. Communities
**Community Types**:
- **Open**: Anyone can join immediately
- **Request**: Requires approval from moderators/creator
- **Invite Only**: Requires invitation from members

**Features**:
- Custom icon and banner
- Description and member count
- Community-specific posts
- Role system (Creator, Moderator, Member)
- Users can display up to 3 communities on their profile

### 5. Explore Page
**Tabs**:
- **Posts**: Trending/featured posts
- **Users**: User discovery and suggestions
- **Games**: Game discovery (MobyGames integration)
- **Communities**: Browse and join communities

**Search**: Real-time search across users, communities, and games

### 6. Notifications
**Types**: New followers, likes, comments, reposts, community invites/approvals

### 7. Messages
**Features**: Direct messaging, conversation list, unread indicators

### 8. Settings
**Sections**: Account, privacy, notifications, theme, platforms, social integrations, feed filtering

---

## Data Models

### User (Supabase `profiles` table — snake_case)
```typescript
interface Profile {
  id: string;                         // UUID (matches auth.users.id)
  handle: string;                     // @username
  display_name: string;
  pronouns?: string;
  bio?: string;
  about?: string;
  profile_picture?: string | null;    // Public URL from Supabase Storage
  banner_image?: string | null;
  platforms?: Platform[];
  platform_handles?: Record<string, string>;
  show_platform_handles?: Record<string, boolean>;
  social_platforms?: SocialPlatform[];
  social_handles?: Record<string, string>;
  show_social_handles?: Record<string, boolean>;
  displayed_communities?: string[];   // Community IDs (max 3)
  updated_at?: string;
}
```

> **Note**: React state and components may also see camelCase aliases (`displayName`, `profilePicture`) from older code paths. `normalizeProfile()` in AppDataContext ensures `display_name`, `handle`, and `profile_picture` are always set.

### Post
```typescript
interface Post {
  id: string;
  user_id: string;
  content: string;
  platform: SocialPlatform | 'forge';
  created_at: string;
  likes: number;
  reposts: number;
  comments: number;
  images?: string[];
  image_alts?: string[];
  url?: string;
  community_id?: string;
  author?: Pick<Profile, 'id' | 'handle' | 'display_name' | 'profile_picture'>;
}
```

### Community
```typescript
interface Community {
  id: string;
  name: string;
  description: string;
  type: 'open' | 'request' | 'invite';
  icon: string;               // Emoji
  banner?: string;
  creator_id: string;
  member_count: number;
}
```

---

## Development Guidelines

### General Principles
1. **Mobile-First**: Design and develop for mobile, then enhance for desktop
2. **Responsive**: All layouts must work across screen sizes
3. **Performance**: Optimize images, lazy load where appropriate
4. **Accessibility**: Follow WCAG 2.1 AA guidelines
5. **Type Safety**: Use TypeScript for all new code

### Code Style
- **Components**: Functional components with hooks
- **File Naming**: PascalCase for components, camelCase for utilities
- **Import Order**: React → Third-party → Local components → Utilities → Types
- **Props**: Destructure in function signature
- **State**: Use Context for global state, useState for local

### Database Field Names
- Supabase returns **snake_case** (`display_name`, `profile_picture`, `platform_handles`)
- Always write to Supabase with snake_case keys
- Use snake_case in `profiles.update()` calls; `normalizeProfile()` handles reads

### Styling Guidelines
- Use Tailwind utility classes
- Avoid custom font-size, font-weight, and line-height classes unless overriding
- Define custom theme values in `/src/styles/theme.css`
- Import fonts only in `/src/styles/fonts.css`
- Use consistent spacing (gap-2, gap-3, gap-4, etc.)
- Hover states for all interactive elements
- Transition classes for smooth animations

---

## Component Patterns

### Layout Components
- **Header**: Top navigation with logo and actions
- **BottomNav**: Fixed bottom navigation (Feed, Explore, Notifications, Profile)
- **Layout**: Wraps authenticated routes with BottomNav and AppDataProvider

### Reusable Components
- **PostCard**: Displays social posts with interactions
- **UserCard**: User profile preview with follow button
- **CommunityCard**: Community preview with join button
- **GameCard**: Game preview with cover art
- **ImageUpload**: File picker + upload to Supabase Storage; exposes `onUploadingChange` so parents can disable Save while uploading
- **ProfileAvatar**: Avatar with fallback initials
- **FollowButton**: Follow/unfollow with optimistic state
- **ConfirmationModal**: Generic confirmation dialog

### Modal Patterns
- Use fixed positioning with backdrop
- Close on backdrop click or X button
- Escape key to close

### List Patterns
- Use unique keys (IDs, not indices)
- Empty states for no data
- Loading states for async data

---

## State Management

### AppDataContext
Provides global state for:
- `currentUser` — normalized profile (never has null display_name/handle)
- `session` — Supabase auth session
- Posts (feed, user posts, community posts)
- Liked/reposted post IDs (Sets)
- Hidden social platforms (Set)

**Key Functions**:
- `updateCurrentUser(updates)` — calls `profiles.update()` with snake_case payload
- `updateGameList(type, games)` — update game library
- `createPost(content, images, url)` — create new post
- `deletePost(postId)` — delete user's post
- `likePost(postId)` / `unlikePost(postId)` — toggle like
- `repostPost(postId)` / `unrepostPost(postId)` — toggle repost
- `toggleSocialPlatformFilter(platform)` — hide/show platform posts

**`normalizeProfile(profile)`**: Ensures `display_name`, `handle`, and `profile_picture` are always present on the current user object, even if the DB row has nulls.

### ThemeContext
- Current theme (`'light' | 'dark'`)
- Toggle function

---

## Deployment

### Frontend (Vercel)
- Auto-deploys on push to `main`
- Live at: `forge-app-roan.vercel.app`
- Build: `npm run build` → `/dist`

### Backend (Supabase)
- Project: `xmxeafjpscgqprrreulh`
- Edge function: `make-server-17285bd7`
- Storage buckets: `forge-avatars`, `forge-banners`, `forge-post-media`, `forge-community-icons`, `forge-community-banners`

### Environment
- Supabase project ID and anon key are stored in `/utils/supabase/info` (Vite alias)

---

## Future Enhancements

### Planned Features
- Real-time messaging with WebSocket / Supabase Realtime
- Push notifications
- Game library sync with Steam/PlayStation/Xbox APIs
- Advanced search and filtering
- Community moderation tools
- Events and tournaments
- Desktop application

---

## Contributing

### Pull Request Process
1. Create feature branch from `main`
2. Follow code style guidelines
3. Update documentation if architecture changes
4. Submit PR with clear description

### Code Review Checklist
- [ ] Code follows style guide
- [ ] TypeScript types are correct
- [ ] Components are responsive
- [ ] No console errors/warnings
- [ ] snake_case used for all Supabase writes

---

**Last Updated**: March 20, 2026
**Version**: 1.1.0
**Maintainer**: Forge Development Team
