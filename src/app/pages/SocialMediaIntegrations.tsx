import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Check } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import type { SocialPlatform } from '../data/data';

const availableSocialPlatforms: { id: SocialPlatform; name: string; description: string; icon: string }[] = [
  { id: 'bluesky', name: 'Bluesky', description: 'Decentralized social network', icon: '🦋' },
  { id: 'mastodon', name: 'Mastodon', description: 'Federated social network', icon: '🐘' },
  { id: 'x', name: 'X (Twitter)', description: 'Social media platform', icon: '𝕏' },
  { id: 'instagram', name: 'Instagram', description: 'Photo and video sharing', icon: '📷' },
  { id: 'tiktok', name: 'TikTok', description: 'Short-form video', icon: '🎵' },
  { id: 'threads', name: 'Threads', description: 'Text-based conversations', icon: '@' },
  { id: 'discord', name: 'Discord', description: 'Gaming chat & communities', icon: '🎮' },
  { id: 'tumblr', name: 'Tumblr', description: 'Microblogging platform', icon: 't' },
  { id: 'rednote', name: 'Red Note', description: 'Social and e-commerce', icon: '📕' },
  { id: 'upscrolled', name: 'Upscrolled', description: 'Community platform', icon: '↑' },
];

export function SocialMediaIntegrations() {
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useAppData();
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(
    currentUser.social_platforms || currentUser.socialPlatforms || []
  );

  const togglePlatform = (platform: SocialPlatform) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const handleSave = () => {
    updateCurrentUser({ social_platforms: selectedPlatforms });
    navigate('/edit-profile');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/edit-profile')}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">Social Media</h1>
          </div>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <p className="text-muted-foreground mb-6">
          Connect your social media accounts to share and discover gaming content
        </p>

        <div className="space-y-2">
          {availableSocialPlatforms.map((platform) => {
            const isSelected = selectedPlatforms.includes(platform.id);

            return (
              <button
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                className={`w-full px-4 py-4 flex items-center gap-4 rounded-xl transition-colors ${
                  isSelected
                    ? 'bg-accent/20 border-2 border-accent'
                    : 'bg-card border-2 border-transparent hover:bg-secondary'
                }`}
              >
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center flex-shrink-0 text-2xl">
                  {platform.icon}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold">{platform.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {platform.description}
                  </p>
                </div>
                {isSelected && (
                  <Check className="w-6 h-6 text-accent flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
