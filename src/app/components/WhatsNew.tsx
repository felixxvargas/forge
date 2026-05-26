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
    version: 'v0.3.8',
    date: 'May 2026',
    title: "What's New in Forge",
    summary: "Forge AI Insights, community-voted game wiki, pull-to-refresh, and the Forge Blog.",
    highlights: [
      'Forge AI Insights: ask any question about a game and get an instant AI-powered answer via Gemini.',
      'Submit insights to that game\'s Insights / Wiki tab for community review — 70% approval after 24 hours makes it permanent.',
      'New Insights / Wiki tab on every game page; vote on pending insights to help grow the knowledge base.',
      '"Search with Forge AI" now appears at the top of Explore search results — 50 AI queries per day.',
      'Pull-to-refresh: drag down on the feed to load new posts.',
      'Forge Blog is live at forge-social.app/blog — product updates, roadmap, and announcements.',
    ],
  },
  {
    version: 'v0.3.7',
    date: 'May 2026',
    title: "What's New in Forge",
    summary: "Faster loading, Android nav fix, Alpha Tester badge, clean profile URLs, and push notifications.",
    highlights: [
      'Profile URLs now use your handle; share your profile as forge-social.app/profile/yourhandle.',
      'Tapping the comment icon on a post now opens the reply tray with a smooth slide-up animation.',
      'Android push notifications: stay informed of DMs and activity even when the app is closed (beta).',
      'Android: fixed the bottom navigation bar appearing transparent for signed-out users.',
      'Alpha Tester badge: founding members who joined during alpha get a ruby flask icon on their profile.',
    ],
  },
  {
    version: 'v0.3.6',
    date: 'May 2026',
    title: "What's New in Forge",
    summary: "Weekly digests, post previews, @ game mentions, and Gaming Timeline controls.",
    highlights: [
      'Weekly activity digest; get a weekly email summary of your notifications and activity on Forge.',
      'Post link previews now show a real post card when shared on iMessage, Discord, and other platforms.',
      '@ mentions now support tagging games; search by name and see cover art in the dropdown.',
      'Hide or show the new Gaming Timeline tab on your profile via Edit Profile settings.',
    ],
  },
  {
    version: 'v0.3.5',
    date: 'May 2026',
    title: "What's New in Forge",
    summary: "Smarter game search, Google Sign-In on Android, and better performance.",
    highlights: [
      'Improved Search: fuzzy matching for typos and base games rank higher than other versions.',
      'Remasters, remakes, and expanded games now appear correctly on game pages and are linked together.',,
      'Feed skeleton loader layout updated to mirror page structure.',
      'Twitch Archive now fetches a full year of VOD history.', 
    ],
  },
  {
    version: 'v0.3.4',
    date: 'May 2026',
    title: "What's New in Forge",
    summary: "Notification improvements, list editor game discovery, and polish.",
    highlights: [
      'Notification bell now shows unread count with a glowing badge so its easier to see when you have notifications',
      'Discover games while editing your lists without leaving the editor',
      'Cleaner game search results; DLCs, season passes, and duplicate edition variants are filtered out automatically',
      'List previews in posts display cleanly on tablet and mobile',
      'Profile pages now use a wider desktop layout for better use of screen space',
    ],
  },
  {
    version: 'v0.3.3',
    date: 'April 2026',
    title: "What's New in Forge",
    summary: "Messaging upgrades: read receipts, reactions, typing indicators, and more.",
    highlights: [
      'DM read receipts; "Read" now appears below your last sent message once it\'s been seen',,
      'Real message preview text in the conversation list instead of generic "New message"',
      'Composing a post from a Game or Group page now auto-tags that game or group',
      'New floating compose button on Game Detail pages',
    ],
  },
  {
    version: 'v0.3.2',
    date: 'April 2026',
    title: "What's New in Forge",
    summary: "Backend reliability improvements, follow count fixes, and Sentry error tracking.",
    highlights: [,
      'Subscription payments are more reliable with duplicate charge prevention',
      'Error tracking improvements; fewer false positives when loading posts with certain account states',
      'Handle lookups and profile matching are now more accurate and consistent',
      'Performance improvements across data fetching and API calls',
    ],
  },
  {
    version: 'v0.3.1',
    date: 'April 2026',
    title: "What's New in Forge",
    summary: "Android closed beta signup, comment threading improvements, and polish.",
    highlights: [
      'Android closed beta: sign up from Settings or the login page to get a Google Play invite',
      'Post detail pages now show full comment threads with connected reply lines',
      'Game expansion pages link back to the parent game; expansions shown on parent pages',
      'Expansion activity now boosts parent game rankings',
      'Sprout badge visible on profile pages',
    ],
  },
  {
    version: 'v0.3.0',
    date: 'April 2026',
    title: "What's New in Forge",
    summary: "Modernized the messaging experience and Feed updates. Google Play Store build submitted!",
    highlights: [
      'Read receipts in direct messages (and group chats); tap the avatar stack to see who has read messages',
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
      'Quote post support; the repost tray now offers Repost or Quote Post',
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
      'Launch of Forge; Feed, Explore, Messages, Profiles, Notifications, Settings',
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
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <div className="rounded-2xl w-full max-w-md flex flex-col max-h-[85dvh]"
        style={{ background: 'rgba(35,22,60,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.10)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">{release.title}</h2>
            <span className="text-xs font-mono text-muted-foreground">{release.version}</span>
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
