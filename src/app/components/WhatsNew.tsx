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
    version: 'v0.2.5',
    date: 'April 2025',
    title: "What's New in Forge",
    summary: "Reply threading, following feed improvements, and polish across the board.",
    highlights: [
      'Threaded replies on post detail pages with vertical connector lines',
      'Bluesky, Mastodon, and topic account posts now appear correctly in the Following feed',
      'Clicking a user\'s avatar or handle in Messages navigates to their profile',
      'Repost counts now update correctly for external posts',
      'View original post link on reply detail pages',
      '"Followed by" separator text no longer bold',
      'Follower count no longer flashes on profile load',
    ],
  },
  {
    version: 'v0.2.4',
    date: 'April 2025',
    title: "What's New in Forge",
    summary: "Quote posts, list sharing in the feed, compose improvements, and URL fixes.",
    highlights: [
      'Quote post support — repost tray now offers Repost or Quote Post',
      'Attach a game list preview to any post from compose or from the List page',
      'Tapping a list preview in a post opens the full list detail page',
      'Navigation away from an unsaved draft now prompts to keep editing or discard',
      'Fixed canonical URL for Upwork and social crawlers',
      'Bug fixes and quality of life improvements',
    ],
  },
  {
    version: 'v0.2.3',
    date: 'March 2025',
    title: "What's New in Forge",
    summary: "Bluesky and Mastodon integration improvements, share lists, and profile polish.",
    highlights: [
      'External Bluesky and Mastodon accounts can now be followed from Explore',
      'Forge follower count shown on Bluesky external profile pages',
      'Share any game list via link with a dedicated share tray',
      'Browse other users\' lists of the same type from the List page',
      'Read-only indicators on external (Bluesky/Mastodon) post engagement buttons',
      'Bluesky and Mastodon login/signup options temporarily hidden pending full integration',
    ],
  },
  {
    version: 'v0.2.1',
    date: 'March 2025',
    title: "What's New in Forge",
    summary: "Forge launched and improvements were made across profiles, content, notifications, and settings.",
    highlights: [
      'Launch of Forge: Feed, Explore, Messages, Profiles, Notifications, Settings & Login/Signup',
      'Follow gaming accounts via ATProto and ActivityPub (IGN, GameSpot, Xbox, itch.io, PC Gamer, MassivelyOP, and more)',
      'Login and sign up via Google',
      'Games database integrated with IGDB',
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
