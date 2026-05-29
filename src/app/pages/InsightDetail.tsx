'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Sparkles, ThumbsUp, ThumbsDown, Check, MessageCircle, Send, ExternalLink, Clock, CheckCircle2, RefreshCw, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { useParams, useNavigate } from '@/compat/router';
import { supabase } from '../utils/supabase';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { Header } from '../components/Header';

interface InsightAuthor {
  id: string;
  handle: string;
  display_name: string;
  profile_picture: string | null;
}

interface Insight {
  id: string;
  user_id: string;
  game_id: string;
  game_title: string;
  query: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  approve_count: number;
  reject_count: number;
  submitted_at: string;
  approved_at: string | null;
  re_review_requested_at: string | null;
  linked_post_id: string | null;
  title: string | null;
  category: string;
  myVote: 'approve' | 'reject' | null;
  author: InsightAuthor | null;
}

interface LoreComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: InsightAuthor | null;
}

export function InsightDetail() {
  const { gameId: rawGameId, insightId } = useParams();
  const gameId = rawGameId ? decodeURIComponent(rawGameId) : rawGameId;
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAppData() as any;

  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [requestingReview, setRequestingReview] = useState(false);

  const [comments, setComments] = useState<LoreComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [changingCategory, setChangingCategory] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [backPath, setBackPath] = useState<string | null>(null);

  useEffect(() => {
    try {
      const prev = sessionStorage.getItem('forge_prev_path');
      if (prev) setBackPath(prev);
    } catch {}
  }, []);

  const fetchInsight = useCallback(async () => {
    if (!insightId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(`/api/insights/game-insights?insightId=${insightId}`, { headers });
      if (!res.ok) throw new Error('Failed to load insight');
      const data = await res.json();
      setInsight(Array.isArray(data) ? data[0] : data);
    } catch {
      toast.error('Failed to load insight');
    } finally {
      setLoading(false);
    }
  }, [insightId]);

  const fetchComments = useCallback(async () => {
    if (!insightId) return;
    setCommentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('insight_comments')
        .select('id, user_id, content, created_at, author:profiles!insight_comments_user_id_fkey(id, handle, display_name, profile_picture)')
        .eq('insight_id', insightId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((data ?? []) as unknown as LoreComment[]);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [insightId]);

  useEffect(() => {
    fetchInsight();
    fetchComments();
  }, [fetchInsight, fetchComments]);

  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [overflowOpen]);

  const handleVote = async (vote: 'approve' | 'reject') => {
    if (!insight || !isAuthenticated || voting) return;
    if (insight.user_id === currentUser?.id) {
      toast.error("You can't vote on your own insight");
      return;
    }

    setVoting(true);
    const prev = insight;
    const wasSameVote = insight.myVote === vote;
    const newApprove = insight.approve_count
      + (vote === 'approve' && !wasSameVote ? 1 : 0)
      - (insight.myVote === 'approve' && !wasSameVote ? 1 : 0)
      - (insight.myVote === 'approve' && wasSameVote ? 1 : 0);
    const newReject = insight.reject_count
      + (vote === 'reject' && !wasSameVote ? 1 : 0)
      - (insight.myVote === 'reject' && !wasSameVote ? 1 : 0)
      - (insight.myVote === 'reject' && wasSameVote ? 1 : 0);
    setInsight(i => i ? { ...i, myVote: wasSameVote ? null : vote, approve_count: newApprove, reject_count: newReject } : i);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/insights/game-insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ insightId: insight.id, vote }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Vote failed');
      }

      const data = await res.json();
      setInsight(i => i ? { ...i, approve_count: data.approveCount, reject_count: data.rejectCount, status: data.status, myVote: data.myVote } : i);
    } catch (err: any) {
      toast.error(err.message || 'Failed to vote');
      setInsight(prev);
    } finally {
      setVoting(false);
    }
  };

  const handleRequestReview = async () => {
    if (!insight || requestingReview) return;
    setRequestingReview(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/insights/game-insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ insightId: insight.id, action: 're-review' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to request re-review');
      }

      toast.success('Re-review requested — the community will vote again');
      fetchInsight();
    } catch (err: any) {
      toast.error(err.message || 'Failed to request re-review');
    } finally {
      setRequestingReview(false);
    }
  };

  const handleDeleteInsight = async () => {
    if (!insight || !window.confirm('Delete this insight? This cannot be undone.')) return;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    const res = await fetch(`/api/insights/game-insights?insightId=${insight.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) { toast.success('Insight deleted'); navigate(-1); }
    else toast.error('Failed to delete insight');
  };

  const handleChangeCategory = async (category: string) => {
    if (!insight || savingCategory) return;
    setSavingCategory(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const res = await fetch('/api/insights/game-insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ insightId: insight.id, action: 'set-category', category }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update category');
      }
      setInsight(i => i ? { ...i, category } as any : i);
      setChangingCategory(false);
      toast.success('Category updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !isAuthenticated || submittingComment) return;
    setSubmittingComment(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('insight_comments')
        .insert({ insight_id: insightId, user_id: currentUser.id, content: commentText.trim() });

      if (error) throw error;
      setCommentText('');
      fetchComments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-card rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-muted/40 rounded w-3/4 mb-3" />
              <div className="h-3 bg-muted/30 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Insight not found.</p>
          <button onClick={() => backPath ? navigate(backPath) : navigate(`/game/${gameId}`)} className="mt-4 text-accent text-sm hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  const total = insight.approve_count + insight.reject_count;
  const approvalPct = total > 0 ? Math.round((insight.approve_count / total) * 100) : 0;
  const isOwn = insight.user_id === currentUser?.id;
  const hoursOld = (Date.now() - new Date(insight.submitted_at).getTime()) / 3600000;
  const canRequestReview = insight.status === 'approved' && isOwn && !insight.re_review_requested_at;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
        {/* Back nav */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => backPath ? navigate(backPath) : navigate(`/game/${gameId}`)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          {isOwn && (
            <div ref={overflowRef} className="relative">
              <button
                onClick={() => setOverflowOpen(o => !o)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors rounded-lg"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {overflowOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                  <button
                    onClick={() => { setOverflowOpen(false); setChangingCategory(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors text-left"
                  >
                    Change category
                  </button>
                  <div className="h-px bg-border mx-2" />
                  <button
                    onClick={() => { setOverflowOpen(false); setTimeout(handleDeleteInsight, 0); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
                  >
                    Delete insight
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Game title + badge */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => navigate(`/game/${gameId}`)}
            className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
          >
            {insight.game_title}
          </button>
          <span className="text-muted-foreground/40">·</span>
          <div className="flex items-center gap-1 text-xs font-semibold text-accent">
            <Sparkles className="w-3 h-3" />
            Game Insight
          </div>
          {insight.status === 'approved' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 uppercase tracking-wide">Approved</span>
          )}
          {insight.status === 'pending' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 uppercase tracking-wide">Pending</span>
          )}
        </div>

        {/* Title (auto-generated headline) */}
        {insight.title && (
          <h1 className="text-xl font-bold leading-snug mb-1">{insight.title}</h1>
        )}

        {/* Approved byline — author + date, no query exposed */}
        {insight.status === 'approved' && insight.author && (
          <p className="text-xs text-muted-foreground mb-4">
            by @{insight.author.handle}
            {' · '}
            {new Date(insight.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}

        {/* Query card — pending only, so reviewers see what was asked */}
        {insight.status === 'pending' && (
          <div className="bg-card border border-border rounded-xl p-5 mb-3">
            {insight.author && (
              <div className="flex items-center gap-2 mb-3">
                <ProfileAvatar username={insight.author.handle} profilePicture={insight.author.profile_picture ?? undefined} size="sm" />
                <span className="text-xs text-muted-foreground">@{insight.author.handle}</span>
              </div>
            )}
            <p className="text-base font-semibold leading-snug">{insight.query}</p>
          </div>
        )}

        {/* Response */}
        <div className="bg-card border rounded-xl p-5 mb-4" style={{ borderColor: 'rgba(139,92,246,0.25)' }}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{insight.content}</p>
        </div>

        {/* Voting (pending insights) */}
        {insight.status === 'pending' && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Community Review</p>

            {total > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{approvalPct}% approval · {total} vote{total !== 1 ? 's' : ''}</span>
                  {hoursOld < 24 && (
                    <span className="text-amber-400/80 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.round(24 - hoursOld)}h until eligible
                    </span>
                  )}
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${approvalPct >= 70 ? 'bg-emerald-500' : 'bg-accent'}`}
                    style={{ width: `${approvalPct}%` }}
                  />
                </div>
              </div>
            )}

            {!isOwn && isAuthenticated && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleVote('approve')}
                  disabled={voting}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    insight.myVote === 'approve'
                      ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40'
                      : 'bg-secondary text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>{insight.approve_count}</span>
                </button>
                <button
                  onClick={() => handleVote('reject')}
                  disabled={voting}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    insight.myVote === 'reject'
                      ? 'bg-red-500/20 text-red-400 border-2 border-red-500/40'
                      : 'bg-secondary text-muted-foreground hover:text-red-400 hover:bg-red-500/10'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                  <span>{insight.reject_count}</span>
                </button>
                {insight.myVote && (
                  <span className="text-xs text-muted-foreground">You {insight.myVote === 'approve' ? 'approved' : 'rejected'}</span>
                )}
              </div>
            )}

            {isOwn && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">Your submission — waiting for community review</p>
              </div>
            )}

            {!isAuthenticated && (
              <p className="text-xs text-muted-foreground">Sign in to vote on this insight</p>
            )}
          </div>
        )}

        {/* Approved metadata + re-review */}
        {insight.status === 'approved' && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Community Approved</span>
              </div>
              {canRequestReview && (
                <button
                  onClick={handleRequestReview}
                  disabled={requestingReview}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${requestingReview ? 'animate-spin' : ''}`} />
                  Request Re-review
                </button>
              )}
              {insight.re_review_requested_at && (
                <span className="text-xs text-amber-400/80 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Re-review pending
                </span>
              )}
            </div>
            {insight.approved_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Approved {new Date(insight.approved_at).toLocaleDateString()} · {insight.approve_count} of {total} voters approved
              </p>
            )}
          </div>
        )}

        {/* Linked post */}
        {insight.linked_post_id && (
          <button
            onClick={() => navigate(`/post/${insight.linked_post_id}`)}
            className="w-full text-left bg-card border border-border rounded-xl p-4 mb-4 hover:border-accent/30 transition-colors flex items-center justify-between"
          >
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Linked Post</p>
              <p className="text-sm font-medium">View the post that shared this insight</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        )}

        {/* Lore / Comments */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Comments</h3>
            {comments.length > 0 && (
              <span className="text-xs text-muted-foreground">({comments.length})</span>
            )}
          </div>

          {commentsLoading && (
            <div className="space-y-3">
              {[1, 2].map(n => (
                <div key={n} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-muted/40 shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 bg-muted/40 rounded w-24 mb-2" />
                    <div className="h-3 bg-muted/30 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!commentsLoading && comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No comments yet. Be the first to add one!
            </p>
          )}

          {!commentsLoading && comments.length > 0 && (
            <div className="space-y-4 mb-6">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  {comment.author && (
                    <div className="shrink-0">
                      <ProfileAvatar username={comment.author.handle} profilePicture={comment.author.profile_picture ?? undefined} size="sm" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {comment.author && (
                        <span className="text-xs font-medium">@{comment.author.handle}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment input */}
          {isAuthenticated && (
            <div className="flex gap-3 pt-4 border-t border-border/50">
              {currentUser && (
                <div className="shrink-0">
                  <ProfileAvatar username={currentUser.handle ?? currentUser.username ?? ''} profilePicture={currentUser.profile_picture ?? currentUser.profilePicture ?? undefined} size="sm" />
                </div>
              )}
              <div className="flex-1 relative">
                <textarea
                  ref={commentInputRef}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={handleCommentKeyDown}
                  placeholder="Add a comment..."
                  rows={1}
                  className="w-full bg-secondary rounded-xl px-3 py-2.5 pr-10 text-sm placeholder-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-accent/50 leading-5"
                  style={{ minHeight: '2.5rem' }}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || submittingComment}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-accent disabled:opacity-40 hover:text-accent/70 transition-colors"
                >
                  {submittingComment ? (
                    <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {!isAuthenticated && (
            <p className="text-sm text-muted-foreground text-center pt-4 border-t border-border/50">
              Sign in to comment
            </p>
          )}
        </div>
      </div>

      {/* Category picker bottom sheet */}
      {changingCategory && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setChangingCategory(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-2xl mx-auto bg-popover border-t border-border rounded-t-2xl p-4 pb-8"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-semibold mb-4 text-center">Change Category</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'characters', label: 'Characters', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
                { id: 'objects', label: 'Objects', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
                { id: 'locations', label: 'Locations', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
                { id: 'extras', label: 'Extras', color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
                { id: 'enemies', label: 'Enemies', color: 'text-red-400 bg-red-400/10 border-red-400/30' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleChangeCategory(cat.id)}
                  disabled={savingCategory}
                  className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50 ${
                    insight?.category === cat.id
                      ? cat.color
                      : 'border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {cat.label}
                  {insight?.category === cat.id && <span className="ml-1.5 text-xs opacity-70">✓ current</span>}
                </button>
              ))}
            </div>
            <button
              onClick={() => setChangingCategory(false)}
              className="mt-4 w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
