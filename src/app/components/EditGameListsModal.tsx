import { useState, useEffect, useRef } from 'react';
import { X, Plus, GripVertical, Trash2, Check, Loader2, Search } from 'lucide-react';
import type { GameListType } from '../data/data';
import { gamesAPI } from '../utils/api';

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
}: EditGameListsModalProps) {
  const [selectedGames, setSelectedGames] = useState<AnyGame[]>(currentGames);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AnyGame[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listTitles: Record<GameListType, string> = {
    'recently-played': 'Recently Played',
    'library': 'Library',
    'favorite': 'Favorite Games',
    'wishlist': 'Wishlist',
    'custom': 'Custom List',
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
        const res = await gamesAPI.searchGames(searchQuery, 30);
        const list: AnyGame[] = Array.isArray(res) ? res : (res as any)?.games ?? [];
        setSearchResults(list);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedGames(currentGames);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  const addGame = (game: AnyGame) => {
    if (!selectedGames.some(g => g.id === game.id)) {
      setSelectedGames(prev => [...prev, game]);
    }
  };

  const removeGame = (gameId: string) => {
    setSelectedGames(prev => prev.filter(g => g.id !== gameId));
  };

  const handleSave = () => {
    onSave(selectedGames);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card sticky top-0">
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

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">

          {/* Selected Games */}
          {selectedGames.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Selected Games ({selectedGames.length})</h3>
              <div className="space-y-2">
                {selectedGames.map((game) => {
                  const cover = getCoverUrl(game);
                  return (
                    <div key={game.id} className="flex items-center gap-3 p-2 bg-secondary rounded-lg">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      {cover ? (
                        <img src={cover} alt={game.title} className="w-12 h-16 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">?</div>
                      )}
                      <div className="flex-1 min-w-0">
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
              </div>
            </div>
          )}

          {/* Search */}
          <div>
            <h3 className="text-sm font-medium mb-2">Search Games</h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search IGDB games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-secondary rounded-lg border border-transparent focus:border-accent focus:outline-none transition-colors"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {searchQuery.trim() === '' && (
              <p className="text-center py-6 text-muted-foreground text-sm">Type a game name to search</p>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
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
            )}

            {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
              <p className="text-center py-4 text-muted-foreground text-sm">No games found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
