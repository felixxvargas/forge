import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

interface Release {
  version: string;
  date: string;
  title: string;
  summary: string;
  highlights: string[];
}

export const RELEASES: Release[] = [
  {
    version: 'v0.2.1',
    date: 'March 2025',
    title: "What's New in Forge",
    summary: "Forge launched and improvements were made across profiles, content, notifications, and settings.",
    highlights: [
      'Launch of Forge: Feed, Explore, Messages, Profiles, Notifications, Settings & Login/Signup',
      'Follow gaming accounts via ATProto and ActivityPub (IGN, GameSpot, Xbox, itch.io, PC Gamer, MassivelyOP, and more)',
      'Login and sign up via Google',
      'Games databases integrated with IGDB',
      'Public view of Forge for users that are not signed in',
      'Data deletion page added (GDPR/privacy compliance)',
      'Bug fixes and quality of life improvements',
    ],
  },
];

const STORAGE_KEY = 'forge-whats-new-seen';

export function WhatsNewModal() {
  const [visible, setVisible] = useState(false);
  const [release] = useState<Release>(RELEASES[0]);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== release.version) {
      setVisible(true);
    }
  }, [release.version]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, release.version);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <div className="bg-card rounded-2xl w-full max-w-md flex flex-col max-h-[85dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">{release.title}</h2>
          </div>
          <button onClick={dismiss} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <p className="text-sm text-muted-foreground">{release.summary}</p>
          <ul className="space-y-2.5">
            {release.highlights.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border">
          <button
            onClick={dismiss}
            className="w-full py-2.5 bg-accent text-accent-foreground rounded-xl font-medium hover:bg-accent/90 transition-colors text-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
