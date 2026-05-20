# Forge — Gaming Social App Guidelines

## Overview
Forge is a mobile-first gaming social application that connects gamers across different gaming platforms and social networks. This document outlines the app's architecture, features, and development guidelines. Keep it current — it is the authoritative reference if the backend is ever rebuilt or a new developer joins.

## Table of Contents
1. [Core Concept](#core-concept)
2. [Design System](#design-system)
3. [Architecture](#architecture)
4. [Authentication & Onboarding](#authentication--onboarding)
5. [Features](#features)
6. [Premium (Forge Premium)](#premium-forge-premium)
7. [Data Models](#data-models)
8. [API Layer](#api-layer)
9. [Email (Resend)](#email-resend)
10. [Development Guidelines](#development-guidelines)
11. [Local Development & Testing](#local-development--testing)
12. [Component Patterns](#component-patterns)
13. [State Management](#state-management)
14. [Observability](#observability)
15. [Deployment](#deployment)

---

## Core Concept

Forge bridges the gap between different gaming ecosystems and social media platforms, allowing gamers to:
- Connect their gaming platforms (Nintendo, PlayStation, Steam, PC, Battle.net, Riot, Xbox, Kick, Trovo)
- Follow external gaming accounts from Bluesky (ATProto) and Mastodon (ActivityPub) — e.g., IGN, GameSpot, Xbox, itch.io, PC Gamer
- Share gaming experiences, game lists, and gaming content
- Join and create gaming communities
- Discover games (via IGDB + RAWG fallback), players, and content

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
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript 5 |
| Build Tool | Next.js 15 App Router + Vercel (web) · Vite 6 (Android/Capacitor only) |
| Router | Next.js App Router (web) · React Router v7 (Android/Capacitor only) |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Animation | Motion (`motion/react`) |
| State | React Context API |
| Database / Auth / Storage | Supabase (Postgres + GoTrue + S3-compatible) |
| Edge Functions | Deno + Hono at `supabase/functions/forge-api` |
| Payments | Stripe (one-time $4.99 Forge Premium via Stripe Elements) |
| Email | Resend (transactional — feedback notifications, change-email, password reset) |
| CAPTCHA | hCaptcha on signup form |
| Error Tracking | Sentry (`@sentry/react` + `@sentry/vite-plugin`) |
| Analytics | Google Analytics 4 |
| Deployment | Vercel (frontend) + Supabase (backend) |

### File Structure
```
/src
  /app
    /components       # Reusable UI components
      /onboarding    # Onboarding-specific components (SplashScreen, InterestsScreen, FollowScreen, UsernameScreen)
    /context         # React Context providers (AppDataContext, ThemeContext)
    /data            # Type definitions and static data
    /pages           # Route pages/screens
    /utils
      analytics.ts   # GA4 helpers (initAnalytics, trackPageView, trackEvent)
      api.ts         # HTTP client for edge function + RAWG fallback + deAccent search helper
      bluesky.ts     # Bluesky/ATProto feed fetching (fetchBlueskyPosts)
      supabase.ts    # Supabase JS client singleton + typed helpers (profiles, posts, userGamesAPI, …)
      mentionHighlight.ts  # Mirror-div rich-text highlight for compose screens
/api
  /emails
    send-notification.ts   # Vercel edge function — Resend email sender
  /stripe
    create-payment-intent.ts  # Vercel edge function — creates Stripe PaymentIntent ($4.99)
    webhook.ts                # Vercel edge function — handles payment_intent.succeeded → sets is_premium
/supabase
  /functions
    /forge-api           # Hono edge function — games (IGDB) + file upload/moderation
    /twitch-vod-archive  # Twitch OAuth token exchange, VOD sync, archive management
  /migrations              # SQL migration files
/.github
  /workflows
    sentry-release.yml     # Creates Sentry release on push-to-main and on GitHub Release publish
/guidelines          # This documentation
```

### Routing Pattern
- **Login / Signup / Onboarding**: Standalone routes without layout (`/login`, `/signup`, `/splash`, `/auth/callback`, `/reset-password`)
- **Main App**: Wrapped in `Layout` with `BottomNav` and `AppDataProvider`
- **Auth Callback** (`/auth/callback`): Handles Google OAuth redirect, upserts profile
- **`/splash` and `/onboarding`**: Both map to the `Onboarding` component

---

## Authentication & Onboarding

### Flows
1. **Email/Password Signup**: `SignUp.tsx` validates the form, renders hCaptcha widget, stores credentials + captcha token in localStorage, navigates to `/splash` (Onboarding). At `UsernameScreen`, calls `supabase.auth.signUp` with `options.captchaToken` from localStorage.
2. **Email/Password Login**: `Login.tsx` → `auth.signInWithPassword` in `AppDataContext`
3. **Google OAuth**: `supabase.auth.signInWithOAuth` → redirects to `/auth/callback` → `AuthCallback.tsx` upserts the profile
4. **Password Reset**: Resend sends a link via `supabase.auth.resetPasswordForEmail`; user lands on `/reset-password` which handles the `PASSWORD_RECOVERY` event.
5. **Change Email**: `AccountSettings.tsx` → `supabase.auth.updateUser({ email })` → Supabase sends confirmation link to new address.
6. **Change Password**: `AccountSettings.tsx` → `supabase.auth.updateUser({ password })` → `toast.success`.

### CAPTCHA (hCaptcha)
- Widget is rendered on `SignUp.tsx` when `VITE_HCAPTCHA_SITE_KEY` is set; invisible when the key is absent (safe for local dev).
- Token is stored in `localStorage` as `forge-signup-captcha` and cleaned up after use.
- For full server-side verification, add the hCaptcha secret key to **Supabase → Auth → Bot and Abuse Protection → hCaptcha secret**. Supabase then verifies the token on every `signUp` call automatically.

### localStorage Keys
| Key | Value |
|-----|-------|
| `forge-signup-email` | Temporary during email signup onboarding (removed after use) |
| `forge-signup-password` | Temporary during email signup onboarding (removed after use) |
| `forge-signup-captcha` | hCaptcha token (removed after use) |
| `forge-pending-profile` | Profile data pending email confirmation (removed after callback) |
| `forge-onboarding-complete` | `'true'` when onboarding done |
| `forge-oauth-intent` | `'signup'` during OAuth flow to detect new vs existing accounts |
| `forge-linked-accounts` | JSON array of linked account tokens for account switching |

---

## Features

### 1. User Profiles
- Profile picture and banner
- Display name, handle (`@username`), pronouns (optional)
- Bio and About sections
- Gaming platform badges with `@handle` display
- Social media integrations (Bluesky, Mastodon, X, Instagram, TikTok, etc.)
- Game library with up to **4 visible lists** at a time (drag-reorderable); attempting to add a 5th shows a bottom-sheet tray explaining the limit
- Shareable game lists with cover art previews (tap → `ListView`)
- Community memberships (max 3 displayed)
- Follower/following counts

### 2. Game Lists
Six standard list types: `recentlyPlayed`, `playedBefore`, `favorites`, `wishlist`, `library`, `completed`
Plus: `lfg` (Looking for Group), custom lists (Premium only).

**Sync rules:**
- "I've Played This" button on `GameDetail` → writes to both `user_games` table (`status: 'played'`) and `profiles.game_lists.playedBefore`
- "I Own This" button → writes to both `user_games` table (`status: 'owned'`) and `profiles.game_lists.library`
- Button initial state derives from **both** `game_lists` (instant, local) and `user_games` (authoritative DB check), OR-merged
- "Follow game" state is stored in `profiles.game_lists._followedGames` (NOT `user_games`); context `followedGameIds` is the single source of truth

**Profile limit:** `visibleListCount` is tracked during render. When it reaches 4, further lists are skipped. The "Create a game list" button shows a limit tray (`showListLimitTray`) instead of the selector when the count is already 4.

### 3. Social Feed
**Two main feeds:**
- **Following**: Posts from users you follow + cross-posted content from Bluesky/Mastodon topic accounts. Bluesky fetch uses `limit * 5` from the API and slices after filtering reposts to guarantee non-repost posts are returned.
- **Trending**: Algorithmic/most-engaged content. @forge posts (UUID `dfa8b7a1-b930-4ee8-a14a-5cb9aa48c5d3`) are always injected at the top regardless of engagement via `getTrendingFeed()` in `supabase.ts`.

**Post Features:** Text, images (with ALT text), link previews, game tags (IGDB), like/repost/quote/comment, attached game list previews, threaded replies

### 4. Game Search (Unicode-robust)
- Primary: IGDB via edge function
- Fallback: RAWG API
- **`deAccent()` helper** in `api.ts` strips diacritics before sending the query and during client-side re-ranking. "Pokemon" finds "Pokémon", "Zelda" finds "Zëlda", etc.
- Same normalization applied in `EditGameListsModal` dedup and re-ranking

### 5. Communities
Types: Open, Request, Invite-only. Creator/Moderator/Member role system. Crown/Shield icons in profile community chips use `<span title="...">` wrappers (Lucide icons don't accept `title` prop).

### 6. Twitch Stream Archive
Users can connect their Twitch account via OAuth to automatically archive VODs to Forge.

**OAuth flow** (`/settings/twitch-archive`):
- Connect button initiates Twitch OAuth (scopes: `user:read:email channel:read:subscriptions`)
- Redirect URI: `https://forge-social.app/settings/twitch-archive`
- Callback handled inline in `TwitchArchiveSettings.tsx` — reads `?code` + `?state` params
- `POST /twitch-vod-archive/oauth-callback` edge function exchanges code for tokens, stores in `profiles` table

**Supabase edge function** (`supabase/functions/twitch-vod-archive/`):
| Route | Purpose |
|-------|---------|
| `POST /twitch-vod-archive/oauth-callback` | Exchange Twitch OAuth code for tokens; store in `profiles` |
| `POST /twitch-vod-archive/sync` | Pull VODs from Twitch API; sync to `stream_archives` table |
| `POST /twitch-vod-archive/disconnect` | Revoke Twitch connection; clear tokens from profile |
| `POST /twitch-vod-archive/delete-archive` | Soft-delete individual archive |
| `POST /twitch-vod-archive/retention-response` | Handle 1-year retention policy response |

**`stream_archives` table** (see `supabase/migrations/20260428_stream_archives.sql`):
- Stores VOD metadata: `twitch_vod_id`, `title`, `duration_seconds`, `thumbnail_url`, `download_status`, `recorded_at`
- Soft-delete via `deleted_at`; `retention_prompted_at` tracks 1-year retention prompts

**Profile columns added** (via migration):
`twitch_user_id`, `twitch_display_name`, `twitch_access_token`, `twitch_refresh_token`, `twitch_token_expires_at`, `twitch_archive_enabled`

**Auto-deletion**: Archives older than 1 year trigger a retention notification; if no response within 3 months the archive is auto-deleted client-side on login (no pg_cron — uses `AppDataContext` 24-hour interval check).

**Deploy command:**
```bash
npx supabase functions deploy twitch-vod-archive \
  --project-ref xmxeafjpscgqprrreulh
```

**Required secrets** (set via `npx supabase secrets set ... --project-ref xmxeafjpscgqprrreulh`):
- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`

### 7. Top 8 Friends & Games
Profile section showing up to 8 friends and 8 games the user highlights. Displayed above the game lists tabs. Edit button only visible on own profile. Friends are picked from followers/following; games are free-form IGDB search.

### 8. Badges
| Badge | Condition |
|-------|-----------|
| Sprout 🌱 | Account < 91 days old |
| Alpha Tester | Founding members who joined during alpha — displays a ruby flask icon on their profile |
| Mentor | Manual/admin-assigned |
| Forge Pioneer | Early adopter designation |

### 9. Settings
Sections: Account, Privacy, Notifications, Theme, Gaming Platforms, Social Integrations, Feed Filtering, QR Code, Subscription (Plan + Premium Support), Twitch Stream Archive, Indie Games, Feedback, What's New, About

**Premium Support** link (`mailto:support@forge-social.app`) is only visible when `currentUser.is_premium === true`.

### 7. Feedback
`FeedbackModal` and `FeedbackPage` both insert to `supabase.from('feedback')` and fire-and-forget a POST to `/api/emails/send-notification` targeting `felixvgiles@gmail.com`. The email is never blocking — failures are swallowed.

### 8. Indie Game Submissions
`SubmitIndieGame.tsx` has a hosting-type toggle:
- **External Link** (free): requires website or Steam URL
- **Host on Forge** (Premium): file upload (ZIP). Non-premium users clicking this are redirected to `/premium`.

---

## Premium (Forge Premium)

### Product
- **Price**: $4.99 one-time payment (no subscription)
- **Payment**: Stripe Elements (`PaymentElement`, night theme, Forge accent colors). Stripe branding minimized via `appearance` API.
- **Route**: `/premium` (purchase page), `/premium/success` (post-payment confirmation)

### Features Included
| Feature | Notes |
|---------|-------|
| Custom Game Lists | Gated in `CreateCustomList.tsx` — redirects to `/premium` for non-premium users |
| Priority Support | `mailto:support@forge-social.app` link in Settings, only visible when `is_premium = true` |
| Host Indie Games on Forge | Upload tab in `SubmitIndieGame.tsx`, gated behind `is_premium` |
| Priority Game Placement | Coming soon — included in purchase; no gate yet |

### Payment Flow
1. User clicks "Get Premium" → frontend calls `POST /api/stripe/create-payment-intent` with `{ userId }`
2. API creates a PaymentIntent with `metadata: { user_id, product: 'forge_premium' }`, returns `clientSecret`
3. Stripe Elements renders with the `clientSecret`
4. On success: Stripe fires `payment_intent.succeeded` webhook to `/api/stripe/webhook`
5. Webhook verifies signature, reads `metadata.user_id`, updates `profiles` table: `is_premium = true, premium_purchased_at = now()`
6. Client navigates to `/premium/success` and optimistically sets `is_premium` locally

### Required DB Columns
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_purchased_at timestamptz;
```

### Environment Variables (Stripe)
| Variable | Where |
|----------|-------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Vercel env vars (exposed to browser) |
| `STRIPE_SECRET_KEY` | Vercel env vars (server-side only) |
| `STRIPE_WEBHOOK_SECRET` | Vercel env vars (server-side only) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env vars (used in webhook to bypass RLS) |

Stripe webhook endpoint: `https://forge-social.app/api/stripe/webhook`
Event to listen for: `payment_intent.succeeded`

---

## Data Models

### Profile (`profiles` table — snake_case)
```typescript
interface Profile {
  id: string;                          // UUID (matches auth.users.id)
  handle: string;                      // @username
  display_name: string;
  pronouns?: string;
  bio?: string;
  about?: string;
  profile_picture?: string | null;     // Public URL from Supabase Storage
  banner_image?: string | null;
  platforms?: Platform[];
  platform_handles?: Record<string, string>;
  show_platform_handles?: Record<string, boolean>;
  social_platforms?: SocialPlatform[];
  social_handles?: Record<string, string>;
  displayed_communities?: string[];    // Community IDs (max 3)
  interests?: Interest[];
  follower_count?: number;
  following_count?: number;
  game_lists?: {
    recentlyPlayed?: Game[];
    playedBefore?: Game[];
    favorites?: Game[];
    wishlist?: Game[];
    library?: Game[];
    completed?: Game[];
    lfg?: Game[];
    customLists?: CustomList[];
    hiddenLists?: string[];            // keys of lists hidden from profile
    listOrder?: string[];              // user-defined display order
    _followedGames?: string[];         // game IDs (source of truth for follow state)
    _topicFollows?: string[];          // topic account IDs (Bluesky/Mastodon)
  };
  suspended?: boolean;
  is_premium?: boolean;
  premium_purchased_at?: string;
  updated_at?: string;
}
```

> **Note**: React state uses `normalizeProfile()` in `AppDataContext` which ensures `display_name`, `handle`, and `profile_picture` are always present. Some older code paths may use camelCase aliases (`displayName`, `profilePicture`) — always write to Supabase with snake_case.

### Post
```typescript
interface Post {
  id: string;
  user_id: string;
  content: string;
  platform: SocialPlatform | 'forge';
  created_at: string;
  like_count: number;
  repost_count: number;               // maintained by trg_repost_count SECURITY DEFINER trigger
  comment_count: number;
  images?: string[];
  image_alts?: string[];
  url?: string;
  community_id?: string;
  reply_to?: string;                  // parent post ID for replies
  quote_post_id?: string;             // quoted post ID for quote posts
  attached_list?: object;             // game list preview snapshot
  game_id?: string;                   // tagged game
  author?: Pick<Profile, 'id' | 'handle' | 'display_name' | 'profile_picture'>;
  repostedBy?: string;                // user ID of reposter (on repost copies)
}
```

### Feedback (`feedback` table)
```typescript
interface Feedback {
  id: string;
  type: 'feature_request' | 'bug' | 'general';
  title: string;
  description: string;
  user_id: string | null;
  user_handle: string | null;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
}
```

### device_tokens
Stores FCM push notification tokens per user/platform.
```typescript
interface DeviceToken {
  id: string;        // UUID
  user_id: string;   // FK → profiles(id), cascade delete
  token: string;     // FCM registration token
  platform: string;  // 'android' (default)
  created_at: string;
  // UNIQUE(user_id, platform) — one token per platform per user
}
```

### scheduled_posts
Auto-publish queue for @forge account posts.
```typescript
interface ScheduledPost {
  id: string;
  user_id: string;           // FK → profiles(id)
  content: string;           // max 500 chars
  game_ids: string[];
  game_titles: string[];
  scheduled_at: string;      // UTC timestamp to publish
  status: 'pending' | 'published';
  published_post_id: string | null;  // FK → posts(id) after publish
  created_at: string;
}
```

### Session Events (`forge_session_events` table)
Tracks user session lifecycle for engagement metrics. Written fire-and-forget by `sessionTelemetry` in `supabase.ts`.
```typescript
interface ForgeSessionEvent {
  id: string;          // UUID
  user_id: string;     // auth.users.id
  session_id: string;  // random UUID per session
  event: 'session_start' | 'heartbeat' | 'session_end';
  platform: 'web' | 'android';
  duration_s: number | null;  // only set on session_end
  created_at: string;
}
```

### Game List Events (`game_list_events` table)
Immutable event log for add/remove actions on any game list. Written by `updateGameList()` in `AppDataContext`. Used to compute monthly gaming timeline summaries.
```typescript
interface GameListEvent {
  id: string;       // UUID
  user_id: string;  // auth.users.id
  game_id: string;  // IGDB game ID (string)
  list_type: string; // 'recentlyPlayed' | 'favorites' | etc.
  event: 'added' | 'removed';
  created_at: string;
}
```

### Gaming Monthly Summaries (`gaming_monthly_summaries` table)
One row per user per month; stores the set of games that were in recently-played at any point during that month. Only written for months where recently-played was updated.
```typescript
interface GamingMonthlySummary {
  user_id: string;   // auth.users.id
  month: string;     // ISO date string, always the 1st of the month (e.g. '2026-05-01')
  game_ids: string[];
  created_at: string;
}
```

---

## API Layer

### Edge Function (Supabase/Hono)
Single Hono app at `supabase/functions/forge-api/index.ts`.

**Active routes** (all KV-based auth/user/post/social routes were removed in v3):
| Route | Purpose |
|-------|---------|
| `GET /users/check-handle/:handle` | Handle availability — queries `profiles` table |
| `POST /upload` | File upload to Supabase Storage + Sightengine moderation |
| `GET /games` | List games (local DB) |
| `GET /games/search/:query` | Search: local DB first, IGDB fallback |
| `POST /games/batch` | Batch fetch games by IDs |
| `GET /games/:gameId` | Single game with artwork |
| `GET /games/:gameId/similar` | Similar games by genre |
| `GET /games/:gameId/versions` | Other platform versions of same title |
| `GET /games/:gameId/players` | Users who played/owned the game (`user_games` table) |
| `POST /games/:gameId/artwork` | Add artwork to a game |
| `POST /games/moby` | Get or create game via IGDB |
| `POST /seed/igdb-games` | Admin: bulk seed top-rated IGDB games |

> **Data layer**: Auth, profile CRUD, posts, follows, blocks, mutes, and likes all go
> directly through the Supabase JS client (`supabase.ts`) — not through the edge function.
> The edge function's sole responsibilities are game data (IGDB) and file upload moderation.

**Deploy commands:**
```bash
# Main game/upload API
npx supabase functions deploy forge-api \
  --project-ref xmxeafjpscgqprrreulh \
  --use-api \
  --no-verify-jwt

# Twitch VOD archive
npx supabase functions deploy twitch-vod-archive \
  --project-ref xmxeafjpscgqprrreulh

# Push notifications (triggered by DB webhook on notifications INSERT)
npx supabase functions deploy send-push-notification \
  --project-ref xmxeafjpscgqprrreulh

# DM notifications (email + FCM push)
npx supabase functions deploy notify-dm \
  --project-ref xmxeafjpscgqprrreulh
```

### Vercel API Routes (`/api/*`)
| Route | Purpose |
|-------|---------|
| `POST /api/emails/send-notification` | Send transactional email via Resend |
| `POST /api/stripe/create-payment-intent` | Create Stripe PaymentIntent for Premium (idempotency-keyed per userId) |
| `POST /api/stripe/webhook` | Handle Stripe `payment_intent.succeeded`; returns 500 on DB failure so Stripe retries |
| `GET /api/admin/stats` | Admin-only: returns user, post, game, community, onboarding, engagement metrics |
| `POST /api/push/register-token` | Upsert FCM device token for a user into `device_tokens` table |
| `GET /api/cron/publish-scheduled-posts` | Publish pending @forge scheduled posts; secured with `Authorization: Bearer CRON_SECRET` |

All are Vercel Edge Functions (`export const config = { runtime: 'edge' }`).

**OG / metadata handlers** (also edge functions, called by middleware for social crawlers and direct navigation):
`api/og.tsx`, `api/post-og/[postId].ts`, `api/profile-og/[handle].ts`, `api/game-og/[gameId].ts`, `api/group-og/[groupId].ts`, `api/android-beta-og.ts`, `api/list-og.ts`

### Client-Side API (`api.ts`)
- `gamesAPI.searchGames(query)` — IGDB search with `deAccent()` normalization and client-side re-ranking
- `rawgAPI.searchGames(query)` — RAWG fallback with same `deAccent()` normalization
- `userAPI.checkHandle(handle)` — availability check via edge function (queries `profiles` table)
- `uploadAPI.uploadFile(file, bucketType)` — direct Supabase Storage upload (bypasses edge function)
- `deAccent(s)` — strips diacritics: `s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()`

---

## Email (Resend)

### Transactional Emails
All email goes through `/api/emails/send-notification` (Vercel edge function) which calls the Resend API.

**Sender**: `Forge <no-reply@forge-social.app>`

| Trigger | Recipient | Subject format |
|---------|-----------|---------------|
| Feedback submitted (Feature Request) | `felixvgiles@gmail.com` | `[Forge Feedback] Feature Request: <title>` |
| Feedback submitted (Bug Report) | `felixvgiles@gmail.com` | `[Forge Feedback] Bug Report: <title>` |
| Feedback submitted (General) | `felixvgiles@gmail.com` | `[Forge Feedback] General Feedback: <title>` |
| Change email | User's new address | Sent by Supabase Auth natively |
| Password reset | User's address | Sent by Supabase Auth natively |

**Environment variables:**
| Variable | Notes |
|----------|-------|
| `RESEND_API_KEY` | From resend.com → API Keys |
| `RESEND_FROM` | Defaults to `Forge <no-reply@forge-social.app>` |

---

## Development Guidelines

### General Principles
1. **Mobile-First**: Design for mobile, then enhance for desktop
2. **Responsive**: All layouts must work across screen sizes
3. **Performance**: Lazy-load routes (all pages use `React.lazy`), optimize images
4. **Type Safety**: TypeScript for all new code; avoid `any` where possible
5. **No speculative abstractions**: implement what the task requires, no more

### Code Style
- **Components**: Functional components with hooks
- **File Naming**: PascalCase for components, camelCase for utilities
- **Import Order**: React → Third-party → Local components → Utilities → Types
- **Props**: Destructure in function signature
- **State**: Context for global state, `useState` for local
- **Lucide icons**: Do not pass `title` prop directly — Lucide's `LucideProps` does not include it. Use `<span title="..."><Icon /></span>` for browser tooltips.

### Database Field Names
- Supabase returns **snake_case** (`display_name`, `profile_picture`, `platform_handles`)
- Always write to Supabase with snake_case keys
- Use snake_case in `profiles.update()` calls; `normalizeProfile()` handles reads

### Styling Guidelines
- Use Tailwind utility classes
- Define custom theme values in `/src/styles/theme.css`
- Import fonts only in `/src/styles/fonts.css`
- Use consistent spacing (`gap-2`, `gap-3`, `gap-4`, etc.)
- Hover states for all interactive elements; use `transition-colors`

---

## Local Development & Testing

### Running Locally
```bash
npm run dev   # Vite dev server at localhost:5173
```
Most integrations degrade gracefully in dev:

| Integration | Local behavior |
|-------------|---------------|
| Sentry (browser) | Disabled — `enabled: import.meta.env.PROD` |
| Sentry Vite plugin | No-op — skips silently when `SENTRY_AUTH_TOKEN` is absent |
| hCaptcha | Hidden — no widget rendered when `VITE_HCAPTCHA_SITE_KEY` is absent |
| GitHub Actions (`sentry-release.yml`) | Only triggers on push to `main` — never runs locally |
| Stripe (live) | Use test keys instead (see below) |
| Resend emails | Calls succeed silently; check the Resend dashboard for test sends |

### Stripe Test Mode
Stripe has a built-in test mode — no separate setup needed:
1. Go to `dashboard.stripe.com` and toggle **Test mode** on
2. Copy the `pk_test_...` and `sk_test_...` keys into `.env.local`
3. Use test card `4242 4242 4242 4242` / any future date / any CVC
4. Webhooks locally: `stripe listen --forward-to localhost:5173/api/stripe/webhook` (optional — you can test the frontend without this)

> Do **not** commit live Stripe keys. Keep them in `.env.local` (gitignored) and Vercel env vars only.

### Staging / Preview Deployments (Vercel)
Every push to any non-main branch automatically creates a **Vercel Preview Deployment** at a unique URL. This is the recommended staging environment:
- Full production build (same as main)
- All integrations active (Sentry, Stripe, hCaptcha, emails)
- Environment variables can be scoped to Preview vs Production in Vercel settings
- No extra setup — just push a branch and Vercel generates the URL

This means you **never need to configure integrations twice**. Test on a preview branch; merge to main when ready.

### Required `.env.local` Variables
```env
# Core (always required)
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_ANON_KEY=...

# hCaptcha (leave blank to disable widget locally)
VITE_HCAPTCHA_SITE_KEY=0fd6d646-463e-4d12-8e72-3e929e06dc68
HCAPTCHA_SECRET_KEY=your_hcaptcha_secret_key_here

# Stripe — use TEST keys for local dev
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...      # from `stripe listen` output
SUPABASE_SERVICE_ROLE_KEY=...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM=Forge <no-reply@forge-social.app>

# Sentry — leave SENTRY_AUTH_TOKEN blank to skip source map uploads
VITE_SENTRY_DSN=https://...@....ingest.sentry.io/...
# SENTRY_AUTH_TOKEN=     # omit locally; plugin is a no-op without it
# SENTRY_ORG=
# SENTRY_PROJECT=

# Twitch Stream Archive — register app at dev.twitch.tv
# Redirect URI: https://forge-social.app/settings/twitch-archive
VITE_TWITCH_CLIENT_ID=your_twitch_client_id
# TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are set as Supabase secrets (not .env.local)
```

---

## Component Patterns

### Layout Components
- **Header**: Top navigation with logo and actions
- **BottomNav**: Fixed bottom navigation (Feed, Explore, Messages, Notifications, Profile)
- **Layout**: Wraps authenticated routes; checks auth and onboarding completion

### Key Page Components
| Page | Route | Notes |
|------|-------|-------|
| `SignUp` | `/signup` | Email/password form + hCaptcha widget |
| `Onboarding` | `/splash`, `/onboarding` | Multi-step: Splash → Interests → Follow → Username |
| `Premium` | `/premium` | Stripe Elements checkout; two-step UX (click → init PaymentIntent → card form) |
| `PremiumSuccess` | `/premium/success` | Post-payment confirmation; optimistically sets `is_premium` locally |
| `GameDetail` | `/game/:gameId` | Played/owned/follow state syncs from both `game_lists` and `user_games` |
| `CreateCustomList` | `/create-custom-list` | Premium-gated; redirects to `/premium` for free users |
| `SubmitIndieGame` | `/submit-indie-game` | "Host on Forge" option is Premium-gated |
| `AccountSettings` | `/settings/account` | Change email (Supabase verification flow), change password |
| `FeedbackPage` | `/settings/feedback` | Fires Resend email to felix on submit |

### Modal Patterns
- Use fixed positioning with `bg-black/60` backdrop
- Close on backdrop click and X button
- Bottom trays use `items-end` + `rounded-t-2xl`

---

## State Management

### AppDataContext
Provides global state:
- `currentUser` — normalized profile (never null `display_name`/`handle`)
- `session` — Supabase auth session
- `followedGameIds` — `Set<string>` derived from `profiles.game_lists._followedGames`
- `followingIds` — `Set<string>` of followed user IDs
- Posts (feed, user posts, community posts)
- Liked/reposted post ID sets
- Blocked/muted user ID sets

**Key Functions:**
| Function | Notes |
|----------|-------|
| `updateCurrentUser(updates)` | Calls `profiles.update()` with snake_case payload |
| `updateGameList(type, games)` | Updates `profiles.game_lists[key]`; auto-shows list when first populated; diffs old vs new game IDs and writes `added`/`removed` events to `game_list_events` |
| `followGame(gameId)` | Adds to `_followedGames` in `profiles.game_lists` — NOT `user_games` |
| `unfollowGame(gameId)` | Removes from `_followedGames` |
| `createPost(...)` | Supports text, images, game tags, replies, quote posts, attached lists |
| `signOut()` | Supabase sign-out + clears local state |

**`normalizeProfile(profile)`**: Ensures `display_name`, `handle`, and `profile_picture` are always set.

> **Follow state source of truth**: `profiles.game_lists._followedGames` (not `user_games`). Never read `followed` status from `userGamesAPI.getStatus()` — it will always be false for games followed via the context.

### ThemeContext
- Current theme (`'light' | 'dark'`)
- `toggleTheme()` function

---

## Observability

### Session Telemetry
`sessionTelemetry` (exported from `supabase.ts`) writes to `forge_session_events` via fire-and-forget inserts. Call `sessionTelemetry.start(userId, platform)` on login, `.heartbeat()` every 5 minutes, `.end()` on logout / tab close. The `AppDataContext` wires this up automatically. Platform is `'web'` for Next.js and `'android'` for Capacitor builds.

The `get_auth_user_activity()` PostgreSQL RPC (created in migration `20260514000000`) returns `{ mau, wau, dau }` by querying `auth.users.last_sign_in_at`. Called by `api/admin/stats.ts` to populate the Admin Engagement section.

### Google Analytics 4
- Initialized in `main.tsx` via `initAnalytics()` from `analytics.ts`
- Env var: `VITE_GA_MEASUREMENT_ID`
- Tracks: page views, post creation, game follows, profile views, search, sign-up, login

### Sentry
**Web (Next.js)** — `@sentry/nextjs` v10:
- `sentry.client.config.ts` — client init; exports `onRouterTransitionStart` for App Router navigation tracking
- `sentry.server.config.ts` — server init (Node.js runtime)
- `sentry.edge.config.ts` — edge/middleware init
- `instrumentation.ts` — Next.js lifecycle hook; imports server/edge configs by runtime, exports `onRequestError`
- DSN: `VITE_SENTRY_DSN` (webpack DefinePlugin maps it for the client bundle; `process.env` for server/edge)
- `withSentryConfig` in `next.config.ts` handles source map uploads and release creation

**Android** — `@sentry/react` initialized in `src/main.tsx` when `VITE_SENTRY_DSN` is present

- **Release tracking**: `@sentry/nextjs`'s webpack plugin — on every Vercel build creates a Sentry release named after `VERCEL_GIT_COMMIT_SHA` and uploads source maps
- **GitHub release integration**: `.github/workflows/sentry-release.yml`
  - Push to `main` → Sentry release from short commit SHA
  - GitHub Release published → Sentry release from tag name (e.g. `v1.2.0`) with full commit association

**Required env vars for Sentry release tracking:**
| Variable | Where to add |
|----------|-------------|
| `SENTRY_AUTH_TOKEN` | GitHub Actions secrets + Vercel env vars |
| `SENTRY_ORG` | GitHub Actions secrets + Vercel env vars |
| `SENTRY_PROJECT` | GitHub Actions secrets + Vercel env vars |

Auth token scope required: **`org:ci`** (covers Source Map Upload, Release Creation, Code Mappings).

To cut a named release: GitHub → Releases → Draft a new release → tag `v1.x.x` → Publish.

---

## Deployment

### Frontend (Vercel)
- Auto-deploys on push to `main` → `forge-social.app`
- Preview deployments on all other branches (recommended staging environment)
- Build command: `npm run build` → `/dist`

### Backend (Supabase)
- Project ref: `xmxeafjpscgqprrreulh`
- Edge functions: `forge-api` (games/upload), `twitch-vod-archive` (Twitch OAuth + VOD sync)
- Storage buckets: `forge-avatars`, `forge-banners`, `forge-post-media`, `forge-community-icons`, `forge-community-banners`

### Environment Variables Reference
| Variable | Required In | Purpose |
|----------|-------------|---------|
| `VITE_SUPABASE_PROJECT_ID` | Frontend | Supabase project ref |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase public key |
| `VITE_SENTRY_DSN` | Frontend | Sentry error ingestion |
| `VITE_GA_MEASUREMENT_ID` | Frontend | Google Analytics 4 |
| `VITE_HCAPTCHA_SITE_KEY` | Frontend | hCaptcha widget |
| `HCAPTCHA_SECRET_KEY` | Supabase dashboard | Bot protection verification |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Frontend | Stripe Elements |
| `STRIPE_SECRET_KEY` | Vercel (server) | Create PaymentIntents |
| `STRIPE_WEBHOOK_SECRET` | Vercel (server) | Verify Stripe signatures |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (server) | Webhook bypasses RLS to set `is_premium` |
| `RESEND_API_KEY` | Vercel (server) | Transactional emails |
| `RESEND_FROM` | Vercel (server) | Email sender address |
| `SENTRY_AUTH_TOKEN` | Vercel + GitHub secrets | Source map upload + release creation |
| `SENTRY_ORG` | Vercel + GitHub secrets | Sentry organization slug |
| `SENTRY_PROJECT` | Vercel + GitHub secrets | Sentry project slug |
| `VITE_TWITCH_CLIENT_ID` | Frontend | Twitch OAuth client ID (initiates auth flow) |
| `TWITCH_CLIENT_ID` | Supabase secrets | Twitch API — used in `twitch-vod-archive` edge function |
| `TWITCH_CLIENT_SECRET` | Supabase secrets | Twitch API — used in `twitch-vod-archive` edge function |
| `FCM_SERVICE_ACCOUNT` | Supabase secrets | Full Firebase service account JSON for FCM HTTP v1 push notifications |
| `CRON_SECRET` | Vercel env vars | Secures `GET /api/cron/publish-scheduled-posts` (Bearer token) |

---

---

## UI Conventions

### Design Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `accent` | CSS var (lime `#E7FFC4` dark / `#6aaa1a` light) | Primary CTA buttons, active states, highlights |
| `text-[#1c1228]` | Deep purple | Text on accent-colored backgrounds (buttons, pills) |
| `bg-card` | CSS var | Surface backgrounds |
| `bg-secondary` | CSS var | Secondary surfaces, inactive chips |
| `border-border` | CSS var | All borders |
| `text-muted-foreground` | CSS var | Secondary text, placeholders |

### Button Styles
| Variant | Classes |
|---------|---------|
| Primary CTA | `bg-accent text-[#1c1228] hover:bg-accent/90 rounded-xl` |
| Secondary | `bg-secondary border-2 border-border text-foreground hover:bg-secondary/80 rounded-xl` |
| Destructive | `bg-destructive text-white hover:bg-destructive/90` |
| LFG/Flare | `border-2 border-orange-500/60 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 rounded-xl` |
| Icon-only | Secondary style + `px-4 py-3` icon centered |

### Filter Chips / Sub-tabs (Forge-branded)
```
Active:   bg-accent text-[#1c1228] px-4 py-2 rounded-full text-sm font-medium
Inactive: bg-secondary text-muted-foreground hover:text-foreground px-4 py-2 rounded-full text-sm font-medium
```
Used in: Explore filter chips, Explore Groups sub-tabs (Groups / Flares).

### Main Tab Bar
```
Active:   text-accent border-b-2 border-accent
Inactive: text-muted-foreground hover:text-foreground
```

---

## Layout Patterns

### Desktop Two-Column
```jsx
<div className="lg:flex lg:flex-row lg:gap-6 lg:items-start lg:px-6 lg:pt-6">
  {/* Sidebar — left, sticky */}
  <div className="lg:w-80 lg:shrink-0 lg:sticky lg:top-[57px] lg:self-start lg:space-y-4">
    ...
  </div>
  {/* Main content — right */}
  <div className="lg:flex-1 lg:min-w-0">
    ...
  </div>
</div>
```
Used in: CommunityDetail (`lg:w-80`), GameDetail, Profile (`lg:w-[300px]` left column).

> **Note**: Use `lg:flex-row` (sidebar left, content right). Never use `flex-row-reverse`. To show/hide elements at breakpoints use `hidden lg:flex` (not `max-lg:hidden flex` — the unconditional `flex` wins over `max-lg:hidden`).

### Profile Desktop Left Column
Width: `lg:w-[300px]`. Sticky at `top-[72px]`.

### Skeleton / Loading States
Show skeleton on first data load only (`!profileUser` / `loadingState && data.length === 0`). Use `animate-pulse` with muted placeholder shapes matching the real layout. Profile has two distinct skeleton variants: mobile (`lg:hidden`) and desktop (`hidden lg:flex`).

---

## Page-Specific Notes

### Explore
**Tab order**: Posts → Users → Games → Groups

**Search results order** (all tabs search):
1. Games
2. Forge users
3. Forge posts
4. External accounts (Bluesky / Mastodon) — labeled "Also on the web"
5. Groups

**Groups tab sub-tabs** (Forge-branded pills):
- **Groups** — grid of community cards + "Create new group" CTA
- **Flares** — active LFG/LFM flares with count badge + "Create Flare" CTA

**Search results game carousel** — on desktop uses `lg:aspect-[3/2]` with `object-top` to crop portrait covers to half-height.

**Games list** — unified poster grid (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`), no separate mobile/desktop layouts.

**External user Follow button**: `bg-accent text-[#1c1228]` (NOT `text-white`). `rounded-lg`, not `rounded-full`.

### Profile
Mobile action buttons (own profile, below active flares):
1. **Create Content** — `bg-accent text-[#1c1228]` → `/new-post`
2. **Create LFG Flare** — orange LFG style → `/create-flare`

Desktop floating button stack (bottom-right): New Post + Create LFG Flare (own profile only).

### Game Detail
**Description expand**: relative container with gradient fade + explicit "Read more ↓ / Show less ↑" button (ChevronDown/Up icons). Always shown when description is present.

**Right column order** (top → bottom): Active Flares → Posts → Related Games (Other Versions) → Expansions & DLC → Similar Games.

**Share button**: icon-only square button (Upload icon) beside "Add to List" in action row. Opens `ShareModal` with game context.

### Messages
Skeleton persists until all DM partner profile pictures are loaded, with a 2 s max timeout fallback. Uses `new Image()` preload pattern.

### Community (Group) Detail
Desktop: sidebar (info, games, flares) on **left** (`lg:w-80`), posts feed on **right** (`lg:flex-1`).

---

## OG / Social Preview

| Page | Handler | Cache |
|------|---------|-------|
| Profile `/:handle` | `api/profile-og/[handle].ts` | 60 s |
| Post `/post/:id` | `api/post-og/[postId].ts` | 60 s |
| Game `/game/:id` | `api/game-og/[gameId].ts` | 300 s |
| Group `/group/:id` | `api/group-og/[groupId].ts` | 60 s |
| List `/list?userId=` | `api/list-og.ts` | 60 s |
| Android Beta `/android-beta` | `api/android-beta-og.ts` | — |

OG image generator: `api/og.tsx` — supports types `profile`, `post`, `game`, `group`, `list`.

Static OG image (`/og-image.png`) is used for all non-UGC pages (Feed, Explore, Login, Sign Up, Messages, Settings, Blog, Terms). Defined in `app/layout.tsx` as the default `openGraph.images` fallback; blog pages override with their own `generateMetadata`.

---

## Brand Voice & Content Writing

- **No em dashes**: Do not use em dashes (—) in any in-app copy, post copy, notifications, email, or UI text. Use a period, comma, or colon instead.
- **Tone**: Direct, conversational, gamer-native. Avoid corporate filler.
- **@forge posts**: 500-character limit. Weekly cadence. No em dashes.

---

## Git Conventions
- No `Co-Authored-By` attribution in commits
- Commit messages: concise, imperative, describe the change (not the task)
- Push to `main` triggers automatic Vercel deployment

---

**Last Updated**: May 20, 2026
**Version**: v0.3.7
**Maintainer**: Forge Development Team

---

## Changelog

### v0.3.7 — May 2026 (current)
- **Handle-based profile URLs**: Profiles are accessible at `forge-social.app/yourhandle`. The `/profile/:userId` route server-redirects to the handle URL. `profilePath()` utility in `src/app/utils/profilePath.ts` handles all internal navigation.
- **Alpha Tester badge**: Founding members who joined during alpha get a ruby flask badge on their profile.
- **Reply tray animation**: Tapping the comment icon on a post opens the reply tray with a smooth slide-up animation.
- **Game mentions in reply tray**: @ game mentions are highlighted in accent green and bold inside the reply compose tray.
- **Android push notifications (beta)**: FCM HTTP v1 push for DMs and all notification types (likes, comments, mentions, follows, Top 8 requests). Service account JWT via `FCM_SERVICE_ACCOUNT` secret. Device tokens in `device_tokens` table. DB webhook on `notifications` INSERT triggers `send-push-notification` edge function; `notify-dm` sends FCM push after email.
- **Scheduled posts system**: `scheduled_posts` Supabase table + hourly Vercel cron (`/api/cron/publish-scheduled-posts`, secured by `CRON_SECRET`). @forge account auto-publishes release announcements and blog shares.
- **Static OG images for non-UGC pages**: `/og-image.png` set as default in `app/layout.tsx` openGraph metadata. Covers Feed, Explore, Login, Sign Up, Messages, Settings, Blog, Terms.
- **Forge Blog OG images**: Blog post and blog index pages include explicit OG image metadata for proper social preview cards.

### v0.3.6 — May 2026
- **@ game mentions**: Type `@` in any post or reply to search and tag a game from the IGDB library. Tagged games display cover art previews.
- **Post link previews**: Forge post URLs render an embedded post card when shared on iMessage and Discord (OG metadata via middleware + `api/post-og`).
- **Weekly activity digest emails**: Automated weekly digest sent via Resend summarizing activity for the week.

### v0.3.5 — May 2026
- **Google Sign-In on Android**: Google OAuth now works in the Capacitor Android build.
- **Smarter game search**: Fuzzy matching handles typos; parent game titles rank above expansions and remasters.
- **Remasters/remakes linked**: Game detail pages now show and link remasters, remakes, and expanded editions correctly.
- **Game detail performance**: Game pages load faster; data is cached and not re-fetched on reload.
- **Avatar fade-in**: Profile pictures no longer flash/pop — they fade in smoothly with a skeleton placeholder.
- **Feed skeleton**: Skeleton loader layout now mirrors the actual feed structure.
- **Twitch Archive full history**: Paginated browsing of up to a full year of VODs; no longer limited to the most recent page.
- **Branded error pages**: 404 and error screens are Forge-styled.
- **OG handlers edge runtime**: All `api/*-og` handlers now declare `export const config = { runtime: 'edge' }`, fixing 500 errors on direct navigation to post/game/group/profile URLs (middleware was returning the handler's error response before this fix).
- **PostgREST query fix**: `page.tsx` for posts now uses `author:profiles!user_id(...)` instead of the ambiguous `profiles(...)` embedded resource syntax.
- **`increment_comment_count` / `decrement_comment_count` RPCs** (migration `20260514000002`): Atomic SQL functions to update `posts.comment_count`; eliminates the read-modify-write fallback.
- **Search performance**: IGDB access token cached module-level in the `forge-api` Deno edge function (saves 200–400 ms per cold search). IGDB game upserts run in parallel via `Promise.all`. Search debounce reduced from 150 ms → 50 ms in `EditGameList.tsx`.
- **Session telemetry** (`forge_session_events` table, migration `20260514000000`): Tracks `session_start`, `heartbeat`, and `session_end` events with `platform` and `duration_s`. `sessionTelemetry` exported from `supabase.ts`. `AppDataContext` fires these on login/logout/tab-close and app state changes on Android.
- **`get_auth_user_activity()` RPC**: Queries `auth.users.last_sign_in_at` to return `{ mau, wau, dau }`.
- **Game list events** (`game_list_events` table, migration `20260514000001`): Immutable event log for add/remove actions on game lists; `updateGameList()` in `AppDataContext` diffs old vs new IDs and writes events.
- **Admin engagement metrics**: `api/admin/stats.ts` now returns MAU/WAU/DAU, avg session duration, and platform split. `Admin.tsx` has a new Engagement section.
- **Gaming timeline — monthly snapshots** (`gaming_monthly_summaries` table, migration `20260514000003`): On login, `AppDataContext` checks if a summary is needed for the previous month (only written if recently-played was updated). Displayed as a **Timeline** tab on the Profile page via `GameTimeline.tsx`.

### v0.3.4 — May 2026
- **Notification badge**: Bell icon shows unread count with a glowing accent badge.
- **Game discovery in list editor**: Browse New Releases, Recently Added, and Popular on Forge without leaving the game list editor.
- **DLC/edition filtering**: DLCs, season passes, and duplicate edition variants are automatically filtered from game search results.
- **Inline game title rendering**: Game titles tagged in post text now flow correctly on all screen sizes.
- **List preview in posts**: Game list previews in posts render cleanly on tablet and mobile.
- **Wider profile desktop layout**: Profile pages use a wider two-column layout for better use of desktop screen space.

### v0.3.3 — April 2026
- **DM read receipts**: "Read" appears below your last sent message when it's been seen.
- **Group chat read receipts**: Tap the avatar stack under a message to see who has read it.
- **Emoji reactions**: Long-press any DM or group message to react or delete.
- **Typing indicators**: Real-time typing indicators in both DMs and group chats.
- **Message previews**: Conversation list shows real message preview text instead of "New message".
- **Context-aware compose**: Creating a post from a Game or Group page auto-tags that game or group.
- **Floating compose button on Game Detail**: Persistent compose FAB on game detail pages.

### v0.3.1 — April 30, 2026
- **Twitch Stream Archive**: Full Twitch OAuth integration on `/settings/twitch-archive` — connect account, auto-sync VODs, toggle auto-archive/auto-post, manual sync, soft-delete archives, 1-year retention prompts, and client-side auto-deletion after 3 months inactivity.
- **Kick & Trovo platforms**: Added Kick and Trovo to supported gaming platform badges on profiles.
- **Top 8 Friends & Games**: New profile section above game lists tabs — highlight up to 8 friends and 8 games; editable on own profile.
- **Badges**: Sprout badge (accounts < 91 days), Mentor badge, and Forge Pioneer early adopter badge.
- **Onboarding redesign**: Global tooltip-style onboarding overlay with progress indicator; tasks tracked in AppDataContext.
- **Stream expiry notifications**: Client-side check (runs once per 24 hours on login) — creates `stream_expiry` notifications for archives approaching 1-year limit. No pg_cron dependency.
- **Edit list fix**: `updateGameList` now correctly saves the LFG list (was writing to key `undefined`). Modal now loads the correct current games for LFG. `communities` preserved in React state after any list save.
- **Desktop layout**: Modernized desktop sidebar, New Post FAB on Feed, Quill icon on desktop compose, desktop account switcher.
- **Group DMs**: Group DM persistence, race condition fix, 3-4 person group avatar, last message preview, group thread refresh persistence.
- **Post improvements**: Sent bubble gradient, glass received bubbles, invite group post visibility, game-add post prompt.
- **UI polish**: Bottom nav blur, card lighting effects, badge polish, profile skeleton, LFG gradient fix, nav blur, platform toggle improvements.

### v0.3.2 — May 9, 2026
- **Profile skeleton**: Rebuilt with distinct mobile and desktop layouts matching actual two-column profile UI. `LoadingScreen` profile skeleton updated to match (`/@handle` routes now also trigger the profile skeleton).
- **Profile desktop layout**: Left column fixed at `lg:w-[340px]`; right column capped at `lg:max-w-2xl` to keep posts readable.
- **Admin stats**: New Vercel Edge Function at `api/admin/stats.ts` (replaces Next.js App Router route that was incompatible with static export).
- **Android static export**: All 17 dynamic page wrappers now export `generateStaticParams` with placeholder params so Next.js 15.5.x static export check passes; server component pages use direct Supabase REST API instead of `cookies()`-based client.
- **Sentry (Next.js)**: Added `sentry.edge.config.ts`, `onRouterTransitionStart` in client config, `onRequestError` in `instrumentation.ts` for full Next.js 15 App Router coverage.
