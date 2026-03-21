import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Gamepad2, Library, Users } from 'lucide-react';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { useAppData } from '../context/AppDataContext';
import { userGamesAPI } from '../utils/supabase';
import { gamesAPI } from '../utils/api';

type Tab = 'all' | 'friends';

export function GamePlayers() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { currentUser, followingIds } = useAppData();

  const [game, setGame] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => {
    if (!gameId) return;
    Promise.all([
      gamesAPI.getGame(gameId).then((d: any) => setGame(d?.game ?? d ?? null)).catch(() => {}),
      userGamesAPI.getPlayersForGame(gameId).then(setPlayers).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [gameId]);

  const friends = players.filter(p => followingIds.has(p.id) || p.id === currentUser?.id);
  const displayed = tab === 'friends' ? friends : players;

  const coverUrl = game?.artwork?.find((a: any) => a.artwork_type === 'cover')?.url
    ?? game?.artwork?.[0]?.url
    ?? game?.coverArt;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {coverUrl && (
              <img src={coverUrl} alt={game?.title} className="w-8 h-10 object-cover rounded" />
            )}
            <div className="min-w-0">
              <h1 className="font-semibold truncate">{game?.title ?? 'Game'}</h1>
              <p className="text-xs text-muted-foreground">{players.length} player{players.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto flex border-b border-border">
          <button
            onClick={() => setTab('all')}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              tab === 'all' ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            All Players ({players.length})
          </button>
          <button
            onClick={() => setTab('friends')}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              tab === 'friends' ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            Friends ({friends.length})
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="font-medium">
              {tab === 'friends' ? 'None of your friends play this game yet' : 'No players yet'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Be the first to log it!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((player) => (
              <button
                key={player.id}
                onClick={() => navigate(player.id === currentUser?.id ? '/profile' : `/profile/${player.id}`)}
                className="w-full flex items-center gap-3 p-3 bg-card rounded-xl hover:bg-card/80 transition-colors text-left"
              >
                <ProfileAvatar
                  username={player.display_name || player.handle || '?'}
                  profilePicture={player.profile_picture ?? null}
                  size="md"
                  userId={player.id}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{player.display_name || player.handle}</p>
                  <p className="text-sm text-muted-foreground">@{(player.handle || '').replace(/^@/, '')}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {player.played && (
                    <span className="flex items-center gap-1 text-xs bg-accent/15 text-accent rounded-full px-2 py-0.5">
                      <Gamepad2 className="w-3 h-3" />
                      Played
                    </span>
                  )}
                  {player.owned && (
                    <span className="flex items-center gap-1 text-xs bg-secondary text-foreground rounded-full px-2 py-0.5">
                      <Library className="w-3 h-3" />
                      Owned
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
