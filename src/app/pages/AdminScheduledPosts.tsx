'use client';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from '@/compat/router';
import { supabase } from '../utils/supabase';
import { toast } from 'sonner';
import { RefreshCw, Pencil, ArrowRight } from 'lucide-react';

interface ScheduledPost {
  id: string;
  user_id: string;
  content: string;
  game_ids: string[] | null;
  game_titles: string[] | null;
  scheduled_at: string;
  status: 'pending' | 'published' | 'failed';
  published_post_id: string | null;
  url: string | null;
  created_at: string;
  author?: { handle: string; display_name: string } | null;
}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function AdminScheduledPosts() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[] | null>(null);
  const [spLoading, setSpLoading] = useState(false);
  const [spError, setSpError] = useState('');
  const [triggerMsg, setTriggerMsg] = useState('');
  const [triggeringNow, setTriggeringNow] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composing, setComposing] = useState(false);
  const [compose, setCompose] = useState({ content: '', scheduled_at: '', game_ids: '', game_titles: '', url: '' });
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ content: '', scheduled_at: '', url: '' });
  const [runMode, setRunMode] = useState(false);
  const [runOrder, setRunOrder] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const loadScheduledPosts = async () => {
    setSpLoading(true); setSpError('');
    try {
      const tok = await getToken();
      if (!tok) { navigate('/'); return; }
      const r = await fetch('/api/admin/scheduled-posts', { headers: { Authorization: `Bearer ${tok}`, 'Cache-Control': 'no-cache' } });
      if (r.ok) setScheduledPosts(await r.json());
      else setSpError('Failed to load scheduled posts');
    } catch {
      setSpError('Failed to load scheduled posts');
    } finally {
      setSpLoading(false);
    }
  };

  const saveEditedPost = async (id: string) => {
    if (new Date(editDraft.scheduled_at) <= new Date()) {
      toast.error('Scheduled time must be in the future');
      return;
    }
    const tok = await getToken();
    if (!tok) { navigate('/'); return; }
    const r = await fetch(`/api/admin/scheduled-posts?id=${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: editDraft.content,
        scheduled_at: new Date(editDraft.scheduled_at).toISOString(),
        url: editDraft.url || null,
      }),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      toast.error(data.error ?? 'Failed to save changes');
      return;
    }
    setEditingPostId(null);
    loadScheduledPosts();
  };

  const triggerPublish = async () => {
    setTriggeringNow(true);
    try {
      const tok = await getToken();
      if (!tok) { navigate('/'); return; }
      const r = await fetch('/api/admin/scheduled-posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger' }),
      });
      const data = await r.json();
      setTriggerMsg(data.published > 0 ? `Published ${data.published} post${data.published > 1 ? 's' : ''}` : 'Nothing due yet');
      setTimeout(() => setTriggerMsg(''), 4000);
      loadScheduledPosts();
    } finally {
      setTriggeringNow(false);
    }
  };

  const runSelected = async () => {
    setRunning(true);
    try {
      const tok = await getToken();
      if (!tok) { navigate('/'); return; }
      const r = await fetch('/api/admin/scheduled-posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_selected', ids: runOrder }),
      });
      const data = await r.json();
      setTriggerMsg(`Published ${data.published} post${data.published !== 1 ? 's' : ''}`);
      setTimeout(() => setTriggerMsg(''), 4000);
      setRunMode(false);
      setRunOrder([]);
      loadScheduledPosts();
    } finally {
      setRunning(false);
    }
  };

  const createScheduledPost = async () => {
    setComposing(true);
    try {
      const tok = await getToken();
      if (!tok) { navigate('/'); return; }
      await fetch('/api/admin/scheduled-posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          content: compose.content,
          scheduled_at: new Date(compose.scheduled_at).toISOString(),
          url: compose.url || null,
          game_ids: compose.game_ids ? compose.game_ids.split(',').map(s => s.trim()).filter(Boolean) : [],
          game_titles: compose.game_titles ? compose.game_titles.split(',').map(s => s.trim()).filter(Boolean) : [],
        }),
      });
      setCompose({ content: '', scheduled_at: '', game_ids: '', game_titles: '', url: '' });
      setShowCompose(false);
      loadScheduledPosts();
    } finally {
      setComposing(false);
    }
  };

  const deleteScheduledPost = async (id: string) => {
    const tok = await getToken();
    if (!tok) { navigate('/'); return; }
    await fetch(`/api/admin/scheduled-posts?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tok}` },
    });
    loadScheduledPosts();
  };

  useEffect(() => {
    getToken().then(tok => {
      setLoading(false);
      if (!tok) { navigate('/'); return; }
      loadScheduledPosts();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm animate-pulse">Loading…</div>
      </div>
    );
  }

  const pending = scheduledPosts?.filter(p => p.status === 'pending').length ?? 0;
  const published = scheduledPosts?.filter(p => p.status === 'published').length ?? 0;
  const failed = scheduledPosts?.filter(p => p.status === 'failed').length ?? 0;

  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Admin
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <h1 className="text-2xl font-bold">Scheduled Posts</h1>
            {scheduledPosts && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 font-medium">Pending {pending}</span>
                <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Published {published}</span>
                {failed > 0 && <span className="px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 font-medium">Failed {failed}</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {triggerMsg && <span className="text-xs text-accent font-medium">{triggerMsg}</span>}
            {runMode && runOrder.length > 0 && (
              <button
                onClick={runSelected}
                disabled={running}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {running ? '…' : `Run ${runOrder.length} post${runOrder.length !== 1 ? 's' : ''} now`}
              </button>
            )}
            <button
              onClick={() => { setRunMode(v => !v); setRunOrder([]); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${runMode ? 'bg-secondary text-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
            >
              {runMode ? '✕ Cancel' : '▶ Run'}
            </button>
            <button
              onClick={() => loadScheduledPosts()}
              className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCompose(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              + New Post
            </button>
          </div>
        </div>

        {/* Compose form */}
        {showCompose && (
          <div className="bg-card rounded-xl p-5 space-y-3 border border-border">
            <textarea
              className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent"
              rows={4}
              placeholder="Post content…"
              value={compose.content}
              onChange={e => setCompose(c => ({ ...c, content: e.target.value }))}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Schedule date & time</label>
                <input
                  type="datetime-local"
                  className="w-full bg-secondary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  style={{ colorScheme: 'dark' }}
                  value={compose.scheduled_at}
                  onChange={e => setCompose(c => ({ ...c, scheduled_at: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Link URL (optional)</label>
                <input
                  type="url"
                  className="w-full bg-secondary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="https://forge-social.app/blog/..."
                  value={compose.url}
                  onChange={e => setCompose(c => ({ ...c, url: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Game titles (comma-separated, optional)</label>
                <input
                  type="text"
                  className="w-full bg-secondary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Elden Ring, Hades II"
                  value={compose.game_titles}
                  onChange={e => setCompose(c => ({ ...c, game_titles: e.target.value }))}
                />
              </div>
              <div className="space-y-1 sm:col-start-2">
                <label className="text-xs text-muted-foreground">Game IDs (comma-separated, optional)</label>
                <input
                  type="text"
                  className="w-full bg-secondary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="119133, 119388"
                  value={compose.game_ids}
                  onChange={e => setCompose(c => ({ ...c, game_ids: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => { setShowCompose(false); setCompose({ content: '', scheduled_at: '', game_ids: '', game_titles: '', url: '' }); }}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createScheduledPost}
                disabled={composing || !compose.content || !compose.scheduled_at}
                className="px-4 py-1.5 bg-accent text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {composing ? 'Scheduling…' : 'Schedule Post →'}
              </button>
            </div>
          </div>
        )}

        {/* Posts list */}
        <div className="bg-card rounded-xl overflow-hidden">
          {spLoading && <p className="px-5 py-4 text-sm text-muted-foreground animate-pulse">Loading…</p>}
          {spError && <p className="px-5 py-4 text-sm text-red-400">{spError}</p>}
          {!spLoading && !spError && scheduledPosts?.length === 0 && (
            <p className="px-5 py-4 text-sm text-muted-foreground">No scheduled posts yet.</p>
          )}
          {!spLoading && !spError && scheduledPosts && scheduledPosts.length > 0 && (
            <ul className="divide-y divide-border">
              {scheduledPosts.map(post => (
                <li
                  key={post.id}
                  className={`flex items-start gap-4 px-5 py-3 ${runMode && (post.status === 'pending' || post.status === 'failed') ? 'cursor-pointer hover:bg-secondary/30 transition-colors' : ''}`}
                  onClick={runMode && (post.status === 'pending' || post.status === 'failed') ? () => setRunOrder(o =>
                    o.includes(post.id) ? o.filter(x => x !== post.id) : [...o, post.id]
                  ) : undefined}
                >
                  {runMode && (post.status === 'pending' || post.status === 'failed') && (
                    <div
                      className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full border text-xs font-bold transition-colors mt-0.5"
                      style={runOrder.includes(post.id)
                        ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-foreground)' }
                        : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }
                      }
                    >
                      {runOrder.includes(post.id) ? runOrder.indexOf(post.id) + 1 : ''}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {post.author?.handle && (
                        <span className="text-sm font-semibold">@{post.author.handle}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        post.status === 'pending' ? 'bg-amber-400/10 text-amber-400' :
                        post.status === 'published' ? 'bg-accent/10 text-accent' :
                        'bg-red-400/10 text-red-400'
                      }`}>{post.status}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.scheduled_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      {post.game_titles && post.game_titles.length > 0 && (
                        <span className="text-xs text-muted-foreground/60">{post.game_titles.join(', ')}</span>
                      )}
                    </div>
                    {editingPostId === post.id ? (
                      <div className="space-y-2">
                        <textarea
                          className="w-full bg-secondary rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                          rows={4}
                          value={editDraft.content}
                          onChange={e => setEditDraft(d => ({ ...d, content: e.target.value }))}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="datetime-local"
                            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            style={{ colorScheme: 'dark' }}
                            value={editDraft.scheduled_at}
                            min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                            onChange={e => setEditDraft(d => ({ ...d, scheduled_at: e.target.value }))}
                          />
                          <input
                            type="url"
                            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            placeholder="Link URL (optional)"
                            value={editDraft.url}
                            onChange={e => setEditDraft(d => ({ ...d, url: e.target.value }))}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEditedPost(post.id)}
                            disabled={!editDraft.content || !editDraft.scheduled_at}
                            className="px-3 py-1.5 bg-accent text-background rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-40"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingPostId(null)}
                            className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p
                          className={`text-sm text-foreground/80 cursor-pointer select-none ${expandedPostId === post.id ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}
                          onClick={() => setExpandedPostId(id => id === post.id ? null : post.id)}
                          title={expandedPostId === post.id ? 'Click to collapse' : 'Click to expand'}
                        >
                          {post.content}
                        </p>
                        {post.url && (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-secondary/60 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors border border-border"
                          >
                            <span className="text-accent shrink-0">↗</span>
                            <span className="truncate">{post.url}</span>
                          </a>
                        )}
                      </>
                    )}
                  </div>
                  {!runMode && (post.status === 'pending' || post.status === 'failed') && editingPostId !== post.id && (
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <button
                        onClick={() => {
                          const localDt = new Date(post.scheduled_at);
                          const offset = localDt.getTimezoneOffset();
                          const local = new Date(localDt.getTime() - offset * 60000);
                          setEditDraft({
                            content: post.content,
                            scheduled_at: local.toISOString().slice(0, 16),
                            url: post.url ?? '',
                          });
                          setEditingPostId(post.id);
                        }}
                        className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => deleteScheduledPost(post.id)}
                        className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
