import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Users, Lock, UserPlus, Settings, X, Plus, Trash2, Loader2, Search } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { PostCard } from '../components/PostCard';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { GroupIcon } from '../components/GroupIcon';
import { gamesAPI } from '../utils/api';
import { communities as communitiesAPI } from '../utils/supabase';

function getCoverUrl(game: any): string | null {
  return game?.artwork?.find((a: any) => a.artwork_type === 'cover')?.url
    ?? game?.artwork?.[0]?.url
    ?? game?.coverArt
    ?? null;
}

export function CommunityDetail() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { currentUser, posts, getUserById, likePost, unlikePost, likedPosts, repostedPosts, repostPost, unrepostPost, users, communities } = useAppData();

  const community = communities.find((c: any) => c.id === communityId);
  const [isMember, setIsMember] = useState(
    currentUser?.communities?.some((c: any) => c.community_id === communityId) || false
  );
  const [showMembersModal, setShowMembersModal] = useState(false);

  // Community games
  const [communityGames, setCommunityGames] = useState<any[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [gameSearch, setGameSearch] = useState('');
  const [gameSearchResults, setGameSearchResults] = useState<any[]>([]);
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  const [savingGames, setSavingGames] = useState(false);

  if (!community) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="w-full max-w-2xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold">Community not found</h2>
        </div>
      </div>
    );
  }

  const isCreator = (community.creator_id ?? community.creatorId) === currentUser?.id;
  const isModerator = (community.moderatorIds ?? []).includes(currentUser?.id);
  const isAdmin = isCreator || isModerator;

  const adminUser = getUserById(community.creator_id ?? community.creatorId ?? '');

  // Load community games from stored IDs
  useEffect(() => {
    const gameIds: string[] = community.game_ids ?? [];
    if (gameIds.length === 0) { setCommunityGames([]); return; }
    setLoadingGames(true);
    gamesAPI.getGames(gameIds)
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.games ?? [];
        // Preserve order from game_ids
        const byId = Object.fromEntries(list.map((g: any) => [g.id, g]));
        setCommunityGames(gameIds.map(id => byId[id]).filter(Boolean));
      })
      .catch(() => setCommunityGames([]))
      .finally(() => setLoadingGames(false));
  }, [community.game_ids]);

  // Debounce game search
  useEffect(() => {
    if (!gameSearch.trim()) { setGameSearchResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearchingGames(true);
      try {
        const res = await gamesAPI.searchGames(gameSearch, 20);
        const list = Array.isArray(res) ? res : (res as any)?.games ?? [];
        setGameSearchResults(list);
      } catch { setGameSearchResults([]); }
      finally { setIsSearchingGames(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [gameSearch]);

  const addGameToCommunity = async (game: any) => {
    if (communityGames.some(g => g.id === game.id)) return;
    if (communityGames.length >= 10) return;
    const updated = [...communityGames, game];
    setCommunityGames(updated);
    // Persist to DB
    await communitiesAPI.updateGameIds?.(communityId!, updated.map(g => g.id)).catch(() => {});
  };

  const removeGameFromCommunity = async (gameId: string) => {
    const updated = communityGames.filter(g => g.id !== gameId);
    setCommunityGames(updated);
    await communitiesAPI.updateGameIds?.(communityId!, updated.map(g => g.id)).catch(() => {});
  };

  // Get all members
  const allMembers = (community.memberIds ?? [])
    .map((id: string) => getUserById(id))
    .filter(Boolean);
  const friends = allMembers.filter((m: any) => m.isFollowing);
  const otherMembers = allMembers.filter((m: any) => !m.isFollowing);

  const communityPosts = posts.filter(p => p.communityId === communityId || p.community_id === communityId);

  const handleJoinCommunity = () => {
    if (community.type === 'invite') {
      alert('This is an invite-only community. You need an invitation to join.');
      return;
    }
    if (community.type === 'request') {
      alert('Join request sent! You will be notified when approved.');
      return;
    }
    setIsMember(true);
  };

  const getTypeLabel = () => {
    switch (community.type) {
      case 'open': return 'Open Community';
      case 'request': return 'Approval Required';
      case 'invite': return 'Invite Only';
      default: return '';
    }
  };

  const handleLikeToggle = (postId: string) => {
    if (likedPosts.has(postId)) { unlikePost(postId); } else { likePost(postId); }
  };

  const handleRepostToggle = (postId: string) => {
    if (repostedPosts.has(postId)) { unrepostPost(postId); } else { repostPost(postId); }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">{community.name}</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto">
        {/* Banner */}
        {community.banner && (
          <div className="h-32 overflow-hidden">
            <img src={community.banner} alt={community.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Community Info */}
        <div className="px-4 py-6 bg-card border-b border-border">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center flex-shrink-0 text-accent">
              <GroupIcon iconKey={community.icon} className="w-8 h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold mb-1">{community.name}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                {community.type === 'invite' && <Lock className="w-4 h-4" />}
                <span>{getTypeLabel()}</span>
              </div>
              {/* Admin */}
              {adminUser && (
                <button
                  onClick={() => navigate(`/profile/${adminUser.id}`)}
                  className="text-xs text-muted-foreground hover:text-accent transition-colors"
                >
                  Admin: <span className="font-medium">{adminUser.display_name || adminUser.handle}</span>
                </button>
              )}
            </div>
          </div>

          {/* Friends who play */}
          {friends.length > 0 && (
            <button
              onClick={() => setShowMembersModal(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <div className="flex -space-x-2">
                {friends.slice(0, 3).map((friend: any, i: number) => (
                  <ProfileAvatar
                    key={friend.id || i}
                    username={friend.display_name || friend.handle || '?'}
                    profilePicture={friend.profile_picture || friend.profilePicture}
                    size="sm"
                    className="border-2 border-card"
                  />
                ))}
              </div>
              <span>{friends.length} {friends.length === 1 ? 'friend' : 'friends'} in this group</span>
            </button>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Users className="w-4 h-4" />
            <span>{(community.member_count ?? community.memberCount ?? 0).toLocaleString()} members</span>
          </div>

          <p className="text-muted-foreground mb-4">{community.description}</p>

          <div className="flex gap-2">
            {!isMember ? (
              <button
                onClick={handleJoinCommunity}
                className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {community.type === 'invite' ? 'Invite Only' : community.type === 'request' ? 'Request to Join' : 'Join Community'}
              </button>
            ) : (
              <button className="px-6 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium">
                Joined
              </button>
            )}
            {isAdmin && (
              <button className="p-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors" title="Community Settings">
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Community Games */}
        <div className="px-4 py-5 bg-card border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Games</h3>
            {isAdmin && communityGames.length < 10 && (
              <button
                onClick={() => setShowGamePicker(true)}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add game
              </button>
            )}
          </div>
          {loadingGames ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : communityGames.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isAdmin ? 'No games added yet. Add up to 10 games.' : 'No games added yet.'}
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {communityGames.map((game) => {
                const cover = getCoverUrl(game);
                return (
                  <div key={game.id} className="flex-shrink-0 w-20 group relative">
                    <div
                      className="aspect-[3/4] rounded-lg overflow-hidden bg-secondary cursor-pointer"
                      onClick={() => navigate(`/game/${game.id}`)}
                    >
                      {cover ? (
                        <img src={cover} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 text-xs">?</div>
                      )}
                    </div>
                    <p className="text-xs mt-1 line-clamp-1 text-center">{game.title}</p>
                    {isAdmin && (
                      <button
                        onClick={() => removeGameFromCommunity(game.id)}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Community Feed */}
        <div className="px-4 py-6">
          <h3 className="text-lg font-semibold mb-4">Community Posts</h3>
          {isMember ? (
            communityPosts.length > 0 ? (
              communityPosts.map(post => {
                const postUser = post.author ?? getUserById(post.userId ?? post.user_id);
                if (!postUser) return null;
                return (
                  <PostCard
                    key={post.id}
                    post={post}
                    user={postUser}
                    onLike={handleLikeToggle}
                    onRepost={handleRepostToggle}
                    isLiked={likedPosts.has(post.id)}
                    isReposted={repostedPosts.has(post.id)}
                  />
                );
              })
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No posts yet. Be the first to post in this community!</p>
              </div>
            )
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Join this community to see posts and participate</p>
            </div>
          )}
        </div>
      </div>

      {/* Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-4 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Members</h2>
              <button onClick={() => setShowMembersModal(false)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {[...friends, ...otherMembers].map((member: any) => (
                <button
                  key={member.id}
                  onClick={() => { setShowMembersModal(false); navigate(`/profile/${member.id}`); }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                >
                  <ProfileAvatar
                    username={member.display_name || member.handle || '?'}
                    profilePicture={member.profile_picture || member.profilePicture}
                    size="md"
                  />
                  <div className="text-left">
                    <p className="font-semibold">{member.display_name || member.handle}</p>
                    <p className="text-sm text-muted-foreground">@{(member.handle || '').replace(/^@/, '')}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game Picker Modal */}
      {showGamePicker && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[80vh] flex flex-col">
            <div className="sticky top-0 bg-card border-b border-border px-4 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Add Game ({communityGames.length}/10)</h2>
              <button onClick={() => setShowGamePicker(false)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search games..."
                  value={gameSearch}
                  onChange={e => setGameSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  autoFocus
                />
                {isSearchingGames && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {gameSearch.trim() === '' && <p className="text-center text-sm text-muted-foreground py-6">Type to search games</p>}
              <div className="space-y-2">
                {gameSearchResults.map(game => {
                  const cover = getCoverUrl(game);
                  const alreadyAdded = communityGames.some(g => g.id === game.id);
                  return (
                    <button
                      key={game.id}
                      onClick={() => { if (!alreadyAdded && communityGames.length < 10) { addGameToCommunity(game); setShowGamePicker(false); } }}
                      disabled={alreadyAdded || communityGames.length >= 10}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                        alreadyAdded ? 'opacity-50 cursor-default' : 'hover:bg-secondary'
                      }`}
                    >
                      {cover ? (
                        <img src={cover} alt={game.title} className="w-10 h-14 object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-14 bg-muted rounded flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{game.title}</p>
                        {game.year && <p className="text-xs text-muted-foreground">{game.year}</p>}
                      </div>
                      {alreadyAdded ? <span className="text-xs text-muted-foreground shrink-0">Added</span> : <Plus className="w-4 h-4 text-accent shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
