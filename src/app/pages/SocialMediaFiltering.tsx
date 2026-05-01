import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { PlatformIcon } from '../components/PlatformIcon';

const PLATFORMS: { id: string; name: string; description: string }[] = [
  { id: 'bluesky',   name: 'Bluesky',         description: 'AT Protocol / Bluesky posts' },
  { id: 'mastodon',  name: 'Mastodon',         description: 'Mastodon & ActivityPub servers' },
  { id: 'x',        name: 'X (Twitter)',       description: 'Posts imported from X / Twitter' },
  { id: 'threads',  name: 'Threads',           description: 'Meta Threads posts' },
  { id: 'tumblr',   name: 'Tumblr',            description: 'Tumblr posts' },
  { id: 'reddit',   name: 'Reddit',            description: 'Reddit posts and links' },
  { id: 'tiktok',   name: 'TikTok',            description: 'TikTok videos and clips' },
  { id: 'instagram', name: 'Instagram',        description: 'Instagram posts and reels' },
  { id: 'youtube',  name: 'YouTube',           description: 'YouTube videos and shorts' },
  { id: 'twitch',   name: 'Twitch',            description: 'Twitch clips and streams' },
  { id: 'rednote',  name: 'Red Note',          description: 'Red Note (小红书) posts' },
  { id: 'upscrolled', name: 'Upscrolled',      description: 'Upscrolled posts' },
];

export function SocialMediaFiltering() {
  const navigate = useNavigate();
  const { filteredSocialPlatforms, toggleSocialPlatformFilter } = useAppData();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="w-full px-4 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Third-Party Post Filtering</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <p className="text-muted-foreground mb-6">
          Control which platforms appear in your feed. Disable a platform to hide imported posts from it — including Bluesky, Mastodon, and other fediverse servers.
        </p>

        <div className="space-y-2">
          {PLATFORMS.map((platform) => {
            const isEnabled = !filteredSocialPlatforms.has(platform.id);

            return (
              <button
                key={platform.id}
                onClick={() => toggleSocialPlatformFilter(platform.id)}
                className="w-full px-4 py-4 flex items-center gap-4 rounded-xl bg-card hover:bg-secondary transition-colors"
              >
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                  <PlatformIcon platform={platform.id as any} className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold">{platform.name}</h3>
                  <p className="text-sm text-muted-foreground">{platform.description}</p>
                </div>
                <div className="flex-shrink-0">
                  <div className={`w-12 h-6 rounded-full transition-colors relative ${isEnabled ? 'bg-accent' : 'bg-muted'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-card rounded-xl border border-border">
          <h3 className="font-semibold mb-2">About Third-Party Posts</h3>
          <p className="text-sm text-muted-foreground">
            These settings apply to posts imported from connected social media accounts, including Bluesky, Mastodon, and other fediverse services. Posts created directly on Forge are always visible.
          </p>
        </div>
      </div>
    </div>
  );
}
