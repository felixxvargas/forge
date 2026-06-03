'use client';
import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Plus, User, Package, MapPin, Star, ChevronRight, ThumbsUp, Cpu, BookOpen, Skull, Scroll } from 'lucide-react';
import { useNavigate } from '@/compat/router';
import { supabase } from '../utils/supabase';
import { GameInsightModal } from './GameInsightModal';

type Category = 'all' | 'characters' | 'objects' | 'locations' | 'extras' | 'enemies' | 'quest';

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

interface WikiEntity {
  id: string;
  name: string;
  type: 'character' | 'location' | 'item' | 'mechanic' | 'lore';
  description: string;
  cover_image_url: string | null;
}

const CATEGORIES: { id: Category; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'all', label: 'All', icon: <Sparkles className="w-3.5 h-3.5" />, color: 'text-accent border-accent/30 bg-accent/10' },
  { id: 'characters', label: 'Characters', icon: <User className="w-3.5 h-3.5" />, color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
  { id: 'objects', label: 'Objects', icon: <Package className="w-3.5 h-3.5" />, color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
  { id: 'locations', label: 'Locations', icon: <MapPin className="w-3.5 h-3.5" />, color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  { id: 'extras', label: 'Extras', icon: <Star className="w-3.5 h-3.5" />, color: 'text-purple-400 border-purple-400/30 bg-purple-400/10' },
  { id: 'enemies', label: 'Enemies', icon: <Skull className="w-3.5 h-3.5" />, color: 'text-red-400 border-red-400/30 bg-red-400/10' },
  { id: 'quest', label: 'Quests', icon: <Scroll className="w-3.5 h-3.5" />, color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' },
];

const CATEGORY_BADGE: Record<string, { label: string; color: string }> = {
  characters: { label: 'Characters', color: 'text-violet-400 bg-violet-400/15' },
  objects:    { label: 'Objects',    color: 'text-violet-400 bg-violet-400/15' },
  locations:  { label: 'Locations',  color: 'text-violet-400 bg-violet-400/15' },
  extras:     { label: 'Extras',     color: 'text-violet-400 bg-violet-400/15' },
  enemies:    { label: 'Enemies',    color: 'text-violet-400 bg-violet-400/15' },
  quest:      { label: 'Quests',     color: 'text-violet-400 bg-violet-400/15' },
};

const ENTITY_TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  character: { label: 'Character', icon: <User className="w-3 h-3" />, color: 'text-blue-400 bg-blue-400/15' },
  location:  { label: 'Location',  icon: <MapPin className="w-3 h-3" />, color: 'text-emerald-400 bg-emerald-400/15' },
  item:      { label: 'Item',      icon: <Package className="w-3 h-3" />, color: 'text-amber-400 bg-amber-400/15' },
  mechanic:  { label: 'Mechanic',  icon: <Cpu className="w-3 h-3" />, color: 'text-violet-400 bg-violet-400/15' },
  lore:      { label: 'Lore',      icon: <BookOpen className="w-3 h-3" />, color: 'text-pink-400 bg-pink-400/15' },
};

// Map insight category → entity types to show alongside
const CATEGORY_ENTITY_TYPES: Record<Category, string[]> = {
  all:        ['character', 'location', 'item', 'mechanic', 'lore'],
  characters: ['character'],
  objects:    ['item'],
  locations:  ['location'],
  extras:     ['mechanic', 'lore'],
  enemies:    ['character'],
  quest:      ['lore'],
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

type WVEntry<T> = { data: T; ts: number };
const _wvCache = new Map<string, WVEntry<any>>();
const WV_TTL = 3 * 60 * 1000;
function wvGet<T>(key: string): T | null {
  const e = _wvCache.get(key);
  return e && Date.now() - e.ts < WV_TTL ? e.data as T : null;
}
function wvSet<T>(key: string, data: T) { _wvCache.set(key, { data, ts: Date.now() }); }
export function clearWvCacheForGame(gameId: string) {
  for (const key of _wvCache.keys()) {
    if (key.startsWith(`${gameId}:`)) _wvCache.delete(key);
  }
}

export function GameWikiView({ gameId, gameTitle, coverUrl }: GameWikiViewProps) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [insights, setInsights] = useState<WikiInsight[]>([]);
  const [entities, setEntities] = useState<WikiEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchData = useCallback(async (category: Category) => {
    const cacheKey = `${gameId}:${category}`;
    const cached = wvGet<{ insights: WikiInsight[]; entities: WikiEntity[] }>(cacheKey);
    if (cached) {
      setInsights(cached.insights);
      setEntities(cached.entities.filter(e => CATEGORY_ENTITY_TYPES[category].includes(e.type)));
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const categoryParam = category !== 'all' ? `&category=${encodeURIComponent(category)}` : '';
      const [insightsRes, entitiesRes] = await Promise.all([
        fetch(`/api/insights/game-insights?gameId=${encodeURIComponent(gameId)}${categoryParam}`, { headers }),
        fetch(`/api/insights/game-wiki-entities?gameId=${encodeURIComponent(gameId)}`, { headers }),
      ]);

      const fetchedInsights: WikiInsight[] = insightsRes.ok ? await insightsRes.json() : [];
      const allEntities: WikiEntity[] = entitiesRes.ok ? await entitiesRes.json() : [];
      wvSet(cacheKey, { insights: fetchedInsights, entities: allEntities });
      setInsights(fetchedInsights);
      setEntities(allEntities.filter(e => CATEGORY_ENTITY_TYPES[category].includes(e.type)));
    } catch {
      setInsights([]);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => { fetchData(activeCategory); }, [activeCategory, fetchData]);

  const activeCat = CATEGORIES.find(c => c.id === activeCategory)!;

  return (
    <div className="min-h-screen bg-background">
      {/* Wiki header */}
      <div className="border-b border-white/5">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Insights Wiki</span>
          </div>
          <h2 className="text-2xl font-bold text-white leading-tight">{gameTitle}</h2>
          <p className="text-xs text-white/40 mt-1">{insights.length > 0 ? `${insights.length} approved insight${insights.length !== 1 ? 's' : ''}` : 'Community-sourced game knowledge'}</p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-md">
      <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none">
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
      </div>

      {/* Content */}
      <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 py-4 pb-24">
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

        {!loading && (
          <>
            {/* Entity stubs — horizontal scroll row */}
            {entities.length > 0 && (
              <div className="mb-5">
                <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-2.5">Wiki Entries</p>
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                  {entities.map(entity => {
                    const meta = ENTITY_TYPE_META[entity.type] ?? ENTITY_TYPE_META.lore;
                    return (
                      <button
                        key={entity.id}
                        onClick={() => navigate(`/game/${gameId}/wiki/${entity.id}`)}
                        className="flex-shrink-0 w-36 rounded-xl p-3 text-left transition-colors"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      >
                        {entity.cover_image_url ? (
                          <div className="w-full h-16 rounded-lg overflow-hidden mb-2">
                            <img src={entity.cover_image_url} alt={entity.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-full h-16 rounded-lg flex items-center justify-center mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <span className={meta.color.split(' ')[0]}>{meta.icon}</span>
                          </div>
                        )}
                        <p className="text-xs font-semibold text-white leading-tight line-clamp-1 mb-1">{entity.name}</p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${meta.color}`}>
                          {meta.icon}
                          {meta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Insights */}
            {insights.length === 0 && entities.length === 0 && (
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

            {insights.length > 0 && (
              <>
                {entities.length > 0 && (
                  <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-2.5">Insights</p>
                )}
                <div className="space-y-3">
                  {insights.map(insight => {
                    const badge = CATEGORY_BADGE[insight.category] ?? CATEGORY_BADGE.extras;
                    return (
                      <a
                        key={insight.id}
                        href={`/game/${gameId}/insight/${insight.id}`}
                        onClick={e => { e.preventDefault(); navigate(`/game/${gameId}/insight/${insight.id}`); }}
                        className="w-full text-left rounded-xl p-4 transition-colors group block"
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
                      </a>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-4 md:bottom-8 md:right-6 z-30 flex items-center gap-2 px-4 py-3 rounded-full font-medium text-sm shadow-lg transition-colors"
        style={{ background: '#E7FFC4', color: '#2d1f47', backdropFilter: 'blur(8px)' }}
      >
        <Plus className="w-4 h-4" />
        Add Insight
      </button>

      <GameInsightModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); fetchData(activeCategory); }}
        preselectedGame={{ id: gameId, title: gameTitle, coverUrl }}
      />
    </div>
  );
}
