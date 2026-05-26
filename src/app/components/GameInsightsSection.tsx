'use client';
import { useState, useEffect, useCallback } from 'react';
import { Sparkles, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from './ProfileAvatar';
import { GameInsightModal } from './GameInsightModal';

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
  myVote: 'approve' | 'reject' | null;
  author: { id: string; handle: string; display_name: string; profile_picture: string | null } | null;
}

interface GameInsightsSectionProps {
  gameId: string;
  gameTitle: string;
  coverUrl?: string;
  initialTab?: 'approved' | 'pending';
}

export function GameInsightsSection({ gameId, gameTitle, coverUrl, initialTab = 'approved' }: GameInsightsSectionProps) {
  const { currentUser, isAuthenticated } = useAppData() as any;
  const [tab, setTab] = useState<'approved' | 'pending'>(initialTab);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [voting, setVoting] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);

  const fetchInsights = useCallback(async (status: 'approved' | 'pending') => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(
        `/api/insights/game-insights?gameId=${encodeURIComponent(gameId)}&status=${status}`,
        { headers }
      );
      if (!res.ok) throw new Error('Failed to load insights');
      const data = await res.json();
      setInsights(data);
    } catch {
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchInsights(tab);
  }, [tab, fetchInsights]);

  const handleVote = async (insightId: string, vote: 'approve' | 'reject') => {
    if (!isAuthenticated) { toast.error('Sign in to vote'); return; }
    if (voting.has(insightId)) return;

    const insight = insights.find(i => i.id === insightId);
    if (!insight) return;
    if (insight.user_id === currentUser?.id) { toast.error("You can't vote on your own insight"); return; }

    setVoting(prev => new Set(prev).add(insightId));

    // Optimistic update
    setInsights(prev => prev.map(i => {
      if (i.id !== insightId) return i;
      const wasSameVote = i.myVote === vote;
      const prevVote = i.myVote;
      const newApprove = i.approve_count
        + (vote === 'approve' && !wasSameVote ? 1 : 0)
        - (prevVote === 'approve' && wasSameVote ? 0 : (prevVote === 'approve' ? 1 : 0));
      const newReject = i.reject_count
        + (vote === 'reject' && !wasSameVote ? 1 : 0)
        - (prevVote === 'reject' && wasSameVote ? 0 : (prevVote === 'reject' ? 1 : 0));
      return { ...i, myVote: wasSameVote ? null : vote, approve_count: newApprove, reject_count: newReject };
    }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/insights/game-insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ insightId, vote }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Vote failed');
      }

      const data = await res.json();
      setInsights(prev => prev.map(i =>
        i.id === insightId
          ? { ...i, approve_count: data.approveCount, reject_count: data.rejectCount, status: data.status, myVote: data.myVote }
          : i
      ));
    } catch (err: any) {
      toast.error(err.message || 'Failed to vote');
      fetchInsights(tab); // revert on error
    } finally {
      setVoting(prev => { const s = new Set(prev); s.delete(insightId); return s; });
    }
  };

  const approvedCount = tab === 'approved' ? insights.filter(i => i.status === 'approved').length : 0;
  const pendingCount = tab === 'pending' ? insights.filter(i => i.status === 'pending').length : 0;

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-semibold">Insights / Wiki</h2>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent/15 text-accent text-sm font-medium hover:bg-accent/25 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Insight
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-4">
        <button
          onClick={() => setTab('approved')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
            tab === 'approved' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Approved
        </button>
        <button
          onClick={() => setTab('pending')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
            tab === 'pending' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Pending Review
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2].map(n => (
            <div key={n} className="bg-card rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-muted/40 rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted/30 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Insights list */}
      {!loading && insights.length === 0 && (
        <div className="bg-card rounded-xl p-6 text-center">
          <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            {tab === 'approved' ? 'No approved insights yet.' : 'No insights pending review.'}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="text-sm text-accent hover:text-accent/80 font-medium transition-colors"
          >
            Be the first to add an insight
          </button>
        </div>
      )}

      {!loading && insights.length > 0 && (
        <div className="space-y-3">
          {insights.map(insight => {
            const isExpanded = expandedId === insight.id;
            const total = insight.approve_count + insight.reject_count;
            const approvalPct = total > 0 ? Math.round((insight.approve_count / total) * 100) : 0;
            const hoursOld = (Date.now() - new Date(insight.submitted_at).getTime()) / 3600000;
            const isOwn = insight.user_id === currentUser?.id;

            return (
              <div
                key={insight.id}
                className="bg-card rounded-xl overflow-hidden"
                style={{ border: insight.status === 'approved' ? '1px solid rgba(34,197,94,0.15)' : '1px solid rgba(139,92,246,0.1)' }}
              >
                <button
                  className="w-full px-4 py-4 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Status badge */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {insight.status === 'approved' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 uppercase tracking-wide">Approved</span>
                        )}
                        {insight.status === 'pending' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 uppercase tracking-wide">Pending</span>
                        )}
                        {insight.author && (
                          <span className="text-xs text-muted-foreground">by @{insight.author.handle}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium leading-snug line-clamp-2">{insight.query}</p>
                    </div>
                    <div className="shrink-0 mt-0.5">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-3">
                    {/* Answer */}
                    <div className="mb-4">
                      <div className="flex items-center gap-1 mb-2">
                        <Sparkles className="w-3 h-3 text-accent" />
                        <span className="text-xs font-semibold text-accent uppercase tracking-wide">AI Answer</span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{insight.content}</p>
                    </div>

                    {/* Voting area */}
                    {insight.status === 'pending' && (
                      <div>
                        {/* Progress bar */}
                        {total > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>{approvalPct}% approval ({total} vote{total !== 1 ? 's' : ''})</span>
                              {hoursOld < 24 && (
                                <span className="text-amber-400/80">{Math.round(24 - hoursOld)}h until eligible</span>
                              )}
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${approvalPct >= 70 ? 'bg-emerald-500' : 'bg-accent'}`}
                                style={{ width: `${approvalPct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Vote buttons */}
                        {!isOwn && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleVote(insight.id, 'approve')}
                              disabled={voting.has(insight.id)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                insight.myVote === 'approve'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40'
                                  : 'bg-secondary text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              <span>{insight.approve_count}</span>
                            </button>
                            <button
                              onClick={() => handleVote(insight.id, 'reject')}
                              disabled={voting.has(insight.id)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                insight.myVote === 'reject'
                                  ? 'bg-red-500/20 text-red-400 border-2 border-red-500/40'
                                  : 'bg-secondary text-muted-foreground hover:text-red-400 hover:bg-red-500/10'
                              }`}
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                              <span>{insight.reject_count}</span>
                            </button>
                            {insight.myVote && (
                              <span className="text-xs text-muted-foreground ml-1">
                                You {insight.myVote === 'approve' ? 'approved' : 'rejected'}
                              </span>
                            )}
                          </div>
                        )}
                        {isOwn && (
                          <p className="text-xs text-muted-foreground">Your submission — waiting for community review</p>
                        )}
                      </div>
                    )}

                    {insight.status === 'approved' && insight.approved_at && (
                      <p className="text-xs text-muted-foreground">
                        Approved {new Date(insight.approved_at).toLocaleDateString()} · {insight.approve_count} of {total} voters approved
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Gemini Insight Modal */}
      <GameInsightModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        preselectedGame={{ id: gameId, title: gameTitle, coverUrl }}
      />
    </div>
  );
}
