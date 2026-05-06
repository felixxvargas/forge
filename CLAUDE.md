# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Next.js dev server on port 3000 (primary — use this for web dev)
npm run build          # Next.js production build → .next/
npm run start          # Serve the Next.js production build locally
npm run dev:vite       # Vite dev server on port 5173 (Android debugging only)
npm run build:android  # Vite build → dist/ then Capacitor sync for Android
```

TypeScript checking (no test or lint scripts):

```bash
npx tsc --noEmit     # Type-check without emitting
```

## Architecture

**Stack**: React 18 + Next.js 15 App Router + Tailwind CSS 4 + Supabase + Vercel

### Routing

The app uses **Next.js App Router** in `app/`. All 60+ routes live there as thin client wrappers that delegate to the actual page components in `src/app/pages/`:

```typescript
// app/(app)/feed/page.tsx — typical pattern
'use client';
import { Suspense } from 'react';
import { Feed } from '@/app/pages/Feed';
export default function Page() { return <Suspense><Feed /></Suspense>; }
```

Route groups:
- `app/(app)/` — authenticated app pages, wrapped by `<Layout>` from `src/`
- `app/(auth)/` — login, signup, onboarding, splash

The root layout at `app/layout.tsx` wraps everything in `<Providers>` from `src/app/components/Providers.tsx`.

### Compatibility Shim

`src/compat/router.tsx` provides React Router–compatible hooks backed by Next.js navigation. All page components in `src/app/pages/` import from here:

```typescript
import { useNavigate, useParams, useSearchParams, Link } from '@/compat/router';
```

This is what made the migration possible without rewriting every page. The shim translates `useNavigate`, `useLocation`, `useParams`, `Link`, `Navigate`, etc. to Next.js equivalents. **Do not import from `react-router` directly in src/ code.**

### State Management

`src/app/context/AppDataContext.tsx` (~1200 lines) is the single global store. It holds: auth session, current user profile, posts, groups, notifications, following/followers, blocking/muting lists, and fediverse connection state. Data is cached in localStorage with a 15-minute TTL. **Most pages read from this context rather than fetching directly.**

### Data Layer (three tiers)

1. **`src/app/utils/supabase.ts`** — Supabase client + typed wrappers for auth, profiles, posts, groups, notifications, user games, stream archives. Used for direct DB operations.
2. **`src/app/utils/api.ts`** — Calls the `forge-api` Supabase Edge Function (Hono REST API). Handles token refresh and expiration. Used for operations that need server-side logic.
3. **`supabase/functions/forge-api/`** — The main backend. Deno + Hono. All sensitive business logic lives here.

### Vercel API Routes (`api/`)

Serverless functions live in `api/` at the project root (not `app/api/`). Vercel deploys these alongside the Next.js app. `next.config.ts` sets `experimental.externalDir: true` so TypeScript can resolve them.

- OG image generation: `api/og.tsx`, `api/post-og/[postId].ts`, `api/profile-og/[handle].ts`, `api/android-beta-og.ts`
- Stripe: `api/stripe/create-payment-intent.ts`, `api/stripe/webhook.ts`
- Transactional emails: `api/emails/` (send-notification, weekly-digest, inbound, send-beta-confirmation)

**These routes are only served by Vercel (or `vercel dev`), not by `next dev` locally.**

### Middleware

`middleware.ts` is Vercel Edge Middleware that intercepts profile handle URLs and post URLs, injects OG `<meta>` tags for social crawlers, and JS-redirects human browsers into the SPA.

### Environment Variables

`src/` code still uses `import.meta.env.VITE_*`. `next.config.ts` maps these to `process.env` via webpack `DefinePlugin`, so existing source files work unchanged.

Required in `.env.local` for local dev (see `.env.example`):
- `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_ANON_KEY`
- `VITE_GA_MEASUREMENT_ID`, `VITE_HCAPTCHA_SITE_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_TWITCH_CLIENT_ID`, `VITE_SENTRY_DSN`
- Server-side only (Vercel): `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `HCAPTCHA_SECRET_KEY`

### Android / Capacitor

Android builds use **Vite** (not Next.js) because Capacitor requires a static file bundle. Vite outputs to `dist/`, which `capacitor.config.ts` references via `webDir: 'dist'`.

```bash
npm run build:android  # vite build → dist/, then npx cap sync android
```

`src/main.tsx` is the Vite entry point used only for Android. `src/app/App.tsx` and `src/app/routes.tsx` are only active in the Vite/Android build path — they are dead code for the Next.js web build but cannot be deleted while the Android build exists.

### UI Conventions

- **GlowBackground** sits at `position: fixed; z-index: 0`. Page content is at `z-index: 1`. Use `bg-card/80 backdrop-blur-xl` (not solid `bg-background`) so the glow shows through pages and modals.
- **Tailwind CSS 4** — Next.js uses `@tailwindcss/postcss`; config lives in `app/globals.css` via `@import 'tailwindcss'`. Vite uses `@tailwindcss/vite`; config in `src/styles/tailwind.css`.
- Radix UI primitives: `src/app/components/ui/`. Feature components: `src/app/components/`.
- **ProfileAvatar** size `"md"` = `w-12 h-12` (48px). Center from a `p-4` container left edge = 40px. Used to align thread connector lines.
- Radix `DropdownMenuItem` `onSelect` fires during the close animation — wrap callbacks in `setTimeout(..., 0)` to let the dropdown close before opening a modal.

### Key Integrations

- **Fediverse**: `src/app/utils/bluesky.ts` (ATProto — like, repost, follow) + `src/app/utils/mastodonAuth.ts` (Mastodon OAuth). OAuth callbacks → `supabase/functions/social-auth/`.
- **Capacitor**: Android builds use Vite → `dist/`. Run `npm run build:android` to sync.
- **Sentry**: `@sentry/react` is initialized in `src/main.tsx` (Android/Vite only). Web/Next.js currently has no Sentry init — migrate to `@sentry/nextjs` for full coverage.
- **Stripe**: Payment intent server-side in `api/stripe/create-payment-intent.ts`; fulfilled via webhook in `api/stripe/webhook.ts`.
- **hCaptcha**: Bot protection on signup; site key is `VITE_HCAPTCHA_SITE_KEY`.
