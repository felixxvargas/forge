'use client';
import { useState, useEffect, useCallback } from 'react';
import { Sparkles, ThumbsUp, ChevronRight, Plus, Clock, CheckCircle2, MessageCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useAppData } from '../context/AppDataContext';
import { useNavigate } from '@/compat/router';
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
  const { isAuthenticated } = useAppData() as any;
  const navigate = useNavigate();
  const [tab, setTab] = useState<'approved' | 'pending'>(initialTab);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
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


  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-semibold">Insights</h2>
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
            const total = insight.approve_count + insight.reject_count;
            const approvalPct = total > 0 ? Math.round((insight.approve_count / total) * 100) : 0;

            return (
              <button
                key={insight.id}
                onClick={() => navigate(`/game/${gameId}/insight/${insight.id}`)}
                className="w-full text-left bg-card rounded-xl p-4 hover:border-accent/30 transition-colors"
                style={{ border: insight.status === 'approved' ? '1px solid rgba(34,197,94,0.15)' : '1px solid rgba(139,92,246,0.1)' }}
              >
                {/* Status + author */}
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

                {/* Query preview */}
                <p className="text-sm font-medium leading-snug line-clamp-2 mb-3">{insight.query}</p>

                {/* Vote progress bar for pending */}
                {insight.status === 'pending' && total > 0 && (
                  <div className="mb-3">
                    <div className="h-1 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${approvalPct >= 70 ? 'bg-emerald-500' : 'bg-accent'}`}
                        style={{ width: `${approvalPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1 text-xs">
                      <ThumbsUp className="w-3 h-3" />
                      {insight.approve_count}
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <MessageCircle className="w-3 h-3" />
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                </div>
              </button>
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
