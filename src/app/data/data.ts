// Data types and initial data for Forge gaming social app

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
  | 'discord'
  | 'mastodon'
  | 'twitch'
  | 'reddit'
  | 'facebook'
  | 'github'
  | 'youtube'
  | 'spotify'
  | 'youtubemusic'
  | 'soundcloud'
  | 'patreon';

export type GameListType =
  | 'recently-played'
  | 'played-before'
  | 'library'
  | 'favorite'
  | 'wishlist'
  | 'completed'
  | 'custom'
  | 'lfg';

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
  genres?: string[];
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
  externalUrl?: string; // Link back to original post on Bluesky/Mastodon (camelCase, legacy)
  external_url?: string; // Link back to original post on Bluesky/Mastodon (snake_case, from DB)
  game_id?: string;
  game_title?: string;
  // Supabase snake_case aliases
  user_id?: string;
  created_at?: string;
  like_count?: number;
  repost_count?: number;
  comment_count?: number;
  image_alts?: string[];
  flare_id?: string;
  quote_post_id?: string;
  quotedPost?: Post; // resolved quoted post object (client-side join)
  attached_list?: {
    listType: string;
    userId: string;
    title: string;
    gameCount: number;
    covers: string[]; // up to 4 cover art URLs
  };
  is_blurred?: boolean;
  game_titles?: string[];
  game_ids?: string[];
  reposts_disabled?: boolean;
  comments_disabled?: boolean;
  reply_to?: string;
}

// Sample game data
export const sampleGames: Game[] = [
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
  handle: '@felix',
  displayName: 'Felix',
  email: 'felixvgiles@gmail.com',
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

// Gaming media topic accounts — only accounts with verified Bluesky domain handles
export const topicAccounts: User[] = [
  {
    id: 'user-ign',
    handle: '@ign',
    displayName: 'IGN',
    bio: "We're all about movies, TV, and video games!",
    profilePicture: '',
    platforms: [],
    socialPlatforms: ['x', 'instagram', 'tiktok', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 181484,
  },
  {
    id: 'user-gamespot',
    handle: '@gamespot',
    displayName: 'GameSpot',
    bio: 'The world in play',
    profilePicture: '',
    platforms: [],
    socialPlatforms: ['x', 'instagram', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-xbox',
    handle: '@xbox',
    displayName: 'Xbox',
    bio: 'Play more. Official Xbox account.',
    profilePicture: '',
    platforms: ['xbox'],
    socialPlatforms: ['x', 'youtube', 'instagram', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-itchio',
    handle: '@itchio',
    displayName: 'itch.io',
    bio: 'The indie game marketplace. Thousands of games by independent creators.',
    profilePicture: '',
    platforms: ['pc'],
    socialPlatforms: ['x', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-pcgamer',
    handle: '@pcgamer',
    displayName: 'PC Gamer',
    bio: 'The global authority on PC games.',
    profilePicture: '',
    platforms: ['pc'],
    socialPlatforms: ['x', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-massivelyop',
    handle: '@massivelyop',
    displayName: 'MassivelyOP',
    bio: 'MMORPG news and opinions.',
    profilePicture: 'https://files.mastodon.social/accounts/avatars/109/515/680/214/374/940/original/f14946fe2da19d10.png',
    platforms: [],
    socialPlatforms: ['mastodon'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 1210,
  },
  {
    id: 'user-forge',
    handle: '@forge',
    displayName: 'Forge',
    bio: 'The gaming social network for everyone. Share your gaming adventures across all platforms. 🎮⚡',
    email: 'admin@forge-social.app',
    profilePicture: '/forge-avatar.png',
    platforms: [],
    socialPlatforms: ['x', 'bluesky', 'threads'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
];

// No posts - will be loaded from backend and Bluesky integration
export const initialPosts: Post[] = [];

// Groups are loaded from Supabase via AppDataContext
export const communities: Group[] = [];