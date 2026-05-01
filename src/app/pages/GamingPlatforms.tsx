import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { PlatformIcon } from '../components/PlatformIcon';
import { useAppData } from '../context/AppDataContext';
import { GAMING_PLATFORMS } from '../constants/platforms';
import type { Platform } from '../data/data';

export function GamingPlatforms() {
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useAppData();

  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(
    currentUser?.platforms || []
  );
  const [platformHandles, setPlatformHandles] = useState<Record<string, string>>(
    currentUser?.platform_handles || currentUser?.platformHandles || {}
  );
  const [showPlatformHandles, setShowPlatformHandles] = useState<Record<string, boolean>>(
    currentUser?.show_platform_handles || currentUser?.showPlatformHandles || {}
  );
  const [isSaving, setIsSaving] = useState(false);

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const toggleShowHandle = (platform: Platform) => {
    setShowPlatformHandles(prev => ({ ...prev, [platform]: !prev[platform] }));
  };

  const updateHandle = (platform: Platform, value: string) => {
    setPlatformHandles(prev => ({ ...prev, [platform]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCurrentUser({
        platforms: selectedPlatforms,
        platform_handles: platformHandles,
        show_platform_handles: showPlatformHandles,
      });
      navigate(-1);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="w-full px-4 h-14 flex items-center justify-between">
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
            disabled={isSaving}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-2">
        <p className="text-sm text-muted-foreground mb-4">
          Select the platforms you game on. Add your username to show it on your profile.
        </p>

        {GAMING_PLATFORMS.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.id);
          return (
            <div
              key={platform.id}
              className={`bg-secondary rounded-lg transition-colors ${isSelected ? 'ring-1 ring-accent/40' : ''}`}
            >
              <div className="flex items-center justify-between p-3">
                <button
                  onClick={() => togglePlatform(platform.id)}
                  className="flex items-center gap-2.5 flex-1 text-left min-w-0"
                >
                  <PlatformIcon platform={platform.id} className="w-4 h-4 shrink-0" />
                  <span className={`font-medium text-sm ${isSelected ? '' : 'text-muted-foreground'}`}>
                    {platform.name}
                  </span>
                </button>
                <div className="flex items-center gap-3">
                  {isSelected && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs text-muted-foreground">Show Handle</span>
                      <input
                        type="checkbox"
                        checked={showPlatformHandles[platform.id] || false}
                        onChange={() => toggleShowHandle(platform.id)}
                        className="w-4 h-4 accent-accent"
                        onClick={e => e.stopPropagation()}
                      />
                    </label>
                  )}
                  <button
                    onClick={() => togglePlatform(platform.id)}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 overflow-hidden ${isSelected ? 'bg-violet-600' : 'bg-muted'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${isSelected ? 'translate-x-[22px]' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
              {isSelected && showPlatformHandles[platform.id] && (
                <div className="px-3 pb-3">
                  <input
                    type="text"
                    value={platformHandles[platform.id] || ''}
                    onChange={e => updateHandle(platform.id, e.target.value)}
                    placeholder={`Your ${platform.name} username`}
                    className="w-full px-3 py-2 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
