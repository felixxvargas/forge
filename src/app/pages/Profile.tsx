import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Edit2, ArrowLeft, Upload, Crown, Shield, MoreHorizontal, Ban, BellOff, Bell, UserX, UserCheck, Flag, Trophy, Gamepad2, Monitor, Mail, Swords, Plus, Trash2 } from 'lucide-react';
import { ShareModal } from '../components/ShareModal';
import { ForgeLogo, getForgeLogoDataURL } from '../components/ForgeLogo';
import { Header } from '../components/Header';
import { PostCard } from '../components/PostCard';
import { GameList } from '../components/GameList';
import { EditGameListsModal } from '../components/EditGameListsModal';
import { ProfilePictureLightbox } from '../components/ProfilePictureLightbox';
import { PlatformIcon } from '../components/PlatformIcon';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { FollowButton } from '../components/FollowButton';
import { WritePostButton } from '../components/WritePostButton';
import { useAppData } from '../context/AppDataContext';
import type { User, SocialPlatform, GameListType } from '../data/data';
import { formatNumber } from '../utils/formatNumber';
import { useBlueskyData } from '../hooks/useBlueskyData';
import { profiles as profilesAPI, posts as postsAPI, profiles, lfgFlares as lfgFlaresAPI } from '../utils/supabase';
import type { LFGFlare } from '../utils/supabase';
import { LFGFlareModal } from '../components/LFGFlareModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

// Helper component to linkify mentions
function LinkifyMentions({ text }: { text: string }) {
  const parts = text.split(/(@\w+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          return (
            <a
              key={i}
              href={`/profile/${part.slice(1)}`}
              className="text-accent hover:underline"
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

type ProfileTab = 'lists' | 'posts' | 'likes' | 'about';

// List type selection state type
type ListTypeOption = 'recently-played' | 'favorite' | 'wishlist' | 'library';

const BIO_MAX_LENGTH = 150;

export function Profile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { currentUser, groups, updateGameList, updateCurrentUser, posts, deletePost, likePost, unlikePost, likedPosts, repostedPosts, repostPost, unrepostPost, getUserById, blockUser, unblockUser, muteUser, unmuteUser, blockedUsers, mutedUsers } = useAppData();
  const [editGameListModal, setEditGameListModal] = useState<{
    isOpen: boolean;
    listType: GameListType | null;
  }>({ isOpen: false, listType: null });
  const [showListTypeSelector, setShowListTypeSelector] = useState(false);

  // List drag-and-drop reorder
  const DEFAULT_LIST_ORDER = ['recentlyPlayed', 'favorites', 'wishlist', 'library'] as const;
  const [listOrder, setListOrder] = useState<string[]>(() => {
    const saved = (currentUser?.game_lists as any)?.listOrder;
    return Array.isArray(saved) && saved.length === 4 ? saved : [...DEFAULT_LIST_ORDER];
  });
  const [listDragIdx, setListDragIdx] = useState<number | null>(null);
  const [listDragOverIdx, setListDragOverIdx] = useState<number | null>(null);
  // Pointer-based drag state (works on mobile touch)
  const listDragPtrRef = useRef<{ fromIdx: number; currentOver: number | null } | null>(null);
  const listItemElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [pinnedPostId, setPinnedPostId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('lists');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [profileUserPosts, setProfileUserPosts] = useState<any[]>([]);
  const [profileLikedPosts, setProfileLikedPosts] = useState<any[]>([]);
  const [likesLoading, setLikesLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [mutualFollowers, setMutualFollowers] = useState<any[]>([]);
  const [freshFollowerCount, setFreshFollowerCount] = useState<number | null>(null);
  const [freshFollowingCount, setFreshFollowingCount] = useState<number | null>(null);

  // LFG Flare state
  const [activeFlares, setActiveFlares] = useState<LFGFlare[]>([]);
  const [showLFGFlareModal, setShowLFGFlareModal] = useState(false);

  // Scroll to top when viewing another user's profile; own profile restores last position
  useEffect(() => {
    if (userId) {
      window.scrollTo(0, 0);
    } else {
      const saved = sessionStorage.getItem('own-profile-scroll-y');
      if (saved) {
        const y = parseInt(saved, 10);
        // Double rAF: wait for content to render before restoring scroll
        requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
      }
    }
    // Save scroll position when leaving own profile
    return () => {
      if (!userId) sessionStorage.setItem('own-profile-scroll-y', String(window.scrollY));
    };
  }, [userId]);

  // Determine which user profile to show
  const isOwnProfile = !userId || userId === currentUser?.id;
  const profileUser = isOwnProfile ? currentUser : getUserById(userId || '');

  // Sync pinned post id from profile data
  useEffect(() => {
    setPinnedPostId((profileUser as any)?.pinned_post_id ?? null);
  }, [(profileUser as any)?.pinned_post_id]);

  // Fetch Bluesky data for Topic accounts (if applicable)
  const blueskyData = useBlueskyData(profileUser || currentUser);

  // Only use Bluesky avatar/banner for topic accounts — prevents stale data bleeding into own profile
  const isTopicAccount = ((profileUser || currentUser) as any)?.account_type === 'topic';
  const profilePicture = (isTopicAccount ? blueskyData.avatar : undefined) || profileUser?.profile_picture || undefined;
  const bannerImage = (isTopicAccount ? blueskyData.banner : undefined) || profileUser?.bannerImage;

  // Check persistent follow state from DB when viewing another user
  useEffect(() => {
    if (isOwnProfile || !currentUser?.id || !profileUser?.id) return;
    profilesAPI.isFollowing(currentUser.id, profileUser.id).then(setIsFollowing);
  }, [isOwnProfile, currentUser?.id, profileUser?.id]);

  // Fetch fresh follower/following counts directly from DB for other users' profiles
  useEffect(() => {
    if (isOwnProfile || !profileUser?.id) return;
    profilesAPI.getById(profileUser.id).then(data => {
      if (data) {
        setFreshFollowerCount(data.follower_count ?? 0);
        setFreshFollowingCount(data.following_count ?? 0);
      }
    }).catch(() => {});
  }, [isOwnProfile, profileUser?.id]);

  // Load mutual followers (people you follow who also follow this profile)
  useEffect(() => {
    if (isOwnProfile || !currentUser?.id || !profileUser?.id) return;
    profiles.getMutualFollowers(currentUser.id, profileUser.id)
      .then(setMutualFollowers)
      .catch(() => setMutualFollowers([]));
  }, [isOwnProfile, currentUser?.id, profileUser?.id]);

  // Load the profile user's posts + reposts directly from Supabase
  useEffect(() => {
    if (!profileUser?.id) return;
    Promise.all([
      postsAPI.getByUser(profileUser.id),
      postsAPI.getRepostsByUser(profileUser.id),
    ]).then(([userPosts, userReposts]) => {
      const all = [...userPosts, ...userReposts];
      all.sort((a, b) =>
        new Date(b.repostedAt || b.created_at).getTime() - new Date(a.repostedAt || a.created_at).getTime()
      );
      setProfileUserPosts(all);
    }).catch(() => setProfileUserPosts([]));
  }, [profileUser?.id]);

  // Load active LFG flares for this profile user
  useEffect(() => {
    if (!profileUser?.id) return;
    lfgFlaresAPI.getActiveForUser(profileUser.id).then(setActiveFlares).catch(() => setActiveFlares([]));
  }, [profileUser?.id]);

  // Load profile user's liked posts when likes tab is active
  useEffect(() => {
    if (activeTab !== 'likes' || !profileUser?.id) return;
    setLikesLoading(true);
    postsAPI.getLikedPosts(profileUser.id)
      .then(setProfileLikedPosts)
      .catch(() => setProfileLikedPosts([]))
      .finally(() => setLikesLoading(false));
  }, [activeTab, profileUser?.id]);

  // If own profile but currentUser hasn't loaded, wait
  if (!profileUser) {
    return (
      <div className="min-h-screen pb-20">
        <Header />
        <div className="w-full max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // If viewing another user's profile and user not found, show error
  if (!isOwnProfile && !profileUser) {
    return (
      <div className="min-h-screen pb-20">
        <Header />
        <div className="w-full max-w-2xl mx-auto px-6 py-12 text-center">
          <h2 className="text-2xl font-bold mb-2">User not found</h2>
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

  // Check if this is an unclaimed topic account
  const isUnclaimedAccount = (profileUser as any)?.account_type === 'topic';

  const handleOpenGameListEdit = (listType: GameListType) => {
    setEditGameListModal({ isOpen: true, listType });
  };

  const handlePinPost = async (postId: string) => {
    if (!currentUser?.id) return;
    const newPinnedId = pinnedPostId === postId ? null : postId;
    setPinnedPostId(newPinnedId);
    await updateCurrentUser({ pinned_post_id: newPinnedId });
  };

  const handleSaveGameList = (games: any[]) => {
    if (!editGameListModal.listType) return;
    updateGameList(editGameListModal.listType, games);
  };

  // Get liked posts from the feed (what we have in context)
  // likedPostsList unused — likes tab now fetches per-profile from DB

  const isBlocked = blockedUsers.has(profileUser?.id || '');
  const isMuted = mutedUsers.has(profileUser?.id || '');

  const handleLikeToggle = (postId: string) => {
    if (likedPosts.has(postId)) {
      unlikePost(postId);
    } else {
      likePost(postId);
    }
  };

  const handleRepostToggle = (postId: string) => {
    if (repostedPosts.has(postId)) {
      unrepostPost(postId);
    } else {
      repostPost(postId);
    }
  };

  const handleReport = async () => {
    if (!currentUser?.id || !profileUser?.id || !reportReason.trim()) return;
    try {
      await profilesAPI.report(currentUser.id, profileUser.id, reportReason.trim());
      setReportSent(true);
      setTimeout(() => { setShowReportModal(false); setReportReason(''); setReportSent(false); }, 2000);
    } catch (e) {
      console.error('Failed to submit report:', e);
    }
  };

  // Helper function to get social platform label
  const getSocialPlatformLabel = (platform: SocialPlatform): string => {
    const labels: Record<SocialPlatform, string> = {
      'bluesky': 'Bluesky',
      'mastodon': 'Mastodon',
      'tumblr': 'Tumblr',
      'x': 'X',
      'tiktok': 'TikTok',
      'instagram': 'Instagram',
      'threads': 'Threads',
      'rednote': 'Red Note',
      'upscrolled': 'Upscrolled',
      'discord': 'Discord',
      'twitch': 'Twitch',
      'reddit': 'Reddit',
      'facebook': 'Facebook',
      'github': 'GitHub',
      'youtube': 'YouTube',
      'spotify': 'Spotify',
      'youtubemusic': 'YouTube Music',
      'soundcloud': 'SoundCloud',
      'patreon': 'Patreon',
    };
    return labels[platform] || platform;
  };

  // For other users' profiles: if they have no lists, treat active tab as 'posts'
  // so the empty Lists section (including "No game lists yet") is never shown.
  const _glCheck = (profileUser as any)?.game_lists ?? (profileUser as any)?.gameLists ?? {};
  const profileHasLists = ['recentlyPlayed', 'favorites', 'wishlist', 'library'].some(k => (_glCheck[k] ?? []).length > 0);
  const effectiveTab = (!isOwnProfile && !profileHasLists && activeTab === 'lists') ? 'posts' : activeTab;

  return (
    <div className="min-h-screen pb-20">
      <Header />
      
      <div className="w-full max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="bg-card px-6 pt-6 pb-4 rounded-b-2xl mb-4">
          {/* Back button for other users' profiles */}
          {!isOwnProfile && (
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <div className="flex items-center gap-2">
                <FollowButton
                  userId={profileUser.id}
                  initialFollowingState={isFollowing}
                  onFollowChange={setIsFollowing}
                  size="md"
                  variant="default"
                />
                {currentUser && (
                  <button
                    onClick={() => navigate(`/messages?to=${profileUser.id}`)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                    title="Send message"
                  >
                    <Mail className="w-5 h-5 text-muted-foreground" />
                  </button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                      <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {currentUser && (
                      <>
                        <DropdownMenuItem onClick={() => navigate(`/messages?to=${profileUser.id}`)}>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Message
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {isMuted ? (
                      <DropdownMenuItem onClick={() => unmuteUser(profileUser.id)}>
                        <Bell className="w-4 h-4 mr-2" />
                        Unmute @{(profileUser.handle || '').replace(/^@/, '')}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => muteUser(profileUser.id)}>
                        <BellOff className="w-4 h-4 mr-2" />
                        Mute @{(profileUser.handle || '').replace(/^@/, '')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {isBlocked ? (
                      <DropdownMenuItem onClick={() => unblockUser(profileUser.id)}>
                        <UserCheck className="w-4 h-4 mr-2" />
                        Unblock @{(profileUser.handle || '').replace(/^@/, '')}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => blockUser(profileUser.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Ban className="w-4 h-4 mr-2" />
                        Block @{(profileUser.handle || '').replace(/^@/, '')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowReportModal(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      Report @{(profileUser.handle || '').replace(/^@/, '')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
          
          {/* Topic badge for unclaimed accounts */}
          {isUnclaimedAccount && (
            <div className="mb-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="px-2 py-1 text-xs bg-accent/20 text-accent rounded-full font-medium">Topic</span>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    This is a Topic account. It has not yet been claimed by the official organization.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Contact <a href="mailto:support@forge-social.com" className="text-accent hover:underline">support@forge-social.com</a> to claim this account.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsLightboxOpen(true)} className="cursor-pointer">
                <ProfileAvatar
                  username={profileUser.display_name || profileUser.handle || '?'}
                  profilePicture={profilePicture}
                  size="xl"
                  userId={profileUser.id}
                />
              </button>
              <div>
                <h1 className="text-xl font-semibold">{profileUser.display_name || profileUser.handle}</h1>
                <p className="text-muted-foreground">@{(profileUser.handle || '').replace(/^@/, '')}</p>
                {profileUser.pronouns && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-accent/20 text-accent">
                    {profileUser.pronouns}
                  </span>
                )}
              </div>
            </div>
            {isOwnProfile && (
              <button
                onClick={() => navigate('/edit-profile')}
                className="p-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bio */}
          <p className="mb-4 text-[0.9375rem]">
            <LinkifyMentions text={profileUser.bio} />
          </p>

          {/* Stats and Share Button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-4">
              <button
                onClick={() => navigate(isOwnProfile ? '/followers' : `/followers/${profileUser.id}`)}
                className="text-left hover:opacity-70 transition-opacity"
              >
                <p className="text-xl font-semibold">{formatNumber(freshFollowerCount ?? profileUser.follower_count ?? profileUser.followerCount ?? 0)}</p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </button>
              <button
                onClick={() => navigate(isOwnProfile ? '/following' : `/following/${profileUser.id}`)}
                className="text-left hover:opacity-70 transition-opacity"
              >
                <p className="text-xl font-semibold">{formatNumber(freshFollowingCount ?? profileUser.following_count ?? profileUser.followingCount ?? 0)}</p>
                <p className="text-sm text-muted-foreground">Following</p>
              </button>
            </div>
            <button
              className="p-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
              title="Share Profile"
              onClick={() => setShareModalOpen(true)}
            >
              <Upload className="w-5 h-5" />
            </button>
          </div>

          {/* Social proof: mutual followers */}
          {!isOwnProfile && mutualFollowers.length > 0 && (
            <button
              onClick={() => navigate(`/followers/${profileUser.id}?highlight=following`)}
              className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity text-left w-full"
            >
              <div className="flex -space-x-2 shrink-0">
                {mutualFollowers.slice(0, 4).map((u: any) => (
                  <ProfileAvatar
                    key={u.id}
                    username={u.display_name || u.handle || '?'}
                    profilePicture={u.profile_picture ?? null}
                    size="sm"
                    userId={u.id}
                    className="border-2 border-card"
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Followed by{' '}
                <span className="text-foreground font-medium">
                  {mutualFollowers.slice(0, 2).map((u: any) => u.display_name || u.handle).join(', ')}
                </span>
                {mutualFollowers.length > 2 && ` and ${mutualFollowers.length - 2} others`}
                {' '}you follow
              </p>
            </button>
          )}

          {/* Platforms */}
          {profileUser.platforms && profileUser.platforms.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
                Gaming Platforms
              </h3>
              <div className="flex flex-wrap gap-2">
                {profileUser.platforms.map(platform => {
                  // Get the gaming handle for this platform
                  const platformHandle = profileUser.platformHandles?.[platform];
                  const showHandle = profileUser.showPlatformHandles?.[platform];
                  
                  return (
                    <PlatformIcon 
                      key={platform} 
                      platform={platform} 
                      userHandle={showHandle && platformHandle ? platformHandle : undefined}
                      showHandle={true}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Groups */}
          {profileUser.communities && profileUser.communities.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm text-muted-foreground uppercase tracking-wide">
                  Groups
                </h3>
                {profileUser.communities.length > 3 && (
                  <button
                    onClick={() => navigate('/user-groups')}
                    className="text-sm text-accent hover:text-accent/80 transition-colors"
                  >
                    View All
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  // Use displayed_communities (DB field) or displayedCommunities (camelCase), fallback to first 3
                  const rawDisplayIds = profileUser.displayed_communities || profileUser.displayedCommunities;
                  const displayIds = rawDisplayIds && rawDisplayIds.length > 0
                    ? rawDisplayIds
                    : profileUser.communities.slice(0, 3).map((m: any) => m.community_id);

                  return profileUser.communities
                    .filter(membership => displayIds.includes(membership.community_id))
                    .slice(0, 3)
                    .map(membership => {
                      const group = groups.find(c => c.id === membership.community_id);
                      if (!group) return null;

                      return (
                        <button
                          key={membership.community_id}
                          onClick={() => navigate(`/group/${group.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full hover:bg-secondary/80 transition-colors text-sm"
                        >
                          {membership.role === 'creator' && (
                            <Crown className="w-3.5 h-3.5 text-accent" title="Creator" />
                          )}
                          {membership.role === 'moderator' && (
                            <Shield className="w-3.5 h-3.5 text-accent" title="Moderator" />
                          )}
                          <span>{group.name}</span>
                        </button>
                      );
                    });
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Active LFG Flares */}
        {activeFlares.length > 0 && (
          <div className="px-4 mb-3 space-y-2">
            {activeFlares.map(flare => (
              <div key={flare.id} className="flex items-start gap-3 p-3 bg-accent/10 border border-accent/30 rounded-xl">
                <Swords className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-accent">
                      {flare.flare_type === 'lfg' ? 'LFG' : 'LFM'}
                    </span>
                    <span className="text-sm font-semibold truncate">{flare.game_title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Need {flare.players_needed}{flare.group_size ? `/${flare.group_size}` : ''} players
                    {flare.game_mode ? ` · ${flare.game_mode}` : ''}
                    {flare.scheduled_for ? ` · ${new Date(flare.scheduled_for).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    Expires {new Date(flare.expires_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {isOwnProfile && (
                  <button
                    onClick={() => lfgFlaresAPI.remove(flare.id).then(() => setActiveFlares(prev => prev.filter(f => f.id !== flare.id)))}
                    className="p-1.5 hover:bg-destructive/20 rounded-lg transition-colors shrink-0"
                    title="Remove flare"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create LFG Flare button (own profile only, shown above tabs) */}
        {isOwnProfile && (
          <div className="px-4 mb-3">
            <button
              onClick={() => setShowLFGFlareModal(true)}
              className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {activeFlares.length > 0 ? 'Add another LFG Flare' : 'Create LFG Flare'}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-border px-4">
          {(() => {
            const gameLists = profileUser.game_lists ?? profileUser.gameLists ?? {};
            const hasLists = ['recentlyPlayed','favorites','wishlist','library'].some(k => (gameLists[k] ?? []).length > 0);
            if (!isOwnProfile && !hasLists) return null;
            return (
              <button
                onClick={() => setActiveTab('lists')}
                className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'lists'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Lists
              </button>
            );
          })()}
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'posts' 
                ? 'border-accent text-accent' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('likes')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'likes' 
                ? 'border-accent text-accent' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Likes
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'about' 
                ? 'border-accent text-accent' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            About
          </button>
        </div>

        {/* Tab Content */}
        {effectiveTab === 'lists' && (
          <div className="px-4 space-y-6">
            {(() => {
              const ALL_LISTS: { key: 'recentlyPlayed' | 'favorites' | 'wishlist' | 'library'; listType: GameListType; label: string }[] = [
                { key: 'recentlyPlayed', listType: 'recently-played', label: 'Recently Played' },
                { key: 'favorites', listType: 'favorite', label: 'Favorite Games' },
                { key: 'wishlist', listType: 'wishlist', label: 'Wishlist' },
                { key: 'library', listType: 'library', label: 'Library' },
              ];
              // Sort by user's saved order
              const orderedLists = listOrder
                .map(k => ALL_LISTS.find(l => l.key === k))
                .filter(Boolean) as typeof ALL_LISTS;
              // Append any missing (safety)
              ALL_LISTS.forEach(l => { if (!orderedLists.find(o => o.key === l.key)) orderedLists.push(l); });

              const gameLists = profileUser.game_lists ?? profileUser.gameLists ?? {};
              const hasAnyList = ALL_LISTS.some(l => (gameLists[l.key] ?? []).length > 0);

              const handleGripPointerDown = (i: number) => (e: React.PointerEvent) => {
                e.preventDefault();
                (e.currentTarget as Element).setPointerCapture(e.pointerId);
                listDragPtrRef.current = { fromIdx: i, currentOver: i };
                setListDragIdx(i);
              };
              const handleGripPointerMove = (i: number) => (e: React.PointerEvent) => {
                if (!listDragPtrRef.current || listDragPtrRef.current.fromIdx !== i) return;
                let overIdx = i;
                for (let j = 0; j < listItemElsRef.current.length; j++) {
                  const el = listItemElsRef.current[j];
                  if (!el) continue;
                  const rect = el.getBoundingClientRect();
                  if (e.clientY < rect.top + rect.height / 2) { overIdx = j; break; }
                  overIdx = j;
                }
                listDragPtrRef.current.currentOver = overIdx;
                if (listDragOverIdx !== overIdx) setListDragOverIdx(overIdx);
              };
              const handleGripPointerUp = (i: number) => (_e: React.PointerEvent) => {
                if (!listDragPtrRef.current || listDragPtrRef.current.fromIdx !== i) return;
                const from = i;
                const to = listDragPtrRef.current.currentOver;
                listDragPtrRef.current = null;
                if (to !== null && to !== from) {
                  const newOrder = [...orderedLists.map(l => l.key)];
                  const [moved] = newOrder.splice(from, 1);
                  newOrder.splice(to, 0, moved);
                  setListOrder(newOrder);
                  setListDragIdx(null); setListDragOverIdx(null);
                  const existing = currentUser?.game_lists ?? {};
                  updateCurrentUser({ game_lists: { ...existing, listOrder: newOrder } });
                } else {
                  setListDragIdx(null); setListDragOverIdx(null);
                }
              };
              const handleGripPointerCancel = (_e: React.PointerEvent) => {
                listDragPtrRef.current = null;
                setListDragIdx(null); setListDragOverIdx(null);
              };

              return (
                <>
                  {orderedLists.map(({ key, listType, label }, i) => {
                    const games = gameLists[key] ?? [];
                    if (games.length === 0) return null;
                    const isDragging = listDragIdx === i;
                    const isOver = listDragOverIdx === i && listDragIdx !== i;
                    return (
                      <div
                        key={listType}
                        ref={el => { listItemElsRef.current[i] = el; }}
                        className={`rounded-xl transition-all ${
                          isDragging ? 'opacity-40' : isOver ? 'ring-2 ring-accent/50 bg-accent/5' : ''
                        }`}
                      >
                        <GameList
                          title={label}
                          games={games}
                          sortable={listType === 'library'}
                          onEdit={isOwnProfile ? () => handleOpenGameListEdit(listType) : undefined}
                          onDelete={isOwnProfile ? () => updateGameList(listType, []) : undefined}
                          listType={listType}
                          showFirstOnly={true}
                          dragHandle={isOwnProfile}
                          onGripPointerDown={isOwnProfile ? handleGripPointerDown(i) : undefined}
                          onGripPointerMove={isOwnProfile ? handleGripPointerMove(i) : undefined}
                          onGripPointerUp={isOwnProfile ? handleGripPointerUp(i) : undefined}
                          onGripPointerCancel={isOwnProfile ? handleGripPointerCancel : undefined}
                        />
                      </div>
                    );
                  })}

                  {/* Single "Create list" button for own profile */}
                  {isOwnProfile && ALL_LISTS.some(({ key }) => (gameLists[key] ?? []).length === 0) && (
                    <div>
                      {showListTypeSelector ? (
                        <div className="bg-card/50 border border-border rounded-xl p-4">
                          <p className="text-sm font-medium mb-3">Choose list type</p>
                          <div className="grid grid-cols-2 gap-2">
                            {ALL_LISTS.filter(({ key }) => (gameLists[key] ?? []).length === 0).map(({ listType, label }) => (
                              <button
                                key={listType}
                                onClick={() => { setShowListTypeSelector(false); handleOpenGameListEdit(listType); }}
                                className="flex items-center gap-2 px-3 py-2.5 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm text-left"
                              >
                                <span>{label}</span>
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setShowListTypeSelector(false)}
                            className="mt-3 text-xs text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowListTypeSelector(true)}
                          className="w-full flex items-center gap-4 p-4 bg-card/50 border-2 border-dashed border-muted rounded-xl hover:border-accent/50 hover:bg-card transition-colors text-left"
                        >
                          <div>
                            <p className="font-medium text-sm">Create a list</p>
                            <p className="text-xs text-muted-foreground">+ Add games to a new list</p>
                          </div>
                        </button>
                      )}
                    </div>
                  )}


                  {/* Posts below lists */}
                  {profileUserPosts.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm text-muted-foreground uppercase tracking-wide mb-3">Recent Posts</h3>
                      {(() => {
                        const pinned = pinnedPostId ? profileUserPosts.find(p => p.id === pinnedPostId && !p.repostedBy) : null;
                        const rest = profileUserPosts.filter(p => !(pinnedPostId && p.id === pinnedPostId && !p.repostedBy));
                        const preview = pinned ? [pinned, ...rest].slice(0, 5) : rest.slice(0, 5);
                        return preview.map(post => (
                          <PostCard
                            key={post.id + (post.repostedBy || '')}
                            post={post}
                            user={post.author || profileUser}
                            onLike={handleLikeToggle}
                            onRepost={handleRepostToggle}
                            onDelete={isOwnProfile && !post.repostedBy ? deletePost : undefined}
                            onPin={isOwnProfile && !post.repostedBy ? handlePinPost : undefined}
                            isPinned={!!pinnedPostId && post.id === pinnedPostId && !post.repostedBy}
                            isLiked={likedPosts.has(post.id)}
                            isReposted={repostedPosts.has(post.id)}
                          />
                        ));
                      })()}
                      {profileUserPosts.length > 5 && (
                        <button
                          onClick={() => setActiveTab('posts')}
                          className="w-full py-3 text-sm text-accent hover:underline"
                        >
                          View all {profileUserPosts.length} posts
                        </button>
                      )}
                    </div>
                  )}

                  {/* LFG List */}
                  {(() => {
                    const lfgGames = (gameLists as any).lfg ?? [];
                    const isPremium = (profileUser as any).is_premium;
                    if (lfgGames.length > 0) {
                      return (
                        <GameList
                          key="lfg"
                          listType="lfg"
                          title="Looking for Group"
                          games={lfgGames}
                          onEdit={isOwnProfile ? () => handleOpenGameListEdit('lfg') : undefined}
                          onDelete={isOwnProfile ? () => updateGameList('lfg', []) : undefined}
                        />
                      );
                    }
                    if (isOwnProfile) {
                      return (
                        <button
                          onClick={() => isPremium ? handleOpenGameListEdit('lfg') : navigate('/premium')}
                          className={`w-full flex items-center gap-4 p-4 border-2 border-dashed rounded-xl transition-colors text-left ${
                            isPremium
                              ? 'bg-card/50 border-muted hover:border-accent/50 hover:bg-card'
                              : 'bg-accent/5 border-accent/30 hover:border-accent/50'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-medium text-sm">Looking for Group</p>
                              {!isPremium && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/20 text-accent rounded-full text-xs font-semibold">
                                  <Crown className="w-3 h-3" />
                                  Premium
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {isPremium ? '+ Add games you want to find group for' : 'Unlock LFG with Forge Premium'}
                            </p>
                          </div>
                          {!isPremium && <Crown className="w-5 h-5 text-accent/70 shrink-0" />}
                        </button>
                      );
                    }
                    return null;
                  })()}

                  {/* Custom Lists */}
                  {(() => {
                    const customLists = (gameLists as any).customLists ?? [];
                    const isPremium = (profileUser as any).is_premium;
                    if (customLists.length > 0) {
                      return customLists.map((list: any) => (
                        <GameList
                          key={list.id}
                          title={list.name}
                          games={list.games ?? []}
                          showFirstOnly={true}
                        />
                      ));
                    }
                    if (isOwnProfile) {
                      // Always show custom list button; non-premium redirects to /premium
                      return (
                        <button
                          onClick={() => navigate(isPremium ? '/create-custom-list' : '/premium')}
                          className={`w-full flex items-center gap-4 p-4 border-2 border-dashed rounded-xl transition-colors text-left ${
                            isPremium
                              ? 'bg-card/50 border-muted hover:border-accent/50 hover:bg-card'
                              : 'bg-gradient-to-r from-accent/5 to-accent/10 border-accent/30 hover:border-accent/60 hover:bg-accent/10'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-medium text-sm">Custom List</p>
                              {!isPremium && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/20 text-accent rounded-full text-xs font-semibold">
                                  <Crown className="w-3 h-3" />
                                  Premium
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {isPremium ? '+ Create a custom list' : 'Unlock custom lists with Forge Premium'}
                            </p>
                          </div>
                          {!isPremium && <Crown className="w-5 h-5 text-accent/70 shrink-0" />}
                        </button>
                      );
                    }
                    return null;
                  })()}
                </>
              );
            })()}
          </div>
        )}

        {effectiveTab === 'posts' && (
          <div className="px-4">
            {profileUserPosts.length > 0 ? (
              (() => {
                const pinned = pinnedPostId ? profileUserPosts.find(p => p.id === pinnedPostId && !p.repostedBy) : null;
                const rest = profileUserPosts.filter(p => !(pinnedPostId && p.id === pinnedPostId && !p.repostedBy));
                const ordered = pinned ? [pinned, ...rest] : rest;
                return ordered.map(post => (
                  <PostCard
                    key={post.id + (post.repostedBy || '')}
                    post={post}
                    user={post.author || profileUser}
                    onLike={handleLikeToggle}
                    onRepost={handleRepostToggle}
                    onDelete={isOwnProfile && !post.repostedBy ? deletePost : undefined}
                    onPin={isOwnProfile && !post.repostedBy ? handlePinPost : undefined}
                    isPinned={!!pinnedPostId && post.id === pinnedPostId && !post.repostedBy}
                    isLiked={likedPosts.has(post.id)}
                    isReposted={repostedPosts.has(post.id)}
                  />
                ));
              })()
            ) : isTopicAccount && blueskyData.posts.length > 0 ? (
              blueskyData.posts.map((post: any) => (
                <PostCard
                  key={post.id}
                  post={{ ...post, user_id: profileUser.id, created_at: post.timestamp }}
                  user={profileUser as any}
                  onLike={handleLikeToggle}
                  onRepost={handleRepostToggle}
                  isLiked={likedPosts.has(post.id)}
                  isReposted={repostedPosts.has(post.id)}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No posts yet</p>
                {isOwnProfile && (
                  <button
                    onClick={() => navigate('/new-post')}
                    className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
                  >
                    Create Your First Post
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {effectiveTab === 'likes' && (
          <div className="px-4">
            {likesLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
              </div>
            ) : profileLikedPosts.length > 0 ? (
              profileLikedPosts.map(post => {
                const postUser = post.author;
                if (!postUser) return null;
                return (
                  <PostCard
                    key={post.id}
                    post={post}
                    user={postUser}
                    onLike={handleLikeToggle}
                    isLiked={likedPosts.has(post.id)}
                  />
                );
              })
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No liked posts yet</p>
              </div>
            )}
          </div>
        )}

        {effectiveTab === 'about' && (
          <div className="px-4 pb-24">
            {profileUser.interests && profileUser.interests.length > 0 && (() => {
              const playstyleInterests = profileUser.interests!.filter(i => i.category === 'playstyle');
              const genreInterests = profileUser.interests!.filter(i => i.category === 'genre');
              const platformInterests = profileUser.interests!.filter(i => i.category === 'platform');
              return (
                <>
                  {/* Playstyle — dedicated section */}
                  {playstyleInterests.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy className="w-4 h-4 text-accent" />
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Playstyle</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {playstyleInterests.map(interest => (
                          <span
                            key={interest.id}
                            className="px-3 py-1.5 bg-accent/15 text-accent border border-accent/30 rounded-full text-sm font-medium"
                          >
                            {interest.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Favorite Genres */}
                  {genreInterests.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Gamepad2 className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Genres</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {genreInterests.map(interest => (
                          <span
                            key={interest.id}
                            className="px-3 py-1.5 bg-secondary rounded-full text-sm"
                          >
                            {interest.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Platforms */}
                  {platformInterests.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Monitor className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Platforms</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {platformInterests.map(interest => (
                          <span
                            key={interest.id}
                            className="px-3 py-1.5 bg-secondary rounded-full text-sm"
                          >
                            {interest.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Social Accounts */}
            {(() => {
              const selectedPlatforms: SocialPlatform[] = (profileUser as any).social_platforms ?? (profileUser as any).socialPlatforms ?? [];
              if (selectedPlatforms.length === 0) return null;
              return (
                <div className="mb-6">
                  <h3 className="text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    Social Accounts
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlatforms.map(platform => {
                      const handle = profileUser.socialHandles?.[platform] ?? (profileUser as any).social_handles?.[platform];
                      const showHandle = profileUser.showSocialHandles?.[platform] ?? (profileUser as any).show_social_handles?.[platform];
                      return (
                        <div
                          key={platform}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full text-sm"
                        >
                          <PlatformIcon platform={platform} className="w-4 h-4 shrink-0" />
                          <span className="font-medium">{getSocialPlatformLabel(platform)}</span>
                          {showHandle && handle && (
                            <span className="text-muted-foreground">· @{handle}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Bluesky / Mastodon links for topic accounts */}
            {isUnclaimedAccount && (() => {
              const handle = (profileUser.handle || '').replace(/^@/, '');
              if (!handle) return null;
              const links: { label: string; url: string }[] = [];
              const isMastodon = (profileUser as any).platform === 'mastodon';
              if (isMastodon) {
                links.push({ label: 'Mastodon', url: `https://mastodon.social/@${handle}` });
              } else {
                links.push({ label: 'Bluesky', url: `https://bsky.app/profile/${handle}` });
              }
              return (
                <div className="mb-6">
                  <h3 className="text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    External Links
                  </h3>
                  <div className="space-y-2">
                    {links.map(link => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-4 py-3 bg-secondary rounded-lg hover:bg-secondary/70 transition-colors"
                      >
                        <span className="text-sm font-medium">{link.label}</span>
                        <span className="text-sm text-accent text-xs">View profile →</span>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* About Description */}
            {profileUser.about && (
              <div>
                <h3 className="text-sm text-muted-foreground uppercase tracking-wide mb-3">
                  About
                </h3>
                <p className="text-sm leading-relaxed">{profileUser.about}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Write Post Button */}
      <WritePostButton />

      {/* Edit Game Lists Modal */}
      <EditGameListsModal
        isOpen={editGameListModal.isOpen}
        onClose={() => setEditGameListModal({ isOpen: false, listType: null })}
        onSave={handleSaveGameList}
        currentGames={editGameListModal.listType ? (
          editGameListModal.listType === 'recently-played' ? (profileUser.game_lists?.recentlyPlayed ?? profileUser.gameLists?.recentlyPlayed ?? []) :
          editGameListModal.listType === 'favorite' ? (profileUser.game_lists?.favorites ?? profileUser.gameLists?.favorites ?? []) :
          editGameListModal.listType === 'wishlist' ? (profileUser.game_lists?.wishlist ?? profileUser.gameLists?.wishlist ?? []) :
          (profileUser.game_lists?.library ?? profileUser.gameLists?.library ?? [])
        ) : []}
        listType={editGameListModal.listType || 'library'}
      />

      {/* Profile Picture Lightbox */}
      <ProfilePictureLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        profilePicture={profilePicture}
        username={profileUser.display_name || profileUser.handle || '?'}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        user={profileUser}
      />

      {/* LFG Flare Modal */}
      <LFGFlareModal
        isOpen={showLFGFlareModal}
        onClose={() => setShowLFGFlareModal(false)}
        onCreated={flare => setActiveFlares(prev => [flare, ...prev])}
      />

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Report @{(profileUser?.handle || '').replace(/^@/, '')}</h2>
            {reportSent ? (
              <p className="text-sm text-accent">Thank you. Your report has been submitted for review.</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Tell us what's going on with this account.</p>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Describe the issue..."
                  rows={4}
                  className="w-full px-3 py-2 bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none text-sm"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowReportModal(false); setReportReason(''); }}
                    className="flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={!reportReason.trim()}
                    className="flex-1 px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors text-sm disabled:opacity-50"
                  >
                    Submit Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}