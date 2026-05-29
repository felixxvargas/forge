'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, User, MapPin, Package, Cpu, BookOpen, Pencil, ThumbsUp, ThumbsDown, ChevronRight } from 'lucide-react';
import { useNavigate, useParams } from '@/compat/router';
import { supabase } from '../utils/supabase';
import { EntityEditSheet } from '../components/EntityEditSheet';

interface WikiEntity {
  id: string;
  game_id: string;
  game_title: string;
  name: string;
  type: 'character' | 'location' | 'item' | 'mechanic' | 'lore';
  description: string;
  cover_image_url: string | null;
  source_insight_id: string | null;
  created_at: string;
  updated_at: string;
}

interface EntityEdit {
  id: string;
  entity_id: string;
  user_id: string;
  content: Record<string, string>;
  status: string;
  approve_count: number;
  reject_count: number;
  submitted_at: string;
  myVote: string | null;
  author: { handle: string; display_name: string; profile_picture: string | null } | null;
}

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  character: { label: 'Character', icon: <User className="w-4 h-4" />, color: 'text-blue-400 bg-blue-400/15' },
  location:  { label: 'Location',  icon: <MapPin className="w-4 h-4" />, color: 'text-emerald-400 bg-emerald-400/15' },
  item:      { label: 'Item',      icon: <Package className="w-4 h-4" />, color: 'text-amber-400 bg-amber-400/15' },
  mechanic:  { label: 'Mechanic',  icon: <Cpu className="w-4 h-4" />, color: 'text-violet-400 bg-violet-400/15' },
  lore:      { label: 'Lore',      icon: <BookOpen className="w-4 h-4" />, color: 'text-pink-400 bg-pink-400/15' },
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export function EntityWikiPage() {
  const navigate = useNavigate();
  const { gameId, entityId } = useParams<{ gameId: string; entityId: string }>();
  const [entity, setEntity] = useState<WikiEntity | null>(null);
  const [edits, setEdits] = useState<EntityEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const [entityRes, editsRes] = await Promise.all([
        fetch(`/api/insights/game-wiki-entities?entityId=${encodeURIComponent(entityId!)}`, { headers }),
        fetch(`/api/insights/game-wiki-entity-edits?entityId=${encodeURIComponent(entityId!)}`, { headers }),
      ]);
      if (!entityRes.ok) { navigate(`/game/${gameId}`); return; }
      setEntity(await entityRes.json());
      if (editsRes.ok) setEdits(await editsRes.json());
    } catch {
      navigate(`/game/${gameId}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (entityId) fetchData(); }, [entityId]);

  const castVote = async (editId: string, vote: 'approve' | 'reject') => {
    setVotingId(editId);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/insights/game-wiki-entity-edits', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ editId, vote }),
      });
      if (!res.ok) return;
      const result = await res.json();
      setEdits(prev => prev.map(e => e.id === editId ? { ...e, ...result } : e).filter(e => e.status === 'pending'));
      if (result.status === 'approved') {
        // Re-fetch entity to get updated description
        const headers2 = await authHeaders();
        const eRes = await fetch(`/api/insights/game-wiki-entities?entityId=${encodeURIComponent(entityId!)}`, { headers: headers2 });
        if (eRes.ok) setEntity(await eRes.json());
      }
    } finally {
      setVotingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0d0b14 0%, #110f1a 100%)' }}>
        <div className="px-4 pt-14 animate-pulse space-y-4">
          <div className="h-6 rounded w-1/2" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="h-4 rounded w-1/3" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-24 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
      </div>
    );
  }

  if (!entity) return null;

  const meta = TYPE_META[entity.type] ?? TYPE_META.lore;

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(180deg, #0d0b14 0%, #110f1a 100%)' }}>
      {/* Back bar */}
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3 border-b border-white/5" style={{ background: 'rgba(13,11,20,0.9)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate(`/game/${gameId}`)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </button>
        <span className="text-sm font-medium text-white/70 truncate">{entity.game_title}</span>
      </div>

      <div className="px-4 pt-6">
        {/* Type badge */}
        <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${meta.color}`}>
          {meta.icon}
          {meta.label}
        </div>

        {/* Cover image */}
        {entity.cover_image_url && (
          <div className="w-full h-48 rounded-xl overflow-hidden mb-4">
            <img src={entity.cover_image_url} alt={entity.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Name */}
        <h1 className="text-2xl font-bold text-white leading-tight mb-4">{entity.name}</h1>

        {/* Description */}
        <div className="rounded-xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
            {entity.description || 'No description yet. Be the first to add one!'}
          </p>
        </div>

        {/* Source insight link */}
        {entity.source_insight_id && (
          <button
            onClick={() => navigate(`/game/${gameId}/insight/${entity.source_insight_id}`)}
            className="flex items-center justify-between w-full rounded-xl px-4 py-3 mb-6 group transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
          >
            <span className="text-xs text-white/50">View source insight</span>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/50 transition-colors" />
          </button>
        )}

        {/* Edit button */}
        {userId && (
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 w-full justify-center rounded-xl px-4 py-3 mb-6 text-sm font-medium text-accent transition-colors"
            style={{ background: 'rgba(231,255,196,0.08)', border: '1px solid rgba(231,255,196,0.15)' }}
          >
            <Pencil className="w-4 h-4" />
            Propose an Edit
          </button>
        )}

        {/* Pending edits */}
        {edits.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Pending Edits</p>
            <div className="space-y-3">
              {edits.map(edit => (
                <div key={edit.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {edit.author && (
                    <p className="text-[11px] text-white/40 mb-2">by @{edit.author.handle}</p>
                  )}
                  {edit.content.description && (
                    <p className="text-sm text-white/70 leading-relaxed mb-3 line-clamp-4">{edit.content.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                      <ThumbsUp className="w-3 h-3" />
                      <span>{edit.approve_count}</span>
                      <ThumbsDown className="w-3 h-3 ml-2" />
                      <span>{edit.reject_count}</span>
                    </div>
                    {userId && edit.user_id !== userId && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => castVote(edit.id, 'approve')}
                          disabled={!!votingId || edit.myVote === 'approve'}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            edit.myVote === 'approve'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-white/5 text-white/50 hover:bg-emerald-500/15 hover:text-emerald-400'
                          }`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => castVote(edit.id, 'reject')}
                          disabled={!!votingId || edit.myVote === 'reject'}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            edit.myVote === 'reject'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-white/5 text-white/50 hover:bg-rose-500/15 hover:text-rose-400'
                          }`}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {entity && (
        <EntityEditSheet
          entity={entity}
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
          onSubmitted={() => { setShowEdit(false); fetchData(); }}
        />
      )}
    </div>
  );
}
