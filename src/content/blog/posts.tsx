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

      <p className="author-close">Felix</p>
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
        The Android app is the full Forge experience. Your feed, game-tagged posts, group pages,
        game library, fediverse connection, and notifications are all there. We built it as a native
        Android app using Capacitor, which means it feels at home on the platform: system back
        gestures work, the share sheet integrates with other apps, and the media picker is native.
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
        Push notifications are the most requested feature and they're in active development. They'll
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

      <p className="author-close">Felix</p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Post 4 — June 10, 2026
// ---------------------------------------------------------------------------

function GamingTimelineContent() {
  return (
    <article>
      <p>
        The votes are in. Gaming Timeline is the feature the community wants most, and we're building it.
      </p>

      <h2>What the poll was asking</h2>
      <p>
        In our last update we asked what Forge should prioritize next: a Gaming Timeline, a Showcase
        feature for highlighting your top moments, deeper fediverse integration, or an AI-powered
        insights layer. Thousands of votes came in. Gaming Timeline won by a wide margin.
      </p>

      <h2>What Gaming Timeline actually is</h2>
      <p>
        The idea is simple: a chronological record of your gaming life. Month by month, you'll be able
        to see which games you were playing, when you added them to your library, and how your taste
        has shifted over time. Think of it like a receipt for every game that has held your attention —
        a record you actually want to exist.
      </p>
      <p>
        It will live on your profile, visible to your followers. You'll be able to scroll back through
        your own history and share specific months as posts.
      </p>

      <h2>We've already started collecting the data</h2>
      <p>
        Here's the part that matters right now: every time you add a game to your Recently Played list,
        we log it. The timestamp, the game, all of it. We started doing this quietly because we knew
        this feature was coming — and we didn't want to build it and then tell you that your history
        only goes back to launch day.
      </p>
      <p>
        If you've been using Forge, your timeline is already taking shape in the background. When the
        feature ships, it won't start from zero — it'll start from whenever you first logged something
        to Recently Played.
      </p>

      <h2>When is it coming</h2>
      <p>
        We don't have a firm date yet. The data layer is in place; now we're working on the display.
        We'll share more when we have something to show. In the meantime: keep playing. Every game
        you log is a data point in a timeline that will eventually be yours to explore.
      </p>

      <p className="author-close">The Forge Team</p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Post 5 — June 17, 2026
// ---------------------------------------------------------------------------

function ForgeInsightsContent() {
  return (
    <article>
      <p>
        We've started building something we're calling Forge Insights. It's early, and we want to
        be honest about what it is right now versus what we believe it can become.
      </p>

      <h2>What it does today</h2>
      <p>
        There's a search bar at the top of the Forge feed. You can ask it anything about a game —
        "how do I beat the final boss," "what's the best build for late game," "where do I find X."
        Tag the game, ask the question, and Forge AI pulls an answer from Gemini in seconds.
      </p>
      <p>
        That's the first half. The second half is what happens after. If the answer is good, you can
        submit it to the community as an Insight. Other users on Forge vote on it — approve or reject.
        If enough people approve it over a 24-hour period, the Insight gets marked as community-approved
        and surfaces on the game's page for anyone who comes looking.
      </p>
      <p>
        The result is AI-generated, community-vetted game knowledge that lives on Forge.
      </p>

      <h2>Why we're building this</h2>
      <p>
        Gaming knowledge is scattered. It lives in Reddit threads that are three years old, in YouTube
        videos that take ten minutes to get to the answer, in Discord servers you have to already be
        in. There's no single place to find a reliable, concise answer to a specific question about a
        specific game.
      </p>
      <p>
        We want Forge to be that place. Not by scraping or indexing content from other platforms —
        but by building it ourselves, piece by piece, with the people who play these games. The
        community votes on what's accurate. Low-quality answers get rejected. Good ones stick around
        and become part of the game's permanent knowledge base on Forge.
      </p>

      <h2>Where this is going</h2>
      <p>
        The Insights system is a foundation. Once we have enough approved content for a game, we can
        start organizing it: beginner guides, boss strategies, build recommendations, lore breakdowns.
        Structured content built from real questions real players asked, verified by the people who
        play the game most.
      </p>
      <p>
        We don't know exactly what the end state looks like yet. That's intentional. We want to let
        the data tell us what shape the knowledge wants to take before we try to force it into a
        structure. What we do know: we want it to be useful, we want it to be community-owned, and
        we want it to live on Forge.
      </p>

      <h2>How to try it</h2>
      <p>
        Open Forge on the web, find the search bar at the top of your feed, tag a game with the
        controller icon or by typing <code>@</code>, and ask your question. If you get an answer
        worth keeping, submit it. Vote on other people's submissions. That's the whole thing for now.
      </p>
      <p>
        The more you use it, the better it gets. Not in a vague AI-learns-from-you way — in the
        direct sense that every approved Insight is a real piece of content that will still be there
        six months from now.
      </p>

      <p className="author-close">The Forge Team</p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Post 3 — May 19, 2026
// ---------------------------------------------------------------------------

// Replace POLL_POST_ID with the actual post ID once available
const POLL_POST_ID = '9acadeca-e87c-4179-b4c2-f25dc9d5b7d6';

function RoadmapContent() {
  return (
    <article>
      <p>
        We're two months in. Here's what we've shipped, what we're building next, and most
        importantly, a question we need your help answering.
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
        fediverse sync, all of it. Built with Capacitor for native gesture and media support.
      </p>

      <h3>May 19 - Platform refinements</h3>
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
        Better two-way sync with Bluesky and Mastodon: replies, follows, and notifications
        flowing in both directions, not just outbound.
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

      {/* Embedded Forge poll */}
      <div className="my-6">
        <iframe
          src={`/embed/post/${POLL_POST_ID}`}
          width="100%"
          style={{ border: 'none', borderRadius: '12px', display: 'block', maxWidth: '550px' }}
          height="420"
          title="Forge community poll"
          scrolling="no"
        />
      </div>

      <p>
        The team will be in the replies. Come find us.
      </p>

      <p className="author-close">The Forge Team</p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Exported array — newest first
// ---------------------------------------------------------------------------

export const blogPosts: BlogPost[] = [
  {
    slug: 'forge-insights',
    title: 'Forge Insights: Building a Gaming Knowledge Base from the Ground Up',
    date: '2026-06-17',
    author: 'The Forge Team',
    excerpt:
      "We're building toward a place where all gaming knowledge lives on Forge. It starts with AI-powered answers, community vetting, and a long-term bet on user-generated game guides.",
    tags: ['AI', 'Feature', 'Insights'],
    content: ForgeInsightsContent,
  },
  {
    slug: 'gaming-timeline',
    title: 'Gaming Timeline Wins the Poll — and the Data Collection Has Already Begun',
    date: '2026-06-10',
    author: 'The Forge Team',
    excerpt:
      "Gaming Timeline won the community poll. Here's what it is, when it's coming, and why the data you're logging to Recently Played right now already matters.",
    tags: ['Feature', 'Community'],
    content: GamingTimelineContent,
  },
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
      'Today we\'re launching Forge, a social platform that puts the games first and the algorithm second. Here\'s what we built and how to get early access.',
    tags: ['Launch', 'Announcement'],
    content: AnnouncingForgeContent,
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return blogPosts.find(p => p.slug === slug);
}
