import { useState } from 'react';
import { ArrowLeft, Plus, Search, X } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { GameCard } from '../components/GameCard';
import { EditGameListsModal } from '../components/EditGameListsModal';
import type { Game, GameListType } from '../data/data';

export function ListView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const listType = (searchParams.get('type') || 'library') as GameListType;
  const { currentUser, updateGameList } = useAppData();
  
  const [sortOrder, setSortOrder] = useState<'a-z' | 'z-a'>('a-z');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Get the games for this list
  const getGamesForList = (): Game[] => {
    switch (listType) {
      case 'recently-played': return currentUser.gameLists.recentlyPlayed;
      case 'favorite': return currentUser.gameLists.favorites;
      case 'wishlist': return currentUser.gameLists.wishlist;
      case 'library': return currentUser.gameLists.library;
      default: return [];
    }
  };

  const games = getGamesForList();

  // Get the title for this list
  const getTitle = () => {
    switch (listType) {
      case 'recently-played': return 'Recently Played';
      case 'favorite': return 'Favorite Games';
      case 'wishlist': return 'Wishlist';
      case 'library': return 'Library';
      default: return 'Games';
    }
  };

  // Sort games
  const sortedGames = [...games].sort((a, b) => 
    sortOrder === 'a-z' 
      ? a.title.localeCompare(b.title) 
      : b.title.localeCompare(a.title)
  );

  const handleSaveGameList = (updatedGames: Game[]) => {
    updateGameList(listType, updatedGames);
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <div className="bg-card sticky top-0 z-10 border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold">{getTitle()}</h1>
                <p className="text-sm text-muted-foreground">{games.length} games</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortOrder(sortOrder === 'a-z' ? 'z-a' : 'a-z')}
                className="px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
              >
                {sortOrder === 'a-z' ? 'A-Z' : 'Z-A'}
              </button>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                title="Edit list"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Games Grid */}
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {sortedGames.map((game) => (
            <GameCard 
              key={game.id} 
              game={game} 
              showHours={listType === 'recently-played'}
            />
          ))}
        </div>

        {/* Empty state */}
        {games.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No games in this list</p>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
            >
              Add Games
            </button>
          </div>
        )}
      </div>

      {/* Edit Game Lists Modal */}
      <EditGameListsModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveGameList}
        currentGames={games}
        listType={listType}
      />
    </div>
  );
}