import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Check } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import type { SocialPlatform } from '../data/data';

// SVG logo components for each social platform
const BlueskySVG = () => (
  <svg viewBox="0 0 360 320" className="w-6 h-6" fill="currentColor">
    <path d="M180 141.964C163.699 110.262 119.326 49.825 75.5 27.4 49.5 14.1 0 3.1 0 59.5c0 28.9 16.6 99.5 27.9 119.9 15.7 27.1 47.4 38.9 77.1 27.6 30.8-11.7 33.1-45.6 33.1-45.6s-3.9 55.2-39.3 78.4c-35.4 23.2-82.2 5.4-82.2 5.4s34.4 116.6 163.4 85.2c129-31.4 163.4-85.2 163.4-85.2s-46.8 17.8-82.2-5.4c-35.4-23.2-39.3-78.4-39.3-78.4s2.3 33.9 33.1 45.6c29.7 11.3 61.4-.5 77.1-27.6C344.4 159 360 88.4 360 59.5c0-56.4-49.5-45.4-75.5-32.1C240.7 49.8 196.3 110.3 180 142z"/>
  </svg>
);

const MastodonSVG = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z"/>
  </svg>
);

const XSVG = () => (
  <svg viewBox="0 0 300 271" className="w-5 h-5" fill="currentColor">
    <path d="m236 0h46l-101 115 118 156h-92.6l-72.5-94.8-83 94.8h-46l107-123-113-148h94.9l65.5 86.6zm-16.1 244h25.5l-165-218h-27.4z"/>
  </svg>
);

const InstagramSVG = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const TikTokSVG = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.53V6.78a4.85 4.85 0 01-1.02-.09z"/>
  </svg>
);

const ThreadsSVG = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.8 3.207 3.399 5.1a13.869 13.869 0 0 1 .556 3.99c0 .286-.005.703-.015 1.14-.06 2.5-.77 4.458-2.11 5.823-1.223 1.247-2.881 1.835-4.94 1.748a5.417 5.417 0 0 1-2.366-.643 3.785 3.785 0 0 1-1.638-1.642c-.363-.688-.497-1.45-.387-2.234.203-1.42 1.043-2.638 2.348-3.442.915-.563 1.972-.878 3.11-.934a8.877 8.877 0 0 0-.319-1.08c-.25-.591-.614-1.02-1.103-1.293-.622-.35-1.42-.367-2.195-.05-.633.262-1.08.674-1.366 1.256a.748.748 0 0 1-1.454-.326c.44-.716 1.107-1.271 2.052-1.664 1.273-.527 2.648-.503 3.756.065.857.447 1.48 1.164 1.852 2.126.26.674.4 1.404.435 2.177 1.016-.054 1.98-.272 2.8-.699.946-.499 1.566-1.263 1.74-2.147.108-.547.112-1.095.012-1.628a6.76 6.76 0 0 0-.3-1.014C15.7 3.27 14.873 2.59 13.783 2.14c-.953-.393-2.077-.578-3.346-.554-1.394.025-2.585.362-3.54 1.003C5.847 3.444 4.99 4.59 4.472 6.18c-.44 1.348-.612 2.912-.55 4.836.055 1.768.292 3.267.71 4.458.508 1.44 1.317 2.52 2.402 3.214.9.569 1.99.873 3.246.9h.005c1.175.024 2.192-.252 3.022-.82.793-.54 1.374-1.332 1.728-2.354a9.64 9.64 0 0 0 .14-.454c-.538.15-1.106.23-1.698.237zm.25-5.203c-.59.025-1.153.17-1.654.428-.718.37-1.165.96-1.29 1.64-.09.485-.013.993.218 1.438.26.503.69.893 1.27 1.163.65.3 1.38.4 2.084.286.996-.16 1.79-.662 2.36-1.493.17-.248.315-.51.435-.779a5.346 5.346 0 0 0-.994-.39c-.78-.42-1.284-1.063-1.43-1.293z"/>
  </svg>
);

const DiscordSVG = () => (
  <svg viewBox="0 -28.5 256 256" className="w-6 h-6" fill="currentColor">
    <path d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320615 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z"/>
  </svg>
);

const TumblrSVG = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M14.563 24c-5.093 0-7.031-3.756-7.031-6.411V9.747H5.116V6.648c3.63-1.313 4.512-4.596 4.71-6.469C9.84.051 9.941 0 9.999 0h3.517v6.114h4.801v3.633h-4.82v7.47c.016 1.001.375 2.371 2.207 2.371h.09c.228-.008 1.092-.058 1.8-.943l2.388 2.692c-1.163 1.748-3.223 2.663-5.419 2.663z"/>
  </svg>
);

const RedNoteSVG = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM8 17v-1.5c0-.28.22-.5.5-.5h7c.28 0 .5.22.5.5V17H8zm8-4H8v-1.5c0-.28.22-.5.5-.5h.5V9h5v2h.5c.28 0 .5.22.5.5V13z"/>
  </svg>
);

const UpscrolledSVG = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 11 12 6 7 11"/>
    <polyline points="17 18 12 13 7 18"/>
  </svg>
);

const PLATFORM_ICONS: Record<string, () => React.ReactElement> = {
  bluesky: BlueskySVG,
  mastodon: MastodonSVG,
  x: XSVG,
  instagram: InstagramSVG,
  tiktok: TikTokSVG,
  threads: ThreadsSVG,
  discord: DiscordSVG,
  tumblr: TumblrSVG,
  rednote: RedNoteSVG,
  upscrolled: UpscrolledSVG,
};

const availableSocialPlatforms: { id: SocialPlatform; name: string; description: string }[] = [
  { id: 'bluesky', name: 'Bluesky', description: 'Decentralized social network' },
  { id: 'mastodon', name: 'Mastodon', description: 'Federated social network' },
  { id: 'x', name: 'X (Twitter)', description: 'Social media platform' },
  { id: 'instagram', name: 'Instagram', description: 'Photo and video sharing' },
  { id: 'tiktok', name: 'TikTok', description: 'Short-form video' },
  { id: 'threads', name: 'Threads', description: 'Text-based conversations' },
  { id: 'discord', name: 'Discord', description: 'Gaming chat & communities' },
  { id: 'tumblr', name: 'Tumblr', description: 'Microblogging platform' },
  { id: 'rednote', name: 'Red Note', description: 'Social and e-commerce' },
  { id: 'upscrolled', name: 'Upscrolled', description: 'Community platform' },
];

export function SocialMediaIntegrations() {
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useAppData();
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(
    currentUser?.social_platforms || currentUser?.socialPlatforms || []
  );
  const [isSaving, setIsSaving] = useState(false);

  const togglePlatform = (platform: SocialPlatform) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCurrentUser({ social_platforms: selectedPlatforms });
      navigate('/edit-profile');
    } catch (err) {
      console.error('Failed to save social platforms:', err);
    } finally {
      setIsSaving(false);
    }
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
            disabled={isSaving}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save'}
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
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                  {(() => { const Icon = PLATFORM_ICONS[platform.id]; return Icon ? <Icon /> : null; })()}
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
