# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server on port 5173
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run build:android  # Vite build + Capacitor sync for Android
```

There are no test or lint scripts in package.json — TypeScript checking is the primary static validation:

```bash
npx tsc --noEmit     # Type-check without emitting
```

## Architecture

**Stack**: React 18 + React Router 7 (SPA) + Vite 6 + Tailwind CSS 4 + Supabase + Vercel

### Routing

All routes are lazy-loaded via `src/app/routes.tsx`. The root component `src/app/App.tsx` wraps everything in `AppDataContext`, `ThemeContext`, `GlowBackground` (fixed purple gradient behind all content), and a React Router `<Suspense>` boundary.

### State Management

`src/app/context/AppDataContext.tsx` (1238 lines) is the single global store. It holds: auth session, current user profile, posts, groups, notifications, following/followers, blocking/muting lists, and fediverse connection state. Data is cached in localStorage with a 15-minute TTL. **Most pages read from this context rather than fetching directly.**

### Data Layer (three tiers)

1. **`src/app/utils/supabase.ts`** — Supabase client + typed wrappers for auth, profiles, posts, groups, notifications, user games, stream archives. Used for direct DB operations.
2. **`src/app/utils/api.ts`** — Calls the `forge-api` Supabase Edge Function (Hono REST API). Handles token refresh and expiration. Used for operations that need server-side logic.
3. **`supabase/functions/forge-api/`** — The main backend. Deno + Hono. All sensitive business logic lives here.

### Vercel API Routes (`api/`)

Serverless functions for: OG image generation (og.tsx, post-og, profile-og, android-beta-og), Stripe (create-payment-intent, webhook), transactional emails (send-notification, send-beta-confirmation, weekly-digest via cron), and inbound email processing.

### Middleware

`middleware.ts` is a Vercel Edge Middleware that intercepts profile handle URLs and injects OG `<meta>` tags for social crawlers before the SPA loads.

### UI Conventions

- **GlowBackground** sits at `position: fixed; z-index: 0`. Page content is at `z-index: 1`. For the glow to show through a page/modal, use `bg-card/80 backdrop-blur-xl` rather than a solid `bg-background`.
- **Tailwind CSS 4** — no `tailwind.config.ts`; config is co-located via `@tailwindcss/vite`.
- Radix UI primitives live in `src/app/components/ui/`. Feature components are in `src/app/components/`.
- **ProfileAvatar** size `"md"` = `w-12 h-12` (48px). Avatar center from a `p-4` container left edge = 40px. Used to align thread lines.
- Radix `DropdownMenuItem` `onSelect` fires during the close animation — wrap callbacks in `setTimeout(..., 0)` to let the dropdown close before opening a modal.

### Key Integrations

- **Fediverse**: `src/app/utils/bluesky.ts` (ATProto — like, repost, follow) + `src/app/utils/mastodonAuth.ts` (Mastodon OAuth + interactions). OAuth callbacks route through `supabase/functions/social-auth/`.
- **Capacitor**: Android builds target `src/` via `capacitor.config.ts`. Run `npm run build:android` to sync.
- **Sentry**: Initialized in `src/main.tsx`; Vite plugin uploads source maps on build. GitHub Actions creates releases on push to `main`.
- **Stripe**: Payment intent created server-side in `api/stripe/create-payment-intent.ts`; fulfilled via webhook in `api/stripe/webhook.ts`.
- **hCaptcha**: Bot protection on signup; site key is `VITE_HCAPTCHA_SITE_KEY`.

### Environment Variables

Required in `.env.local` for local dev (see `.env.example`):
- `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_ANON_KEY`
- Server-side only (Vercel/Edge): `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `HCAPTCHA_SECRET_KEY`
