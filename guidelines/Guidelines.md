# Forge - Gaming Social App Guidelines

## Overview
Forge is a mobile-first gaming social application that connects gamers across different gaming platforms and social networks. This document outlines the app's architecture, features, and development guidelines.

## Table of Contents
1. [Core Concept](#core-concept)
2. [Design System](#design-system)
3. [Architecture](#architecture)
4. [Authentication](#authentication)
5. [Features](#features)
6. [Data Models](#data-models)
7. [Development Guidelines](#development-guidelines)
8. [Component Patterns](#component-patterns)
9. [State Management](#state-management)
10. [Observability](#observability)

---

## Core Concept

Forge bridges the gap between different gaming ecosystems and social media platforms, allowing gamers to:
- Connect their gaming platforms (Nintendo, PlayStation, Steam, PC, Battle.net, Riot, Xbox)
- Follow external gaming accounts from Bluesky (ATProto) and Mastodon (ActivityPub) — e.g., IGN, GameSpot, Xbox, itch.io, PC Gamer
- Share gaming experiences, game lists, and gaming content
- Join and create gaming communities
- Discover games (via IGDB), players, and content

---

## Design System

### Color Theme
- **Accent (dark mode)**: Lime/chartreuse `#E7FFC4` — used for interactive elements, buttons, highlights
- **Accent (light mode)**: `#6aaa1a`
- **Background (dark mode)**: Deep purple `#1c1228`
- **Background (light mode)**: Near-white with light purple tones
- **Dark mode is the default**; light mode is togglable in settings

### Typography
- **Primary Font**: Poppins (weights 300–700) — applied globally via `theme.css`
- **Secondary Font**: Sora (weights 400–800) — used selectively via `.font-sora` class (e.g., "Forge" wordmark in splash)
- Avoid inline Tailwind font-weight/font-size classes; use theme-defined values in `theme.css`

### Visual Elements
- **Logo**: Custom SVG shape (see `src/assets/forge-logo.svg` and inline SVGs throughout the app)
- **Rounded Corners**: `rounded-lg`, `rounded-xl`, `rounded-full` — used consistently
- **Shadows**: Subtle elevation with `shadow-lg`
- **Spacing**: 4px grid (`gap-2`, `gap-4`, etc.)

### Accessibility
- High contrast ratios for text readability
- Light/dark mode toggle in settings
- Semantic HTML elements
- ARIA labels where appropriate
- Keyboard navigation support

---

## Architecture

### Tech Stack
- **Framework**: React 18 + TypeScript 5
- **Build Tool**: Vite 6
- **Router**: React Router v7
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- **Animation**: Motion (`motion/react`)
- **State Management**: React Context API
- **Backend**: Supabase (Postgres + Auth + Storage)
- **Edge Functions**: Deno + Hono at `supabase/functions/make-server-17285bd7/index.ts`
- **Deployment**: Vercel (frontend) + Supabase (backend)
- **Error Tracking**: Sentry (`@sentry/react`)
- **Analytics**: Google Analytics 4 (via `VITE_GA_MEASUREMENT_ID`)

### File Structure
```
/src
  /app
    /components       # Reusable UI components
      /onboarding    # Onboarding-specific components
    /context         # React Context providers (AppDataContext, ThemeContext)
    /data            # Type definitions and static data
    /pages           # Route pages/screens
    /styles          # Global styles and theme
    /utils
      analytics.ts   # GA4 helpers (initAnalytics, trackPageView, trackEvent)
      api.ts         # HTTP client for edge function + Supabase Storage uploads
      supabase.ts    # Supabase JS client singleton + typed helpers
/supabase
  /functions
    /make-server-17285bd7  # Hono edge function — canonical source AND deploy slug
  /migrations              # SQL migration files
/guidelines          # This documentation
```

### Routing Pattern
- **Login/Signup/Onboarding**: Standalone routes without layout
- **Main App**: Wrapped in `Layout` with `BottomNav` and `AppDataProvider`
- **Protected Routes**: Check for authentication and onboarding completion in `Layout.tsx`
- **Auth Callback** (`/auth/callback`): Handles Google OAuth redirect, upserts profile
- **`/splash` and `/onboarding`**: Both map to the `Onboarding` component

### Backend Architecture

#### Supabase Database (Postgres)
All data is stored in Supabase. Key tables:
- `profiles` — user profiles (snake_case columns)
- `posts` — user posts; includes `repost_count`, `like_count`, `comment_count` counters
- `follows` — follower/following relationships
- `likes` — post likes
- `reposts` — post reposts (a SECURITY DEFINER trigger `trg_repost_count` maintains `posts.repost_count`)
- `communities` / `community_members` — community data
- `notifications` — user notifications
- `blocked_users` / `muted_users` — safety features
- `messages` / `conversations` — direct messages

#### Supabase Storage
File uploads go directly to Supabase Storage via the REST API:
- `forge-avatars` — profile pictures (`avatars/<userId>.<ext>`)
- `forge-banners` — profile banners (`banners/<userId>.<ext>`)
- `forge-post-media` — post images/videos
- `forge-community-icons` — community icons
- `forge-community-banners` — community banners

#### Edge Function
A single Hono app at `supabase/functions/make-server-17285bd7/index.ts` handles:
- `/users/*` — user CRUD, follow/unfollow, block/mute, handle check
- `/posts/*` — post CRUD, likes
- `/games/*` — game search and batch fetch (IGDB integration)
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
1. **Email/Password Signup**: `SignUp.tsx` calls `supabase.auth.signUp` → stores credentials in localStorage → navigates to `/splash` (Onboarding). At the end of onboarding (`UsernameScreen`), uses the active Supabase session (or falls back to `signInWithPassword` with stored credentials) to save the profile.
2. **Email/Password Login**: `Login.tsx` → `auth.signIn(email, password)` in `AppDataContext`
3. **Google OAuth**: `supabase.auth.signInWithOAuth` → redirects to `/auth/callback` → `AuthCallback.tsx` upserts the profile

### localStorage Keys
| Key | Value |
|-----|-------|
| `forge-access-token` | Supabase JWT (expires ~1 hour) |
| `forge-refresh-token` | Supabase refresh token (long-lived) |
| `forge-user-id` | Authenticated user's UUID |
| `forge-logged-in` | `'true'` when authenticated |
| `forge-onboarding-complete` | `'true'` when onboarding done |
| `forge-signup-email` / `forge-signup-password` | Temporary credentials during email signup onboarding (removed after use) |

### Token Refresh
`getValidToken()` in `api.ts` automatically:
1. Returns the stored token if not expired
2. Calls the Supabase Auth REST API with the refresh token if expired
3. Falls back to `supabase.auth.getSession()` for Google OAuth sessions

---

## Features

### 1. Authentication & Onboarding
**Flow**:
1. **Signup/Login**: Email/password or Google OAuth
2. **Splash Screen**: Animated Forge logo
3. **Interest Selection**: Choose gaming platforms, genres, and playstyles
4. **Follow Suggestions**: Recommended users to follow (pinned: @forge, then top users by follower count)
5. **Username Creation**: Real-time handle validation — the only onboarding screen already centered/constrained on desktop

**Desktop optimization**: Interest and Follow screens constrain content to `max-w-2xl mx-auto`; buttons do not span full screen width.

### 2. User Profiles
**Features**:
- Profile picture and banner
- Display name, handle (@username), pronouns (optional)
- Bio and About sections
- Gaming platform badges and handles
- Social media integrations (Bluesky, Mastodon, X, Instagram, TikTok, etc.)
- Game library (Recently Played, Library, Favorites, Wishlist, Completed, LFG, Custom)
- Shareable game lists with cover art previews
- Community memberships (max 3 displayed, customizable)
- Follower/following counts

### 3. Social Feed
**Two main feeds**:
- **Following**: Posts from users you follow, including cross-posted content from Bluesky and Mastodon accounts
- **Trending**: Algorithmic/most-engaged content; shown to all guests and authenticated users when Following feed is empty

**Post Features**:
- Text content with @mention and #game hashtag support
- Image support (single or multiple, with ALT text)
- Link previews
- Game tags (IGDB-linked)
- Timestamp (relative: "2h ago", "3d ago")
- Like, Repost, Quote Post, Comment interactions
- Repost count maintained by `trg_repost_count` SECURITY DEFINER trigger (bypasses RLS for cross-user updates)
- Attached game list previews (tap to open full list detail)
- Threaded replies on post detail pages (sub-replies connected by a left border line, full-width like top-level replies)

**External Accounts**:
- Gaming sites and studios (IGN, GameSpot, Xbox, itch.io, PC Gamer, etc.) are followed via ATProto (Bluesky) or ActivityPub (Mastodon)
- External post engagement buttons are read-only indicators

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
- **Users**: User discovery and search
- **Games**: Game discovery via IGDB
- **Communities**: Browse and join communities

**Search**: Real-time search across users, communities, and games

### 6. Notifications
**Types**: New followers, likes, comments, reposts, community invites/approvals

### 7. Messages
**Features**: Direct messaging between users, conversation list, unread indicators. Tapping a user's avatar or handle in the messages list navigates to their profile.

### 8. Settings
**Sections**: Account, privacy, notifications, theme (light/dark), gaming platforms, social integrations, feed filtering, data deletion (GDPR compliance)

### 9. What's New Modal
Shown on first launch after a new version is deployed. Version is tracked in `localStorage` (`forge-whats-new-seen`). Release history is maintained in `WhatsNew.tsx` (`RELEASES` array). A "What's New" page in settings shows current and past version release notes.

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
  interests?: Interest[];
  follower_count?: number;
  following_count?: number;
  updated_at?: string;
}
```

> **Note**: React state may also see camelCase aliases (`displayName`, `profilePicture`) from older code paths. `normalizeProfile()` in `AppDataContext` ensures `display_name`, `handle`, and `profile_picture` are always set.

### Post
```typescript
interface Post {
  id: string;
  user_id: string;
  content: string;
  platform: SocialPlatform | 'forge';
  created_at: string;
  like_count: number;
  repost_count: number;
  comment_count: number;
  images?: string[];
  image_alts?: string[];
  url?: string;
  community_id?: string;
  reply_to?: string;           // parent post ID for replies
  quote_post_id?: string;      // quoted post ID for quote posts
  attached_list?: object;      // game list preview snapshot
  author?: Pick<Profile, 'id' | 'handle' | 'display_name' | 'profile_picture'>;
  repostedBy?: string;         // user ID of reposter (on repost copies)
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
- **State**: Use Context for global state, `useState` for local

### Database Field Names
- Supabase returns **snake_case** (`display_name`, `profile_picture`, `platform_handles`)
- Always write to Supabase with snake_case keys
- Use snake_case in `profiles.update()` calls; `normalizeProfile()` handles reads

### Styling Guidelines
- Use Tailwind utility classes
- Avoid custom font-size, font-weight, and line-height classes unless overriding
- Define custom theme values in `/src/styles/theme.css`
- Import fonts only in `/src/styles/fonts.css`
- Use consistent spacing (`gap-2`, `gap-3`, `gap-4`, etc.)
- Hover states for all interactive elements
- Transition classes for smooth animations

---

## Component Patterns

### Layout Components
- **Header**: Top navigation with logo and actions
- **BottomNav**: Fixed bottom navigation (Feed, Explore, Messages, Notifications, Profile)
- **Layout**: Wraps authenticated routes with BottomNav and AppDataProvider

### Reusable Components
- **PostCard**: Displays social posts with interactions (like, repost, quote, comment)
- **UserCard**: User profile preview with follow button
- **CommunityCard**: Community preview with join button
- **GameCard**: Game preview with cover art (IGDB data)
- **ImageUpload**: File picker + upload to Supabase Storage; exposes `onUploadingChange` so parents can disable Save while uploading
- **ProfileAvatar**: Avatar with fallback initials
- **FollowButton**: Follow/unfollow with optimistic state
- **WhatsNewModal**: First-launch release notes modal (version-gated via localStorage)
- **LoginModule**: Email/password + Google sign-in form used in both login page and feed desktop sidebar

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
- `currentUser` — normalized profile (never has null `display_name`/`handle`)
- `session` — Supabase auth session
- Posts (feed, user posts, community posts)
- Liked/reposted post IDs (Sets)
- Followed game IDs
- Blocked/muted user IDs (Sets)

**Key Functions**:
- `updateCurrentUser(updates)` — calls `profiles.update()` with snake_case payload
- `updateGameList(type, games)` — update game library
- `createPost(content, images, url, ...)` — create new post (supports images, games, replyTo, quotePostId, attachedList)
- `deletePost(postId)` — delete user's post
- `likePost(postId)` / `unlikePost(postId)` — toggle like
- `repostPost(postId)` / `unrepostPost(postId)` — toggle repost
- `signIn(email, password)` / `signUp(email, password)` / `signInWithGoogle()` / `signOut()`
- `toggleSocialPlatformFilter(platform)` — hide/show platform posts in feed

**`normalizeProfile(profile)`**: Ensures `display_name`, `handle`, and `profile_picture` are always present on the current user object, even if the DB row has nulls.

### ThemeContext
- Current theme (`'light' | 'dark'`)
- Toggle function

---

## Observability

### Google Analytics 4
- Initialized in `main.tsx` via `initAnalytics()` from `src/app/utils/analytics.ts`
- Measurement ID: `VITE_GA_MEASUREMENT_ID` environment variable
- Tracks: page views (on every route change), post creation, game follows, profile views, game detail views, search, sign-up, and login events
- **No advertising IDs (IDFA/GAID) are used** — GA4 is configured for analytics only, not ad targeting

### Sentry
- Initialized in `main.tsx` via `Sentry.init()` when `VITE_SENTRY_DSN` is present
- Captures uncaught exceptions and React render errors via `RootErrorBoundary`
- `tracesSampleRate: 0.2` (20% of transactions), `replaysSessionSampleRate: 0.05` (5% of sessions), `replaysOnErrorSampleRate: 1.0` (100% of error sessions)
- Only enabled in production (`import.meta.env.PROD`)

---

## Deployment

### Frontend (Vercel)
- Auto-deploys on push to `main`
- Live at: `forge-social.app`
- Build: `npm run build` → `/dist`

### Backend (Supabase)
- Project: `xmxeafjpscgqprrreulh`
- Edge function: `make-server-17285bd7`
- Storage buckets: `forge-avatars`, `forge-banners`, `forge-post-media`, `forge-community-icons`, `forge-community-banners`

### Environment Variables
| Variable | Purpose |
|----------|---------|
| `VITE_GA_MEASUREMENT_ID` | Google Analytics 4 measurement ID |
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking |
| Supabase project ID and anon key | Stored in `/utils/supabase/info` (Vite alias) |

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
- [ ] Components are responsive (mobile-first, desktop-enhanced)
- [ ] No console errors/warnings
- [ ] snake_case used for all Supabase writes

---

**Last Updated**: April 9, 2026
**Version**: v0.2.5
**Maintainer**: Forge Development Team
