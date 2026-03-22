// SVG icon imports for social platforms (normalized, currentColor-compatible)
import DiscordIcon from '../../assets/icons/discord.svg?react';
import TwitterIcon from '../../assets/icons/twitter.svg?react';
import InstagramIcon from '../../assets/icons/instagram.svg?react';
import FacebookIcon from '../../assets/icons/facebook.svg?react';
import RedditIcon from '../../assets/icons/reddit.svg?react';
import YouTubeIcon from '../../assets/icons/youtube.svg?react';
import TwitchIcon from '../../assets/icons/twitch.svg?react';
import TikTokIcon from '../../assets/icons/tiktok.svg?react';
import TumblrIcon from '../../assets/icons/tumblr.svg?react';
import MastodonIcon from '../../assets/icons/mastodon.svg?react';
import ThreadsIcon from '../../assets/icons/threads.svg?react';
import SpotifyIcon from '../../assets/icons/spotify.svg?react';
import GitHubIcon from '../../assets/icons/github.svg?react';
import PatreonIcon from '../../assets/icons/patreon.svg?react';
// Gaming platform SVG imports
import SteamIcon from '../../assets/icons/steam.svg?react';
import XboxIcon from '../../assets/icons/xbox.svg?react';
import PlayStationIcon from '../../assets/icons/playstation.svg?react';
import WindowsIcon from '../../assets/icons/windows.svg?react';
import AppleIcon from '../../assets/icons/apple.svg?react';

interface PlatformIconProps {
  platform: string;
  className?: string;
  userHandle?: string;
  showHandle?: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
  // Gaming
  steam: 'Steam', xbox: 'Xbox', playstation: 'PlayStation', epic: 'Epic Games',
  ea: 'EA', nintendo: 'Nintendo', gog: 'GOG', ubisoft: 'Ubisoft',
  rockstar: 'Rockstar', pc: 'PC', mac: 'Mac Gaming', linux: 'Linux Gaming',
  // Social
  discord: 'Discord', twitter: 'X (Twitter)', x: 'X (Twitter)',
  instagram: 'Instagram', facebook: 'Facebook', reddit: 'Reddit',
  youtube: 'YouTube', twitch: 'Twitch', tiktok: 'TikTok', tumblr: 'Tumblr',
  mastodon: 'Mastodon', spotify: 'Spotify', github: 'GitHub', patreon: 'Patreon',
  bluesky: 'Bluesky', threads: 'Threads', rednote: 'Red Note', upscrolled: 'Upscrolled',
  youtubemusic: 'YouTube Music', soundcloud: 'SoundCloud', apple: 'Apple',
};

export function PlatformIcon({ platform, className = 'w-5 h-5', userHandle, showHandle }: PlatformIconProps) {
  const key = platform?.toLowerCase();
  const cls = className;

  const renderIcon = () => {
    switch (key) {
      // ── Social (file imports) ──────────────────────────────
      case 'discord':     return <DiscordIcon className={cls} />;
      case 'twitter':
      case 'x':          return <TwitterIcon className={cls} />;
      case 'instagram':  return <InstagramIcon className={cls} />;
      case 'facebook':   return <FacebookIcon className={cls} />;
      case 'reddit':     return <RedditIcon className={cls} />;
      case 'youtube':    return <YouTubeIcon className={cls} />;
      case 'twitch':     return <TwitchIcon className={cls} />;
      case 'tiktok':     return <TikTokIcon className={cls} />;
      case 'tumblr':     return <TumblrIcon className={cls} />;
      case 'mastodon':   return <MastodonIcon className={cls} />;
      case 'spotify':    return <SpotifyIcon className={cls} />;
      case 'github':     return <GitHubIcon className={cls} />;
      case 'patreon':    return <PatreonIcon className={cls} />;

      // ── Social (inline — no SVG file available) ────────────
      case 'bluesky':
        return (
          <svg viewBox="0 0 360 320" fill="currentColor" className={cls}>
            <path d="M180 142C164 110 120 50 75 27 50 14 0 3 0 60c0 29 17 99 28 120 16 27 47 39 77 28 31-12 33-46 33-46s-4 55-39 78c-35 23-82 5-82 5s34 117 163 85c129-31 163-85 163-85s-47 18-82-5c-35-23-39-78-39-78s2 34 33 46c30 11 61-1 77-28C343 159 360 89 360 60c0-57-50-46-75-33C241 50 196 110 180 142z"/>
          </svg>
        );
      case 'threads':    return <ThreadsIcon className={cls} />;
      case 'rednote':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM8 17v-1.5c0-.28.22-.5.5-.5h7c.28 0 .5.22.5.5V17H8zm8-4H8v-1.5c0-.28.22-.5.5-.5h.5V9h5v2h.5c.28 0 .5.22.5.5V13z"/>
          </svg>
        );
      case 'upscrolled':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cls}>
            <polyline points="17 11 12 6 7 11"/>
            <polyline points="17 18 12 13 7 18"/>
          </svg>
        );
      case 'youtubemusic':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
            <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-12.732c-3.1 0-5.628 2.528-5.628 5.628S8.9 17.628 12 17.628s5.628-2.528 5.628-5.628S15.1 6.372 12 6.372zM9.684 15.54V8.46L15.816 12 9.684 15.54z"/>
          </svg>
        );
      case 'soundcloud':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
            <path d="M1.175 12.225c-.015 0-.027.006-.04.008L1.1 12.241c-.483.043-.867.452-.867.952 0 .52.41.952.921.952h12.95c.51 0 .921-.432.921-.952V9.01c0-.52-.41-.952-.921-.952a.921.921 0 0 0-.613.231A3.506 3.506 0 0 0 10.505 6a3.49 3.49 0 0 0-2.988 1.699 2.62 2.62 0 0 0-.625-.076 2.666 2.666 0 0 0-2.622 2.383A2.012 2.012 0 0 0 3.187 10c-.55 0-1.012.447-1.012 1.012 0 .564.461 1.012 1.012 1.012.02 0 .039-.003.058-.005a1.004 1.004 0 0 1-.07-.381c0-.552.448-1 1-1s1 .448 1 1-.448 1-1 1H3.1z"/>
          </svg>
        );
      case 'apple':    return <AppleIcon className={cls} />;

      // ── Gaming (SVG file imports) ──────────────────────────
      case 'steam':     return <SteamIcon className={cls} />;
      case 'xbox':      return <XboxIcon className={cls} />;
      case 'playstation': return <PlayStationIcon className={cls} />;
      case 'nintendo':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
            <path d="M14.942 2.994H9.058C5.26 2.994 2.994 5.26 2.994 9.058v5.884c0 3.798 2.266 6.064 6.064 6.064h5.884c3.798 0 6.064-2.266 6.064-6.064V9.058c0-3.798-2.266-6.064-6.064-6.064zm-5.884 1.5h5.884c2.987 0 4.564 1.577 4.564 4.564v5.884c0 2.987-1.577 4.564-4.564 4.564H9.058c-2.987 0-4.564-1.577-4.564-4.564V9.058c0-2.987 1.577-4.564 4.564-4.564zM9.5 7A1.5 1.5 0 0 0 8 8.5 1.5 1.5 0 0 0 9.5 10 1.5 1.5 0 0 0 11 8.5 1.5 1.5 0 0 0 9.5 7zm5 4a1.5 1.5 0 0 0-1.5 1.5A1.5 1.5 0 0 0 14.5 14 1.5 1.5 0 0 0 16 12.5 1.5 1.5 0 0 0 14.5 11z"/>
          </svg>
        );
      case 'pc':        return <WindowsIcon className={cls} />;
      case 'mac':       return <AppleIcon className={cls} />;
      case 'linux':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
            <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489.117.779.567 1.563 1.182 2.14.614.578 1.361.7 2.063.682 1.175-.024 2.462-.31 3.432-.324 1.032-.02 2.02.203 3.11.208.918.013 1.889-.234 2.614-.751.724-.518 1.224-1.294 1.378-2.114.154-.82-.012-1.667-.28-2.457-.602-1.738-1.815-3.376-2.65-4.408-.783-1.069-1.006-1.872-1.111-2.94-.201-2.017.67-4.977-3.012-6.337C12.948.04 12.717 0 12.504 0zM9 12c0-.552.448-1 1-1s1 .448 1 1-.448 1-1 1-1-.448-1-1zm4 0c0-.552.448-1 1-1s1 .448 1 1-.448 1-1 1-1-.448-1-1zm-6 6c.286-1.143 1.429-2 2.5-2h1c1.071 0 2.214.857 2.5 2H7zm3.5-8.5c-.829 0-1.5-.671-1.5-1.5S9.671 8 10.5 8s1.5.671 1.5 1.5S11.329 9.5 10.5 9.5zm3 0c-.829 0-1.5-.671-1.5-1.5S12.671 8 13.5 8s1.5.671 1.5 1.5S14.329 9.5 13.5 9.5z"/>
          </svg>
        );
      case 'epic':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
            <path d="M3 2v20h5v-7h5v-3H8V5h8V2H3zm10 0v3h5v14h-5v3h8V2h-8z"/>
          </svg>
        );
      case 'ea':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
            <path d="M16.635 3L24 21h-4.687l-1.23-3H11.4l-1.23 3H5.484L12.85 3h3.784M14.742 7.5l-2.054 5.625h4.108L14.742 7.5M3.5 9v3h4.313v2.25H3.5V18h6v-2.25H5.812V11.25H9.5V9H3.5z"/>
          </svg>
        );
      case 'gog':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-2 5h4c1.657 0 3 1.343 3 3v1h-3v-1a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-1h-1v-1h4v2c0 1.657-1.343 3-3 3h-4c-1.657 0-3-1.343-3-3v-4c0-1.657 1.343-3 3-3z"/>
          </svg>
        );
      case 'ubisoft':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c4.42 0 8 3.58 8 8s-3.58 8-8 8-8-3.58-8-8 3.58-8 8-8zm0 2c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 2c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
          </svg>
        );
      case 'rockstar':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
            <path d="M4 3h8c2.21 0 4 1.79 4 4 0 1.48-.81 2.77-2 3.46L16 14h-2.5l-1.62-3.5H7V14H4V3zm3 2v3.5h4.5c.83 0 1.5-.67 1.5-1.5v-.5C13 5.67 12.33 5 11.5 5H7zm11.12.69l-.88 2.59 1.94 1.41-2.44.02-.94 2.87-.93-2.87-2.44-.02 1.95-1.41L14.5 5.7 16 6.92l1.12-1.23z"/>
          </svg>
        );

      default:
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
            <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5v-3c0-.83.67-1.5 1.5-1.5h4c.83 0 1.5.67 1.5 1.5v3c0 .83-.67 1.5-1.5 1.5h-4zm.5-4v3h3v-3h-3z"/>
          </svg>
        );
    }
  };

  const label = PLATFORM_LABELS[key] ?? key;

  if (showHandle && userHandle) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg">
        {renderIcon()}
        <span className="text-sm font-medium">{userHandle}</span>
      </div>
    );
  }

  if (showHandle) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg">
        {renderIcon()}
        <span className="text-sm font-medium">{label}</span>
      </div>
    );
  }

  return renderIcon();
}
