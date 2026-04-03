import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Check } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import type { SocialPlatform } from '../data/data';
import BlueskyIconAsset from '../../assets/icons/bluesky.svg?react';

// SVG logo components for each social platform
const BlueskySVG = () => <BlueskyIconAsset className="w-6 h-6" />;

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
  <svg viewBox="0 0 192 192" className="w-6 h-6" fill="currentColor">
    <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.318-11.319 11.24-24.957 16.1-45.494 16.243-22.747-.158-39.95-7.479-51.14-21.755C35.95 139.01 30.376 120.702 30.166 96c.21-24.702 5.784-43.01 16.577-56.451C57.932 25.273 75.135 17.952 97.883 17.794c22.922.158 40.337 7.511 51.773 21.868 5.676 7.115 9.945 16.125 12.772 26.902l16.147-4.548c-3.43-12.725-8.853-23.748-16.219-32.715C147.535 12.015 125.867 2.179 97.948 2h-.393C69.877 2.178 48.408 12.04 33.809 29.24 20.37 44.885 13.312 66.087 13.1 95.99v.02c.212 29.902 7.27 51.104 20.709 66.748 14.6 17.2 36.069 27.062 63.726 27.24h.393c24.545-.157 42.045-6.613 56.328-20.847 18.936-18.871 18.414-42.545 12.168-57.105-4.41-10.287-12.8-18.695-24.887-24.058zm-38.27 37.714c-10.427.568-21.258-4.092-21.775-14.166-.381-7.133 5.089-15.093 21.515-16.025 1.882-.108 3.731-.16 5.553-.16 6.17 0 11.913.551 17.098 1.599-1.949 24.347-12.04 28.088-22.39 28.752z"/>
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

const TwitchSVG = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
  </svg>
);

const RedditSVG = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

const FacebookSVG = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const GitHubSVG = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);

const YouTubeSVG = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const SpotifySVG = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const YouTubeMusicSVG = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12 9.684 15.54z"/>
  </svg>
);

const PatreonSVG = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M14.82 2.41C10.52 2.41 7 5.93 7 10.23c0 4.29 3.52 7.78 7.82 7.78 4.29 0 7.77-3.49 7.77-7.78 0-4.3-3.48-7.82-7.77-7.82M2.18 21.6h3.64V2.41H2.18V21.6z"/>
  </svg>
);

const SoundCloudSVG = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M1.175 12.225c-.015 0-.027.006-.04.008L1.1 12.241c-.483.043-.867.452-.867.952 0 .52.41.952.921.952h12.95c.51 0 .921-.432.921-.952V9.01c0-.52-.41-.952-.921-.952a.921.921 0 0 0-.613.231A3.506 3.506 0 0 0 10.505 6a3.49 3.49 0 0 0-2.988 1.699 2.62 2.62 0 0 0-.625-.076 2.666 2.666 0 0 0-2.622 2.383A2.012 2.012 0 0 0 3.187 10c-.55 0-1.012.447-1.012 1.012 0 .564.461 1.012 1.012 1.012.02 0 .039-.003.058-.005a1.004 1.004 0 0 1-.07-.381c0-.552.448-1 1-1s1 .448 1 1-.448 1-1 1h-.04c-.016 0-.032.003-.048.004a.988.988 0 0 1-.912-.617zm.825-1.012a.987.987 0 0 1 .96-.76.992.992 0 0 1 .996.994.992.992 0 0 1-.996.994.987.987 0 0 1-.96-.76zM0 12.193c0-1.105.895-2 2-2 .094 0 .186.007.277.02A3.502 3.502 0 0 1 5.5 8.5c.142 0 .282.01.42.028A4.489 4.489 0 0 1 10 6a4.49 4.49 0 0 1 4.338 3.34c.053-.003.107-.005.162-.005 1.38 0 2.5 1.12 2.5 2.5v2.858c0 1.38-1.12 2.5-2.5 2.5H2c-1.105 0-2-.895-2-2z"/>
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
  twitch: TwitchSVG,
  reddit: RedditSVG,
  facebook: FacebookSVG,
  github: GitHubSVG,
  youtube: YouTubeSVG,
  spotify: SpotifySVG,
  youtubemusic: YouTubeMusicSVG,
  soundcloud: SoundCloudSVG,
  patreon: PatreonSVG,
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
  { id: 'twitch', name: 'Twitch', description: 'Live game streaming' },
  { id: 'reddit', name: 'Reddit', description: 'Communities and discussions' },
  { id: 'facebook', name: 'Facebook', description: 'Social networking' },
  { id: 'github', name: 'GitHub', description: 'Code and projects' },
  { id: 'youtube', name: 'YouTube', description: 'Video sharing' },
  { id: 'spotify', name: 'Spotify', description: 'Music streaming' },
  { id: 'youtubemusic', name: 'YouTube Music', description: 'Music streaming by Google' },
  { id: 'soundcloud', name: 'SoundCloud', description: 'Audio sharing platform' },
  { id: 'patreon', name: 'Patreon', description: 'Creator membership platform' },
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
