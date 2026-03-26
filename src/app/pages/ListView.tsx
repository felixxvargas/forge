import { useState } from 'react';
import { ArrowLeft, Edit2, Users } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { GameCard } from '../components/GameCard';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { EditGameListsModal } from '../components/EditGameListsModal';
import type { Game, GameListType } from '../data/data';

const LIST_LABELS: Record<GameListType, string> = {
  'recently-played': 'Recently Played',
  'favorite': 'Favorite Games',
  'wishlist': 'Wishlist',
  'library': 'Library',
  'custom': 'Custom List',
  'lfg': 'Looking for Group',
};

const LIST_KEY_MAP: Record<GameListType, string> = {
  'recently-played': 'recentlyPlayed',
  'favorite': 'favorites',
  'wishlist': 'wishlist',
  'library': 'library',
  'custom': 'custom',
  'lfg': 'lfg',
};

export function ListView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const listType = (searchParams.get('type') || 'library') as GameListType;
  const isBrowseMode = searchParams.get('browse') === 'true';
  const viewUserId = searchParams.get('userId');
  const { currentUser, users, updateGameList } = useAppData();

  const [sortOrder, setSortOrder] = useState<'default' | 'a-z' | 'z-a'>('default');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const listKey = LIST_KEY_MAP[listType];

  // If viewing another user's list via userId param
  const viewUser = viewUserId ? users.find(u => u.id === viewUserId) : null;
  const sourceUser = viewUser ?? currentUser;
  const gameLists = (sourceUser as any)?.game_lists ?? (sourceUser as any)?.gameLists ?? {};
  const games: Game[] = gameLists[listKey] ?? [];

  const sortedGames = sortOrder === 'default'
    ? [...games]
    : [...games].sort((a, b) =>
        sortOrder === 'a-z'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
      );

  const cycleSortOrder = () => {
    setSortOrder(s => s === 'default' ? 'a-z' : s === 'a-z' ? 'z-a' : 'default');
  };
  const sortLabel = sortOrder === 'default' ? 'Default' : sortOrder === 'a-z' ? 'A-Z' : 'Z-A';

  const handleSaveGameList = (updatedGames: Game[]) => {
    updateGameList(listType, updatedGames);
  };

  // Other users who have games in this list type
  const usersWithList = users.filter(u => {
    if (u.id === currentUser?.id) return false;
    const ul = u.game_lists ?? u.gameLists ?? {};
    return (ul[listKey] ?? []).length > 0;
  });

  const title = LIST_LABELS[listType] ?? 'Games';

  if (isBrowseMode) {
    const ownGames: Game[] = games;
    const allEntries = [
      ...(ownGames.length > 0 && currentUser ? [{ user: currentUser, games: ownGames, isSelf: true }] : []),
      ...usersWithList.map(u => ({ user: u, games: (u.game_lists ?? (u as any).gameLists ?? {})[listKey] ?? [] as Game[], isSelf: false })),
    ];

    return (
      <div className="min-h-screen pb-20 bg-background">
        <div className="bg-card sticky top-0 z-10 border-b border-border">
          <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">{title} Lists</h1>
              <p className="text-sm text-muted-foreground">{allEntries.length} {allEntries.length === 1 ? 'list' : 'lists'}</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-2xl mx-auto px-4 py-4 space-y-4">
          {allEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No {title} lists yet</p>
            </div>
          ) : (
            allEntries.map(({ user: u, games: uGames, isSelf }) => (
              <div
                key={u.id}
                className={`bg-card rounded-xl p-4 cursor-pointer hover:bg-card/80 transition-colors ${isSelf ? 'border border-accent/30' : ''}`}
                onClick={() => navigate(isSelf ? `/list?type=${listType}` : `/list?type=${listType}&userId=${u.id}`)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <ProfileAvatar
                    username={(u as any).display_name || (u as any).displayName || u.handle || '?'}
                    profilePicture={(u as any).profile_picture || (u as any).profilePicture}
                    size="md"
                    userId={u.id}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{(u as any).display_name || (u as any).displayName || u.handle}</p>
                      {isSelf && <span className="text-xs text-accent font-medium">You</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{uGames.length} games</p>
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {uGames.slice(0, 6).map((game: Game) => {
                    const cover = (game as any).artwork?.find((a: any) => a.artwork_type === 'cover')?.url
                      ?? (game as any).artwork?.[0]?.url
                      ?? game.coverArt;
                    return cover ? (
                      <img
                        key={game.id}
                        src={cover}
                        alt={game.title}
                        className="w-12 h-16 object-cover rounded shrink-0"
                      />
                    ) : (
                      <div key={game.id} className="w-12 h-16 rounded shrink-0 bg-secondary flex items-center justify-center">
                        <span className="text-xs text-muted-foreground text-center px-1 leading-tight">{game.title.slice(0,10)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

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
                <h1 className="text-xl font-semibold">{title}</h1>
                <p className="text-sm text-muted-foreground">
                  {viewUser ? `${viewUser.display_name || viewUser.handle}'s list · ` : ''}{games.length} games
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cycleSortOrder}
                className="px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
              >
                {sortLabel}
              </button>
              {!viewUser && (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                  title="Edit list"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Games Grid */}
      <div className="w-full max-w-2xl mx-auto px-7 py-6">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
          {sortedGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              showHours={listType === 'recently-played'}
              fullWidth
            />
          ))}
        </div>

        {games.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No games in this list yet</p>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
            >
              Add Games
            </button>
          </div>
        )}

        {/* Other users with this list */}
        {usersWithList.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{title} Lists</h2>
              {usersWithList.length > 3 && (
                <button
                  onClick={() => navigate(`/list?type=${listType}&browse=true`)}
                  className="text-sm text-accent hover:underline"
                >
                  See all ({usersWithList.length})
                </button>
              )}
            </div>
            <div className="space-y-3">
              {usersWithList.slice(0, 3).map(u => {
                const ul = u.game_lists ?? u.gameLists ?? {};
                const uGames: Game[] = ul[listKey] ?? [];
                return (
                  <div
                    key={u.id}
                    className="bg-card rounded-xl p-4 cursor-pointer hover:bg-card/80 transition-colors"
                    onClick={() => navigate(`/list?type=${listType}&userId=${u.id}`)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <ProfileAvatar
                        username={u.display_name || u.displayName || u.handle || '?'}
                        profilePicture={u.profile_picture || u.profilePicture}
                        size="sm"
                        userId={u.id}
                      />
                      <div>
                        <p className="font-semibold text-sm">{u.display_name || u.displayName || u.handle}</p>
                        <p className="text-xs text-muted-foreground">{uGames.length} games</p>
                      </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {uGames.slice(0, 6).map(game => (
                        <img
                          key={game.id}
                          src={game.coverArt}
                          alt={game.title}
                          className="w-10 h-14 object-cover rounded shrink-0"
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
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
