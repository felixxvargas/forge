import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Check, Edit2 } from 'lucide-react';
import { PlatformIcon } from '../components/PlatformIcon';
import { useAppData } from '../context/AppDataContext';
import { GAMING_PLATFORMS } from '../constants/platforms';
import type { Platform } from '../data/data';

export function GamingPlatforms() {
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useAppData();
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(currentUser?.platforms || []);

  const togglePlatform = (platform: Platform) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const handleSave = () => {
    updateCurrentUser({ platforms: selectedPlatforms });
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">Gaming Platforms</h1>
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
          Select the gaming platforms you use to connect with other gamers
        </p>

        <div className="space-y-2">
          {GAMING_PLATFORMS.map((platform) => {
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
                <div className="flex-shrink-0">
                  <PlatformIcon platform={platform.id} />
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