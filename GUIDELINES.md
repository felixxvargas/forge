# Forge — Design & Development Guidelines

Living reference for UI patterns, component conventions, and architecture decisions.

---

## Design System

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `accent` | CSS var (purple) | Primary CTA buttons, active states, highlights |
| `text-[#1c1228]` | Deep purple | Text on accent-colored backgrounds (buttons, pills) |
| `bg-card` | CSS var | Surface backgrounds |
| `bg-secondary` | CSS var | Secondary surfaces, inactive chips |
| `border-border` | CSS var | All borders |
| `text-muted-foreground` | CSS var | Secondary text, placeholders |

### Button Styles

**Primary CTA** — `bg-accent text-[#1c1228] hover:bg-accent/90 rounded-xl`  
**Secondary** — `bg-secondary border-2 border-border text-foreground hover:bg-secondary/80 rounded-xl`  
**Destructive** — `bg-destructive text-white hover:bg-destructive/90`  
**LFG/Flare** — `border-2 border-orange-500/60 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 rounded-xl`  
**Icon-only** — same secondary style with `px-4 py-3` and icon centered

### Filter Chips / Sub-tabs (Forge-branded)

```
Active:   bg-accent text-[#1c1228] px-4 py-2 rounded-full text-sm font-medium
Inactive: bg-secondary text-muted-foreground hover:text-foreground px-4 py-2 rounded-full text-sm font-medium
```

Used in: Explore filter chips, Explore Groups sub-tabs (Groups / Flares).

### Main Tab Bar (Explore, etc.)

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

Used in: CommunityDetail, GameDetail, Profile (lg:w-[340px] left column).

> **Note**: Use `lg:flex-row` (sidebar left, content right). Do NOT use `flex-row-reverse`.

### Profile Desktop Left Column

Width: `lg:w-[340px]` (widened from 300px for better use of space).

### Skeleton / Loading States

Show skeleton on first data load only (`loadingState && data.length === 0`). Use `animate-pulse` with muted placeholder shapes matching the real layout.

---

## Component Conventions

### ShareModal

```tsx
<ShareModal
  isOpen={open}
  onClose={() => setOpen(false)}
  post={post}         // OR
  user={user}         // OR
  game={{ id, title, description, coverUrl }}
/>
```

Supports native `navigator.share()` → falls back to copy link. Also shows Bluesky, Mastodon, and Email share buttons.

### PlatformIcon

Canonical platform keys and their display labels:

| Key | Label | Icon |
|-----|-------|------|
| `pc` | Windows | WindowsIcon |
| `mac` | Mac | AppleIcon |
| `ios` | iOS | AppleIcon |
| `android` | Android | Inline Android SVG |
| `playstation` | PlayStation | PlayStationIcon |
| `xbox` | Xbox | XboxIcon |
| `nintendo` | Nintendo | NintendoIcon |
| `steam` | Steam | SteamIcon |

### ImageUpload

Supports drag-and-drop. Props: `onUpload`, `onRemove`, `accept`, `maxSizeMB`, `bucketType` (`'avatar' | 'post' | 'community-icon' | 'community-banner'`).

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

**External user Follow button**: `bg-accent text-[#1c1228]` (NOT `text-white`). Rounded-lg, not rounded-full.

### Profile (mobile, own profile)

Action buttons below active flares, above Top 8 & tabs:
1. **Create Content** — `bg-accent text-[#1c1228]` → `/new-post`
2. **Create LFG Flare** — orange style → `/create-flare`

Desktop floating button stack (bottom-right): New Post + Create LFG Flare (own profile only).

### Game Detail

**Description expand**: relative container with gradient fade + explicit "Read more ↓ / Show less ↑" button (ChevronDown/Up icons). Shows always when description present.

**Right column order** (top → bottom): Active Flares → Posts → Related Games (Other Versions) → Expansions & DLC → Similar Games.

**Share button**: icon-only square button beside "Add to List" in action row. Opens `ShareModal` with game context.

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

---

## Git Conventions

- No `Co-Authored-By` attribution in commits
- Commit messages: concise, imperative, describe the change (not the task)
- Push to `main` triggers automatic Vercel deployment
