import type { ReactNode } from 'react';

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  tags: string[];
  content: () => ReactNode;
};

// ---------------------------------------------------------------------------
// Post 1 — March 18, 2026
// ---------------------------------------------------------------------------

function AnnouncingForgeContent() {
  return (
    <article>
      <p>
        Today we're launching Forge, a social platform built specifically for the gaming community.
      </p>
      <p>
        We're building Forge because we think gaming deserves its own social space. One that puts
        the games first and the algorithm second. One that doesn't treat your gaming activity as
        an afterthought buried in a general-purpose feed.
      </p>

      <h2>What Forge is</h2>
      <p>
        At its core, Forge is a place to share what you're playing, connect with other players, and
        talk about games the way you actually talk about games. Every post can be tagged to a game
        from our full IGDB library with cover art, year, and more metadata so your content is always in
        context.
      </p>
      <p>
        Your profile is your gaming library. Favorites, wishlist, recently played, completed,
        looking-for-group, custom lists; your gaming history lives on Forge, and you can share any
        of those lists as a post and broadcast updates to your gaming lineup.
      </p>
      <p>
        We also built Groups, so communities around specific games and genres have a proper home.
        And because the gaming community already lives across a lot of platforms, we connected Forge
        to the fediverse: view posts across the fediverse and, once we have our own servers on Forge, you'll be able to communicate with your followers on Bluesky and Mastodon too.
      </p>

      <h2>What's available today</h2>
      <ul>
        <li>Following, For You, Trending, and per-game feeds</li>
        <li>Posts with images, video, links, and game tags</li>
        <li>Full game library tracking (8 list categories)</li>
        <li>Groups and communities</li>
        <li>Bluesky and Mastodon federation (partial)</li>
        <li>Replies, reposts, quotes, likes, and polls</li>
        <li>Notifications, Settings, and profile pages</li>
      </ul>

      <h2>How to get access</h2>
      <p>
        We're starting with an open beta on web; we want to pay attention to feedback and build the
        right things early. Sign up at <a href="https://forge-social.app">forge-social.app</a> and
        starting using Forge today.
      </p>
      <p>
        If you're already in the beta, thank you so much. Your feedback over the next few months will
        shape what Forge becomes.
      </p>

      <p className="author-close">— Felix</p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Post 2 — April 28, 2026
// ---------------------------------------------------------------------------

function AndroidBetaContent() {
  return (
    <article>
      <p>
        Six weeks after launch, Forge is coming to Android. Starting today, the Forge Android app
        is available in closed beta.
      </p>

      <h2>What's in the app</h2>
      <p>
        The Android app is the full Forge experience — everything from the web version is there.
        Your feed, game-tagged posts, group pages, game library, fediverse connection, and
        notifications. We built it as a native Android app using Capacitor, which means it feels
        at home on the platform: system back gestures work, the share sheet integrates with other
        apps, and the media picker is native.
      </p>
      <p>
        We put real effort into the mobile-specific experience. The feed is snappy on slower
        connections. The compose screen is redesigned for thumb-friendly use. The reply experience
        uses a sticky bottom bar that expands into the full compose view without navigating away
        from the post.
      </p>

      <h2>How to join</h2>
      <p>
        Head to the <a href="https://forge-social.app/android-beta">Android Beta page</a> and sign
        up with your email. We'll send you an invite link as we expand access over the coming weeks.
        Current Forge web users will be prioritized.
      </p>

      <h2>What's still coming on Android</h2>
      <p>
        Push notifications are the most requested feature and they're in active development — they'll
        land in a follow-up update. We also have a handful of gesture refinements and performance
        improvements queued up based on early tester feedback.
      </p>
      <p>
        As always: if you find something broken, or if there's something you want to see that isn't
        there yet, use the feedback button in the app or reach us directly on Forge.
      </p>
      <p>
        Thanks for being part of this.
      </p>

      <p className="author-close">— Felix</p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Post 3 — May 19, 2026
// ---------------------------------------------------------------------------

// Replace POLL_POST_ID with the actual post ID once available
const POLL_POST_ID = 'POLL_POST_ID';

function RoadmapContent() {
  return (
    <article>
      <p>
        We're two months in. Here's what we've shipped, what we're building next, and — most
        importantly — a question we need your help answering.
      </p>

      <h2>What we've shipped</h2>

      <h3>March 18 - Launch</h3>
      <p>
        The full social layer shipped on day one: following, For You, Trending, and per-game feeds.
        Posts with images, video, links, polls, and inline game tagging against the full IGDB
        library. Reposts, quotes, replies with threading, likes. Your profile as a game library
        across eight categories. Groups. Direct federation with Bluesky and Mastodon. Notifications.
      </p>

      <h3>April 28 - Android closed beta</h3>
      <p>
        The full Forge experience as a native Android app. Feed, compose, groups, game library,
        fediverse sync — all of it. Built with Capacitor for native gesture and media support.
      </p>

      <h3>May 19 — Platform refinements</h3>
      <p>
        Since launch we've shipped a steady stream of improvements: a redesigned reply compose
        screen with a sticky bottom bar that expands in-place on mobile; a full post toolbar
        (images, links, game tags, groups, lists) inside replies; game tag search via{' '}
        <code>@mentions</code> and <code>#tags</code> with cover art previews; post embeds so you
        can share a Forge post on any website; VIP lists; list sharing in posts; feed skeleton
        loaders; and a lot of smaller fixes.
      </p>

      <h2>What's next for H2 2026</h2>

      <h3>Open beta</h3>
      <p>
        We're planning to move into Open Beta for Android devices in early June. Anyone will be able to create an account
        and bring their friends. This is the biggest milestone on the roadmap to date.
      </p>

      <h3>iOS</h3>
      <p>
        An iOS version is in early development on the same Capacitor foundation as Android.
        We'll share a timeline when it's firm.
      </p>

      <h3>Search and discovery</h3>
      <p>
        Today's search is basic. We're building full-text search across posts, games, and people;
        with filters for game, date range, and content type. Following recommendations will also
        improve significantly.
      </p>

      <h3>Fediverse improvements</h3>
      <p>
        Better two-way sync with Bluesky and Mastodon — replies, follows, and notifications
        flowing in both directions rather than just outbound.
      </p>

      <h3>Developer API</h3>
      <p>
        A public API so third-party tools, stream overlays, bots, and integrations can read and
        write to Forge. We'll start with read-only and expand from there.
      </p>

      <h3>Moderation and safety</h3>
      <p>
        Community moderation tools, proper report flows, and trust-and-safety infrastructure as
        we grow. This is non-negotiable as open beta approaches.
      </p>

      <h2>We Want to Hear from You</h2>
      <p>
        We're moving into planning for the 2027 roadmap and we want your input before anything
        gets locked in. What should we prioritize? What's missing that you need every day? What's
        working better than you expected?
      </p>
      <p>
        Vote in the poll below, or reply to tell us directly. Every response gets read.
      </p>

      {/* Embedded Forge poll — replace POLL_POST_ID once available */}
      <div className="my-6">
        {POLL_POST_ID !== 'POLL_POST_ID' ? (
          <iframe
            src={`/embed/post/${POLL_POST_ID}`}
            width="100%"
            style={{ border: 'none', borderRadius: '12px', display: 'block', maxWidth: '550px' }}
            height="280"
            title="Forge community poll"
            scrolling="no"
          />
        ) : (
          <div className="rounded-xl border border-border bg-card/40 px-5 py-4 text-sm text-muted-foreground italic">
            Community poll coming soon — check back shortly.
          </div>
        )}
      </div>

      <p>
        The team will be in the replies. Come find us.
      </p>

      <p className="author-close">— The Forge Team</p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Exported array — newest first
// ---------------------------------------------------------------------------

export const blogPosts: BlogPost[] = [
  {
    slug: 'roadmap-2026',
    title: '2026 Product Roadmap: Where We\'ve Been and Where We\'re Going',
    date: '2026-05-19',
    author: 'The Forge Team',
    excerpt:
      'Two months in. Here\'s everything we\'ve shipped since launch, what\'s coming in H2 2026, and a question we need your help answering.',
    tags: ['Product', 'Roadmap'],
    content: RoadmapContent,
  },
  {
    slug: 'android-closed-beta',
    title: 'Forge on Android: Closed Beta Now Open',
    date: '2026-04-28',
    author: 'The Forge Team',
    excerpt:
      'Six weeks after launch, Forge is now available on Android in closed beta. Here\'s what\'s in the app and how to get access.',
    tags: ['Android', 'Beta'],
    content: AndroidBetaContent,
  },
  {
    slug: 'announcing-forge',
    title: 'Introducing Forge: The Social Platform Built for Gamers',
    date: '2026-03-18',
    author: 'The Forge Team',
    excerpt:
      'Today we\'re launching Forge — a social platform that puts the games first and the algorithm second. Here\'s what we built and how to get early access.',
    tags: ['Launch', 'Announcement'],
    content: AnnouncingForgeContent,
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return blogPosts.find(p => p.slug === slug);
}
