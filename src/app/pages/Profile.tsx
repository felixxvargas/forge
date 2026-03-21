import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Edit2, ArrowLeft, Upload, Crown, Shield, MoreHorizontal, Ban, BellOff, Bell, UserX, UserCheck, Flag } from 'lucide-react';
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
import { profiles as profilesAPI, posts as postsAPI } from '../utils/supabase';
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

const BIO_MAX_LENGTH = 150;

export function Profile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { currentUser, communities, updateGameList, posts, deletePost, likePost, unlikePost, likedPosts, repostedPosts, repostPost, unrepostPost, getUserById, blockUser, unblockUser, muteUser, unmuteUser, blockedUsers, mutedUsers } = useAppData();
  const [editGameListModal, setEditGameListModal] = useState<{
    isOpen: boolean;
    listType: GameListType | null;
  }>({ isOpen: false, listType: null });
  const [activeTab, setActiveTab] = useState<ProfileTab>('lists');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [profileUserPosts, setProfileUserPosts] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);

  // Scroll to top when viewing a new profile
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [userId]);

  // Determine which user profile to show
  const isOwnProfile = !userId || userId === currentUser?.id;
  const profileUser = isOwnProfile ? currentUser : getUserById(userId || '');

  // Fetch Bluesky data for Topic accounts (if applicable)
  const blueskyData = useBlueskyData(profileUser || currentUser);

  // Use Bluesky avatar if available for Topic accounts
  const profilePicture = blueskyData.avatar || profileUser?.profile_picture || undefined;
  const bannerImage = blueskyData.banner || profileUser?.bannerImage;

  // Check persistent follow state from DB when viewing another user
  useEffect(() => {
    if (isOwnProfile || !currentUser?.id || !profileUser?.id) return;
    profilesAPI.isFollowing(currentUser.id, profileUser.id).then(setIsFollowing);
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

  const handleSaveGameList = (games: any[]) => {
    if (!editGameListModal.listType) return;
    updateGameList(editGameListModal.listType, games);
  };

  // Get liked posts from the feed (what we have in context)
  const likedPostsList = posts.filter(post => likedPosts.has(post.id));

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
    };
    return labels[platform] || platform;
  };

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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                      <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
                <p className="text-xl font-semibold">{formatNumber(profileUser.follower_count ?? profileUser.followerCount ?? 0)}</p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </button>
              <button
                onClick={() => navigate(isOwnProfile ? '/following' : `/following/${profileUser.id}`)}
                className="text-left hover:opacity-70 transition-opacity"
              >
                <p className="text-xl font-semibold">{formatNumber(profileUser.following_count ?? profileUser.followingCount ?? 0)}</p>
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

          {/* Communities */}
          {profileUser.communities && profileUser.communities.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm text-muted-foreground uppercase tracking-wide">
                  Communities
                </h3>
                {profileUser.communities.length > 3 && (
                  <button
                    onClick={() => navigate('/user-communities')}
                    className="text-sm text-accent hover:text-accent/80 transition-colors"
                  >
                    View All
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  // Use displayedCommunities if set, otherwise show first 3
                  const displayIds = profileUser.displayedCommunities && profileUser.displayedCommunities.length > 0
                    ? profileUser.displayedCommunities
                    : profileUser.communities.slice(0, 3).map(m => m.community_id);

                  return profileUser.communities
                    .filter(membership => displayIds.includes(membership.community_id))
                    .slice(0, 3)
                    .map(membership => {
                      const community = communities.find(c => c.id === membership.community_id);
                      if (!community) return null;

                      return (
                        <button
                          key={membership.community_id}
                          onClick={() => navigate(`/community/${community.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full hover:bg-secondary/80 transition-colors text-sm"
                        >
                          {membership.role === 'creator' && (
                            <Crown className="w-3.5 h-3.5 text-accent" title="Creator" />
                          )}
                          {membership.role === 'moderator' && (
                            <Shield className="w-3.5 h-3.5 text-accent" title="Moderator" />
                          )}
                          <span>{community.name}</span>
                        </button>
                      );
                    });
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-border px-4">
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
        {activeTab === 'lists' && (
          <div className="px-4 space-y-6">
            {(() => {
              const lists: { key: 'recentlyPlayed' | 'favorites' | 'wishlist' | 'library'; listType: GameListType; label: string; icon: string }[] = [
                { key: 'recentlyPlayed', listType: 'recently-played', label: 'Recently Played', icon: '🕐' },
                { key: 'favorites', listType: 'favorite', label: 'Favorite Games', icon: '⭐' },
                { key: 'wishlist', listType: 'wishlist', label: 'Wishlist', icon: '🎯' },
                { key: 'library', listType: 'library', label: 'Library', icon: '📚' },
              ];
              const gameLists = profileUser.game_lists ?? profileUser.gameLists ?? {};
              const hasAnyList = lists.some(l => (gameLists[l.key] ?? []).length > 0);

              return (
                <>
                  {lists.map(({ key, listType, label }) => {
                    const games = gameLists[key] ?? [];
                    if (games.length > 0) {
                      return (
                        <GameList
                          key={listType}
                          title={label}
                          games={games}
                          sortable={listType === 'library'}
                          onEdit={isOwnProfile ? () => handleOpenGameListEdit(listType) : undefined}
                          onDelete={isOwnProfile ? () => updateGameList(listType, []) : undefined}
                          listType={listType}
                          showFirstOnly={true}
                        />
                      );
                    }
                    if (isOwnProfile) {
                      return (
                        <button
                          key={listType}
                          onClick={() => handleOpenGameListEdit(listType)}
                          className="w-full flex items-center gap-4 p-4 bg-card/50 border-2 border-dashed border-muted rounded-xl hover:border-accent/50 hover:bg-card transition-colors text-left"
                        >
                          <div>
                            <p className="font-medium text-sm">{label}</p>
                            <p className="text-xs text-muted-foreground">+ Create list</p>
                          </div>
                        </button>
                      );
                    }
                    return null;
                  })}

                  {!hasAnyList && !isOwnProfile && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No game lists yet</p>
                    </div>
                  )}

                  {/* Posts below lists */}
                  {profileUserPosts.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm text-muted-foreground uppercase tracking-wide mb-3">Posts</h3>
                      {profileUserPosts.slice(0, 5).map(post => (
                        <PostCard
                          key={post.id + (post.repostedBy || '')}
                          post={post}
                          user={post.author || profileUser}
                          onLike={handleLikeToggle}
                          onRepost={handleRepostToggle}
                          onDelete={isOwnProfile && !post.repostedBy ? deletePost : undefined}
                          isLiked={likedPosts.has(post.id)}
                          isReposted={repostedPosts.has(post.id)}
                        />
                      ))}
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
                    if (isOwnProfile && !isPremium) {
                      return (
                        <div className="bg-card/50 rounded-xl p-6 text-center border-2 border-dashed border-muted">
                          <h3 className="font-medium mb-2">Custom Lists</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Create your own custom game lists with a premium subscription
                          </p>
                          <button
                            onClick={() => navigate('/premium')}
                            className="px-6 py-2 bg-secondary text-foreground border border-border rounded-lg hover:bg-secondary/80 transition-colors font-medium"
                          >
                            Upgrade to Premium
                          </button>
                        </div>
                      );
                    }
                    if (isOwnProfile && isPremium) {
                      return (
                        <button
                          onClick={() => navigate('/create-custom-list')}
                          className="w-full flex items-center gap-4 p-4 bg-card/50 border-2 border-dashed border-muted rounded-xl hover:border-accent/50 hover:bg-card transition-colors text-left"
                        >
                          <div>
                            <p className="font-medium text-sm">Custom List</p>
                            <p className="text-xs text-muted-foreground">+ Create list</p>
                          </div>
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

        {activeTab === 'posts' && (
          <div className="px-4">
            {profileUserPosts.length > 0 ? (
              profileUserPosts.map(post => (
                <PostCard
                  key={post.id + (post.repostedBy || '')}
                  post={post}
                  user={post.author || profileUser}
                  onLike={handleLikeToggle}
                  onRepost={handleRepostToggle}
                  onDelete={isOwnProfile && !post.repostedBy ? deletePost : undefined}
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

        {activeTab === 'likes' && (
          <div className="px-4">
            {likedPostsList.length > 0 ? (
              likedPostsList.map(post => {
                const postUser = post.author;
                if (!postUser) return null;
                
                return (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    user={postUser}
                    onLike={handleLikeToggle}
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

        {activeTab === 'about' && (
          <div className="px-4 pb-6">
            {/* Interests Section */}
            {profileUser.interests && profileUser.interests.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm text-muted-foreground uppercase tracking-wide mb-3">
                  Interests
                </h3>
                <div className="space-y-3">
                  {/* Group interests by category */}
                  {['genre', 'platform', 'playstyle'].map(category => {
                    const categoryInterests = profileUser.interests?.filter(i => i.category === category);
                    if (!categoryInterests || categoryInterests.length === 0) return null;
                    
                    return (
                      <div key={category}>
                        <p className="text-xs text-muted-foreground capitalize mb-2">{category}</p>
                        <div className="flex flex-wrap gap-2">
                          {categoryInterests.map(interest => (
                            <span
                              key={interest.id}
                              className="px-3 py-1.5 bg-secondary rounded-full text-sm"
                            >
                              {interest.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Social Accounts */}
            {(() => {
              const selectedPlatforms: SocialPlatform[] = (profileUser as any).social_platforms ?? (profileUser as any).socialPlatforms ?? [];
              if (selectedPlatforms.length === 0) return null;
              return (
                <div className="mb-6">
                  <h3 className="text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    Social Accounts
                  </h3>
                  <div className="space-y-2">
                    {selectedPlatforms.map(platform => {
                      const handle = profileUser.socialHandles?.[platform];
                      const showHandle = profileUser.showSocialHandles?.[platform];
                      return (
                        <div
                          key={platform}
                          className="flex items-center justify-between px-4 py-3 bg-secondary rounded-lg"
                        >
                          <span className="text-sm font-medium">{getSocialPlatformLabel(platform)}</span>
                          {showHandle && handle && (
                            <span className="text-sm text-muted-foreground">@{handle}</span>
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
            <div>
              <h3 className="text-sm text-muted-foreground uppercase tracking-wide mb-3">
                About
              </h3>
              <p className="text-sm leading-relaxed">
                {profileUser.about || profileUser.bio}
              </p>
            </div>
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