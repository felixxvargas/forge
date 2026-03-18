# Forge - Gaming Social Network

## Project Overview

**Forge** is a mobile-first gaming social application that connects gamers across different gaming platforms and social media websites. It serves as a unified hub for gaming communities, combining features from traditional social networks with gaming-specific functionality.

**Version**: 1.0.0  
**Last Updated**: March 13, 2026  
**Status**: Production-Ready (Backend deployment issues pending resolution)

---

## Core Concept

Forge bridges the gap between different gaming ecosystems and social media platforms, allowing gamers to:

- **Connect Gaming Platforms**: Nintendo, PlayStation, Steam, PC, Battle.net, Riot, Xbox, Epic Games
- **Integrate Social Media**: Bluesky, Tumblr, X (Twitter), TikTok, Instagram, Threads, Red Note, Upscrolled, Discord
- **Share Gaming Experiences**: Cross-post gaming content across multiple platforms
- **Join Communities**: Create and participate in gaming communities (called "Groups")
- **Discover Content**: Find games, players, and gaming media content from trusted sources
- **Real-Time Feeds**: See posts from gaming media outlets (IGN, Polygon, Kotaku, etc.) via Bluesky integration

---

## Tech Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Routing**: React Router v7 (Data mode pattern)
- **Styling**: Tailwind CSS v4.0
- **Animation**: Motion (motion/react) - formerly Framer Motion
- **State Management**: React Context API (AppDataContext, ThemeContext)
- **UI Components**: Custom component library with shadcn/ui patterns
- **Icons**: Lucide React
- **Notifications**: Sonner (toast notifications)

### Backend
- **Platform**: Supabase
- **Server**: Edge Functions running Hono web server
- **Database**: Key-Value store (Supabase KV table)
- **Authentication**: Supabase Auth (Email/Password + Google OAuth)
- **Storage**: Supabase Storage for profile pictures and images
- **External APIs**: 
  - Bluesky Public API (gaming media posts)
  - IGDB API (game artwork and metadata)

### Development
- **Build Tool**: Vite
- **Package Manager**: pnpm
- **TypeScript**: Full type safety across frontend and backend
- **Hot Module Replacement**: Fast refresh during development

---

## Architecture

### Three-Tier Architecture
```
Frontend (React) → Server (Edge Function) → Database (Supabase)
```

### File Structure
```
/
├── docs/                          # All documentation files
├── public/                        # Static assets (favicon, manifest)
├── src/
│   ├── app/
│   │   ├── components/           # Reusable UI components
│   │   │   ├── onboarding/      # Onboarding-specific components
│   │   │   ├── ui/              # Base UI components (buttons, cards, etc.)
│   │   │   └── figma/           # Figma import utilities
│   │   ├── context/             # React Context providers
│   │   ├── data/                # Type definitions and constants
│   │   ├── hooks/               # Custom React hooks
│   │   ├── pages/               # Route pages/screens
│   │   ├── utils/               # Utility functions and API client
│   │   └── routes.tsx           # React Router configuration
│   └── styles/                  # Global styles and theme
├── supabase/
│   └── functions/
│       └── server/              # Edge function server code
└── utils/
    └── supabase/                # Supabase configuration
```

---

## Key Features

### 1. Authentication & Onboarding

**Sign Up/Sign In**:
- Email/password authentication with strong password requirements
- Google OAuth integration (requires Supabase configuration)
- Automatic profile creation on first sign-in
- Session management with JWT tokens

**Onboarding Flow** (4 steps):
1. **Splash Screen**: Animated Forge logo (3-second intro)
2. **Interest Selection**: Choose gaming interests by category (Genre, Platform, Playstyle)
3. **Follow Suggestions**: Recommended users based on selected interests
4. **Username Creation**: Set unique @handle with real-time validation

**Features**:
- Skip functionality on optional steps
- Sequential screens with smooth transitions (Motion animations)
- Progress indicator
- localStorage persistence for completion status

### 2. User Profiles

**Profile Information**:
- Profile picture (with upload and lightbox view)
- Banner image
- Display name, @handle, pronouns (optional)
- Bio and extended "About" section
- Interest tags grouped by category

**Gaming Integration**:
- Platform badges (Nintendo, PlayStation, Steam, etc.)
- Social media integrations with optional handles
- Game library organization:
  - Recently Played
  - Library
  - Favorites
  - Wishlist
- IGDB integration for game artwork

**Community Membership**:
- Join/create gaming communities (Groups)
- Display up to 3 communities on profile
- Role badges (Crown for creator, Shield for moderator)

**Profile Actions**:
- Follow/Unfollow users
- Block users (hides all content)
- Mute users (hides posts but allows interactions)
- Report users (with reason selection)
- Edit profile (full field editing)

### 3. Social Feed

**Two Main Feeds**:
- **Following**: Posts from users you follow
- **For You**: Algorithmic/curated content

**Post Features**:
- Text content (280 character limit recommended)
- Image uploads with ALT text support
- Link previews with Open Graph metadata
- Video thumbnails (placeholder)
- Platform attribution (shows which platform post originated from)
- Timestamps with relative formatting ("2h ago", "3d ago")
- Interactions: Like, Repost, Comment, Share
- @mentions with autocomplete and clickable links
- Mute individual posts (separate from muting users)

**Account Types**:
- **User Accounts**: Standard accounts created by users
- **Topic Accounts**: Gaming media outlets (IGN, Polygon, Kotaku, etc.)

**Cross-Platform Posting**:
- Topic accounts automatically pull posts from Bluesky
- Real-time gaming news from trusted sources
- Full media content (images, videos) displayed directly
- Platform attribution on each cross-posted item
- Cached with 5-minute TTL to reduce API calls

**Post Actions**:
- Like/Unlike (purple heart icon)
- Repost/Unrepost (shows "Reposted by..." attribution)
- Comment (opens post detail view)
- Share (via Web Share API or copy link)
- Delete (own posts only)
- Mute post (stops notifications from that thread)

### 4. Communities (Groups)

**Community Types**:
- **Open**: Anyone can join immediately
- **Request**: Requires approval from moderators
- **Invite Only**: Requires invitation from members

**Community Features**:
- Custom emoji icon and banner
- Description and rules
- Member count and mutual friends display
- Community-specific posts
- Role system:
  - Creator (crown badge)
  - Moderator (shield badge)
  - Member
- Join/leave functionality
- Request approval system

**Community Management**:
- Create new communities
- Invite members
- Approve join requests
- Remove members
- Promote to moderator

### 5. Explore Page

**Three Tabs**:
- **Posts**: Trending/featured posts from gaming media
  - Real Bluesky posts from IGN, Polygon, Kotaku, etc.
  - Infinite scroll (placeholder)
- **Users**: User discovery and suggestions
  - Follow suggestions based on interests
  - Search users by handle or display name
- **Groups**: Browse and join communities
  - Filter by type (Open, Request, Invite Only)
  - See mutual friends in each community

**Search**:
- Floating search bar (sticky at bottom on mobile)
- Real-time search across users and communities
- Focus mode expands results
- Keyboard navigation support

**Tab Persistence**:
- Selected tab persists across navigation
- Smooth transitions between tabs

### 6. Notifications

**Notification Types**:
- New followers
- Likes on your posts
- Comments on your posts
- Reposts of your content
- Community invites/approvals
- Mention notifications (@username)
- Thread notifications (muted posts excluded)

**Features**:
- In-app toggle for toast notifications
- Unread indicator in header
- Mark all as read functionality
- Timestamp for each notification
- Deep links to relevant content

### 7. Messages (Direct Messaging)

**Features**:
- Direct messaging between users
- Conversation list with previews
- Unread indicators
- Real-time updates (simulated in prototype)
- Search conversations
- Typing indicators (placeholder)

**Message Actions**:
- Send text messages
- Delete messages
- Block user from messages
- Report inappropriate messages

### 8. Settings

**Account Settings**:
- Email and password management
- Profile information
- Delete account

**Privacy Controls**:
- Private account toggle
- Block list management
- Muted users list
- Muted posts list

**Notification Preferences**:
- In-app toast notifications toggle
- Email notifications (placeholder)
- Push notifications (placeholder)

**Appearance**:
- Light/Dark mode toggle
- Theme persists across sessions

**Gaming Platforms**:
- Enable/disable platforms
- Set platform handles
- Toggle handle visibility

**Social Media Integrations**:
- Connect social accounts
- Set social handles
- Filter posts by platform (hide specific platforms from feed)

**Display Preferences**:
- Language selection (placeholder)
- Accessibility options (placeholder)

### 9. Admin Panel

**Location**: `/admin`

**Features**:
- **Check User**: Look up user by email, see auth and profile status
- **Update Password**: Admin password reset
- **Update Profile**: Change display name or handle
- **Create Profile**: Manually create profile for auth user
- **Complete Onboarding**: Mark onboarding as complete
- **Seed Database**: One-click topic account seeding
- **Review Indie Game Submissions**: Approve/reject community submissions

**Use Cases**:
- Troubleshoot authentication issues
- Reset user passwords
- Fix incomplete profiles
- Initialize database with topic accounts

### 10. Game Features

**Game Library**:
- Add games to Recently Played, Library, Favorites, Wishlist
- IGDB integration for game artwork and metadata
- Game detail pages with cover art, description, platforms
- Search games by title

**Game Discovery**:
- Browse popular games (placeholder)
- See what friends are playing
- Game recommendations (placeholder)

**Indie Game Submissions**:
- Community members can submit indie games
- Admin review process
- Approved games appear in discovery

### 11. Safety & Moderation

**User Safety**:
- Block users (complete content hiding)
- Mute users (hide posts, keep profile access)
- Mute posts (disable thread notifications)
- Report users with reason selection
- Report posts (placeholder)

**Content Moderation**:
- Admin review queue for reports
- User blocking prevents all interactions
- Muted content can be shown on demand ("Show anyway")

**Privacy**:
- Private accounts (placeholder)
- Control who can message you (placeholder)
- Control who can see your game library (placeholder)

---

## User Flows

### New User Journey

1. **Land on Login Page**
   - Option: Sign up with email/password
   - Option: Sign in with Google OAuth
   
2. **Create Account**
   - Enter email, password, confirm password
   - Password validation with strength indicator
   - Submit → Creates auth account + profile
   
3. **Onboarding** (4 steps)
   - Splash screen (3 seconds)
   - Select interests (Genre, Platform, Playstyle)
   - Follow suggested users (based on interests)
   - Create unique @handle
   
4. **Arrive at Feed**
   - See posts from followed users
   - See posts from gaming media (topic accounts)
   - Write first post
   
5. **Explore & Engage**
   - Browse Explore tabs (Posts, Users, Groups)
   - Join communities
   - Like, repost, comment on posts
   - Build game library

### Posting Content

1. **Compose Post**
   - Click Write Post button (header or floating)
   - Enter text content (with @mention autocomplete)
   - Optional: Add image with ALT text
   - Optional: Add link (auto-generates preview)
   - Optional: Tag community
   
2. **Post Interactions**
   - Like/Unlike
   - Repost/Unrepost
   - Comment (opens detail view)
   - Share via Web Share API
   - Mute post (disable notifications)
   
3. **Manage Posts**
   - Delete own posts
   - View post analytics (placeholder)

### Community Engagement

1. **Discover Groups**
   - Browse Explore → Groups tab
   - Search by name
   - See mutual friends in groups
   
2. **Join Group**
   - Open → Instant join
   - Request → Wait for approval
   - Invite Only → Need invitation
   
3. **Participate**
   - Post in community
   - Comment on community posts
   - See community feed
   
4. **Manage (if creator/mod)**
   - Approve join requests
   - Remove members
   - Promote to moderator
   - Edit community settings

---

## Design System

### Color Theme

**Primary Color**: Purple (Violet)
- `--color-primary`: #7C3AED (purple-600)
- Used for: Primary actions, links, active states

**Accent Color**: Lime Green
- `--color-accent`: #84CC16 (lime-500)
- Used for: CTAs, highlights, special actions

**Background Colors** (Dark Mode Default):
- `--background`: #09090B (zinc-950)
- `--card`: #18181B (zinc-900)
- `--secondary`: #27272A (zinc-800)

**Text Colors**:
- `--foreground`: #FAFAFA (zinc-50)
- `--muted-foreground`: #A1A1AA (zinc-400)

**Semantic Colors**:
- `--destructive`: #EF4444 (red-500) - Delete, block actions
- `--border`: #27272A (zinc-800)

### Typography

**Font Family**: Poppins
- Loaded from Google Fonts
- Applied globally to body

**Font Sizes** (defined in theme.css):
- Headings: h1 (2rem), h2 (1.5rem), h3 (1.25rem)
- Body: 1rem
- Small: 0.875rem

**Font Weights**:
- Light: 300
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

### Visual Elements

**Logo**: Thunderbolt/Zap icon
- Used in: Navigation, splash screen, favicon
- Color: Primary purple or white (on dark backgrounds)

**Rounded Corners**:
- Cards: rounded-xl (0.75rem)
- Buttons: rounded-lg (0.5rem)
- Avatars: rounded-full (fully circular)
- Inputs: rounded-lg (0.5rem)

**Shadows**:
- Cards: shadow-lg
- Modals: shadow-2xl
- Floating elements: shadow-xl

**Spacing System**: 4px grid
- gap-2: 0.5rem (8px)
- gap-4: 1rem (16px)
- gap-6: 1.5rem (24px)

### Component Styling

**Buttons**:
- Primary: `bg-primary text-white hover:bg-primary/90`
- Accent: `bg-accent text-black hover:bg-accent/90`
- Ghost: `hover:bg-secondary`
- Destructive: `bg-destructive text-white hover:bg-destructive/90`

**Input Fields**:
- `bg-secondary border border-border text-foreground`
- Focus: `ring-2 ring-primary`

**Cards**:
- `bg-card rounded-xl border border-border`
- Hover: `hover:bg-card/80 transition-colors`

**Avatars**:
- Small: 32px
- Medium: 40px (default)
- Large: 56px
- Extra Large: 96px

### Accessibility

- **Color Contrast**: WCAG 2.1 AA compliant
- **Focus Indicators**: Visible focus rings on all interactive elements
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Semantic HTML and ARIA labels
- **Alt Text**: Required for all images
- **Light/Dark Mode**: User preference toggle

---

## API Endpoints

### Base URL
```
https://{projectId}.supabase.co/functions/v1/make-server-17285bd7
```

### Authentication Endpoints

**POST /auth/signup**
- Body: `{ email, password, displayName, handle, pronouns? }`
- Creates auth user and profile
- Returns user and session

**POST /auth/signin**
- Body: `{ email, password }`
- Returns session with access token

**GET /auth/me**
- Headers: `Authorization: Bearer {token}`
- Returns current user profile

### User Endpoints

**GET /users/:userId**
- Returns user profile by ID

**GET /users/handle/:handle**
- Returns user profile by @handle

**GET /users/me/profile**
- Headers: `Authorization: Bearer {token}`
- Returns authenticated user's full profile

**PUT /users/me/profile**
- Headers: `Authorization: Bearer {token}`
- Body: User profile updates
- Updates profile fields

**POST /users/me/profile-picture**
- Headers: `Authorization: Bearer {token}`
- Body: `{ imageData }` (base64 or file)
- Uploads profile picture to Supabase Storage

**GET /users/topic-accounts**
- Returns all topic accounts (gaming media)

**GET /users/check-handle/:handle**
- Checks if handle is available

### Post Endpoints

**GET /posts**
- Query: `?userId={id}` (optional)
- Returns posts (filtered by user if provided)

**POST /posts**
- Headers: `Authorization: Bearer {token}`
- Body: `{ content, images?, url?, imageAlts?, communityId? }`
- Creates new post

**DELETE /posts/:postId**
- Headers: `Authorization: Bearer {token}`
- Deletes own post

**POST /posts/:postId/like**
- Headers: `Authorization: Bearer {token}`
- Likes a post

**DELETE /posts/:postId/like**
- Headers: `Authorization: Bearer {token}`
- Unlikes a post

**GET /users/me/likes**
- Headers: `Authorization: Bearer {token}`
- Returns array of liked post IDs

**POST /posts/:postId/mute**
- Headers: `Authorization: Bearer {token}`
- Mutes a post (disables thread notifications)

**DELETE /posts/:postId/mute**
- Headers: `Authorization: Bearer {token}`
- Unmutes a post

**GET /users/me/muted-posts**
- Headers: `Authorization: Bearer {token}`
- Returns array of muted post IDs

### Follow Endpoints

**POST /users/:userId/follow**
- Headers: `Authorization: Bearer {token}`
- Follows a user

**DELETE /users/:userId/follow**
- Headers: `Authorization: Bearer {token}`
- Unfollows a user

**GET /users/:userId/followers**
- Returns array of follower user objects

**GET /users/:userId/following**
- Returns array of following user objects

**GET /users/me/following-ids**
- Headers: `Authorization: Bearer {token}`
- Returns array of following user IDs

### Safety Endpoints

**POST /users/:userId/block**
- Headers: `Authorization: Bearer {token}`
- Blocks a user

**DELETE /users/:userId/block**
- Headers: `Authorization: Bearer {token}`
- Unblocks a user

**GET /users/me/blocks**
- Headers: `Authorization: Bearer {token}`
- Returns array of blocked user IDs

**POST /users/:userId/mute**
- Headers: `Authorization: Bearer {token}`
- Mutes a user

**DELETE /users/:userId/mute**
- Headers: `Authorization: Bearer {token}`
- Unmutes a user

**GET /users/me/mutes**
- Headers: `Authorization: Bearer {token}`
- Returns array of muted user IDs

**POST /users/:userId/report**
- Headers: `Authorization: Bearer {token}`
- Body: `{ reason, description? }`
- Reports a user

### Game Endpoints

**GET /games/search**
- Query: `?query={searchTerm}`
- Searches IGDB for games

**POST /games**
- Headers: `Authorization: Bearer {token}`
- Body: `{ igdbId, title, coverArt, year, platforms, genres }`
- Creates game entry

**POST /users/me/games/:listType**
- Headers: `Authorization: Bearer {token}`
- Body: `{ gameIds: string[] }`
- Updates game list (recentlyPlayed, library, favorites, wishlist)

### Bluesky Integration Endpoints

**GET /bluesky/profile/:handle**
- Returns Bluesky profile data
- Cached for 5 minutes

**GET /bluesky/posts/:handle**
- Query: `?limit={number}` (default: 10)
- Returns Bluesky posts for handle
- Cached for 5 minutes

**GET /bluesky/posts/all/gaming-media**
- Query: `?limit={number}` (default: 5 per account)
- Returns aggregated posts from all gaming media accounts
- Cached for 5 minutes

### Admin Endpoints

**GET /admin/check-user/:email**
- Returns auth user and profile status

**POST /admin/update-password**
- Body: `{ email, newPassword }`
- Admin password reset

**POST /admin/update-profile**
- Body: `{ email, displayName?, handle? }`
- Updates user profile

**POST /admin/create-profile**
- Body: `{ email, displayName?, handle? }`
- Creates profile for auth user

**POST /admin/complete-onboarding**
- Body: `{ email }`
- Marks onboarding as complete

### Seed Endpoints

**POST /seed/topic-accounts**
- Seeds all topic accounts
- Creates @forge account
- Makes @forge follow @felix
- Creates welcome post from @forge

---

## Database Schema (Key-Value Store)

### User Profile
```
Key: user:{userId}
Value: {
  id: string
  handle: string
  displayName: string
  pronouns?: string
  bio: string
  about?: string
  profilePicture: string
  bannerImage?: string
  email?: string
  platforms: Platform[]
  platformHandles: Record<Platform, string>
  showPlatformHandles: Record<Platform, boolean>
  socialPlatforms: SocialPlatform[]
  socialHandles: Record<SocialPlatform, string>
  showSocialHandles: Record<SocialPlatform, boolean>
  gameLists: {
    recentlyPlayed: Game[]
    library: Game[]
    favorites: Game[]
    wishlist: Game[]
  }
  followerCount: number
  followingCount: number
  communities: CommunityMembership[]
  displayedCommunities: string[]
  interests: Interest[]
  accountType?: 'topic' | 'user'
  authProvider?: 'email' | 'google'
  createdAt: string
  updatedAt: string
}
```

### Handle Lookup
```
Key: user:handle:{@handle}
Value: userId
```

### Post
```
Key: post:{postId}
Value: {
  id: string
  userId: string
  content: string
  platform: SocialPlatform | 'forge'
  timestamp: string
  likes: number
  reposts: number
  comments: number
  images?: string[]
  imageAlts?: string[]
  url?: string
  video?: string
  communityId?: string
  createdAt: string
}
```

### Like
```
Key: like:{userId}:{postId}
Value: {
  userId: string
  postId: string
  timestamp: string
}
```

### Follow
```
Key: follow:{followerId}:{followingId}
Value: {
  followerId: string
  followingId: string
  timestamp: string
}
```

### Block
```
Key: block:{userId}:{blockedId}
Value: {
  userId: string
  blockedId: string
  timestamp: string
}
```

### Mute User
```
Key: mute:{userId}:{mutedId}
Value: {
  userId: string
  mutedId: string
  timestamp: string
}
```

### Mute Post
```
Key: mute-post:{userId}:{postId}
Value: {
  userId: string
  postId: string
  timestamp: string
}
```

### Report
```
Key: report:{reportId}
Value: {
  id: string
  reporterId: string
  reportedUserId: string
  reason: string
  description?: string
  timestamp: string
  status: 'pending' | 'reviewed' | 'resolved'
}
```

---

## Environment Variables

### Required Secrets (Already Configured)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (server-side only)
- `SUPABASE_DB_URL`: Database connection string
- `IGDB_CLIENT_ID`: IGDB API client ID
- `IGDB_CLIENT_SECRET`: IGDB API client secret

### Optional
- Google OAuth credentials (configured in Supabase dashboard, not environment variables)

---

## Current Status

### ✅ Completed Features
- Full authentication system (email/password + Google OAuth)
- User profiles with gaming/social integrations
- Social feed with Following/For You tabs
- Real Bluesky integration for gaming media posts
- IGDB integration for game artwork
- Post creation with images, links, @mentions
- Like, repost, comment interactions
- Follow/unfollow users
- Block/mute/report users
- Mute individual posts (separate from muting users)
- Communities (Groups) system
- Explore page with Posts/Users/Groups tabs
- Notifications system
- Messages (DM) system
- Settings with theme toggle
- Onboarding flow
- Admin panel
- Indie game submission system
- Profile picture upload to Supabase Storage
- Share functionality via Web Share API
- Error handling with ErrorBoundary and toast notifications
- Favicon with Forge logo
- @mentions autocomplete while typing

### ⚠️ Known Issues
- **Backend Deployment**: Edge functions experiencing 404 errors on cold starts
  - Following users doesn't work
  - Creating posts doesn't persist
  - Profile picture uploads fail
  - All features work correctly once edge function warms up
- **Google OAuth**: Requires manual configuration in Supabase dashboard

### 🚧 In Progress / Future Enhancements
- Fix edge function cold start issues
- Real-time messaging with WebSocket
- Push notifications
- Advanced search and filtering
- User blocking from messages
- Community moderation tools
- Events and tournaments
- Voice/video calls (future consideration)
- Desktop application (future consideration)
- Game library sync with Steam/PlayStation/Xbox APIs
- Email notifications
- Private accounts enforcement
- Analytics and insights

---

## Development Guidelines

### Code Style
- **Components**: Functional components with hooks
- **File Naming**: PascalCase for components, camelCase for utilities
- **Import Order**: React → Third-party → Local components → Utilities → Types
- **Props**: Destructure in function signature with TypeScript interfaces
- **State**: Use Context for global state, useState for local

### Component Creation
- Place in `/src/app/components/` directory
- Use TypeScript interfaces for props
- Export as named export
- Include JSDoc comments for complex components
- Follow existing patterns for consistency

### Styling Guidelines
- Use Tailwind utility classes
- Avoid custom font-size/font-weight unless overriding theme
- Define theme values in `/src/styles/theme.css`
- Import fonts only in `/src/styles/fonts.css`
- Use consistent spacing (gap-2, gap-4, gap-6)
- Add hover states for all interactive elements
- Use transition classes for smooth animations

### Backend Development
- All server code in `/supabase/functions/server/`
- Import external packages via `npm:` or `jsr:` specifiers
- Use `node:` prefix for Node built-ins
- All routes prefixed with `/make-server-17285bd7`
- Return user-friendly error messages
- Log errors to console for debugging
- Use CORS middleware from `npm:hono/cors`

---

## Testing

### Manual Testing Checklist
- [ ] Sign up new user (email/password)
- [ ] Sign in existing user
- [ ] Complete onboarding flow
- [ ] Create post with text
- [ ] Create post with image
- [ ] Create post with @mention
- [ ] Like/unlike posts
- [ ] Repost/unrepost posts
- [ ] Follow/unfollow users
- [ ] Block/unblock users
- [ ] Mute/unmute users
- [ ] Mute/unmute posts
- [ ] Edit profile
- [ ] Upload profile picture
- [ ] Join community
- [ ] Search users
- [ ] Browse Explore tabs
- [ ] View notifications
- [ ] Send message
- [ ] Toggle light/dark mode
- [ ] Share post via Web Share API
- [ ] Admin panel operations

### Browser Compatibility
- Chrome/Edge (Chromium) ✅
- Firefox ✅
- Safari ✅ (iOS and macOS)
- Mobile browsers ✅

### Device Testing
- iPhone/iOS ✅
- Android ✅
- Tablet (iPad/Android) ✅
- Desktop (1920x1080+) ✅

---

## Deployment

### Frontend
- Built with Vite
- Hosted on Figma Make infrastructure
- Automatic deployments on code changes

### Backend
- Supabase Edge Functions
- Deployed via Supabase CLI or dashboard
- Currently experiencing cold start issues (under investigation)

### Database
- Supabase PostgreSQL
- Key-value store using custom table
- Automatic backups

---

## Credits & Attribution

### External Services
- **Supabase**: Backend infrastructure
- **Bluesky**: Real-time gaming media posts
- **IGDB**: Game artwork and metadata
- **Unsplash**: Placeholder images (development only)

### Open Source Libraries
- React, React Router, Tailwind CSS, Motion, Lucide React, Sonner
- Full list in `package.json`

---

## Support & Resources

### Documentation
- [React Documentation](https://react.dev)
- [React Router Documentation](https://reactrouter.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Motion Documentation](https://motion.dev)
- [Supabase Documentation](https://supabase.com/docs)

### Project Links
- Guidelines: `/docs/Guidelines.md`
- Setup Instructions: `/docs/SETUP_INSTRUCTIONS.md`
- Deployment Help: `/docs/DEPLOYMENT_HELP.md`
- Database Schema: `/docs/DATABASE_SCHEMA.sql`

---

**Forge** - Connecting gamers across platforms, one post at a time. ⚡
