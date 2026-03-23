import { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, Flame, Users, Gamepad2, ChevronDown } from 'lucide-react';
import { gamesAPI } from '../utils/api';
import { lfgFlares } from '../utils/supabase';
import type { LFGFlare } from '../utils/supabase';
import { useAppData } from '../context/AppDataContext';

interface LFGFlareModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledGame?: { id: string; title: string };
  prefilledType?: 'lfg' | 'lfm';
  onCreated?: (flare: LFGFlare) => void;
}

const EXPIRY_OPTIONS = [
  { label: '1 hour',   minutes: 60 },
  { label: '2 hours',  minutes: 120 },
  { label: '4 hours',  minutes: 240 },
  { label: '8 hours',  minutes: 480 },
  { label: '24 hours', minutes: 1440 },
  { label: '3 days',   minutes: 4320 },
  { label: '1 week',   minutes: 10080 },
  { label: '2 weeks',  minutes: 20160 },
  { label: '1 month',  minutes: 43200 },
];

export function LFGFlareModal({ isOpen, onClose, prefilledGame, prefilledType, onCreated }: LFGFlareModalProps) {
  const { session, createPost } = useAppData() as any;

  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState<any[]>([]);
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  const [selectedGame, setSelectedGame] = useState<{ id: string; title: string } | null>(prefilledGame ?? null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [flareType, setFlareType] = useState<'lfg' | 'lfm'>(prefilledType ?? 'lfg');
  const [playersNeeded, setPlayersNeeded] = useState(1);
  const [groupSize, setGroupSize] = useState<number | ''>('');
  const [gameMode, setGameMode] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState(1440); // default 24 hours

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedGame(prefilledGame ?? null);
      setFlareType(prefilledType ?? 'lfg');
      setPlayersNeeded(1);
      setGroupSize('');
      setGameMode('');
      setExpiryMinutes(1440);
      setGameQuery('');
      setGameResults([]);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!gameQuery.trim()) { setGameResults([]); return; }
    searchDebounce.current = setTimeout(async () => {
      setIsSearchingGames(true);
      try {
        const res = await gamesAPI.searchGames(gameQuery, 15);
        const list = Array.isArray(res) ? res : (res as any)?.games ?? [];
        setGameResults(list);
      } catch { setGameResults([]); }
      finally { setIsSearchingGames(false); }
    }, 300);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [gameQuery]);

  const handleSubmit = async () => {
    if (!selectedGame) { setError('Please select a game.'); return; }
    if (!session?.user) { setError('You must be logged in.'); return; }
    setError('');
    setSaving(true);
    try {
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
      const flare = await lfgFlares.create(session.user.id, {
        game_id: selectedGame.id,
        game_title: selectedGame.title,
        flare_type: flareType,
        players_needed: playersNeeded,
        group_size: groupSize !== '' ? Number(groupSize) : undefined,
        game_mode: gameMode.trim() || undefined,
        expires_at: expiresAt,
      });

      const typeLabel = flareType === 'lfg' ? 'Looking for Group' : 'Looking for More';
      const parts = [
        `🔥 ${typeLabel}: ${selectedGame.title}`,
        groupSize !== '' ? `Need ${playersNeeded} more · Group of ${groupSize}` : `Need ${playersNeeded} more`,
        gameMode.trim() ? `Mode: ${gameMode.trim()}` : null,
      ].filter(Boolean);
      try {
        await createPost(parts.join('\n'), undefined, undefined, undefined, undefined, selectedGame.id, selectedGame.title);
      } catch { /* best-effort */ }

      onCreated?.(flare);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to create flare.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold">Create LFG Flare</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">

          {/* Type toggle — full width pill */}
          <div className="flex p-1 bg-secondary rounded-xl gap-1">
            {(['lfg', 'lfm'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFlareType(t)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  flareType === t
                    ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                {t === 'lfg' ? 'Looking for Group' : 'Looking for More'}
              </button>
            ))}
          </div>

          {/* Game search */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Game</label>
            {selectedGame ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                <Gamepad2 className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="font-semibold text-sm flex-1">{selectedGame.title}</span>
                {!prefilledGame && (
                  <button onClick={() => { setSelectedGame(null); setGameQuery(''); }} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search for a game…"
                  value={gameQuery}
                  onChange={e => setGameQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
                  style={{ fontSize: '16px' }}
                />
                {isSearchingGames && (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {gameResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                    {gameResults.map(g => (
                      <button
                        key={g.id}
                        onClick={() => { setSelectedGame({ id: g.id, title: g.title }); setGameQuery(''); setGameResults([]); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary text-sm transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        <Gamepad2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{g.title}</span>
                        {g.year && <span className="text-xs text-muted-foreground">{g.year}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Players needed + group size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                <Users className="w-3 h-3 inline mr-1" />Players Needed
              </label>
              <div className="flex items-center gap-0 bg-secondary rounded-xl overflow-hidden">
                <button
                  onClick={() => setPlayersNeeded(n => Math.max(1, n - 1))}
                  className="px-3 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors text-lg font-bold"
                >−</button>
                <span className="flex-1 text-center font-semibold text-sm py-3">{playersNeeded}</span>
                <button
                  onClick={() => setPlayersNeeded(n => Math.min(99, n + 1))}
                  className="px-3 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors text-lg font-bold"
                >+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Group Size <span className="normal-case font-normal text-muted-foreground/60">(opt.)</span>
              </label>
              <div className="flex items-center gap-0 bg-secondary rounded-xl overflow-hidden">
                <button
                  onClick={() => setGroupSize(s => s === '' || s <= 2 ? '' : (s as number) - 1)}
                  className="px-3 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors text-lg font-bold"
                >−</button>
                <span className="flex-1 text-center font-semibold text-sm py-3">{groupSize === '' ? '—' : groupSize}</span>
                <button
                  onClick={() => setGroupSize(s => s === '' ? 2 : Math.min(100, (s as number) + 1))}
                  className="px-3 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors text-lg font-bold"
                >+</button>
              </div>
            </div>
          </div>

          {/* Game mode */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Game Mode <span className="normal-case font-normal text-muted-foreground/60">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ranked, Casual, Raid, PvP…"
              value={gameMode}
              onChange={e => setGameMode(e.target.value)}
              maxLength={60}
              className="w-full px-4 py-3 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Expiry dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Flare Expires In
            </label>
            <div className="relative">
              <select
                value={expiryMinutes}
                onChange={e => setExpiryMinutes(Number(e.target.value))}
                className="w-full appearance-none px-4 py-3 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm font-medium pr-10 cursor-pointer"
                style={{ fontSize: '16px' }}
              >
                {EXPIRY_OPTIONS.map(opt => (
                  <option key={opt.minutes} value={opt.minutes}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-3 border-t border-border/60">
          <button
            onClick={handleSubmit}
            disabled={saving || !selectedGame}
            className="w-full py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-gradient-to-br from-orange-500 to-red-500 text-white hover:from-orange-500/90 hover:to-red-500/90 shadow-lg shadow-orange-500/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
            {saving ? 'Posting…' : flareType === 'lfg' ? 'Post — Looking for Group' : 'Post — Looking for More'}
          </button>
        </div>
      </div>
    </div>
  );
}
