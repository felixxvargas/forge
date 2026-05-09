'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, GripVertical, Trash2, Check, Loader2, Search, Send, Gamepad2 } from 'lucide-react';
import type { GameListType } from '../data/data';
import { gamesAPI, rawgAPI } from '../utils/api';
import { analytics } from '../utils/analytics';
import { getGameRank, loadTrendingRankings } from '../utils/gameRankings';
import { supabase, userGamesAPI } from '../utils/supabase';
import { useNavigate, useParams, useSearchParams } from '@/compat/router';
import { useAppData } from '../context/AppDataContext';

interface AnyGame {
  id: string;
  title: string;
  coverArt?: string;
  artwork?: { artwork_type: string; url: string }[];
  year?: number;
  platform?: string;
  platforms?: string[];
  [key: string]: any;
}

function getCoverUrl(game: AnyGame): string | null {
  return game.artwork?.find(a => a.artwork_type === 'cover')?.url
    ?? game.artwork?.[0]?.url
    ?? game.coverArt
    ?? null;
}

const LIST_TITLES: Record<GameListType, string> = {
  'recently-played': 'Recently Played',
  'played-before': "I've Played Before",
  'library': 'Library',
  'favorite': 'Favorite Games',
  'wishlist': 'Wishlist',
  'completed': 'Completed Games',
  'custom': 'Custom List',
  'lfg': 'Looking for Group',
};

function getGamesForList(user: any, listType: GameListType): AnyGame[] {
  if (!user) return [];
  const lists = user.game_lists ?? user.gameLists ?? {};
  switch (listType) {
    case 'recently-played': return lists.recentlyPlayed ?? [];
    case 'played-before': return lists.playedBefore ?? [];
    case 'favorite': return lists.favorites ?? [];
    case 'wishlist': return lists.wishlist ?? [];
    case 'completed': return lists.completed ?? [];
    case 'lfg': return lists.lfg ?? [];
    case 'custom': return lists.custom ?? [];
    case 'library': return lists.library ?? [];
    default: return [];
  }
}

export function EditGameList() {
  const { listType: listTypeParam } = useParams<{ listType: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, updateGameList } = useAppData();

  const listType = (listTypeParam ?? 'library') as GameListType;
  const autoFocusSearch = searchParams.get('search') === '1';
  const [selectedGames, setSelectedGames] = useState<AnyGame[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AnyGame[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<{ title: string; cover: string | null }[]>(() => {
    try {
      const raw = localStorage.getItem(`forge-game-list-recent:${listTypeParam ?? 'library'}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Drop old plain-string entries saved before the cover-art format
      return parsed.filter((e: any) => typeof e === 'object' && e !== null && typeof e.title === 'string');
    } catch { return []; }
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialGamesRef = useRef<AnyGame[]>([]);
  const hasInitializedRef = useRef(false);

  // Share-prompt state
  const [shareGames, setShareGames] = useState<AnyGame[] | null>(null);
  const [shareMessage, setShareMessage] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Discovery carousel state
  const [newReleases, setNewReleases] = useState<AnyGame[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<AnyGame[]>([]);
  const [popularOnForge, setPopularOnForge] = useState<AnyGame[]>([]);

  // Pointer-based drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragPtrRef = useRef<{ fromIdx: number; currentOver: number | null } | null>(null);
  // Separate ref arrays for desktop and mobile to avoid collision with CSS-hidden elements
  const mobileItemElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const desktopItemElsRef = useRef<(HTMLDivElement | null)[]>([]);

  const draftKey = `forge-game-list-draft:${listType}`;

  // Initialize from currentUser — wait for it to be non-null so games load correctly
  // even if context is still hydrating when this page first mounts.
  useEffect(() => {
    if (hasInitializedRef.current || !currentUser) return;
    hasInitializedRef.current = true;

    const games = getGamesForList(currentUser, listType);
    initialGamesRef.current = games;
    try {
      const raw = localStorage.getItem(draftKey);
      const draft: AnyGame[] | null = raw ? JSON.parse(raw) : null;
      setSelectedGames(draft ?? games);
    } catch {
      setSelectedGames(games);
    }
    const savedQuery = localStorage.getItem(`forge-game-list-search-${listType}`) || '';
    setSearchQuery(savedQuery);
    if (!savedQuery) setSearchResults([]);
    if (autoFocusSearch) {
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
          desktopSearchInputRef.current?.focus();
        } else {
          searchInputRef.current?.focus();
        }
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Persist search query
  useEffect(() => {
    localStorage.setItem(`forge-game-list-search-${listType}`, searchQuery);
  }, [searchQuery, listType]);

  // Persist draft
  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(selectedGames));
  }, [selectedGames, draftKey]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [serverRes, rawgRes] = await Promise.allSettled([
          gamesAPI.searchGames(searchQuery, 30),
          rawgAPI.searchGames(searchQuery, 20),
        ]);
        const serverGames: AnyGame[] = serverRes.status === 'fulfilled'
          ? (Array.isArray(serverRes.value) ? serverRes.value : (serverRes.value as any)?.games ?? [])
          : [];
        const rawgGames: AnyGame[] = rawgRes.status === 'fulfilled' ? rawgRes.value : [];

        const normalise = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
          .replace(/\s*[:\-–]\s+/g, ' ')
          .replace(/\s+(complete|definitive|enhanced|remastered|goty|gold|ultimate|deluxe|premium|standard|special|collector|limited|anniversary|director.?s cut|game of the year)\s*(edition)?$/i, '')
          .replace(/[''`,.!?™®]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        const serverKeys = new Set<string>();
        for (const g of serverGames) {
          const key = normalise(g.title);
          serverKeys.add(key);
          const yr = (g as any).year ?? (g as any).first_release_year;
          if (yr) serverKeys.add(`${key}|${yr}`);
        }
        const merged = [
          ...serverGames,
          ...rawgGames.filter((g: AnyGame) => {
            const key = normalise(g.title);
            if (serverKeys.has(key)) return false;
            const yr = (g as any).year;
            if (yr && serverKeys.has(`${key}|${yr}`)) return false;
            return true;
          }),
        ];

        const deAccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        const queryWords = deAccent(searchQuery.trim()).split(/\s+/).filter(Boolean);
        const wordCoverage = (title: string) => {
          const t = deAccent(title);
          return queryWords.filter(w => t.includes(w)).length;
        };
        // Unofficial/fan-made/ROM-hack titles get pushed below official games
        const isUnofficial = (t: string) => {
          const l = t.toLowerCase();
          return /\b(randomizer|nuzlocke|rom\s*hack|fangame|fan\s*game|fan.?made|bootleg|fakemon)\b/.test(l)
            || /[\[(](hack|rom|fan|unofficial|pirate)[\])]/.test(l)
            || /\s(hack|rom)$/.test(l);
        };
        merged.sort((a, b) => {
          const unoffA = isUnofficial(a.title) ? 1 : 0;
          const unoffB = isUnofficial(b.title) ? 1 : 0;
          if (unoffA !== unoffB) return unoffA - unoffB;
          const rankA = getGameRank(String(a.id)) ?? 9999;
          const rankB = getGameRank(String(b.id)) ?? 9999;
          const covA = wordCoverage(a.title);
          const covB = wordCoverage(b.title);
          if (covB !== covA) return covB - covA;
          if (rankA !== rankB) return rankA - rankB;
          return 0;
        });

        const versionKey = (t: string) => t.toLowerCase()
          .replace(/\s*[:\-–]\s*/g, ' ')
          .replace(/\bre:?\s*/gi, '')
          .replace(/\b(hd|final mix|hd remix|remaster(?:ed)?|definitive|complete|director.?s cut|anniversary)\b/gi, '')
          .replace(/\s*\([^)]*\)\s*/g, '')
          .replace(/[''`,.!?™®]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        const seenVersionKeys = new Set<string>();
        const deduped = merged.filter(g => {
          const vk = versionKey(g.title);
          if (seenVersionKeys.has(vk)) return false;
          seenVersionKeys.add(vk);
          return true;
        });

        setSearchResults(deduped);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  // Load discovery carousels once on mount
  useEffect(() => {
    // Popular on Forge
    void loadTrendingRankings().then(ranked => {
      setPopularOnForge(
        ranked.filter(g => g.title && g.cover).slice(0, 12).map(g => ({
          id: g.id, title: g.title, coverArt: g.cover ?? undefined, year: g.year,
        }))
      );
    });

    // Recently Added by Users
    (async () => {
      try {
        const { data } = await supabase
          .from('user_games')
          .select('game_id, created_at')
          .order('created_at', { ascending: false })
          .limit(200);
        if (!data?.length) return;
        const seen = new Set<string>();
        const ids: string[] = [];
        for (const r of data) {
          if (r.game_id && !seen.has(r.game_id)) { seen.add(r.game_id); ids.push(r.game_id); }
          if (ids.length >= 12) break;
        }
        const batch: any = await gamesAPI.getGames(ids);
        const list: any[] = Array.isArray(batch) ? batch : batch?.games ?? [];
        const ord = new Map(ids.map((id, i) => [id, i]));
        list.sort((a, b) => (ord.get(String(a.id)) ?? 999) - (ord.get(String(b.id)) ?? 999));
        setRecentlyAdded(list.map(g => ({ id: String(g.id), title: g.title, artwork: g.artwork, coverArt: g.coverArt, year: g.year })));
      } catch { /* carousel stays empty */ }
    })();

    // New Releases — query DB directly by first_release_date desc
    (async () => {
      try {
        const currentYear = new Date().getFullYear();
        const since = Math.floor(new Date(`${currentYear - 2}-01-01`).getTime() / 1000);
        const { data } = await supabase
          .from('forge_games_17285bd7')
          .select('id, title, first_release_date, game_category, artwork:forge_game_artwork_17285bd7(*)')
          .gte('first_release_date', since)
          .not('first_release_date', 'is', null)
          .or('hidden.is.null,hidden.eq.false')
          .order('first_release_date', { ascending: false })
          .limit(60);
        if (!data?.length) return;
        const EXCL_CATS = new Set([1, 3, 5, 6, 7, 13, 14]);
        const NOISE = /\b(dlc|season pass|battle pass|mod|randomizer|fan.?made)\b/i;
        const filtered = (data as any[])
          .filter(g => {
            if (g.game_category !== null && EXCL_CATS.has(Number(g.game_category))) return false;
            if (NOISE.test(g.title ?? '')) return false;
            const art = g.artwork as any[] | null;
            if (!art?.length) return false;
            return true;
          })
          .slice(0, 12);
        setNewReleases(filtered.map(g => ({
          id: String(g.id),
          title: g.title as string,
          artwork: (g.artwork as any[] | null) ?? [],
          year: g.first_release_date ? new Date((g.first_release_date as number) * 1000).getFullYear() : undefined,
        })));
      } catch { /* carousel stays empty */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addGame = (game: AnyGame) => {
    if (!selectedGames.some(g => g.id === game.id)) {
      const next = [game, ...selectedGames];
      setSelectedGames(next);
      updateGameList(listType, next);
      analytics.gameAddedToList(String(game.id), game.title, listType);
      setRecentSearches(prev => {
        const entry = { title: game.title, cover: getCoverUrl(game) };
        const updated = [entry, ...prev.filter(e => e.title !== game.title)].slice(0, 8);
        localStorage.setItem(`forge-game-list-recent:${listType}`, JSON.stringify(updated));
        return updated;
      });
    }
  };

  const removeGame = (gameId: string) => {
    setSelectedGames(prev => {
      const next = prev.filter(g => g.id !== gameId);
      updateGameList(listType, next);
      return next;
    });
  };

  const handleClose = () => {
    localStorage.removeItem(draftKey);
    localStorage.removeItem(`forge-game-list-search-${listType}`);
    navigate(-1);
  };

  const syncLibraryUserGames = async (games: AnyGame[]) => {
    if (listType !== 'library' || !currentUser) return;
    const prevLibrary: any[] = currentUser?.game_lists?.library ?? [];
    const prevIds = new Set(prevLibrary.map((g: any) => String(g.id)));
    const newIds = new Set(games.map((g: any) => String(g.id)));
    const added = games.filter((g: any) => !prevIds.has(String(g.id)));
    const removed = prevLibrary.filter((g: any) => !newIds.has(String(g.id)));
    await Promise.allSettled([
      ...added.map((g: any) => userGamesAPI.add(currentUser.id, String(g.id), 'owned')),
      ...removed.map((g: any) => userGamesAPI.remove(currentUser.id, String(g.id), 'owned')),
    ]);
  };

  const handleSave = async () => {
    await updateGameList(listType, selectedGames);
    await syncLibraryUserGames(selectedGames);
    localStorage.removeItem(draftKey);
    localStorage.removeItem(`forge-game-list-search-${listType}`);
    const newlyAdded = selectedGames.filter(
      g => !initialGamesRef.current.some(ig => String(ig.id) === String(g.id))
    );
    const removed = initialGamesRef.current.filter(
      ig => !selectedGames.some(g => String(g.id) === String(ig.id))
    ).length;
    analytics.listUpdated(listType, selectedGames.length, newlyAdded.length, removed);
    if (newlyAdded.length > 0) {
      const names = newlyAdded.map(g => g.title);
      const preview = names.length === 1
        ? names[0]
        : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names[0]}, ${names[1]}, and ${names.length - 2} more`;
      setShareMessage(`Just added ${preview} to my ${LIST_TITLES[listType]}.`);
      setShareGames(newlyAdded);
    } else {
      navigate(-1);
    }
  };

  const handlePost = async () => {
    if (!shareGames) return;
    setIsPosting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const gameIds = shareGames.map(g => String(g.id));
      const gameTitles = shareGames.map(g => g.title);
      const covers = selectedGames.slice(0, 4).map(g => getCoverUrl(g)).filter(Boolean);
      await supabase.from('posts').insert({
        user_id: session.user.id,
        content: shareMessage.trim() || `Added to my ${LIST_TITLES[listType]}: ${gameTitles.join(', ')}`,
        game_id: gameIds[0] ?? null,
        game_title: gameTitles[0] ?? null,
        game_ids: gameIds,
        game_titles: gameTitles,
        attached_list: { listType, userId: session.user.id, title: LIST_TITLES[listType], gameCount: selectedGames.length, covers },
      });
      setShareGames(null);
      navigate(-1);
    } catch (e: any) {
      alert('Failed to post: ' + e.message);
    } finally {
      setIsPosting(false);
    }
  };

  const onGripPointerDown = useCallback((i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragPtrRef.current = { fromIdx: i, currentOver: i };
    setDragIdx(i);
  }, []);

  const onGripPointerMove = useCallback((i: number) => (e: React.PointerEvent) => {
    if (!dragPtrRef.current || dragPtrRef.current.fromIdx !== i) return;
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    const refs = isDesktop ? desktopItemElsRef.current : mobileItemElsRef.current;
    let overIdx = i;
    for (let j = 0; j < refs.length; j++) {
      const el = refs[j];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) { overIdx = j; break; }
      overIdx = j;
    }
    dragPtrRef.current.currentOver = overIdx;
    setDragOverIdx(overIdx);
  }, []);

  const onGripPointerUp = useCallback((i: number) => (_e: React.PointerEvent) => {
    if (!dragPtrRef.current || dragPtrRef.current.fromIdx !== i) return;
    const from = i;
    const to = dragPtrRef.current.currentOver;
    dragPtrRef.current = null;
    if (to !== null && to !== from) {
      setSelectedGames(prev => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    }
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  const onGripPointerCancel = useCallback(() => {
    dragPtrRef.current = null;
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  const renderSelectedGame = (
    game: AnyGame,
    i: number,
    elRef: React.MutableRefObject<(HTMLDivElement | null)[]>,
  ) => {
    const cover = getCoverUrl(game);
    const isDragging = dragIdx === i;
    const isOver = dragOverIdx === i && dragIdx !== i;
    return (
      <div
        key={game.id}
        ref={el => { elRef.current[i] = el; }}
        className={`flex items-center gap-3 p-2 rounded-lg transition-all select-none ${
          isDragging
            ? 'opacity-40 bg-accent/10 border-2 border-accent/40'
            : isOver
            ? 'bg-accent/10 border-2 border-accent/60 scale-[1.01]'
            : 'bg-secondary/60 border-2 border-transparent'
        }`}
      >
        <div
          className="cursor-grab active:cursor-grabbing touch-none p-1"
          onPointerDown={onGripPointerDown(i)}
          onPointerMove={onGripPointerMove(i)}
          onPointerUp={onGripPointerUp(i)}
          onPointerCancel={onGripPointerCancel}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        {cover ? (
          <img src={cover} alt={game.title} className="w-12 h-16 object-cover rounded pointer-events-none" />
        ) : (
          <div className="w-12 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground pointer-events-none">?</div>
        )}
        <div className="flex-1 min-w-0 pointer-events-none">
          <p className="font-medium truncate">{game.title}</p>
          {game.year && <p className="text-sm text-muted-foreground">{game.year}</p>}
        </div>
        <button
          onClick={() => removeGame(game.id)}
          className="p-2 hover:bg-destructive/20 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </button>
      </div>
    );
  };

  const renderSearchResult = (game: AnyGame) => {
    const isSelected = selectedGames.some(g => g.id === game.id);
    const cover = getCoverUrl(game);
    return (
      <button
        key={game.id}
        onClick={() => !isSelected && addGame(game)}
        disabled={isSelected}
        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
          isSelected
            ? 'bg-accent/20 cursor-default border-2 border-accent'
            : 'bg-secondary/50 hover:bg-secondary'
        }`}
      >
        {cover ? (
          <img src={cover} alt={game.title} className="w-12 h-16 object-cover rounded flex-shrink-0" />
        ) : (
          <div className="w-12 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">?</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{game.title}</p>
          <p className="text-sm text-muted-foreground">{game.year ?? ''}</p>
        </div>
        {isSelected ? (
          <div className="flex items-center gap-1 text-accent text-sm font-medium shrink-0">
            <Check className="w-4 h-4" />
          </div>
        ) : (
          <Plus className="w-5 h-5 text-accent shrink-0" />
        )}
      </button>
    );
  };

  const searchClearButton = (inputRef: React.RefObject<HTMLInputElement | null>) => (
    <button
      onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <X className="w-4 h-4" />
    </button>
  );

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-lg sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={handleClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">Edit {LIST_TITLES[listType]}</h2>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
        >
          Save
        </button>
      </div>

      {/* ── Desktop 2-column layout ── */}
      <div className="hidden lg:grid lg:grid-cols-[2fr_3fr] flex-1 min-h-0 gap-6 p-6">

        {/* Left: current list — 40% */}
        <div className="flex flex-col min-h-0 bg-card/80 backdrop-blur-xl rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-2 shrink-0 border-b border-border/40">
            <h3 className="text-sm font-medium text-muted-foreground">
              {selectedGames.length === 0
                ? 'Your list is empty'
                : `In this list (${selectedGames.length}) · drag to reorder`}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto forge-scroll p-3 space-y-2">
            {selectedGames.length > 0 ? (
              <>
                {selectedGames.map((game, i) => renderSelectedGame(game, i, desktopItemElsRef))}
                <button
                  onClick={() => desktopSearchInputRef.current?.focus()}
                  className="w-full flex items-center gap-3 p-2 rounded-lg border-2 border-dashed border-muted hover:border-accent/50 hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="w-12 h-16 rounded flex items-center justify-center border-2 border-dashed border-muted-foreground/30 shrink-0">
                    <Plus className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Add a game…</p>
                </button>
              </>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px] text-center px-4">
                <p className="text-muted-foreground text-sm">Search for games on the right to add them here</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: search + results / recent searches — 60% */}
        <div className="flex flex-col min-h-0 min-w-0">
          <div className="relative mb-4 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={desktopSearchInputRef}
              type="text"
              placeholder="Search games to add…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-3 bg-card/80 backdrop-blur-xl rounded-xl border border-border/50 focus:border-accent focus:outline-none transition-colors text-sm"
              style={{ fontSize: '16px' }}
            />
            {isSearching ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            ) : searchQuery ? searchClearButton(desktopSearchInputRef) : null}
          </div>

          <div className="flex-1 overflow-y-auto forge-scroll bg-card/80 backdrop-blur-xl rounded-2xl p-4">
            {searchQuery.trim() ? (
              searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map(game => renderSearchResult(game))}
                </div>
              ) : !isSearching ? (
                <p className="text-center py-8 text-muted-foreground text-sm">No games found</p>
              ) : null
            ) : (
              <div className="space-y-5">
                {recentSearches.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Recently added</p>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map(entry => (
                        <button
                          key={entry.title}
                          onClick={() => { setSearchQuery(entry.title); desktopSearchInputRef.current?.focus(); }}
                          className="flex items-center gap-2 pl-1 pr-3 py-1 bg-secondary/60 hover:bg-secondary rounded-full text-sm transition-colors"
                        >
                          {entry.cover ? (
                            <img src={entry.cover} alt={entry.title} className="w-7 h-9 object-cover rounded shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <Gamepad2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          )}
                          <span className="truncate max-w-[140px]">{entry.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {[
                  { label: 'New Releases', games: newReleases },
                  { label: 'Recently Added by Forge Users', games: recentlyAdded },
                  { label: 'Popular on Forge', games: popularOnForge },
                ].filter(({ games }) => games.length > 0).map(({ label, games }) => (
                  <div key={label}>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{label}</p>
                    <div className="flex gap-2.5 overflow-x-auto pb-2 forge-scroll">
                      {games.map(game => {
                        const isSelected = selectedGames.some(g => g.id === game.id);
                        const cover = getCoverUrl(game);
                        return (
                          <button
                            key={game.id}
                            onClick={() => !isSelected && addGame(game)}
                            disabled={isSelected}
                            className="shrink-0 w-[68px] text-left"
                          >
                            <div className={`w-[68px] h-[90px] rounded-lg overflow-hidden bg-muted/20 mb-1 relative ${isSelected ? 'ring-2 ring-accent' : 'hover:opacity-80 transition-opacity'}`}>
                              {cover && <img src={cover} alt={game.title} className="w-full h-full object-cover" />}
                              {isSelected && (
                                <div className="absolute inset-0 bg-accent/30 flex items-center justify-center">
                                  <Check className="w-4 h-4 text-accent" />
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{game.title}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {recentSearches.length === 0 && newReleases.length === 0 && recentlyAdded.length === 0 && popularOnForge.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                    <Search className="w-8 h-8 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm">Search for games to add to your list</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile layout ── */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0">
        {/* Sticky search bar */}
        <div className="sticky top-[65px] z-10 px-4 py-3 border-b border-border/50 bg-card/30 backdrop-blur-md">
          <div className="relative max-w-2xl mx-auto w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search games to add…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 bg-secondary/60 backdrop-blur-sm rounded-xl border border-border/50 focus:border-accent focus:outline-none transition-colors text-sm"
              style={{ fontSize: '16px' }}
            />
            {isSearching ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            ) : searchQuery ? searchClearButton(searchInputRef) : null}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto forge-scroll overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="p-4 pb-24 space-y-4 max-w-2xl mx-auto w-full">

            {/* Search results */}
            {searchQuery.trim() && (
              <div>
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map(game => renderSearchResult(game))}
                  </div>
                ) : !isSearching ? (
                  <p className="text-center py-4 text-muted-foreground text-sm">No games found</p>
                ) : null}
              </div>
            )}

            {/* Recently added */}
            {!searchQuery.trim() && recentSearches.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Recently added</p>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map(entry => (
                    <button
                      key={entry.title}
                      onClick={() => { setSearchQuery(entry.title); searchInputRef.current?.focus(); }}
                      className="flex items-center gap-2 pl-1 pr-3 py-1 bg-secondary/60 hover:bg-secondary rounded-full text-sm transition-colors"
                    >
                      {entry.cover ? (
                        <img src={entry.cover} alt={entry.title} className="w-7 h-9 object-cover rounded-full shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Gamepad2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                      <span className="truncate max-w-[140px]">{entry.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected games */}
            {selectedGames.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">
                  In this list ({selectedGames.length}) · drag to reorder
                </h3>
                <div className="space-y-2">
                  {selectedGames.map((game, i) => renderSelectedGame(game, i, mobileItemElsRef))}
                  <button
                    onClick={() => { searchInputRef.current?.focus(); searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                    className="w-full flex items-center gap-3 p-2 rounded-lg border-2 border-dashed border-muted hover:border-accent/50 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="w-12 h-16 rounded flex items-center justify-center border-2 border-dashed border-muted-foreground/30 shrink-0">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Add a game to this list…</p>
                  </button>
                </div>
              </div>
            )}

            {selectedGames.length === 0 && !searchQuery.trim() && (
              <button
                onClick={() => { searchInputRef.current?.focus(); searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                className="w-full flex items-center gap-3 p-2 rounded-lg border-2 border-dashed border-muted hover:border-accent/50 hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="w-12 h-16 rounded flex items-center justify-center border-2 border-dashed border-muted-foreground/30 shrink-0">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Search for games above to add them to this list…</p>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Share prompt overlay */}
      {shareGames && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-lg z-20 flex flex-col">
          <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card/80 backdrop-blur-lg shrink-0">
            <div>
              <h2 className="text-base font-semibold">Share your update</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {shareGames.length === 1 ? '1 game added' : `${shareGames.length} games added`} to {LIST_TITLES[listType]}
              </p>
            </div>
            <button
              onClick={() => { setShareGames(null); navigate(-1); }}
              className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-3 px-4 py-4 overflow-x-auto shrink-0">
            {shareGames.map(game => {
              const cover = getCoverUrl(game);
              return (
                <div key={game.id} className="shrink-0 w-14">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted/50 mb-1.5">
                    {cover
                      ? <img src={cover} alt={game.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-xs">?</div>
                    }
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate leading-tight text-center">{game.title}</p>
                </div>
              );
            })}
          </div>

          <div className="flex-1 px-4 pb-4 flex flex-col min-h-0">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-medium">Your message</p>
            <textarea
              autoFocus
              value={shareMessage}
              onChange={e => setShareMessage(e.target.value)}
              placeholder="Write something about these games…"
              className="flex-1 min-h-[120px] w-full bg-secondary rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent border border-border/50 focus:border-accent/60"
            />
          </div>

          <div className="px-4 pb-6 flex gap-3 shrink-0">
            <button
              onClick={() => { setShareGames(null); navigate(-1); }}
              className="flex-1 py-3 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handlePost}
              disabled={isPosting}
              className="flex-1 py-3 bg-accent text-accent-foreground rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors hover:bg-accent/90"
            >
              {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isPosting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
