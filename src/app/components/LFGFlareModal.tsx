import { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, Swords, Users, Clock, Gamepad2 } from 'lucide-react';
import { gamesAPI } from '../utils/api';
import { lfgFlares } from '../utils/supabase';
import type { LFGFlare } from '../utils/supabase';
import { useAppData } from '../context/AppDataContext';

interface LFGFlareModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-fill with a specific game (from Game Detail page). */
  prefilledGame?: { id: string; title: string };
  /** Pre-fill the flare type. */
  prefilledType?: 'lfg' | 'lfm';
  /** Called after flare is successfully created. */
  onCreated?: (flare: LFGFlare) => void;
}

export function LFGFlareModal({ isOpen, onClose, prefilledGame, prefilledType, onCreated }: LFGFlareModalProps) {
  const { session, createPost } = useAppData() as any;

  // Game selection
  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState<any[]>([]);
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  const [selectedGame, setSelectedGame] = useState<{ id: string; title: string } | null>(prefilledGame ?? null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flare fields
  const [flareType, setFlareType] = useState<'lfg' | 'lfm'>(prefilledType ?? 'lfg');
  const [playersNeeded, setPlayersNeeded] = useState(1);
  const [groupSize, setGroupSize] = useState<number | ''>('');
  const [gameMode, setGameMode] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSelectedGame(prefilledGame ?? null);
      setFlareType(prefilledType ?? 'lfg');
      setPlayersNeeded(1);
      setGroupSize('');
      setGameMode('');
      setScheduledFor('');
      setExpiresAt('');
      setGameQuery('');
      setGameResults([]);
      setError('');
    }
  }, [isOpen]);

  // Game search debounce
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
      const defaultExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const flare = await lfgFlares.create(session.user.id, {
        game_id: selectedGame.id,
        game_title: selectedGame.title,
        flare_type: flareType,
        players_needed: playersNeeded,
        group_size: groupSize !== '' ? Number(groupSize) : undefined,
        game_mode: gameMode.trim() || undefined,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : defaultExpiry,
      });

      // Auto-create announcement post via context (updates feed automatically)
      const typeLabel = flareType === 'lfg' ? 'Looking for Group' : 'Looking for More';
      const parts = [
        `🎮 ${typeLabel}: ${selectedGame.title}`,
        groupSize !== '' ? `Need ${playersNeeded} more · Group of ${groupSize}` : `Need ${playersNeeded} more`,
        gameMode.trim() ? `Mode: ${gameMode.trim()}` : null,
        scheduledFor ? `When: ${new Date(scheduledFor).toLocaleString()}` : null,
      ].filter(Boolean);
      const content = parts.join('\n');

      try {
        await createPost(content, undefined, undefined, undefined, undefined, selectedGame.id, selectedGame.title);
      } catch { /* post creation is best-effort */ }

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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-4 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-semibold">Create LFG Flare</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-5">

          {/* Game */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Game <span className="text-destructive">*</span></label>
            {selectedGame ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-accent/10 border border-accent/30 rounded-xl">
                <Gamepad2 className="w-4 h-4 text-accent shrink-0" />
                <span className="font-medium text-sm flex-1">{selectedGame.title}</span>
                {!prefilledGame && (
                  <button onClick={() => { setSelectedGame(null); setGameQuery(''); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search games…"
                  value={gameQuery}
                  onChange={e => setGameQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  autoFocus
                />
                {isSearchingGames && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {gameResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                    {gameResults.map(g => (
                      <button
                        key={g.id}
                        onClick={() => { setSelectedGame({ id: g.id, title: g.title }); setGameQuery(''); setGameResults([]); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary text-sm transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        <Gamepad2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>{g.title}</span>
                        {g.year && <span className="text-xs text-muted-foreground ml-auto">{g.year}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LFG / LFM toggle */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Type</label>
            <div className="flex gap-2">
              {(['lfg', 'lfm'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFlareType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    flareType === t ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                >
                  {t === 'lfg' ? 'LFG — Looking for Group' : 'LFM — Looking for More'}
                </button>
              ))}
            </div>
          </div>

          {/* Players needed + group size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <Users className="w-3.5 h-3.5 inline mr-1" />
                Players Needed
              </label>
              <input
                type="number"
                min={1}
                max={99}
                value={playersNeeded}
                onChange={e => setPlayersNeeded(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2.5 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Group Size <span className="text-muted-foreground">(optional)</span></label>
              <input
                type="number"
                min={2}
                max={100}
                placeholder="e.g. 5"
                value={groupSize}
                onChange={e => setGroupSize(e.target.value === '' ? '' : Math.max(2, Number(e.target.value)))}
                className="w-full px-3 py-2.5 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-sm"
              />
            </div>
          </div>

          {/* Game mode */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Game Mode <span className="text-muted-foreground">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. Ranked, Casual, Raid, PvP…"
              value={gameMode}
              onChange={e => setGameMode(e.target.value)}
              maxLength={60}
              className="w-full px-3 py-2.5 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            />
          </div>

          {/* Scheduled time */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              <Clock className="w-3.5 h-3.5 inline mr-1" />
              Scheduled Time <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={e => setScheduledFor(e.target.value)}
              className="w-full px-3 py-2.5 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            />
          </div>

          {/* End date */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Flare Expires <span className="text-muted-foreground">(default: 24 hours)</span></label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2.5 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={saving || !selectedGame}
            className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
            {saving ? 'Creating…' : 'Post Flare'}
          </button>
        </div>
      </div>
    </div>
  );
}
