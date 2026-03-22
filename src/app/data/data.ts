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
  | 'library'
  | 'favorite'
  | 'wishlist'
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
  bannerImage?: string;
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

// Gaming media topic accounts
export const topicAccounts: User[] = [
  {
    id: 'user-ign',
    handle: '@ign',
    displayName: 'IGN',
    bio: "We're all about movies, TV, and video games!",
    profilePicture: 'https://cdn.bsky.app/img/avatar/plain/did:plc:xwqgusybtrpm67tcwqdfmzvy/bafkreifjtza52etlgjuek5iuqwi7j7izlxuanffvizj2ry5s5g4dbh47ju@jpeg',
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
    bio: 'Every gamer wants to be Massively Overpowered! MMORPG news and opinions from the indie team at MOP.',
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
    email: 'admin@forge.com',
    profilePicture: '/forge-avatar.png',
    platforms: [],
    socialPlatforms: ['x', 'bluesky', 'threads'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  // Gaming studios
  {
    id: 'user-blizzard',
    handle: '@blizzard',
    displayName: 'Blizzard Entertainment',
    bio: 'Dedicated to creating the most epic entertainment experiences... ever.',
    profilePicture: '',
    platforms: ['pc'],
    socialPlatforms: ['x', 'youtube', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-riot',
    handle: '@riot',
    displayName: 'Riot Games',
    bio: 'We are Riot Games. We exist to be the most player-focused game company in the world.',
    profilePicture: '',
    platforms: ['pc'],
    socialPlatforms: ['x', 'youtube', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-larian',
    handle: '@larian',
    displayName: 'Larian Studios',
    bio: 'Makers of Divinity: Original Sin, Baldur\'s Gate 3, and more.',
    profilePicture: '',
    platforms: ['steam', 'pc'],
    socialPlatforms: ['x', 'youtube', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-koop',
    handle: '@koop',
    displayName: 'KO_OP',
    bio: 'Worker-owned indie game studio. Making Thirsty Suitors, GNOG, and more.',
    profilePicture: '',
    platforms: ['steam', 'pc'],
    socialPlatforms: ['x', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-fromsoft',
    handle: '@fromsoft',
    displayName: 'FromSoftware',
    bio: 'Japanese video game developer and publisher. Dark Souls, Elden Ring, Armored Core.',
    profilePicture: '',
    platforms: ['playstation', 'xbox', 'steam'],
    socialPlatforms: ['x'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  // Gaming platforms
  {
    id: 'user-nintendo',
    handle: '@nintendo',
    displayName: 'Nintendo',
    bio: 'Welcome to Nintendo! The official home of the Nintendo account on Bluesky.',
    profilePicture: '',
    platforms: ['nintendo'],
    socialPlatforms: ['x', 'youtube', 'bluesky'],
    gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
    followerCount: 0,
  },
  {
    id: 'user-playstation',
    handle: '@playstation',
    displayName: 'PlayStation',
    bio: 'Be the player. Official PlayStation account.',
    profilePicture: '',
    platforms: ['playstation'],
    socialPlatforms: ['x', 'youtube', 'instagram', 'bluesky'],
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
    id: 'user-steam',
    handle: '@steam',
    displayName: 'Steam',
    bio: 'The ultimate destination for playing, discussing, and creating games. Official Steam account.',
    profilePicture: '',
    platforms: ['steam'],
    socialPlatforms: ['x', 'bluesky'],
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
];

// No posts - will be loaded from backend and Bluesky integration
export const initialPosts: Post[] = [];

// Groups are loaded from Supabase via AppDataContext
export const communities: Group[] = [];