import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import type { SocialPlatform } from '../data/data';

const socialPlatforms: { id: SocialPlatform; name: string; icon: string }[] = [
  { id: 'bluesky', name: 'Bluesky', icon: '🦋' },
  { id: 'tumblr', name: 'Tumblr', icon: 't' },
  { id: 'x', name: 'X (Twitter)', icon: '𝕏' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
  { id: 'instagram', name: 'Instagram', icon: '📷' },
  { id: 'threads', name: 'Threads', icon: '@' },
  { id: 'rednote', name: 'Red Note', icon: '📕' },
  { id: 'upscrolled', name: 'Upscrolled', icon: '↑' }
];

export function SocialMediaFiltering() {
  const navigate = useNavigate();
  const { filteredSocialPlatforms, toggleSocialPlatformFilter } = useAppData();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Third-Party Posts</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <p className="text-muted-foreground mb-6">
          Choose which social media platforms you want to see posts from in your feed. 
          Disable platforms to hide their imported posts.
        </p>

        <div className="space-y-2">
          {socialPlatforms.map((platform) => {
            const isEnabled = !filteredSocialPlatforms.has(platform.id);
            
            return (
              <button
                key={platform.id}
                onClick={() => toggleSocialPlatformFilter(platform.id)}
                className="w-full px-4 py-4 flex items-center gap-4 rounded-xl bg-card hover:bg-secondary transition-colors"
              >
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center flex-shrink-0 text-2xl">
                  {platform.icon}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold">{platform.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {isEnabled ? 'Posts visible' : 'Posts hidden'}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      isEnabled ? 'bg-accent' : 'bg-muted'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        isEnabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-card rounded-xl border border-border">
          <h3 className="font-semibold mb-2">About Third-Party Posts</h3>
          <p className="text-sm text-muted-foreground">
            These settings only apply to posts imported from connected social media accounts. 
            Posts created directly on Forge will always be visible.
          </p>
        </div>
      </div>
    </div>
  );
}