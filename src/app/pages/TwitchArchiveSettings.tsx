import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from '@/compat/router';
import { ArrowLeft, Check, AlertCircle, Loader2, Trash2, Eye, EyeOff, Tv2 } from 'lucide-react';
import TwitchIcon from '../../assets/icons/twitch.svg?react';
import { useAppData } from '../context/AppDataContext';
import { supabase, streamArchivesAPI, type StreamArchive } from '../utils/supabase';
import { projectId } from '/utils/supabase/info';

const TWITCH_CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID ?? '';
// Normalize to canonical production domain — forge-social.app redirects to www.forge-social.app
// via Vercel, so the Twitch-registered redirect URI must use the www origin.
const REDIRECT_URI = window.location.hostname.endsWith('forge-social.app')
  ? 'https://www.forge-social.app/settings/twitch-archive'
  : `${window.location.origin}/settings/twitch-archive`;
const TWITCH_SCOPES = 'user:read:email channel:read:subscriptions';
const PAGE_SIZE = 20;

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TwitchArchiveSettings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, updateCurrentUser, refreshCurrentUser } = useAppData();

  const isConnected = !!(currentUser as any)?.twitch_user_id;
  const isEnabled = !!(currentUser as any)?.twitch_archive_enabled;
  const isAutoPost = !!(currentUser as any)?.twitch_archive_auto_post;
  const twitchName = (currentUser as any)?.twitch_display_name;

  const [archives, setArchives] = useState<StreamArchive[]>([]);
  const [loadingArchives, setLoadingArchives] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number } | null>(null);
  const [toggling, setToggling] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pushing, setPushing] = useState(false);
  const [isExchanging, setIsExchanging] = useState(() => {
    if (typeof window === 'undefined') return false;
    const p = new URLSearchParams(window.location.search);
    return p.get('state') === 'twitch-archive' && !!p.get('code');
  });
  const [error, setError] = useState<string | null>(null);

  const loadArchives = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingArchives(true);
    try {
      const data = await streamArchivesAPI.getForUserPaginated(currentUser.id, 0, PAGE_SIZE);
      setArchives(data);
      setHasMore(data.length === PAGE_SIZE);
    } finally {
      setLoadingArchives(false);
    }
  }, [currentUser?.id]);

  const handleLoadMore = async () => {
    if (!currentUser?.id || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await streamArchivesAPI.getForUserPaginated(currentUser.id, archives.length, PAGE_SIZE);
      setArchives(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };

  // Handle Twitch OAuth callback — covers both success (?code=) and error (?error=) redirects
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const twitchError = searchParams.get('error');
    const twitchErrorDesc = searchParams.get('error_description');

    // Twitch returned an error (e.g. user denied, redirect URI mismatch)
    if (twitchError && state === 'twitch-archive') {
      setError(twitchErrorDesc ?? twitchError ?? 'Twitch authorization failed');
      setIsExchanging(false);
      navigate('/settings/twitch-archive', { replace: true });
      return;
    }

    if (!code || state !== 'twitch-archive' || !currentUser?.id) return;

    const exchangeCode = async () => {
      setError(null);
      setIsExchanging(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Your session expired — please sign in again');

        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/twitch-vod-archive/oauth-callback`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ code, redirect_uri: REDIRECT_URI, user_id: currentUser.id }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? 'OAuth exchange failed');
        }
        await refreshCurrentUser();
        await loadArchives();
        navigate('/settings/twitch-archive', { replace: true });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsExchanging(false);
      }
    };
    exchangeCode();
  }, [searchParams, currentUser?.id]);

  useEffect(() => {
    if (isConnected) loadArchives();
  }, [isConnected, loadArchives]);

  const handleConnect = () => {
    if (!TWITCH_CLIENT_ID) {
      setError('Twitch client ID is not configured. Add VITE_TWITCH_CLIENT_ID to your .env.local file.');
      return;
    }
    const params = new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: TWITCH_SCOPES,
      state: 'twitch-archive',
      force_verify: 'false',
    });
    window.location.href = `https://id.twitch.tv/oauth2/authorize?${params}`;
  };

  const handleDisconnect = async () => {
    if (!currentUser?.id) return;
    setDisconnecting(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/twitch-vod-archive/disconnect`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ user_id: currentUser.id }),
        }
      );
      await updateCurrentUser({
        twitch_user_id: null,
        twitch_display_name: null,
        twitch_archive_enabled: false,
      } as any);
      setArchives([]);
      setSelectedIds(new Set());
    } finally {
      setDisconnecting(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!currentUser?.id) return;
    setToggling(true);
    try {
      await updateCurrentUser({ twitch_archive_enabled: !isEnabled } as any);
    } finally {
      setToggling(false);
    }
  };

  const handleToggleAutoPost = async () => {
    if (!currentUser?.id) return;
    await updateCurrentUser({ twitch_archive_auto_post: !isAutoPost } as any);
  };

  const handleTogglePublic = async (archive: StreamArchive) => {
    await streamArchivesAPI.setPublic(archive.id, !archive.is_public);
    setArchives(prev => prev.map(a => a.id === archive.id ? { ...a, is_public: !a.is_public } : a));
  };

  const handlePushToProfile = async () => {
    if (!currentUser?.id || selectedIds.size === 0) return;
    setPushing(true);
    try {
      const ids = [...selectedIds];
      await Promise.all(ids.map(id => streamArchivesAPI.setPublic(id, true)));

      const session = (await supabase.auth.getSession()).data.session;
      if (session) {
        const count = ids.length;
        const body = `Added ${count} stream${count !== 1 ? 's' : ''} to my Forge profile`;
        await supabase.from('posts').insert({
          user_id: currentUser.id,
          body,
          post_type: 'stream_publish',
          stream_archive_ids: ids,
        });
      }

      setArchives(prev => prev.map(a => selectedIds.has(a.id) ? { ...a, is_public: true } : a));
      setSelectedIds(new Set());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPushing(false);
    }
  };

  const handleSync = async () => {
    if (!currentUser?.id) return;
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const prevIds = new Set(archives.map(a => a.id));
      const result = await streamArchivesAPI.syncFromTwitch(currentUser.id, '');
      setSyncResult(result);
      const updated = await streamArchivesAPI.getForUserPaginated(currentUser.id, 0, PAGE_SIZE);
      setArchives(updated);
      setHasMore(updated.length === PAGE_SIZE);

      if (isAutoPost) {
        const newArchives = updated.filter(a => !prevIds.has(a.id));
        if (newArchives.length > 0) {
          const ids = newArchives.map(a => a.id);
          await Promise.all(ids.map(id => streamArchivesAPI.setPublic(id, true)));
          const session = (await supabase.auth.getSession()).data.session;
          if (session) {
            const count = ids.length;
            const body = `Added ${count} stream${count !== 1 ? 's' : ''} to my Forge profile`;
            await supabase.from('posts').insert({
              user_id: currentUser.id,
              body,
              post_type: 'stream_publish',
              stream_archive_ids: ids,
            });
          }
          setArchives(prev => prev.map(a => ids.includes(a.id) ? { ...a, is_public: true } : a));
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteArchive = async (archiveId: string) => {
    await streamArchivesAPI.softDelete(archiveId);
    setArchives(prev => prev.filter(a => a.id !== archiveId));
    setSelectedIds(prev => { const next = new Set(prev); next.delete(archiveId); return next; });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen pb-32">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="w-full px-4 h-14 flex items-center gap-4">
          <button onClick={() => navigate('/settings')} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Twitch Stream Archive</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Connection status */}
        <div className="bg-card rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
              <TwitchIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Twitch</p>
              {isConnected ? (
                <p className="text-sm text-muted-foreground">Connected as <span className="text-foreground font-medium">{twitchName}</span></p>
              ) : (
                <p className="text-sm text-muted-foreground">Not connected</p>
              )}
            </div>
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            ) : isExchanging ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-600/40 text-white text-sm font-medium rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting…
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                Connect
              </button>
            )}
          </div>

          {isConnected && (
            <div className="border-t border-border pt-4 space-y-3">
              {/* Archive toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Auto-archive streams</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sync past streams to your Forge media library</p>
                </div>
                <button
                  onClick={handleToggleArchive}
                  disabled={toggling}
                  className={`w-11 h-6 rounded-full transition-colors relative ${isEnabled ? 'bg-purple-500' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Auto-post toggle */}
              {isEnabled && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Auto-post when synced</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Post new streams to your profile automatically on sync</p>
                  </div>
                  <button
                    onClick={handleToggleAutoPost}
                    className={`w-11 h-6 rounded-full transition-colors relative ${isAutoPost ? 'bg-purple-500' : 'bg-muted'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isAutoPost ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              )}

              {/* Manual sync */}
              <button
                onClick={handleSync}
                disabled={syncing || !isEnabled}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-sm hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TwitchIcon className="w-4 h-4" />}
                {syncing ? 'Syncing…' : 'Sync now from Twitch'}
              </button>

              {syncResult && (
                <p className="text-xs text-muted-foreground text-center">
                  Synced {syncResult.synced} stream{syncResult.synced !== 1 ? 's' : ''}
                  {syncResult.skipped > 0 ? ` · ${syncResult.skipped} skipped (too long)` : ''}
                </p>
              )}
            </div>
          )}
        </div>

        {/* How it works */}
        {!isConnected && (
          <div className="bg-card rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-sm">How it works</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                'Connect your Twitch account to Forge',
                'Past streams from the last year are loaded automatically on connect',
                'Select which streams to push to your Forge profile and Media tab',
                'Pushing streams creates a post on your profile so followers can see',
                "You'll be reminded to review archives after 1 year",
                'Archives with no response are deleted after 3 months of inactivity',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Archive list */}
        {isConnected && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Your Archives ({archives.length})
              </h2>
              {archives.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Select streams to push to your profile
                </p>
              )}
            </div>

            {loadingArchives ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-xl overflow-hidden animate-pulse">
                    <div className="h-16 bg-muted/50" />
                  </div>
                ))}
              </div>
            ) : archives.length === 0 ? (
              <div className="bg-card rounded-xl p-8 text-center text-muted-foreground">
                <Tv2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No archived streams yet.</p>
                <p className="text-xs mt-1">{isEnabled ? 'Streams will appear here after you go live.' : 'Enable auto-archiving above to get started.'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {archives.map(archive => (
                  <div
                    key={archive.id}
                    className={`bg-card rounded-xl overflow-hidden flex items-stretch transition-colors ${selectedIds.has(archive.id) ? 'ring-1 ring-accent' : ''}`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(archive.id)}
                      className={`flex-none w-11 flex items-center justify-center transition-colors ${selectedIds.has(archive.id) ? 'bg-accent/15' : 'hover:bg-secondary/50'}`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds.has(archive.id) ? 'bg-accent border-accent' : 'border-muted-foreground/50'}`}>
                        {selectedIds.has(archive.id) && <Check className="w-3 h-3 text-accent-foreground" />}
                      </div>
                    </button>

                    {/* Thumbnail */}
                    {archive.thumbnail_url ? (
                      <div className="w-28 h-16 shrink-0 bg-muted overflow-hidden">
                        <img src={archive.thumbnail_url} alt={archive.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-28 h-16 shrink-0 bg-muted flex items-center justify-center">
                        <Tv2 className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0 px-3 py-2 flex flex-col justify-center">
                      <p className="font-medium text-sm truncate">{archive.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(archive.recorded_at)} · {formatDuration(archive.duration_seconds)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 pr-2 shrink-0">
                      <button
                        onClick={() => handleTogglePublic(archive)}
                        className={`p-1.5 rounded transition-colors ${archive.is_public ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
                        title={archive.is_public ? 'Visible on profile — click to hide' : 'Hidden from profile — click to show'}
                      >
                        {archive.is_public ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteArchive(archive.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full mt-3 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        )}

        {/* Retention policy */}
        {isConnected && (
          <div className="bg-card rounded-xl p-4 border border-border/50">
            <h3 className="text-sm font-medium mb-1">Retention policy</h3>
            <p className="text-xs text-muted-foreground">
              After 1 year, you'll be prompted to review each archive. If you don't respond within 3 months, the archive is automatically deleted.
            </p>
          </div>
        )}
      </div>

      {/* Push to profile sticky bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-20 px-4">
          <div className="max-w-2xl mx-auto bg-accent text-accent-foreground rounded-xl px-4 py-3 flex items-center justify-between shadow-2xl">
            <p className="text-sm font-medium">
              {selectedIds.size} stream{selectedIds.size !== 1 ? 's' : ''} selected
            </p>
            <button
              onClick={handlePushToProfile}
              disabled={pushing}
              className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              {pushing && <Loader2 className="w-4 h-4 animate-spin" />}
              Push to Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
