import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Gamepad2, Library, Users, BookOpen, List } from 'lucide-react';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { GroupIcon } from '../components/GroupIcon';
import { useAppData } from '../context/AppDataContext';
import { userGamesAPI } from '../utils/supabase';
import { gamesAPI } from '../utils/api';

type Tab = 'people' | 'groups' | 'lists';

export function GameLists() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { currentUser, followingIds } = useAppData();

  const [game, setGame] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [listEntries, setListEntries] = useState<{ userId: string; handle: string; displayName: string; profilePicture?: string; listTypes: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('lists');

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    Promise.all([
      gamesAPI.getGame(gameId)
        .then((d: any) => setGame(d?.game ?? d ?? null))
        .catch(() => {}),
      userGamesAPI.getPlayersForGame(gameId)
        .then(setPlayers)
        .catch(() => {}),
      userGamesAPI.getGroupsWithGame(gameId)
        .then(setGroups)
        .catch(() => {}),
      userGamesAPI.getListEntries(gameId)
        .then(setListEntries)
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [gameId]);

  const coverUrl = game?.artwork?.find((a: any) => a.artwork_type === 'cover')?.url
    ?? game?.artwork?.[0]?.url
    ?? game?.coverArt;

  // Split players by list type
  const playedUsers = players.filter(p => p.played);
  const ownedUsers = players.filter(p => p.owned);

  const totalPeople = players.length;
  const totalGroups = groups.length;
  const totalListEntries = listEntries.length;

  const renderPlayer = (player: any) => (
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
        <div className="flex items-center gap-1.5">
          <p className="font-semibold truncate">{player.display_name || player.handle}</p>
          {followingIds.has(player.id) && (
            <span className="text-xs text-muted-foreground shrink-0">• Following</span>
          )}
        </div>
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
  );

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
              <p className="text-xs text-muted-foreground">On Lists</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto flex border-b border-border">
          <button
            onClick={() => setTab('lists')}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              tab === 'lists' ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="w-4 h-4" />
            Lists ({totalListEntries})
          </button>
          <button
            onClick={() => setTab('people')}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              tab === 'people' ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            People ({totalPeople})
          </button>
          <button
            onClick={() => setTab('groups')}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              tab === 'groups' ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Groups ({totalGroups})
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        ) : tab === 'lists' ? (
          listEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <List className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="font-medium">Not on any lists yet</p>
              <p className="text-sm text-muted-foreground mt-1">Be the first to add it!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {listEntries.map((entry) => (
                <button
                  key={entry.userId}
                  onClick={() => navigate(entry.userId === currentUser?.id ? '/profile' : `/profile/${entry.userId}`)}
                  className="w-full flex items-center gap-3 p-3 bg-card rounded-xl hover:bg-card/80 transition-colors text-left"
                >
                  <ProfileAvatar
                    username={entry.displayName || entry.handle || '?'}
                    profilePicture={entry.profilePicture ?? null}
                    size="md"
                    userId={entry.userId}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{entry.displayName || entry.handle}</p>
                    <p className="text-sm text-muted-foreground">@{(entry.handle || '').replace(/^@/, '')}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[140px]">
                    {entry.listTypes.map(lt => (
                      <span key={lt} className="text-xs bg-accent/15 text-accent rounded-full px-2 py-0.5 whitespace-nowrap">
                        {lt}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )
        ) : tab === 'people' ? (
          players.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="font-medium">No one has added this game yet</p>
              <p className="text-sm text-muted-foreground mt-1">Be the first to log it!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {playedUsers.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Gamepad2 className="w-4 h-4 text-accent" />
                    <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                      Played · {playedUsers.length}
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {playedUsers.map(renderPlayer)}
                  </div>
                </section>
              )}

              {ownedUsers.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Library className="w-4 h-4 text-muted-foreground" />
                    <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                      In Library · {ownedUsers.length}
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {ownedUsers.map(renderPlayer)}
                  </div>
                </section>
              )}
            </div>
          )
        ) : (
          /* Groups tab */
          groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="font-medium">No groups have listed this game yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group: any) => (
                <button
                  key={group.id}
                  onClick={() => navigate(`/group/${group.id}`)}
                  className="w-full flex items-center gap-3 p-4 bg-card rounded-xl hover:bg-card/80 transition-colors text-left"
                >
                  <div className="w-10 h-10 flex items-center justify-center bg-secondary rounded-full text-accent shrink-0">
                    <GroupIcon iconKey={group.icon} className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{group.name}</p>
                    {group.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{group.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(group.member_count ?? 0).toLocaleString()} member{group.member_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
