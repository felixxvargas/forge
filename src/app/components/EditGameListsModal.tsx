import { useState } from 'react';
import { X, Plus, GripVertical, Trash2, Check } from 'lucide-react';
import type { Game, GameListType } from '../data/data';
import { sampleGames } from '../data/data';

interface EditGameListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  listType: GameListType;
  currentGames: Game[];
  onSave: (games: Game[]) => void;
}

export function EditGameListsModal({ 
  isOpen, 
  onClose, 
  listType, 
  currentGames,
  onSave 
}: EditGameListsModalProps) {
  const [selectedGames, setSelectedGames] = useState<Game[]>(currentGames);
  const [searchQuery, setSearchQuery] = useState('');

  const listTitles: Record<GameListType, string> = {
    'recently-played': 'Recently Played',
    'library': 'Library',
    'favorite': 'Favorite Games',
    'wishlist': 'Wishlist',
    'custom': 'Custom List'
  };

  const availableGames = sampleGames.filter(game => 
    game.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addGame = (game: Game) => {
    setSelectedGames([...selectedGames, game]);
  };

  const removeGame = (gameId: string) => {
    setSelectedGames(selectedGames.filter(g => g.id !== gameId));
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
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
      {/* Content */}
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
          {/* Current Games */}
          {selectedGames.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Selected Games</h3>
              <div className="space-y-2">
                {selectedGames.map((game) => (
                  <div 
                    key={game.id}
                    className="flex items-center gap-3 p-2 bg-secondary rounded-lg"
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <img 
                      src={game.coverArt} 
                      alt={game.title}
                      className="w-12 h-16 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{game.title}</p>
                      <p className="text-sm text-muted-foreground capitalize">{game.platform}</p>
                    </div>
                    <button
                      onClick={() => removeGame(game.id)}
                      className="p-2 hover:bg-destructive/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Games */}
          <div>
            <h3 className="text-sm font-medium mb-2">Add Games</h3>
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-secondary rounded-lg border border-transparent focus:border-accent focus:outline-none transition-colors mb-2"
            />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableGames.map((game) => {
                const isSelected = selectedGames.some(g => g.id === game.id);
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
                    <img 
                      src={game.coverArt} 
                      alt={game.title}
                      className="w-12 h-16 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{game.title}</p>
                      <p className="text-sm text-muted-foreground capitalize">{game.platform} • {game.year}</p>
                    </div>
                    {isSelected ? (
                      <div className="flex items-center gap-1 text-accent text-sm font-medium">
                        <Check className="w-4 h-4" />
                        <span>Added</span>
                      </div>
                    ) : (
                      <Plus className="w-5 h-5 text-accent" />
                    )}
                  </button>
                );
              })}
              {availableGames.length === 0 && (
                <p className="text-center py-4 text-muted-foreground text-sm">
                  No games found
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}