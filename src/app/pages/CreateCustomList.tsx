import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Crown, Search } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { gamesAPI } from '../utils/api';

export function CreateCustomList() {
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useAppData();
  const isPremium = currentUser?.is_premium;

  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState<any[]>([]);
  const [selectedGames, setSelectedGames] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const searchTimer = useState<ReturnType<typeof setTimeout> | null>(null)[0];
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (q: string) => {
    setGameQuery(q);
    if (timer) clearTimeout(timer);
    if (!q.trim()) { setGameResults([]); return; }
    setTimer(setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await gamesAPI.searchGames(q, 8);
        setGameResults(Array.isArray(results) ? results : results?.games ?? []);
      } catch {
        setGameResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400));
  };

  const toggleGame = (game: any) => {
    setSelectedGames(prev => {
      const exists = prev.find(g => g.id === game.id);
      if (exists) return prev.filter(g => g.id !== game.id);
      return [...prev, { id: String(game.id ?? game.game_id), title: game.title, coverArt: game.cover || game.coverArt }];
    });
  };

  const handleSave = async () => {
    if (!listName.trim()) return;
    setIsSaving(true);
    try {
      const existing = currentUser?.game_lists ?? {};
      const customLists = existing.customLists ?? [];
      const newList = {
        id: `custom-${Date.now()}`,
        name: listName.trim(),
        description: description.trim(),
        games: selectedGames,
        createdAt: new Date().toISOString(),
      };
      await updateCurrentUser({
        game_lists: {
          ...existing,
          customLists: [...customLists, newList],
        },
      });
      navigate('/profile');
    } catch (err) {
      console.error('Failed to save list:', err);
      alert('Failed to save list. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">Custom List</h1>
          </div>
        </div>
        <div className="w-full max-w-2xl mx-auto px-4 py-16 text-center">
          <Crown className="w-16 h-16 text-accent mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Premium Feature</h2>
          <p className="text-muted-foreground mb-8">
            Custom lists are available to Forge Premium subscribers.
          </p>
          <button
            onClick={() => navigate('/premium')}
            className="px-8 py-3 bg-accent text-accent-foreground rounded-xl font-semibold hover:bg-accent/90 transition-colors"
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">New Custom List</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={!listName.trim() || isSaving}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* List Name */}
        <div>
          <label className="block text-sm font-medium mb-2">List Name *</label>
          <input
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="e.g. Games I want to stream"
            maxLength={60}
            className="w-full px-4 py-2 bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this list about?"
            rows={2}
            maxLength={200}
            className="w-full px-4 py-2 bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>

        {/* Game search */}
        <div>
          <label className="block text-sm font-medium mb-2">Add Games</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={gameQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search for games to add…"
              className="w-full pl-9 pr-3 py-2 bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            />
          </div>
          {isSearching && <p className="text-xs text-muted-foreground mt-2">Searching…</p>}
          {gameResults.length > 0 && (
            <div className="mt-2 border border-border rounded-lg overflow-hidden">
              {gameResults.map((game: any, i) => {
                const isSelected = selectedGames.some(g => g.id === String(game.id ?? game.game_id));
                return (
                  <button
                    key={game.id ?? i}
                    onClick={() => toggleGame(game)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors text-sm ${isSelected ? 'bg-accent/10' : 'hover:bg-secondary'}`}
                  >
                    {game.cover && <img src={game.cover} alt="" className="w-8 h-10 rounded object-cover shrink-0" />}
                    <span className="flex-1">{game.title}</span>
                    {isSelected && <span className="text-accent text-xs font-medium">Added</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected games */}
        {selectedGames.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">Games in this list ({selectedGames.length})</label>
            <div className="flex flex-wrap gap-2">
              {selectedGames.map(game => (
                <div
                  key={game.id}
                  className="flex items-center gap-2 bg-secondary rounded-full px-3 py-1.5 text-sm"
                >
                  <span>{game.title}</span>
                  <button
                    onClick={() => setSelectedGames(prev => prev.filter(g => g.id !== game.id))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
