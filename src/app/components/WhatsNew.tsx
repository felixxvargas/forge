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
    version: 'v0.3.0',
    date: 'April 2026',
    title: "What's New in Forge",
    summary: "Modernized the messaging experience and Feed updates. Google Play Store build submitted!",
    highlights: [
      'Read receipts in direct messages; see when your message was read',
      'Group chat read receipts; tap the avatar stack to see who has read messages',
      'Typing indicators in DMs and group chats',
      'Add Emoji reactions on DMs and group messages; long-press any message to react or delete',
      'Tag Groups in posts now. Tapping a group tag on a post navigates to the group page',
      'Post directly to a game from the game detail page',

    ],
  },
  {
    version: 'v0.2.6',
    date: 'April 2025',
    title: "What's New in Forge",
    summary: "Gaming media in your feeds, encrypted DMs, image alt text, Premium, and more.",
    highlights: [
      'Gaming news and media accounts now appear in the Trending and For You feeds',
      'Direct messages are now end-to-end encrypted',
      'Add alt text to images when composing a post',
      'Forge Premium subscription available; support the app and unlock perks',
      'Captcha verification added to login and signup for improved security',
    ],
  },
  {
    version: 'v0.2.5',
    date: 'April 2025',
    title: "What's New in Forge",
    summary: "Threaded replies, following feed improvements, and polish.",
    highlights: [
      'Threaded replies on post detail pages',
      'Bluesky & Mastodon posts now appear correctly in the Following feed',
      'Tap a user\'s avatar or handle in Messages to view their profile',
      'Repost counts update correctly for external posts',
      'View the original post from reply detail pages',
    ],
  },
  {
    version: 'v0.2.4',
    date: 'April 2025',
    title: "What's New in Forge",
    summary: "Quote posts, game list sharing in the feed, and compose improvements.",
    highlights: [
      'Quote post support — the repost tray now offers Repost or Quote Post',
      'Attach a game list preview to any post from compose or from a List page',
      'Tapping a list preview in a post opens the full list',
      'Leaving compose with unsaved content now prompts to save as draft or discard',
    ],
  },
  {
    version: 'v0.2.3',
    date: 'March 2025',
    title: "What's New in Forge",
    summary: "Bluesky and Mastodon improvements, list sharing, and profile polish.",
    highlights: [
      'Follow external Bluesky and Mastodon accounts from Explore',
      'Your Forge follower count is shown on Bluesky external profile pages',
      'Share any game list via a dedicated share tray',
      'Browse other users\' lists of the same type from the List page',
    ],
  },
  {
    version: 'v0.2.1',
    date: 'March 2025',
    title: "What's New in Forge",
    summary: "Forge launched with feeds, profiles, messages, notifications, and more.",
    highlights: [
      'Launch of Forge — Feed, Explore, Messages, Profiles, Notifications, Settings',
      'Follow gaming news accounts via Bluesky and Mastodon (IGN, GameSpot, Xbox, and more)',
      'Login and sign up via Google',
      'Games database powered by IGDB',
      'Public view for signed-out visitors',
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
