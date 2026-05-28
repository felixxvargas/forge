'use client';
import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Plus, User, Package, MapPin, Star, ChevronRight, ThumbsUp } from 'lucide-react';
import { useNavigate } from '@/compat/router';
import { supabase } from '../utils/supabase';
import { GameInsightModal } from './GameInsightModal';

type Category = 'all' | 'characters' | 'objects' | 'locations' | 'extras';

interface WikiInsight {
  id: string;
  title: string | null;
  query: string;
  content: string;
  category: string;
  approve_count: number;
  submitted_at: string;
  updated_at: string | null;
  author: { handle: string; display_name: string; profile_picture: string | null } | null;
}

const CATEGORIES: { id: Category; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'all', label: 'All', icon: <Sparkles className="w-3.5 h-3.5" />, color: 'text-accent border-accent/30 bg-accent/10' },
  { id: 'characters', label: 'Characters', icon: <User className="w-3.5 h-3.5" />, color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
  { id: 'objects', label: 'Objects', icon: <Package className="w-3.5 h-3.5" />, color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
  { id: 'locations', label: 'Locations', icon: <MapPin className="w-3.5 h-3.5" />, color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  { id: 'extras', label: 'Extras', icon: <Star className="w-3.5 h-3.5" />, color: 'text-purple-400 border-purple-400/30 bg-purple-400/10' },
];

const CATEGORY_BADGE: Record<string, { label: string; color: string }> = {
  characters: { label: 'Characters', color: 'text-blue-400 bg-blue-400/15' },
  objects: { label: 'Objects', color: 'text-amber-400 bg-amber-400/15' },
  locations: { label: 'Locations', color: 'text-emerald-400 bg-emerald-400/15' },
  extras: { label: 'Extras', color: 'text-purple-400 bg-purple-400/15' },
};

function insightDateLabel(submitted_at: string, updated_at: string | null): string {
  const sub = new Date(submitted_at).getTime();
  const upd = updated_at ? new Date(updated_at).getTime() : sub;
  const isEdited = upd - sub > 60_000;
  const d = new Date(isEdited ? updated_at! : submitted_at);
  return `${isEdited ? 'Edited' : 'Submitted'} ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

interface GameWikiViewProps {
  gameId: string;
  gameTitle: string;
  coverUrl?: string;
}

export function GameWikiView({ gameId, gameTitle, coverUrl }: GameWikiViewProps) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [insights, setInsights] = useState<WikiInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchInsights = useCallback(async (category: Category) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const categoryParam = category !== 'all' ? `&category=${encodeURIComponent(category)}` : '';
      const res = await fetch(
        `/api/insights/game-insights?gameId=${encodeURIComponent(gameId)}&status=approved${categoryParam}`,
        { headers }
      );
      if (!res.ok) throw new Error('Failed to load insights');
      setInsights(await res.json());
    } catch {
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => { fetchInsights(activeCategory); }, [activeCategory, fetchInsights]);

  const activeCat = CATEGORIES.find(c => c.id === activeCategory)!;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0d0b14 0%, #110f1a 100%)' }}>
      {/* Wiki header */}
      <div className="px-4 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-0.5">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Insights Wiki</span>
        </div>
        <h2 className="text-2xl font-bold text-white leading-tight">{gameTitle}</h2>
        <p className="text-xs text-white/40 mt-1">{insights.length > 0 ? `${insights.length} approved insight${insights.length !== 1 ? 's' : ''}` : 'Community-sourced game knowledge'}</p>
      </div>

      {/* Category tabs */}
      <div className="sticky top-0 z-10 px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none" style={{ background: 'rgba(13,11,20,0.85)', backdropFilter: 'blur(12px)' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.id ? cat.color : 'text-white/40 border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-24">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="rounded-xl p-4 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="h-4 rounded w-3/4 mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <div className="h-3 rounded w-1/2 mb-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-3 rounded w-2/3" style={{ background: 'rgba(255,255,255,0.05)' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && insights.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(139,92,246,0.1)' }}>
              {activeCat.icon}
            </div>
            <p className="text-white/50 text-sm mb-1">No {activeCategory === 'all' ? '' : activeCat.label + ' '}insights yet</p>
            <p className="text-white/30 text-xs mb-4">Be the first to add one</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-violet-400 text-sm font-medium hover:text-violet-300 transition-colors"
            >
              Add an Insight
            </button>
          </div>
        )}

        {!loading && insights.length > 0 && (
          <div className="space-y-3">
            {insights.map(insight => {
              const badge = CATEGORY_BADGE[insight.category] ?? CATEGORY_BADGE.extras;
              return (
                <button
                  key={insight.id}
                  onClick={() => navigate(`/game/${gameId}/insight/${insight.id}`)}
                  className="w-full text-left rounded-xl p-4 transition-colors group"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                >
                  {/* Category badge + author */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>
                      {badge.label}
                    </span>
                    {insight.author && (
                      <span className="text-[11px] text-white/40">by @{insight.author.handle}</span>
                    )}
                  </div>

                  {/* Title / query */}
                  {insight.title && (
                    <p className="text-sm font-semibold text-white leading-snug mb-1">{insight.title}</p>
                  )}
                  <p className={`line-clamp-2 leading-snug text-white/60 mb-2 ${insight.title ? 'text-xs' : 'text-sm font-medium'}`}>
                    {insight.content || insight.query}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-white/30 text-[11px]">
                      <ThumbsUp className="w-3 h-3" />
                      {insight.approve_count}
                      <span className="ml-2">{insightDateLabel(insight.submitted_at, insight.updated_at)}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-4 z-30 flex items-center gap-2 px-4 py-3 rounded-full font-medium text-sm shadow-lg transition-colors"
        style={{ background: 'rgba(139,92,246,0.9)', color: '#fff', backdropFilter: 'blur(8px)' }}
      >
        <Plus className="w-4 h-4" />
        Add Insight
      </button>

      <GameInsightModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); fetchInsights(activeCategory); }}
        preselectedGame={{ id: gameId, title: gameTitle, coverUrl }}
      />
    </div>
  );
}
