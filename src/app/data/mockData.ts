// Mock data for Forge gaming social app

export type Platform =
  | 'nintendo'
  | 'playstation'
  | 'steam'
  | 'pc'
  | 'mac'
  | 'linux'
  | 'xbox'
  | 'epic'
  | 'ea'
  | 'gog'
  | 'ubisoft'
  | 'rockstar';

export type SocialPlatform = 
  | 'bluesky' 
  | 'tumblr' 
  | 'x' 
  | 'tiktok' 
  | 'instagram' 
  | 'threads' 
  | 'rednote' 
  | 'upscrolled'
  | 'discord';

export type GameListType = 
  | 'recently-played' 
  | 'library' 
  | 'favorite' 
  | 'wishlist' 
  | 'custom';

export type GroupType = 'open' | 'request' | 'invite';

export type GroupRole = 'creator' | 'moderator' | 'member';

export interface Group {
  id: string;
  name: string;
  description: string;
  type: GroupType;
  icon: string;
  banner?: string;
  memberCount: number;
  creatorId: string;
  moderatorIds: string[];
  memberIds?: string[]; // Sample member IDs for avatar display
  createdAt: Date;
}

export interface GroupMembership {
  communityId: string;
  role: GroupRole;
  joinedAt: Date;
}

export interface Game {
  id: string;
  title: string;
  platform: Platform;
  year: number;
  coverArt: string;
}

export interface User {
  id: string;
  handle: string;
  displayName: string;
  pronouns?: string;
  bio: string;
  about?: string;
  profilePicture: string;
  email?: string; // Email address (only available for current user)
  platforms: Platform[];
  platformHandles?: Partial<Record<Platform, string>>; // Gaming handles for each platform
  showPlatformHandles?: Partial<Record<Platform, boolean>>; // Whether to show handle or just platform name
  socialPlatforms: SocialPlatform[];
  socialHandles?: Partial<Record<SocialPlatform, string>>; // Social media handles
  showSocialHandles?: Partial<Record<SocialPlatform, boolean>>; // Whether to display on profile
  gameLists: {
    recentlyPlayed: Game[];
    library: Game[];
    favorites: Game[];
    wishlist: Game[];
    custom?: Game[];
  };
  communities?: GroupMembership[];
  displayedCommunities?: string[]; // IDs of groups to display on profile (max 3)
  isFollowing?: boolean;
  followerCount?: number;
  followingCount?: number;
  interests?: { id: string; label: string; category: 'platform' | 'genre' | 'social' | 'playstyle' }[];
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  platform?: SocialPlatform | 'forge';
  communityId?: string;
  timestamp: Date;
  likes: number;
  reposts: number;
  comments: number;
  isLiked?: boolean;
  isReposted?: boolean;
  repostedBy?: string; // userId who reposted this
  images?: string[];
  imageAlts?: string[]; // Alt text for images (same order as images array)
  video?: string; // Video URL for video posts
  url?: string; // URL for link previews
}

// Mock game data
export const mockGames: Game[] = [
  {
    id: '1',
    title: 'Final Fantasy XIV: Endwalker',
    platform: 'pc',
    year: 2021,
    coverArt: 'https://m.media-amazon.com/images/M/MV5BZmVhMDM2NjAtNzI1MS00NThiLWJjNTYtN2Y3NGY3NjdmNGFhXkEyXkFqcGc@._V1_.jpg'
  },
  {
    id: '2',
    title: "Baldur's Gate 3",
    platform: 'steam',
    year: 2023,
    coverArt: 'https://upload.wikimedia.org/wikipedia/en/1/12/Baldur%27s_Gate_3_cover_art.jpg'
  },
  {
    id: '3',
    title: 'Elden Ring',
    platform: 'playstation',
    year: 2022,
    coverArt: 'https://m.media-amazon.com/images/I/6110RSDn3PL._AC_UF350,350_QL50_.jpg'
  },
  {
    id: '4',
    title: 'The Legend of Zelda: Tears of the Kingdom',
    platform: 'nintendo',
    year: 2023,
    coverArt: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=400&fit=crop'
  },
  {
    id: '5',
    title: 'Hades II',
    platform: 'steam',
    year: 2024,
    coverArt: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=400&fit=crop'
  },
  {
    id: '6',
    title: 'Valorant',
    platform: 'pc',
    year: 2020,
    coverArt: 'https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=300&h=400&fit=crop'
  },
  {
    id: '7',
    title: 'Diablo IV',
    platform: 'pc',
    year: 2023,
    coverArt: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&h=400&fit=crop'
  },
  {
    id: '8',
    title: 'Hollow Knight',
    platform: 'steam',
    year: 2017,
    coverArt: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=300&h=400&fit=crop'
  },
  {
    id: '9',
    title: 'Stardew Valley',
    platform: 'nintendo',
    year: 2016,
    coverArt: 'https://images.unsplash.com/photo-1592155931584-901ac15763e3?w=300&h=400&fit=crop'
  },
  {
    id: '10',
    title: 'Cyberpunk 2077',
    platform: 'steam',
    year: 2020,
    coverArt: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=300&h=400&fit=crop'
  }
];

// Current user data (minimal placeholder - will be replaced with actual user data from backend)
export const currentUser: User = {
  id: 'current-user',
  handle: '@user',
  displayName: 'User',
  bio: '',
  profilePicture: '',
  platforms: [],
  socialPlatforms: [],
  gameLists: {
    recentlyPlayed: [],
    library: [],
    favorites: [],
    wishlist: [],
  },
  followerCount: 0,
  followingCount: 0,
  communities: [],
  displayedCommunities: [],
  interests: []
};

// Other users
export const mockUsers: User[] = [
  // Gaming media accounts
  {
    id: 'user-ign',
    handle: '@ign',
    displayName: 'IGN',
    bio: 'The ultimate gaming and entertainment resource',
    profilePicture: '', // Will be loaded from Bluesky
    platforms: [],
    socialPlatforms: ['x', 'instagram', 'tiktok', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-gamespot',
    handle: '@gamespot',
    displayName: 'GameSpot',
    bio: 'The world in play',
    profilePicture: '', // Will be loaded from Bluesky
    platforms: [],
    socialPlatforms: ['x', 'instagram', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-pcgamer',
    handle: '@pcgamer',
    displayName: 'PC Gamer',
    bio: 'The global authority on PC games',
    profilePicture: '', // Will be loaded from Bluesky
    platforms: [],
    socialPlatforms: ['x', 'threads', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-polygon',
    handle: '@polygon',
    displayName: 'Polygon',
    bio: 'Gaming news, reviews, and more',
    profilePicture: '', // Will be loaded from Bluesky
    platforms: [],
    socialPlatforms: ['x', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-kotaku',
    handle: '@kotaku',
    displayName: 'Kotaku',
    bio: 'Gaming reviews and news',
    profilePicture: '', // Will be loaded from Bluesky
    platforms: [],
    socialPlatforms: ['x', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-eurogamer',
    handle: '@eurogamer',
    displayName: 'Eurogamer',
    bio: 'The leading European video games media',
    profilePicture: '', // Will be loaded from Bluesky
    platforms: [],
    socialPlatforms: ['x', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-destructoid',
    handle: '@destructoid',
    displayName: 'Destructoid',
    bio: 'Independent gaming news and views',
    profilePicture: '', // Will be loaded from Bluesky
    platforms: [],
    socialPlatforms: ['x', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-rockpapershotgun',
    handle: '@rockpapershotgun',
    displayName: 'Rock Paper Shotgun',
    bio: 'PC gaming news and reviews',
    profilePicture: '', // Will be loaded from Bluesky
    platforms: [],
    socialPlatforms: ['x', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-massivelyop',
    handle: '@massivelyop',
    displayName: 'MassivelyOP',
    bio: 'MMORPG news and culture',
    profilePicture: '', // Will be loaded from Mastodon
    platforms: [],
    socialPlatforms: ['bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-forge',
    handle: '@forge',
    displayName: 'Forge',
    bio: 'The gaming social network for everyone. Share your gaming adventures across all platforms. 🎮⚡',
    email: 'admin@forge.com',
    profilePicture: '', // Will use custom logo
    platforms: [],
    socialPlatforms: ['x', 'bluesky', 'threads'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  }
];

// Mock posts
export const mockPosts: Post[] = [];

// Mock groups
export const mockCommunities: Group[] = [
  {
    id: 'comm-1',
    name: 'FFXIV Raiders',
    description: 'Hardcore raiding community for Final Fantasy XIV. Weekly static prog and clears!',
    type: 'request',
    icon: '⚔️',
    banner: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&h=300&fit=crop',
    memberCount: 1247,
    creatorId: 'current-user',
    moderatorIds: [],
    memberIds: ['current-user'],
    createdAt: new Date('2025-08-15T00:00:00')
  },
  {
    id: 'comm-2',
    name: 'Indie Game Lovers',
    description: 'For those who love discovering and discussing indie games. All are welcome!',
    type: 'open',
    icon: '🎮',
    banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=300&fit=crop',
    memberCount: 3421,
    creatorId: 'current-user',
    moderatorIds: [],
    memberIds: ['current-user'],
    createdAt: new Date('2024-12-01T00:00:00')
  },
  {
    id: 'comm-3',
    name: 'Valorant Competitive',
    description: 'Competitive Valorant players. LFG, tips, and rank climbing strategies.',
    type: 'open',
    icon: '🎯',
    banner: 'https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=800&h=300&fit=crop',
    memberCount: 8934,
    creatorId: 'current-user',
    moderatorIds: [],
    memberIds: ['current-user'],
    createdAt: new Date('2025-01-20T00:00:00')
  },
  {
    id: 'comm-4',
    name: 'Soulsborne Veterans',
    description: 'For veterans and newcomers to FromSoft games. Jolly cooperation!',
    type: 'open',
    icon: '🗡️',
    banner: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&h=300&fit=crop',
    memberCount: 5678,
    creatorId: 'current-user',
    moderatorIds: [],
    memberIds: ['current-user'],
    createdAt: new Date('2025-03-10T00:00:00')
  },
  {
    id: 'comm-5',
    name: 'Cozy Gamers',
    description: 'Low-key gaming, cozy vibes. Stardew, Animal Crossing, and chill games.',
    type: 'open',
    icon: '☕',
    banner: 'https://images.unsplash.com/photo-1592155931584-901ac15763e3?w=800&h=300&fit=crop',
    memberCount: 12456,
    creatorId: 'current-user',
    moderatorIds: [],
    memberIds: ['current-user'],
    createdAt: new Date('2024-10-05T00:00:00')
  },
  {
    id: 'comm-6',
    name: 'Elite Speedrunners',
    description: 'Invite-only group for verified speedrunners. Share strats and WR attempts.',
    type: 'invite',
    icon: '⏱️',
    memberCount: 234,
    creatorId: 'current-user',
    moderatorIds: [],
    memberIds: ['current-user'],
    createdAt: new Date('2025-05-12T00:00:00')
  }
];

// Add groups to users
mockUsers[0].communities = [
  { communityId: 'comm-3', role: 'creator', joinedAt: new Date('2025-01-20T00:00:00') }
];

mockUsers[1].communities = [
  { communityId: 'comm-1', role: 'moderator', joinedAt: new Date('2025-08-16T00:00:00') },
  { communityId: 'comm-4', role: 'creator', joinedAt: new Date('2025-03-10T00:00:00') }
];

mockUsers[2].communities = [
  { communityId: 'comm-2', role: 'creator', joinedAt: new Date('2024-12-01T00:00:00') },
  { communityId: 'comm-5', role: 'creator', joinedAt: new Date('2024-10-05T00:00:00') }
];