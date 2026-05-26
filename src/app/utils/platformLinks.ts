export function getPlatformUrl(platform: string, handle: string): string | null {
  const h = handle.replace(/^@/, '').trim();
  if (!h) return null;

  switch (platform) {
    // Gaming platforms
    case 'steam':    return `https://steamcommunity.com/id/${h}`;
    case 'xbox':     return `https://account.xbox.com/en-us/profile?gamertag=${encodeURIComponent(h)}`;
    case 'gog':      return `https://www.gog.com/u/${h}`;
    case 'rockstar': return `https://socialclub.rockstargames.com/member/${h}`;
    // No public profile page linkable from handle
    case 'nintendo': return null;
    case 'epic':     return null;
    case 'ea':       return null;
    case 'ubisoft':  return null;
    case 'playstation': return null;
    case 'pc': case 'mac': case 'linux': return null;

    // Social platforms
    case 'bluesky': {
      const bh = h.includes('.') ? h : `${h}.bsky.social`;
      return `https://bsky.app/profile/${bh}`;
    }
    case 'mastodon': {
      // Stored as user@instance.social (leading @ already stripped above)
      const parts = h.split('@').filter(Boolean);
      if (parts.length === 2) return `https://${parts[1]}/@${parts[0]}`;
      return null;
    }
    case 'x':          return `https://x.com/${h}`;
    case 'instagram':  return `https://instagram.com/${h}`;
    case 'tiktok':     return `https://tiktok.com/@${h}`;
    case 'threads':    return `https://www.threads.net/@${h}`;
    case 'tumblr':     return `https://${h}.tumblr.com`;
    case 'reddit':     return `https://reddit.com/u/${h.replace(/^u\//, '')}`;
    case 'facebook':   return `https://facebook.com/${h}`;
    case 'github':     return `https://github.com/${h}`;
    case 'youtube':    return `https://youtube.com/@${h.startsWith('@') ? h.slice(1) : h}`;
    case 'twitch':     return `https://twitch.tv/${h}`;
    case 'kick':       return `https://kick.com/${h}`;
    case 'trovo':      return `https://trovo.live/${h}`;
    case 'soundcloud': return `https://soundcloud.com/${h}`;
    case 'patreon':    return `https://patreon.com/${h}`;
    case 'spotify':    return `https://open.spotify.com/user/${h}`;
    // Not linkable by handle
    case 'discord':    return null;
    case 'battlenet':  return null;
    case 'riot':       return null;
    case 'rednote':    return null;
    case 'upscrolled': return null;
    case 'youtubemusic': return null;

    default: return null;
  }
}
