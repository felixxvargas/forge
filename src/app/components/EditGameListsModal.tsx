import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, GripVertical, Trash2, Check, Loader2, Search, Send } from 'lucide-react';
import type { GameListType } from '../data/data';
import { gamesAPI, rawgAPI } from '../utils/api';
import { getGameRank } from '../utils/gameRankings';
import { supabase } from '../utils/supabase';

// Use a generic game shape compatible with both local Game and IGDB DB games
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

interface EditGameListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  listType: GameListType;
  currentGames: AnyGame[];
  onSave: (games: AnyGame[]) => void;
  autoFocusSearch?: boolean;
}

function getCoverUrl(game: AnyGame): string | null {
  return game.artwork?.find(a => a.artwork_type === 'cover')?.url
    ?? game.artwork?.[0]?.url
    ?? game.coverArt
    ?? null;
}

export function EditGameListsModal({
  isOpen,
  onClose,
  listType,
  currentGames,
  onSave,
  autoFocusSearch = false,
}: EditGameListsModalProps) {
  const [selectedGames, setSelectedGames] = useState<AnyGame[]>(currentGames);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AnyGame[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialGamesRef = useRef<AnyGame[]>([]);

  // Share-prompt state
  const [shareGames, setShareGames] = useState<AnyGame[] | null>(null);
  const [shareMessage, setShareMessage] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Pointer-based drag state (works on desktop and mobile touch)
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragPtrRef = useRef<{ fromIdx: number; currentOver: number | null } | null>(null);
  const itemElsRef = useRef<(HTMLDivElement | null)[]>([]);

  const listTitles: Record<GameListType, string> = {
    'recently-played': 'Recently Played',
    'played-before': "I've Played Before",
    'library': 'Library',
    'favorite': 'Favorite Games',
    'wishlist': 'Wishlist',
    'completed': 'Completed Games',
    'custom': 'Custom List',
    'lfg': 'Looking for Group',
  };

  // Debounced IGDB search
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

        // Merge: prefer server/IGDB results, append RAWG results not already present.
        // Normalise: normalize subtitle separator but keep subtitle content; strip edition labels.
        const normalise = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
          .replace(/\s*[:\-–]\s+/g, ' ')                           // normalize separator → space (keeps subtitle)
          .replace(/\s+(complete|definitive|enhanced|remastered|goty|gold|ultimate|deluxe|premium|standard|special|collector|limited|anniversary|director.?s cut|game of the year)\s*(edition)?$/i, '')
          .replace(/[''`,.!?™®]/g, '')                             // strip punctuation
          .replace(/\s+/g, ' ')
          .trim();
        // Build a lookup: normalised title → year for IGDB games (year-aware dedup)
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

        // Re-rank by: Forge popularity → title word coverage → alphabetical
        const deAccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const queryWords = deAccent(searchQuery.trim()).split(/\s+/).filter(Boolean);
        const wordCoverage = (title: string) => {
          const t = deAccent(title);
          return queryWords.filter(w => t.includes(w)).length;
        };
        merged.sort((a, b) => {
          const rankA = getGameRank(String(a.id)) ?? 9999;
          const rankB = getGameRank(String(b.id)) ?? 9999;
          const covA = wordCoverage(a.title);
          const covB = wordCoverage(b.title);
          if (covB !== covA) return covB - covA;
          if (rankA !== rankB) return rankA - rankB;
          return 0;
        });

        // Second-pass dedup: collapse variant versions of the same game (HD remasters,
        // Re: prefixes, Final Mix, parenthetical platform tags, etc.) keeping the
        // highest-ranked entry per group.
        const versionKey = (t: string) => t.toLowerCase()
          .replace(/\s*[:\-–]\s*/g, ' ')
          .replace(/\bre:?\s*/gi, '')                              // strip "Re:" version prefix
          .replace(/\b(hd|final mix|hd remix|remaster(?:ed)?|definitive|complete|director.?s cut|anniversary)\b/gi, '')
          .replace(/\s*\([^)]*\)\s*/g, '')                        // strip parentheticals (platform/year)
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
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  // Restore/reset state when opened
  useEffect(() => {
    if (isOpen) {
      initialGamesRef.current = currentGames;
      setSelectedGames(currentGames);
      setShareGames(null);
      setShareMessage('');
      const savedQuery = localStorage.getItem(`forge-game-list-search-${listType}`) || '';
      setSearchQuery(savedQuery);
      if (!savedQuery) setSearchResults([]);
      setDragIdx(null);
      setDragOverIdx(null);
      if (autoFocusSearch) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    }
  }, [isOpen]);

  // Persist search query per list type
  useEffect(() => {
    if (isOpen) {
      localStorage.setItem(`forge-game-list-search-${listType}`, searchQuery);
    }
  }, [searchQuery, isOpen, listType]);

  const addGame = (game: AnyGame) => {
    if (!selectedGames.some(g => g.id === game.id)) {
      const next = [game, ...selectedGames];
      setSelectedGames(next);
      onSave(next);
    }
  };

  const removeGame = (gameId: string) => {
    setSelectedGames(prev => prev.filter(g => g.id !== gameId));
  };

  const handleSave = () => {
    onSave(selectedGames);
    localStorage.removeItem(`forge-game-list-search-${listType}`);
    const newlyAdded = selectedGames.filter(
      g => !initialGamesRef.current.some(ig => String(ig.id) === String(g.id))
    );
    if (newlyAdded.length > 0) {
      const names = newlyAdded.map(g => g.title);
      const preview = names.length === 1
        ? names[0]
        : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names[0]}, ${names[1]}, and ${names.length - 2} more`;
      setShareMessage(`Just added ${preview} to my ${listTitles[listType]}.`);
      setShareGames(newlyAdded);
    } else {
      onClose();
    }
  };

  const handlePost = async () => {
    if (!shareGames) return;
    setIsPosting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      await supabase.from('posts').insert({
        user_id: session.user.id,
        content: shareMessage.trim() || `Added to my ${listTitles[listType]}: ${shareGames.map(g => g.title).join(', ')}`,
        game_id: shareGames[0]?.id ? String(shareGames[0].id) : null,
        game_title: shareGames[0]?.title ?? null,
      });
      setShareGames(null);
      onClose();
    } catch (e: any) {
      alert('Failed to post: ' + e.message);
    } finally {
      setIsPosting(false);
    }
  };

  // Pointer-based drag handlers (work on desktop mouse and mobile touch)
  const onGripPointerDown = useCallback((i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragPtrRef.current = { fromIdx: i, currentOver: i };
    setDragIdx(i);
  }, []);

  const onGripPointerMove = useCallback((i: number) => (e: React.PointerEvent) => {
    if (!dragPtrRef.current || dragPtrRef.current.fromIdx !== i) return;
    let overIdx = i;
    for (let j = 0; j < itemElsRef.current.length; j++) {
      const el = itemElsRef.current[j];
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-[60] flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">Edit {listTitles[listType]}</h2>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
        >
          Save
        </button>
      </div>

      {/* Sticky Search Bar */}
      <div className="sticky top-[65px] z-10 px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="relative max-w-2xl mx-auto w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search games to add…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); }}
            className="w-full pl-9 pr-9 py-2.5 bg-secondary/60 backdrop-blur-sm rounded-xl border border-border/50 focus:border-accent focus:outline-none transition-colors text-sm"
            style={{ fontSize: '16px' }}
          />
          {isSearching ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          ) : searchQuery ? (
            <button
              onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}

        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-4 pb-24 space-y-4 max-w-2xl mx-auto w-full">

          {/* Search Results */}
          {searchQuery.trim() && (
            <div>
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((game) => {
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
                  })}
                </div>
              ) : !isSearching ? (
                <p className="text-center py-4 text-muted-foreground text-sm">No games found</p>
              ) : null}
            </div>
          )}

          {/* Selected Games */}
          {selectedGames.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">
                In this list ({selectedGames.length}) · drag to reorder
              </h3>
              <div className="space-y-2">
                {selectedGames.map((game, i) => {
                  const cover = getCoverUrl(game);
                  const isDragging = dragIdx === i;
                  const isOver = dragOverIdx === i && dragIdx !== i;
                  return (
                    <div
                      key={game.id}
                      ref={el => { itemElsRef.current[i] = el; }}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-all select-none ${
                        isDragging
                          ? 'opacity-40 bg-accent/10 border-2 border-accent/40'
                          : isOver
                          ? 'bg-accent/10 border-2 border-accent/60 scale-[1.01]'
                          : 'bg-secondary border-2 border-transparent'
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
                })}

                {/* Add a game placeholder — always last in the list */}
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

      {/* Share prompt overlay — slides up after saving with new games */}
      {shareGames && (
        <div className="absolute inset-0 bg-background z-20 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card shrink-0">
            <div>
              <h2 className="text-base font-semibold">Share your update</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {shareGames.length === 1 ? '1 game added' : `${shareGames.length} games added`} to {listTitles[listType]}
              </p>
            </div>
            <button
              onClick={() => { setShareGames(null); onClose(); }}
              className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Game covers preview */}
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

          {/* Message input */}
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

          {/* Actions */}
          <div className="px-4 pb-6 flex gap-3 shrink-0">
            <button
              onClick={() => { setShareGames(null); onClose(); }}
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
