import type { Platform } from '../data/data';

export interface PlatformOption {
  id: Platform;
  name: string;
  description: string;
}

// Shared platform list used across the app
export const GAMING_PLATFORMS: PlatformOption[] = [
  { id: 'nintendo', name: 'Nintendo', description: 'Switch, 3DS, and more' },
  { id: 'playstation', name: 'PlayStation', description: 'PS5, PS4, and PS VR' },
  { id: 'xbox', name: 'Xbox', description: 'Xbox Series X|S, Xbox One' },
  { id: 'steam', name: 'Steam', description: 'PC gaming platform' },
  { id: 'pc', name: 'PC Gaming', description: 'Epic, GOG, and other PC games' },
  { id: 'battlenet', name: 'Battle.net', description: 'Blizzard games' },
  { id: 'riot', name: 'Riot Games', description: 'League of Legends, Valorant' }
];
