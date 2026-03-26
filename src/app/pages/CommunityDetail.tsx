import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Users, Lock, UserPlus, Settings, X, Plus, Trash2, Loader2, Search, MessageCircle, ShieldOff, UserMinus, Camera, Check, Flame } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { PostCard } from '../components/PostCard';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { GroupIcon } from '../components/GroupIcon';
import { LFGFlareModal } from '../components/LFGFlareModal';
import { gamesAPI } from '../utils/api';
import { groups as groupsAPI, profiles as profilesAPI, lfgFlares as flaresAPI } from '../utils/supabase';

function getCoverUrl(game: any): string | null {
  return game?.artwork?.find((a: any) => a.artwork_type === 'cover')?.url
    ?? game?.artwork?.[0]?.url
    ?? game?.coverArt
    ?? null;
}

export function CommunityDetail() {
  const { groupId } = useParams();
  const communityId = groupId; // alias for DB queries that still use communityId
  const navigate = useNavigate();
  const { currentUser, posts, getUserById, likePost, unlikePost, likedPosts, repostedPosts, repostPost, unrepostPost, users, groups } = useAppData();

  const community = groups.find((c: any) => c.id === groupId);
  const [isMember, setIsMember] = useState(
    currentUser?.communities?.some((c: any) => c.community_id === groupId) ?? false
  );

  // Verify membership from DB (communities may not be populated in currentUser yet)
  useEffect(() => {
    if (!currentUser?.id || !groupId) return;
    groupsAPI.isMember(currentUser.id, groupId).then(setIsMember).catch(() => {});
  }, [currentUser?.id, groupId]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [dbMembers, setDbMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(null);
  const [groupImageUrl, setGroupImageUrl] = useState<string | null>(community?.profile_picture ?? null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(community?.name ?? '');
  const [editDescription, setEditDescription] = useState(community?.description ?? '');
  const [savingEdit, setSavingEdit] = useState(false);

  // Invite users
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteResults, setInviteResults] = useState<any[]>([]);
  const [isSearchingInvite, setIsSearchingInvite] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(new Set());

  // Group flares
  const [groupFlares, setGroupFlares] = useState<any[]>([]);
  const [loadingFlares, setLoadingFlares] = useState(false);
  const [showFlareModal, setShowFlareModal] = useState(false);

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
          <h2 className="text-2xl font-bold">Group not found</h2>
        </div>
      </div>
    );
  }

  const isCreator = (community.creator_id ?? community.creatorId) === currentUser?.id;
  const isModerator = (community.moderatorIds ?? []).includes(currentUser?.id);
  const isAdmin = isCreator || isModerator;

  const adminUser = getUserById(community.creator_id ?? community.creatorId ?? '');
  const creatorId = community.creator_id ?? community.creatorId ?? '';

  // Load members from DB when modal opens
  useEffect(() => {
    if (!showMembersModal) return;
    setLoadingMembers(true);
    groupsAPI.getMembers(communityId!)
      .then(setDbMembers)
      .catch(() => setDbMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [showMembersModal, communityId]);

  const handleRemoveMember = async (userId: string) => {
    if (!isAdmin || userId === creatorId) return;
    setMemberActionLoading(userId);
    try {
      await groupsAPI.removeMember(communityId!, userId);
      setDbMembers(prev => prev.filter(m => m.id !== userId));
    } catch (e: any) {
      alert(e.message || 'Failed to remove member.');
    } finally {
      setMemberActionLoading(null);
    }
  };

  const handleBanMember = async (userId: string) => {
    if (!isAdmin || userId === creatorId) return;
    if (!confirm('Ban this user from the group? They will be removed and cannot rejoin.')) return;
    setMemberActionLoading(userId);
    try {
      await groupsAPI.banMember(communityId!, userId);
      setDbMembers(prev => prev.filter(m => m.id !== userId));
    } catch (e: any) {
      alert(e.message || 'Failed to ban member.');
    } finally {
      setMemberActionLoading(null);
    }
  };

  // Debounce invite user search
  useEffect(() => {
    if (!inviteSearch.trim()) { setInviteResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearchingInvite(true);
      try {
        const results = await profilesAPI.search(inviteSearch);
        // Exclude already-members and current user
        const memberIds = new Set(dbMembers.map((m: any) => m.id));
        setInviteResults(results.filter((u: any) => u.id !== currentUser?.id && !memberIds.has(u.id)));
      } catch { setInviteResults([]); }
      finally { setIsSearchingInvite(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [inviteSearch, dbMembers, currentUser?.id]);

  const handleInviteUser = async (userId: string) => {
    setInvitingUserId(userId);
    try {
      await groupsAPI.addMember(communityId!, userId);
      setInvitedUserIds(prev => new Set(prev).add(userId));
    } catch (e: any) {
      alert(e.message || 'Failed to add user.');
    } finally {
      setInvitingUserId(null);
    }
  };

  const handleGroupImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !communityId) return;
    setUploadingImage(true);
    try {
      const url = await groupsAPI.updateGroupImage(communityId, file);
      setGroupImageUrl(url);
    } catch (err: any) {
      alert(err.message || 'Failed to upload image.');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleSaveGroupEdit = async () => {
    if (!communityId || !editName.trim()) return;
    setSavingEdit(true);
    try {
      await groupsAPI.updateGroup(communityId, {
        name: editName.trim(),
        description: editDescription.trim(),
      });
      setShowEditModal(false);
    } catch (e: any) {
      alert(e.message || 'Failed to save changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Load active group flares
  useEffect(() => {
    if (!communityId) return;
    setLoadingFlares(true);
    flaresAPI.getActiveForCommunity(communityId)
      .then(setGroupFlares)
      .catch(() => setGroupFlares([]))
      .finally(() => setLoadingFlares(false));
  }, [communityId]);

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
    await groupsAPI.updateGameIds?.(communityId!, updated.map(g => g.id)).catch(() => {});
  };

  const removeGameFromCommunity = async (gameId: string) => {
    const updated = communityGames.filter(g => g.id !== gameId);
    setCommunityGames(updated);
    await groupsAPI.updateGameIds?.(communityId!, updated.map(g => g.id)).catch(() => {});
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
      alert('This is an invite-only group. You need an invitation to join.');
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
      case 'open': return 'Open Group';
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
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center text-accent overflow-hidden">
                {groupImageUrl ? (
                  <img src={groupImageUrl} alt={community.name} className="w-full h-full object-cover" />
                ) : (
                  <GroupIcon iconKey={community.icon} className="w-8 h-8" />
                )}
              </div>
              {isAdmin && (
                <>
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-lg hover:bg-accent/90 transition-colors"
                    title="Change group image"
                  >
                    {uploadingImage ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <Camera className="w-3 h-3 text-white" />}
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleGroupImageUpload}
                  />
                </>
              )}
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
                  className="text-xs text-muted-foreground hover:opacity-80 transition-opacity"
                >
                  Admin: <span className="font-bold text-accent">{adminUser.display_name || adminUser.handle}</span>
                </button>
              )}
            </div>
          </div>

          {/* Friends who play */}
          {friends.length > 0 && (
            <button
              onClick={() => navigate(`/group/${groupId}/members`)}
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

          <button
            onClick={() => navigate(`/group/${groupId}/members`)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <Users className="w-4 h-4" />
            <span>{(community.member_count ?? community.memberCount ?? 0).toLocaleString()} members</span>
          </button>

          <p className="text-muted-foreground mb-4">{community.description}</p>

          <div className="flex gap-2 flex-wrap">
            {isMember ? (
              <button className="px-6 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium">
                Joined
              </button>
            ) : community.type !== 'invite' ? (
              <button
                onClick={handleJoinCommunity}
                className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {community.type === 'request' ? 'Request to Join' : 'Join Group'}
              </button>
            ) : null}

            {/* Message Admin — invite-only groups only; respects admin's DM setting (on by default) */}
            {community.type === 'invite' && !isAdmin && adminUser && (adminUser as any).allow_dms !== false && (
              <button
                onClick={() => navigate(`/messages?to=${adminUser.id}`)}
                className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Message Admin
              </button>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={() => { setInviteSearch(''); setInviteResults([]); setInvitedUserIds(new Set()); setShowInviteModal(true); }}
                  className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium flex items-center gap-2"
                  title="Invite Users"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite
                </button>
                <button
                  onClick={() => { setEditName(community.name); setEditDescription(community.description ?? ''); setShowEditModal(true); }}
                  className="p-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                  title="Edit Group"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </>
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

        {/* Group Flares */}
        <div className="px-4 py-5 bg-card border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <h3 className="font-semibold">Active Flares</h3>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowFlareModal(true)}
                className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Post Flare
              </button>
            )}
          </div>
          {loadingFlares ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : groupFlares.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isAdmin ? 'No active flares. Post one to recruit group members!' : 'No active flares.'}
            </p>
          ) : (
            <div className="space-y-2">
              {groupFlares.map((flare: any) => (
                <button
                  key={flare.id}
                  onClick={() => navigate(`/flare/${flare.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-orange-500/5 border border-orange-500/20 rounded-xl text-left hover:bg-orange-500/10 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shrink-0">
                    <Flame className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{flare.game_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {flare.flare_type === 'lfg' ? 'LFG' : 'LFM'} · {flare.players_needed} needed
                      {flare.game_mode ? ` · ${flare.game_mode}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-orange-400 shrink-0">View →</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Flare Modal */}
        <LFGFlareModal
          isOpen={showFlareModal}
          onClose={() => setShowFlareModal(false)}
          prefilledCommunity={community ? { id: communityId!, name: community.name } : undefined}
          onCreated={(flare) => setGroupFlares(prev => [flare, ...prev])}
        />

        {/* Group Feed */}
        <div className="px-4 py-6">
          <h3 className="text-lg font-semibold mb-4">Group Posts</h3>
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
                <p>No posts yet. Be the first to post in this group!</p>
              </div>
            )
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Join this group to see posts and participate</p>
            </div>
          )}
        </div>
      </div>

      {/* Members — now a full-screen page at /group/:groupId/members */}

      {/* Edit Group Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl">
            <div className="sticky top-0 bg-card border-b border-border px-4 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Edit Group</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Profile picture */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  {groupImageUrl ? (
                    <img src={groupImageUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-3xl">
                      {community.icon}
                    </div>
                  )}
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-accent rounded-full flex items-center justify-center shadow-lg hover:bg-accent/90 transition-colors"
                    title="Change group image"
                  >
                    {uploadingImage ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
                  </button>
                </div>
                <span className="text-xs text-muted-foreground">Tap to change photo</span>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Group Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  maxLength={60}
                  className="w-full px-3 py-2.5 bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  maxLength={500}
                  rows={4}
                  className="w-full px-3 py-2.5 bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-none"
                />
              </div>
              <button
                onClick={handleSaveGroupEdit}
                disabled={savingEdit || !editName.trim()}
                className="w-full py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Users Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[80vh] flex flex-col">
            <div className="sticky top-0 bg-card border-b border-border px-4 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Invite Users</h2>
              <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by username or display name…"
                  value={inviteSearch}
                  onChange={e => setInviteSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  autoFocus
                />
                {isSearchingInvite && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {inviteSearch.trim() === '' && (
                <p className="text-center text-sm text-muted-foreground py-6">Type to search users</p>
              )}
              {inviteSearch.trim() !== '' && !isSearchingInvite && inviteResults.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">No users found</p>
              )}
              <div className="space-y-2">
                {inviteResults.map((user: any) => {
                  const alreadyInvited = invitedUserIds.has(user.id);
                  const isLoading = invitingUserId === user.id;
                  return (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                      <ProfileAvatar
                        username={user.display_name || user.handle || '?'}
                        profilePicture={user.profile_picture}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.display_name || user.handle}</p>
                        <p className="text-sm text-muted-foreground">@{(user.handle || '').replace(/^@/, '')}</p>
                      </div>
                      <button
                        onClick={() => handleInviteUser(user.id)}
                        disabled={alreadyInvited || isLoading}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 shrink-0 ${
                          alreadyInvited
                            ? 'bg-accent/20 text-accent cursor-default'
                            : 'bg-accent text-accent-foreground hover:bg-accent/90'
                        }`}
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : alreadyInvited ? (
                          <><Check className="w-3.5 h-3.5" /> Added</>
                        ) : (
                          <><UserPlus className="w-3.5 h-3.5" /> Add</>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
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
