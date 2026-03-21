import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { GAMING_PLATFORMS } from '../../constants/platforms';
import { 
  Gamepad2, 
  Monitor, 
  Smartphone, 
  Trophy,
  Sword,
  Heart,
  Puzzle,
  Car,
  Users,
  Sparkles,
  Zap,
  Globe,
  X as XIcon,
  Instagram,
  MessageCircle,
  Video,
  ArrowLeft
} from 'lucide-react';

export interface Interest {
  id: string;
  label: string;
  category: 'platform' | 'genre' | 'social' | 'playstyle';
}

interface InterestsScreenProps {
  onComplete: (interests: Interest[]) => void;
  initialInterests?: Interest[];
}

const interestOptions: { category: string; icon: any; interests: Interest[] }[] = [
  {
    category: 'Platform',
    icon: Monitor,
    interests: GAMING_PLATFORMS.map(platform => ({
      id: platform.id,
      label: platform.name,
      category: 'platform' as const
    }))
  },
  {
    category: 'Genre',
    icon: Gamepad2,
    interests: [
      { id: 'rpg', label: 'RPG', category: 'genre' },
      { id: 'fps', label: 'FPS', category: 'genre' },
      { id: 'moba', label: 'MOBA', category: 'genre' },
      { id: 'strategy', label: 'Strategy', category: 'genre' },
      { id: 'racing', label: 'Racing', category: 'genre' },
      { id: 'puzzle', label: 'Puzzle', category: 'genre' },
      { id: 'adventure', label: 'Adventure', category: 'genre' },
      { id: 'indie', label: 'Indie', category: 'genre' },
      { id: 'horror', label: 'Horror', category: 'genre' },
      { id: 'simulation', label: 'Simulation', category: 'genre' },
      { id: 'fighting', label: 'Fighting', category: 'genre' },
      { id: 'sports', label: 'Sports', category: 'genre' },
      { id: 'platformer', label: 'Platformer', category: 'genre' },
      { id: 'roguelike', label: 'Roguelike', category: 'genre' },
    ]
  },
  {
    category: 'Playstyle',
    icon: Trophy,
    interests: [
      { id: 'competitive', label: 'Competitive', category: 'playstyle' },
      { id: 'casual', label: 'Casual', category: 'playstyle' },
      { id: 'coop', label: 'Co-op', category: 'playstyle' },
      { id: 'solo', label: 'Solo Player', category: 'playstyle' },
      { id: 'speedrun', label: 'Speedrunning', category: 'playstyle' },
      { id: 'collector', label: 'Completionist', category: 'playstyle' },
      { id: 'streamer', label: 'Streaming', category: 'playstyle' },
      { id: 'social', label: 'Social Gaming', category: 'playstyle' },
      { id: 'achievement', label: 'Achievement Hunter', category: 'playstyle' },
      { id: 'story', label: 'Story-Driven', category: 'playstyle' },
    ]
  }
];

const iconMap: { [key: string]: any } = {
  Monitor, Gamepad2, Globe, Trophy
};

export function InterestsScreen({ onComplete, initialInterests }: InterestsScreenProps) {
  const navigate = useNavigate();
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>(initialInterests ?? []);

  const toggleInterest = (interest: Interest) => {
    setSelectedInterests(prev => {
      const exists = prev.find(i => i.id === interest.id);
      if (exists) {
        return prev.filter(i => i.id !== interest.id);
      }
      return [...prev, interest];
    });
  };

  const isSelected = (interestId: string) => {
    return selectedInterests.some(i => i.id === interestId);
  };

  const handleBack = () => {
    // Check if we're in settings flow by looking at URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('step') === 'interests') {
      navigate('/settings');
    }
  };

  return (
    <div className="fixed inset-0 bg-background overflow-y-auto z-50">
      <div className="min-h-screen px-6 py-12 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Back button for settings flow */}
          {new URLSearchParams(window.location.search).get('step') === 'interests' && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Settings</span>
            </button>
          )}
          
          <h1 className="text-3xl font-bold mb-2">What are you into?</h1>
          <p className="text-muted-foreground mb-8">
            Select your interests to personalize your Forge experience
          </p>

          <div className="space-y-8">
            {interestOptions.map((section, sectionIdx) => {
              const Icon = iconMap[section.icon.name] || Gamepad2;
              return (
                <motion.div
                  key={section.category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: sectionIdx * 0.1, duration: 0.5 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-5 h-5 text-accent" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.category}
                    </h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {section.interests.map((interest) => (
                      <button
                        key={interest.id}
                        onClick={() => toggleInterest(interest)}
                        className={`px-4 py-2 rounded-full transition-all ${
                          isSelected(interest.id)
                            ? 'bg-accent/20 text-accent border-2 border-accent'
                            : 'bg-card text-foreground hover:bg-secondary border-2 border-transparent'
                        }`}
                      >
                        {interest.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-6">
        <button
          onClick={() => onComplete(selectedInterests)}
          disabled={selectedInterests.length === 0}
          className={`w-full py-4 rounded-xl font-semibold transition-all ${
            selectedInterests.length === 0
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-accent text-accent-foreground hover:opacity-90'
          }`}
        >
          Continue ({selectedInterests.length} selected)
        </button>
      </div>
    </div>
  );
}