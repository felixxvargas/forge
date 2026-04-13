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
- Connect their gaming platforms (Nintendo, PlayStation, Steam, PC, Battle.net, Riot, Xbox)
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
| Build Tool | Vite 6 + `@sentry/vite-plugin` |
| Router | React Router v7 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Animation | Motion (`motion/react`) |
| State | React Context API |
| Database / Auth / Storage | Supabase (Postgres + GoTrue + S3-compatible) |
| Edge Functions | Deno + Hono at `supabase/functions/make-server-17285bd7` |
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
    /make-server-17285bd7  # Hono edge function — canonical source AND deploy slug
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
- **Trending**: Algorithmic/most-engaged content

**Post Features:** Text, images (with ALT text), link previews, game tags (IGDB), like/repost/quote/comment, attached game list previews, threaded replies

### 4. Game Search (Unicode-robust)
- Primary: IGDB via edge function
- Fallback: RAWG API
- **`deAccent()` helper** in `api.ts` strips diacritics before sending the query and during client-side re-ranking. "Pokemon" finds "Pokémon", "Zelda" finds "Zëlda", etc.
- Same normalization applied in `EditGameListsModal` dedup and re-ranking

### 5. Communities
Types: Open, Request, Invite-only. Creator/Moderator/Member role system. Crown/Shield icons in profile community chips use `<span title="...">` wrappers (Lucide icons don't accept `title` prop).

### 6. Settings
Sections: Account, Privacy, Notifications, Theme, Gaming Platforms, Social Integrations, Feed Filtering, QR Code, Subscription (Plan + Premium Support), Indie Games, Feedback, What's New, About

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

---

## API Layer

### Edge Function (Supabase/Hono)
Single Hono app at `supabase/functions/make-server-17285bd7/index.ts`.

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

**Deploy command:**
```bash
npx supabase functions deploy make-server-17285bd7 \
  --project-ref xmxeafjpscgqprrreulh \
  --use-api \
  --no-verify-jwt
```

### Vercel API Routes (`/api/*`)
| Route | Purpose |
|-------|---------|
| `POST /api/emails/send-notification` | Send transactional email via Resend |
| `POST /api/stripe/create-payment-intent` | Create Stripe PaymentIntent for Premium (idempotency-keyed per userId) |
| `POST /api/stripe/webhook` | Handle Stripe `payment_intent.succeeded`; returns 500 on DB failure so Stripe retries |

All three are Vercel Edge Functions (runtime: `'edge'`).

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
| `updateGameList(type, games)` | Updates `profiles.game_lists[key]`; auto-shows list when first populated |
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

### Google Analytics 4
- Initialized in `main.tsx` via `initAnalytics()` from `analytics.ts`
- Env var: `VITE_GA_MEASUREMENT_ID`
- Tracks: page views, post creation, game follows, profile views, search, sign-up, login

### Sentry
- Initialized in `main.tsx` via `Sentry.init()` when `VITE_SENTRY_DSN` is present
- Only enabled in production (`import.meta.env.PROD`)
- **Release tracking**: `@sentry/vite-plugin` in `vite.config.ts` — on every Vercel build:
  - Uploads source maps (deleted from public bundle after upload)
  - Creates a Sentry release named after the git commit SHA (`VERCEL_GIT_COMMIT_SHA`)
  - Marks the release as deployed
- **GitHub release integration**: `.github/workflows/sentry-release.yml`
  - Push to `main` → Sentry release from short commit SHA
  - GitHub Release published → Sentry release from tag name (e.g. `v1.2.0`) with full commit association
- `release: import.meta.env.VITE_SENTRY_RELEASE` in `Sentry.init` tags every error to the exact build

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
- Edge function: `make-server-17285bd7`
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

---

**Last Updated**: April 13, 2026
**Version**: v0.4.0
**Maintainer**: Forge Development Team

---

## Changelog

### v0.4.0 — April 13, 2026
- **Edge function rebuilt (v3)**: Removed ~2100 lines of legacy Figma Make KV-store code (auth, user CRUD, post CRUD, likes, follows, blocks, mutes, admin endpoints). Edge function is now ~270 lines focused exclusively on games (IGDB) and file upload/moderation.
- **Handle check fixed**: `/users/check-handle/:handle` now queries the `profiles` table instead of the legacy `kv_store_17285bd7` table.
- **`api.ts` trimmed**: Removed dead exports `authAPI`, `postAPI`, `safetyAPI`, `followAPI`, `blueskyAPI`, `adminAPI`, and unused `userAPI` methods. Removed verbose token logging. File reduced from 696 → 270 lines.
- **`supabase.ts` fixes**: Removed debug `console.log` in `profiles.update`. Fixed `getByHandle()` to use `.maybeSingle()` (was `.single()`, threw on no match). Fixed follow/unfollow counter race condition — replaced read-modify-write pattern with a count query from the `follows` table (authoritative, no concurrent-update skew).
- **Stripe idempotency**: `create-payment-intent` now sends an `Idempotency-Key` header scoped to `userId`, preventing duplicate charges on retries.
- **Sentry fix**: `useBlueskyData` hook now guards `if (!user) return` at the top of the effect and uses `[user?.id]` as the dependency, preventing `TypeError: Cannot read properties of null (reading 'id')` when `PostCard` renders with a null user (FORGE-6, FORGE-7 resolved).
