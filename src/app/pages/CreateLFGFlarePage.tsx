import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Search, Loader2, Flame, Users, Gamepad2, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { gamesAPI } from '../utils/api';
import { lfgFlares, groups as groupsAPI } from '../utils/supabase';
import { useAppData } from '../context/AppDataContext';

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

export function CreateLFGFlarePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, createPost, currentUser } = useAppData() as any;

  // Prefill from URL params
  const initGameId    = searchParams.get('gameId') ?? '';
  const initGameTitle = searchParams.get('gameTitle') ?? '';
  const initType      = (searchParams.get('type') as 'lfg' | 'lfm') ?? 'lfg';
  const initCommId    = searchParams.get('communityId') ?? '';
  const initCommName  = searchParams.get('communityName') ?? '';

  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState<any[]>([]);
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  const [selectedGame, setSelectedGame] = useState<{ id: string; title: string } | null>(
    initGameId && initGameTitle ? { id: initGameId, title: initGameTitle } : null
  );
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [flareType, setFlareType] = useState<'lfg' | 'lfm'>(initType);
  const [playersNeeded, setPlayersNeeded] = useState(1);
  const [groupSize, setGroupSize] = useState<number | ''>('');
  const [gameMode, setGameMode] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState(1440);

  const [scope, setScope] = useState<'personal' | 'group'>(initCommId ? 'group' : 'personal');
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(
    initCommId && initCommName ? { id: initCommId, name: initCommName } : null
  );
  const [adminGroups, setAdminGroups] = useState<any[]>([]);
  const [loadingAdminGroups, setLoadingAdminGroups] = useState(false);
  const [groupFlareCount, setGroupFlareCount] = useState<Record<string, number>>({});

  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  // Load admin groups when scope is 'group'
  useEffect(() => {
    if (scope !== 'group' || !session?.user?.id) return;
    setLoadingAdminGroups(true);
    groupsAPI.getUserCommunities(session.user.id)
      .then(async (communities: any[]) => {
        const adminOnes = communities.filter((c: any) => c.role === 'creator' || c.role === 'admin');
        setAdminGroups(adminOnes);
        const counts: Record<string, number> = {};
        await Promise.all(adminOnes.map(async (c: any) => {
          try { counts[c.id] = await lfgFlares.getCommunityFlareCount(c.id); }
          catch { counts[c.id] = 0; }
        }));
        setGroupFlareCount(counts);
      })
      .catch(() => setAdminGroups([]))
      .finally(() => setLoadingAdminGroups(false));
  }, [scope, session?.user?.id]);

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
    if (scope === 'group' && !selectedGroup) { setError('Please select a group.'); return; }
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
        community_id: scope === 'group' ? selectedGroup?.id : undefined,
      });

      const typeLabel = flareType === 'lfg' ? 'Looking for Group' : 'Looking for More';
      const parts = [
        `🔥 ${typeLabel}: ${selectedGame.title}`,
        groupSize !== '' ? `Need ${playersNeeded} more · Group of ${groupSize}` : `Need ${playersNeeded} more`,
        gameMode.trim() ? `Mode: ${gameMode.trim()}` : null,
      ].filter(Boolean);
      try {
        const postId = await createPost(parts.join('\n'), undefined, undefined, undefined, undefined, selectedGame.id, selectedGame.title, undefined, undefined, flare.id);
        if (postId) await lfgFlares.updatePostId(flare.id, postId).catch(() => {});
      } catch { /* best-effort */ }

      setShowSuccess(true);
      setTimeout(() => {
        navigate(-1);
      }, 1800);
    } catch (e: any) {
      setError(e.message || 'Failed to create flare.');
    } finally {
      setSaving(false);
    }
  };

  const profilePic = currentUser?.profile_picture ?? currentUser?.profilePicture;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-950 via-red-950/90 to-orange-950" />
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-orange-400"
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.5], x: (i % 3 - 1) * 60 + Math.random() * 30, y: -(80 + i * 20) }}
                transition={{ delay: 0.1 + i * 0.1, duration: 1.2, ease: 'easeOut' }}
              />
            ))}
            <motion.div
              className="relative w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center shadow-2xl shadow-orange-500/50"
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, duration: 0.5, type: 'spring', bounce: 0.4 }}
            >
              <Flame className="w-12 h-12 text-white" />
            </motion.div>
            <motion.h3
              className="relative text-2xl font-bold text-white"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              Flare Posted! 🔥
            </motion.h3>
            <motion.p
              className="relative text-sm text-orange-200/70"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.4 }}
            >
              Your flare is live — time to squad up
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-lg font-bold">Create LFG Flare</h1>
          </div>
        </div>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-5 space-y-5 pb-32">

        {/* Flare For */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Flare For</label>
          <div className="flex p-1 bg-secondary rounded-xl gap-1">
            {(['personal', 'group'] as const).map(s => (
              <button
                key={s}
                onClick={() => { setScope(s); if (s === 'personal') setSelectedGroup(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  scope === s
                    ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s === 'personal' ? (
                  profilePic ? (
                    <img src={profilePic} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-[9px] font-bold">
                      {(currentUser?.display_name || currentUser?.handle || '?').charAt(0).toUpperCase()}
                    </div>
                  )
                ) : <Users className="w-3.5 h-3.5" />}
                {s === 'personal' ? 'My Profile' : 'My Groups'}
              </button>
            ))}
          </div>
        </div>

        {/* Group picker */}
        {scope === 'group' && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Select Group</label>
            {loadingAdminGroups ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : adminGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1">You're not an admin of any groups.</p>
            ) : (
              <div className="space-y-2">
                {adminGroups.map((g: any) => {
                  const count = groupFlareCount[g.id] ?? 0;
                  const atLimit = count >= 1;
                  const isSelected = selectedGroup?.id === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => !atLimit && setSelectedGroup({ id: g.id, name: g.name })}
                      disabled={atLimit && !isSelected}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-orange-500/15 border border-orange-500/40'
                          : atLimit
                          ? 'bg-secondary opacity-50 cursor-not-allowed'
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                    >
                      <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{g.name}</p>
                        {atLimit && <p className="text-xs text-orange-400">1 active flare · Upgrade for unlimited</p>}
                      </div>
                      {isSelected && <ChevronRight className="w-4 h-4 text-orange-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* LFG / LFM toggle */}
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
              {!initGameId && (
                <button onClick={() => { setSelectedGame(null); setGameQuery(''); }} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-4 h-4 rotate-180" />
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
                autoFocus={!initGameId}
              />
              {isSearchingGames && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {gameResults.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                  {gameResults.map((g: any) => (
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
            <div className="flex items-center bg-secondary rounded-xl overflow-hidden">
              <button onClick={() => setPlayersNeeded(n => Math.max(1, n - 1))} className="px-3 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors text-lg font-bold">−</button>
              <span className="flex-1 text-center font-semibold text-sm py-3">{playersNeeded}</span>
              <button onClick={() => setPlayersNeeded(n => Math.min(99, n + 1))} className="px-3 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors text-lg font-bold">+</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Group Size <span className="normal-case font-normal text-muted-foreground/60">(opt.)</span>
            </label>
            <div className="flex items-center bg-secondary rounded-xl overflow-hidden">
              <button onClick={() => setGroupSize(s => s === '' || s <= 2 ? '' : (s as number) - 1)} className="px-3 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors text-lg font-bold">−</button>
              <span className="flex-1 text-center font-semibold text-sm py-3">{groupSize === '' ? '—' : groupSize}</span>
              <button onClick={() => setGroupSize(s => s === '' ? 2 : Math.min(100, (s as number) + 1))} className="px-3 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors text-lg font-bold">+</button>
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

        {/* Expiry */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Flare Expires In</label>
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

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border px-4 py-4">
        <div className="w-full max-w-2xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={saving || !selectedGame}
            className="w-full py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 border-2 border-orange-500/70 bg-orange-950/40 text-orange-300 hover:bg-orange-950/60 hover:border-orange-500/90"
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Flame className="w-6 h-6" />}
            {saving ? 'Posting…' : flareType === 'lfg' ? 'Post — Looking for Group' : 'Post — Looking for More'}
          </button>
        </div>
      </div>
    </div>
  );
}
