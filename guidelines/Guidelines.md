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
- **Framework**: React 18+
- **Router**: React Router v7 (Data mode pattern)
- **Styling**: Tailwind CSS v4
- **Animation**: Motion (motion/react)
- **State Management**: React Context API
- **Language**: TypeScript

### File Structure
```
/src
  /app
    /components       # Reusable UI components
      /onboarding    # Onboarding-specific components
    /context         # React Context providers
    /data            # Mock data and type definitions
    /pages           # Route pages/screens
    /styles          # Global styles and theme
  /guidelines        # Documentation
```

### Routing Pattern
The app uses React Router's Data mode with a Layout component that wraps all authenticated routes:
- **Login/Onboarding**: Standalone routes without layout
- **Main App**: Wrapped in Layout with BottomNav and AppDataProvider
- **Protected Routes**: Check for authentication and onboarding completion

---

## Features

### 1. Authentication & Onboarding
**Flow**:
1. **Login Screen**: Email/password or Google OAuth (prototype uses mock authentication)
2. **Splash Screen**: Animated logo and app name (3-second animation)
3. **Interest Selection**: Choose gaming interests and preferences
4. **Follow Suggestions**: Recommended users to follow based on interests
5. **Username Creation**: Real-time validation and uniqueness check

**Implementation**:
- Uses localStorage for persistence (`forge-logged-in`, `forge-onboarding-complete`)
- Sequential screens with AnimatePresence for smooth transitions
- Skip functionality available on optional steps

### 2. User Profiles
**Features**:
- Profile picture and banner
- Display name, username (handle), pronouns (optional)
- Bio text
- Gaming platforms badges
- Social media integrations
- Game library (Recently Played, Library, Favorites, Wishlist)
- Community memberships (max 3 displayed, customizable)
- Follower/following counts

**Edit Profile**:
- All profile fields editable
- Platform/social toggles
- Community selection (max 3 for profile display)
- Role badges (Crown for creator, Shield for moderator)

### 3. Social Feed
**Two main feeds**:
- **Following**: Posts from users you follow
- **For You**: Algorithmic/curated content

**Post Features**:
- Text content (with platform attribution)
- Image support (single or multiple)
- Gif and video support
- Link previews
- Community tags
- Timestamp (relative formatting: "2h ago", "3d ago")
- Like, Repost, Comment interactions
- Repost attribution ("Reposted by...")

**Post Types**:
- Native Forge posts
- Cross-posted from integrated social platforms
- Community posts (tagged with community info)

**Account Types**:
- Standard (User created account or claimed account)
- Topic (Unclaimed account): popular gaming websites and studios (IGN, Gamespot, Nintendo Life, Game Informer, PC Gamer, Xbox, PlayStation, Nintendo, Blizzard, Riot, GoG, etc.)

**Topic Account Cross-Posting**:
- Topic accounts automatically generate posts on Forge whenever content is published to their accounts on other social media platforms
- These posts and attachments are recreated in full (not just previews) on Forge
- Cross-posted content is clearly marked with the originating social media platform
- Full media content (images, videos, gifs) is displayed directly in the Forge feed
- Platform attribution appears on each cross-posted item

**Repost Mechanics**:
- Example posts have varied repost counts (36, 52, 147, etc.)
- User-created posts start at 0 reposts
- Reposted posts show attribution banner
- Visual indicator for posts you've reposted (accent color)

### 4. Communities
**Community Types**:
- **Open**: Anyone can join immediately
- **Request**: Requires approval from moderators/creator
- **Invite Only**: Requires invitation from members

**Community Features**:
- Custom icon and banner
- Description and member count
- Friends who play (shows mutual friends in community)
- Community-specific posts
- Role system (Creator, Moderator, Member)
- Join/leave functionality

**Community Display**:
- Users can select up to 3 communities to display on profile
- Communities shown as chips with icons
- Click to view full community page

### 5. Explore Page
**Tabs**:
- **Posts**: Trending/featured posts from gaming media
- **Users**: User discovery and suggestions
- **Games**: Game discovery (placeholder for future implementation)
- **Communities**: Browse and join communities

**Search**:
- Floating search bar at bottom
- Real-time search across users, communities, and games
- Focus mode expands search results

### 6. Notifications
**Types**:
- New followers
- Likes on your posts
- Comments on your posts
- Reposts of your content
- Community invites/approvals
- Friend requests

### 7. Messages
**Features**:
- Direct messaging between users
- Conversation list
- Unread indicators
- Real-time updates (simulated in prototype)

### 8. Settings
**Sections**:
- Account settings
- Privacy controls
- Notification preferences
- Theme toggle (light/dark mode)
- Gaming platform management
- Social media integrations
- Social media filtering (hide specific platforms from feed)

---

## Data Models

### User
```typescript
interface User {
  id: string;
  handle: string;              // @username
  displayName: string;
  pronouns?: string;           // Optional
  bio: string;
  profilePicture: string;
  bannerImage?: string;
  platforms: Platform[];       // Gaming platforms
  socialPlatforms: SocialPlatform[];
  gameLists: {
    recentlyPlayed: Game[];
    library: Game[];
    favorites: Game[];
    wishlist: Game[];
  };
  followerCount?: number;
  isFollowing?: boolean;
  communities?: CommunityMembership[];
  displayedCommunities?: string[];  // Community IDs to show on profile (max 3)
}
```

### Post
```typescript
interface Post {
  id: string;
  userId: string;
  content: string;
  platform: SocialPlatform | 'forge';
  timestamp: Date;
  likes: number;
  reposts: number;
  comments: number;
  isLiked?: boolean;
  isReposted?: boolean;
  repostedBy?: string;         // User ID who reposted
  images?: string[];
  url?: string;
  communityId?: string;        // If posted in a community
}
```

### Community
```typescript
interface Community {
  id: string;
  name: string;
  description: string;
  type: 'open' | 'request' | 'invite';
  icon: string;                // Emoji
  banner?: string;
  creatorId: string;
  moderatorIds: string[];
  memberIds: string[];
  memberCount: number;
}
```

### Game
```typescript
interface Game {
  id: string;
  title: string;
  coverArt: string;
  year: number;
  platforms: string[];
  genres: string[];
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

### Component Creation
```typescript
// Standard component template
import { useState } from 'react';
import { ComponentProps } from '../types';

interface MyComponentProps {
  // Define props with TypeScript
}

export function MyComponent({ prop1, prop2 }: MyComponentProps) {
  // Component logic
  return (
    // JSX
  );
}
```

### Styling Guidelines
- Use Tailwind utility classes
- Avoid custom font-size, font-weight, and line-height classes unless overriding
- Define custom theme values in `/src/styles/theme.css`
- Import fonts only in `/src/styles/fonts.css`
- Use consistent spacing (gap-2, gap-3, gap-4, etc.)
- Hover states for all interactive elements
- Transition classes for smooth animations

### Images
- Use Unsplash for placeholder images
- Always provide alt text
- Use object-cover for consistent aspect ratios
- Lazy load images below the fold

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

### Modal Patterns
- Use fixed positioning with backdrop
- Close on backdrop click or X button
- Trap focus within modal
- Escape key to close

### List Patterns
- Use unique keys (IDs, not indices)
- Empty states for no data
- Loading states for async data
- Infinite scroll for long lists (future enhancement)

---

## State Management

### AppDataContext
Provides global state for:
- Current user data
- Posts (feed, user posts, community posts)
- Liked posts (Set)
- Reposted posts (Set)
- Hidden social platforms (Set)
- User lookup functions

**Key Functions**:
- `updateCurrentUser(updates)`: Update user profile
- `updateGameList(type, games)`: Update game library
- `createPost(content, images, url)`: Create new post
- `deletePost(postId)`: Delete user's post
- `likePost(postId)` / `unlikePost(postId)`: Toggle like
- `repostPost(postId)` / `unrepostPost(postId)`: Toggle repost
- `toggleSocialPlatformFilter(platform)`: Hide/show platform posts

### ThemeContext
Provides theme state:
- Current theme ('light' | 'dark')
- Toggle function

### Best Practices
- Don't duplicate state across contexts
- Use local state when data isn't needed globally
- Memoize expensive computations
- Batch state updates when possible

---

## Testing Guidelines (Future)

### Unit Tests
- Test pure functions and utilities
- Test custom hooks
- Snapshot tests for components

### Integration Tests
- Test user flows (onboarding, posting, etc.)
- Test routing navigation
- Test form submissions

### E2E Tests
- Critical user journeys
- Cross-browser testing
- Mobile device testing

---

## Deployment

### Build Process
1. Run `npm run build`
2. Output to `/dist` directory
3. Serve static files

### Environment Variables
- API endpoints (when backend is added)
- OAuth credentials
- Analytics keys

### Performance Checklist
- [ ] Images optimized
- [ ] Code splitting enabled
- [ ] Bundle size analyzed
- [ ] Lighthouse score > 90
- [ ] Accessibility audit passed

---

## Future Enhancements

### Planned Features
- Real-time messaging with WebSocket
- Push notifications
- Game library sync with Steam/PlayStation/Xbox APIs
- Social media OAuth integrations
- Advanced search and filtering
- User blocking and reporting
- Community moderation tools
- Events and tournaments
- Voice/video calls
- Desktop application

### Technical Debt
- Replace mock data with real API
- Implement proper authentication
- Add database persistence
- Add error boundaries
- Add loading skeletons
- Implement proper image upload
- Add rate limiting
- Add caching layer

---

## Contributing

### Pull Request Process
1. Create feature branch from `main`
2. Follow code style guidelines
3. Write tests for new features
4. Update documentation
5. Submit PR with clear description

### Code Review Checklist
- [ ] Code follows style guide
- [ ] TypeScript types are correct
- [ ] Components are responsive
- [ ] Accessibility standards met
- [ ] No console errors/warnings
- [ ] Documentation updated

---

## Support & Resources

### Internal Links
- Design mockups: [Link to Figma]
- API documentation: [Link when available]
- Project board: [Link to task tracker]

### External Resources
- [React Documentation](https://react.dev)
- [React Router Documentation](https://reactrouter.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Motion Documentation](https://motion.dev)

---

**Last Updated**: March 12, 2026  
**Version**: 1.0.0  
**Maintainer**: Forge Development Team