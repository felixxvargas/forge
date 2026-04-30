import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Tv2, Check, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { supabase, streamArchivesAPI, type StreamArchive } from '../utils/supabase';
import { projectId } from '/utils/supabase/info';

const TWITCH_CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID ?? '';
const REDIRECT_URI = `${window.location.origin}/settings/twitch-archive`;
const TWITCH_SCOPES = 'user:read:email channel:read:subscriptions';

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
  const { currentUser, updateCurrentUser } = useAppData();

  const isConnected = !!(currentUser as any)?.twitch_user_id;
  const isEnabled = !!(currentUser as any)?.twitch_archive_enabled;
  const isAutoPost = !!(currentUser as any)?.twitch_archive_auto_post;
  const twitchName = (currentUser as any)?.twitch_display_name;

  const [archives, setArchives] = useState<StreamArchive[]>([]);
  const [loadingArchives, setLoadingArchives] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number } | null>(null);
  const [toggling, setToggling] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadArchives = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingArchives(true);
    try {
      const data = await streamArchivesAPI.getForUser(currentUser.id);
      setArchives(data);
    } finally {
      setLoadingArchives(false);
    }
  }, [currentUser?.id]);

  // Handle Twitch OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code || state !== 'twitch-archive' || !currentUser?.id) return;

    const exchangeCode = async () => {
      setError(null);
      try {
        // Exchange code for tokens via our edge function
        const session = (await supabase.auth.getSession()).data.session;
        if (!session) return;

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
        const data = await res.json();
        await updateCurrentUser({
          twitch_user_id: data.twitch_user_id,
          twitch_display_name: data.twitch_display_name,
          twitch_archive_enabled: true,
        } as any);
        // Clear query params
        navigate('/settings/twitch-archive', { replace: true });
      } catch (e: any) {
        setError(e.message);
      }
    };
    exchangeCode();
  }, [searchParams, currentUser?.id]);

  useEffect(() => {
    if (isConnected) loadArchives();
  }, [isConnected, loadArchives]);

  const handleConnect = () => {
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

  const createStreamPost = async (archive: StreamArchive) => {
    if (!currentUser?.id) return;
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return;
    const h = Math.floor(archive.duration_seconds / 3600);
    const m = Math.floor((archive.duration_seconds % 3600) / 60);
    const dur = h > 0 ? `${h}h ${m}m` : `${m}m`;
    const body = `Just finished streaming: ${archive.title} (${dur})`;
    const images = archive.thumbnail_url ? [archive.thumbnail_url] : [];
    await supabase.from('posts').insert({
      user_id: currentUser.id,
      body,
      images,
      post_type: 'stream_archive',
      stream_archive_id: archive.id,
    });
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
      const updated = await streamArchivesAPI.getForUser(currentUser.id);
      setArchives(updated);
      if (isAutoPost) {
        const newArchives = updated.filter(a => !prevIds.has(a.id) && a.download_status !== 'pending');
        await Promise.all(newArchives.map(createStreamPost));
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
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
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
              <Tv2 className="w-5 h-5 text-white" />
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
                  <p className="text-xs text-muted-foreground mt-0.5">Save streams under 4 hours to your Forge media</p>
                </div>
                <button
                  onClick={handleToggleArchive}
                  disabled={toggling}
                  className={`w-11 h-6 rounded-full transition-colors relative ${isEnabled ? 'bg-accent' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Auto-post toggle */}
              {isEnabled && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Auto-post when synced</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Create a post on your profile when a new stream is saved</p>
                  </div>
                  <button
                    onClick={handleToggleAutoPost}
                    className={`w-11 h-6 rounded-full transition-colors relative ${isAutoPost ? 'bg-accent' : 'bg-muted'}`}
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
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tv2 className="w-4 h-4" />}
                {syncing ? 'Syncing…' : 'Sync now from Twitch'}
              </button>

              {syncResult && (
                <p className="text-xs text-muted-foreground text-center">
                  Synced {syncResult.synced} stream{syncResult.synced !== 1 ? 's' : ''}
                  {syncResult.skipped > 0 ? ` · ${syncResult.skipped} skipped (over 4 hours)` : ''}
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
                'Enable auto-archiving — streams under 4 hours are saved automatically',
                'Archived streams appear on your Forge media tab and profile',
              'Optionally auto-post to your feed when a new stream is saved',
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
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Your Archives ({archives.length})
            </h2>
            {loadingArchives ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-xl overflow-hidden animate-pulse">
                    <div className="aspect-video bg-muted/50" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-muted/50 rounded w-3/4" />
                      <div className="h-3 bg-muted/30 rounded w-1/3" />
                    </div>
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
              <div className="space-y-3">
                {archives.map(archive => (
                  <div key={archive.id} className="bg-card rounded-xl overflow-hidden">
                    {archive.thumbnail_url && (
                      <div className="aspect-video bg-muted overflow-hidden">
                        <img src={archive.thumbnail_url} alt={archive.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{archive.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(archive.recorded_at)} · {formatDuration(archive.duration_seconds)}
                          {archive.download_status === 'pending' && (
                            <span className="ml-2 text-amber-400">Pending download</span>
                          )}
                          {archive.download_status === 'ready' && (
                            <span className="ml-2 text-green-400">Ready</span>
                          )}
                        </p>
                      </div>
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
    </div>
  );
}
