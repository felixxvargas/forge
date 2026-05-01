import { ArrowLeft, Flame, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { useState, useEffect } from 'react';
import { lfgFlares as lfgFlaresAPI, profiles } from '../utils/supabase';
import type { LFGFlare } from '../utils/supabase';

export function UserFlares() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { currentUser } = useAppData();

  const [flares, setFlares] = useState<LFGFlare[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetHandle, setTargetHandle] = useState('');

  const viewingUserId = userId || currentUser?.id || '';
  const isOwnProfile = viewingUserId === currentUser?.id;

  useEffect(() => {
    if (!viewingUserId) return;
    setLoading(true);

    profiles.getById(viewingUserId)
      .then(u => setTargetHandle(u?.display_name || u?.handle || ''))
      .catch(() => {});

    lfgFlaresAPI.getActiveForUser(viewingUserId)
      .then(setFlares)
      .catch(() => setFlares([]))
      .finally(() => setLoading(false));
  }, [viewingUserId]);

  function removeFlare(flareId: string) {
    lfgFlaresAPI.remove(flareId).then(() =>
      setFlares(prev => prev.filter(f => f.id !== flareId))
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="w-full px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <div>
              <h1 className="font-semibold">Active LFG Flares</h1>
              {targetHandle && (
                <p className="text-sm text-muted-foreground">{targetHandle}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-muted-foreground">Loading flares...</p>
          </div>
        ) : flares.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Flame className="w-10 h-10 text-orange-400/30 mb-3" />
            <p className="text-muted-foreground text-sm">No active LFG flares</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flares.map(flare => (
              <div
                key={flare.id}
                onClick={() => navigate(`/flare/${flare.id}`)}
                className="flex items-start gap-3 p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-2 border-orange-400/50 rounded-xl cursor-pointer hover:border-orange-400/80 hover:from-orange-500/15 hover:to-red-500/15 transition-all"
              >
                <Flame className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-orange-400">
                      {flare.flare_type === 'lfg' ? 'LFG' : 'LFM'}
                    </span>
                    <span className="text-sm font-semibold truncate">{flare.game_title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Need {flare.players_needed}{flare.group_size ? `/${flare.group_size}` : ''} players
                    {flare.game_mode ? ` · ${flare.game_mode}` : ''}
                    {flare.scheduled_for
                      ? ` · ${new Date(flare.scheduled_for).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                      : ''}
                  </p>
                  <p className="text-xs text-orange-400/50 mt-0.5">
                    Expires {new Date(flare.expires_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {isOwnProfile && (
                  <button
                    onClick={e => { e.stopPropagation(); removeFlare(flare.id); }}
                    className="p-1.5 hover:bg-destructive/20 rounded-lg transition-colors shrink-0"
                    title="Remove flare"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
