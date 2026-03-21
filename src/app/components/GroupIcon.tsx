import {
  Gamepad2, Shield, Trophy, Zap, Star, Flame, Target, Crown,
  Rocket, Globe, Map, Compass, Brain, Sword, Swords, Skull,
  Wand2, Layers, Mountain, Users, Puzzle, Dice5, Eye, Dumbbell,
  Music, Leaf, Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const GAMING_ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'gamepad', label: 'Controller', Icon: Gamepad2 },
  { key: 'sword', label: 'Sword', Icon: Sword },
  { key: 'swords', label: 'Battle', Icon: Swords },
  { key: 'shield', label: 'Shield', Icon: Shield },
  { key: 'trophy', label: 'Trophy', Icon: Trophy },
  { key: 'target', label: 'Target', Icon: Target },
  { key: 'zap', label: 'Lightning', Icon: Zap },
  { key: 'star', label: 'Star', Icon: Star },
  { key: 'flame', label: 'Fire', Icon: Flame },
  { key: 'crown', label: 'Crown', Icon: Crown },
  { key: 'rocket', label: 'Rocket', Icon: Rocket },
  { key: 'globe', label: 'World', Icon: Globe },
  { key: 'map', label: 'Map', Icon: Map },
  { key: 'compass', label: 'Compass', Icon: Compass },
  { key: 'brain', label: 'Mind', Icon: Brain },
  { key: 'skull', label: 'Skull', Icon: Skull },
  { key: 'wand', label: 'Magic', Icon: Wand2 },
  { key: 'layers', label: 'Levels', Icon: Layers },
  { key: 'mountain', label: 'Mountain', Icon: Mountain },
  { key: 'users', label: 'Squad', Icon: Users },
  { key: 'puzzle', label: 'Puzzle', Icon: Puzzle },
  { key: 'dice', label: 'Dice', Icon: Dice5 },
  { key: 'eye', label: 'Scout', Icon: Eye },
  { key: 'dumbbell', label: 'Power', Icon: Dumbbell },
  { key: 'music', label: 'Rhythm', Icon: Music },
  { key: 'leaf', label: 'Cozy', Icon: Leaf },
  { key: 'waves', label: 'Chill', Icon: Waves },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  GAMING_ICONS.map(({ key, Icon }) => [key, Icon])
);

// Default icon key for new groups
export const DEFAULT_ICON_KEY = 'gamepad';

interface GroupIconProps {
  iconKey: string;
  className?: string;
}

export function GroupIcon({ iconKey, className = 'w-8 h-8' }: GroupIconProps) {
  // Legacy: if iconKey is an emoji, show it as text
  const isEmoji = iconKey && [...iconKey].some(c => c.codePointAt(0)! > 0x2000);
  if (isEmoji) {
    return <span className="text-2xl leading-none">{iconKey}</span>;
  }
  const Icon = ICON_MAP[iconKey] ?? Gamepad2;
  return <Icon className={className} />;
}
