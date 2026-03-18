import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Users } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { sampleGames } from '../data/data';
import { PlatformIcon } from '../components/PlatformIcon';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { Header } from '../components/Header';

export function GameDetail() {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const { users, currentUser } = useAppData();

  const game = sampleGames.find(g => g.id === gameId);

  if (!game) {
    return (
      <div className="min-h-screen pb-20">
        <Header />
        <div className="w-full max-w-2xl mx-auto px-6 py-12 text-center">
          <h2 className="text-2xl font-bold mb-2">Game not found</h2>
          <button
            onClick={() => navigate(-1)}
            className="text-accent hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  // Find all users who have this game in their library
  const allUsers = [currentUser, ...users];
  const usersWithGame = allUsers.filter(user => 
    user.gameLists.library.some(g => g.id === game.id) ||
    user.gameLists.recentlyPlayed.some(g => g.id === game.id) ||
    user.gameLists.favorites.some(g => g.id === game.id)
  );

  // Separate friends (users currentUser is following) from all users
  const friends = usersWithGame.filter(user => user.isFollowing);
  const totalPlayers = usersWithGame.length;

  return (
    <div className="min-h-screen pb-20 md:pb-6 bg-background">
      <Header />
      
      {/* Back Button */}
      <div className="w-full max-w-2xl mx-auto px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        {/* Game Header */}
        <div className="bg-card rounded-2xl overflow-hidden mb-6">
          <div className="relative aspect-video">
            <img 
              src={game.coverArt} 
              alt={game.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          </div>
          
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{game.title}</h1>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="text-lg">{game.year}</span>
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={game.platform} className="w-8 h-8" />
                    <span className="text-lg capitalize">{game.platform}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Player Stats */}
            <div className="flex items-center gap-6 pt-4 border-t border-border">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Total Players</span>
                </div>
                <p className="text-2xl font-semibold">{totalPlayers}</p>
              </div>
              {friends.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Friends Playing</p>
                  <p className="text-2xl font-semibold">{friends.length}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Friends Who Play */}
        {friends.length > 0 && (
          <div className="bg-card rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Friends Who Play</h2>
              <div className="flex -space-x-2">
                {friends.slice(0, 5).map((user) => (
                  <ProfileAvatar
                    key={user.id}
                    src={user.profilePicture}
                    alt={user.displayName}
                    className="w-8 h-8 border-2 border-card"
                  />
                ))}
                {friends.length > 5 && (
                  <div className="w-8 h-8 rounded-full border-2 border-card bg-secondary flex items-center justify-center text-xs font-medium">
                    +{friends.length - 5}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-3">
              {friends.slice(0, 5).map((user) => {
                const userGame = user.gameLists.library.find(g => g.id === game.id) ||
                                user.gameLists.recentlyPlayed.find(g => g.id === game.id) ||
                                user.gameLists.favorites.find(g => g.id === game.id);
                
                return (
                  <button
                    key={user.id}
                    onClick={() => navigate(`/profile/${user.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <ProfileAvatar
                      src={user.profilePicture}
                      alt={user.displayName}
                      className="w-12 h-12"
                    />
                    <div className="flex-1 text-left">
                      <p className="font-semibold">{user.displayName}</p>
                      <p className="text-sm text-muted-foreground">{user.handle}</p>
                    </div>
                    {userGame?.hoursPlayed && (
                      <div className="text-right">
                        <p className="text-sm font-medium">{userGame.hoursPlayed}h</p>
                        <p className="text-xs text-muted-foreground">played</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* All Players */}
        <div className="bg-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">All Players</h2>
            <div className="flex -space-x-2">
              {usersWithGame.slice(0, 5).map((user) => (
                <ProfileAvatar
                  key={user.id}
                  src={user.profilePicture}
                  alt={user.displayName}
                  className="w-8 h-8 border-2 border-card"
                />
              ))}
              {usersWithGame.length > 5 && (
                <div className="w-8 h-8 rounded-full border-2 border-card bg-secondary flex items-center justify-center text-xs font-medium">
                  +{usersWithGame.length - 5}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-3">
            {usersWithGame.map((user) => {
              const userGame = user.gameLists.library.find(g => g.id === game.id) ||
                              user.gameLists.recentlyPlayed.find(g => g.id === game.id) ||
                              user.gameLists.favorites.find(g => g.id === game.id);
              
              return (
                <button
                  key={user.id}
                  onClick={() => navigate(user.id === currentUser.id ? '/profile' : `/profile/${user.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                >
                  <ProfileAvatar
                    src={user.profilePicture}
                    alt={user.displayName}
                    className="w-12 h-12"
                  />
                  <div className="flex-1 text-left">
                    <p className="font-semibold">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground">{user.handle}</p>
                  </div>
                  {userGame?.hoursPlayed && (
                    <div className="text-right">
                      <p className="text-sm font-medium">{userGame.hoursPlayed}h</p>
                      <p className="text-xs text-muted-foreground">played</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}