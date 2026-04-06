import { useState } from 'react';
import BlueskySVG from '../../assets/icons/bluesky.svg?react';
import MastodonSVG from '../../assets/icons/mastodon.svg?react';

const POPULAR_INSTANCES = ['mastodon.social', 'hachyderm.io', 'fosstodon.org', 'infosec.exchange'];

interface Props {
  disabled?: boolean;
}

export function SocialAuthButtons({ disabled }: Props) {
  const [active, setActive] = useState<'bluesky' | 'mastodon' | null>(null);

  const [blueskyHandle, setBlueskyHandle] = useState('');
  const [blueskyLoading, setBlueskyLoading] = useState(false);
  const [blueskyError, setBlueskyError] = useState('');

  const [mastodonInstance, setMastodonInstance] = useState('');
  const [mastodonLoading, setMastodonLoading] = useState(false);
  const [mastodonError, setMastodonError] = useState('');

  const handleBlueskySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const handle = blueskyHandle.trim().replace(/^@/, '');
    if (!handle) return;
    setBlueskyLoading(true);
    setBlueskyError('');
    try {
      const { initiateBlueskyLogin } = await import('../utils/blueskyAuth');
      await initiateBlueskyLogin(handle);
    } catch (err: any) {
      setBlueskyError(err.message || 'Bluesky sign-in failed. Check your handle.');
      setBlueskyLoading(false);
    }
  };

  const handleMastodonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const instance = mastodonInstance.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!instance) return;
    setMastodonLoading(true);
    setMastodonError('');
    try {
      const { initiateMastodonLogin } = await import('../utils/mastodonAuth');
      await initiateMastodonLogin(instance);
    } catch (err: any) {
      setMastodonError(err.message || 'Mastodon sign-in failed. Check your instance.');
      setMastodonLoading(false);
    }
  };

  return (
    <div className="space-y-2.5">

      {/* ── Bluesky ──────────────────────────────────────────────── */}
      {active !== 'bluesky' ? (
        <button
          type="button"
          onClick={() => setActive('bluesky')}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-2.5 px-5 py-3 bg-sky-500 text-white rounded-xl hover:bg-sky-600 active:bg-sky-700 transition-colors font-medium disabled:opacity-50"
        >
          <BlueskySVG className="w-5 h-5 shrink-0" />
          Continue with Bluesky
        </button>
      ) : (
        <div className="rounded-xl border border-sky-500/40 bg-sky-500/5 p-3.5">
          <div className="flex items-center gap-2 mb-3">
            <BlueskySVG className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-sm font-semibold text-sky-400">Sign in with Bluesky</span>
          </div>
          <form onSubmit={handleBlueskySubmit}>
            {blueskyError && (
              <p className="text-xs text-destructive mb-2">{blueskyError}</p>
            )}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none select-none">@</span>
                <input
                  type="text"
                  value={blueskyHandle}
                  onChange={e => setBlueskyHandle(e.target.value)}
                  placeholder="handle.bsky.social"
                  autoFocus
                  disabled={blueskyLoading}
                  className="w-full pl-7 pr-3 py-2.5 bg-background rounded-lg border border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={blueskyLoading || !blueskyHandle.trim()}
                className="px-4 py-2.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 active:bg-sky-700 transition-colors font-medium text-sm disabled:opacity-50 shrink-0"
              >
                {blueskyLoading ? '…' : 'Continue'}
              </button>
            </div>
          </form>
          <button
            type="button"
            onClick={() => { setActive(null); setBlueskyHandle(''); setBlueskyError(''); }}
            className="mt-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Mastodon ─────────────────────────────────────────────── */}
      {active !== 'mastodon' ? (
        <button
          type="button"
          onClick={() => setActive('mastodon')}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-2.5 px-5 py-3 bg-[#6364ff] text-white rounded-xl hover:bg-[#5253e0] active:bg-[#4344cc] transition-colors font-medium disabled:opacity-50"
        >
          <MastodonSVG className="w-5 h-5 shrink-0" />
          Continue with Mastodon
        </button>
      ) : (
        <div className="rounded-xl border border-[#6364ff]/40 bg-[#6364ff]/5 p-3.5">
          <div className="flex items-center gap-2 mb-3">
            <MastodonSVG className="w-4 h-4 text-[#8b8cff] shrink-0" />
            <span className="text-sm font-semibold text-[#8b8cff]">Sign in with Mastodon</span>
          </div>
          <form onSubmit={handleMastodonSubmit}>
            {mastodonError && (
              <p className="text-xs text-destructive mb-2">{mastodonError}</p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={mastodonInstance}
                onChange={e => setMastodonInstance(e.target.value)}
                placeholder="mastodon.social"
                autoFocus
                disabled={mastodonLoading}
                className="flex-1 px-3 py-2.5 bg-background rounded-lg border border-[#6364ff]/40 focus:outline-none focus:ring-2 focus:ring-[#6364ff] text-sm"
              />
              <button
                type="submit"
                disabled={mastodonLoading || !mastodonInstance.trim()}
                className="px-4 py-2.5 bg-[#6364ff] text-white rounded-lg hover:bg-[#5253e0] active:bg-[#4344cc] transition-colors font-medium text-sm disabled:opacity-50 shrink-0"
              >
                {mastodonLoading ? '…' : 'Continue'}
              </button>
            </div>
          </form>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {POPULAR_INSTANCES.map(instance => (
              <button
                key={instance}
                type="button"
                onClick={() => setMastodonInstance(instance)}
                className="px-2.5 py-1 bg-secondary rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
              >
                {instance}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { setActive(null); setMastodonInstance(''); setMastodonError(''); }}
            className="mt-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

    </div>
  );
}
