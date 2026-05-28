'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from '@/compat/router';
import { Edit2, ArrowLeft, Upload, Crown, Shield, MoreHorizontal, Ban, BellOff, Bell, UserX, UserCheck, Flag, Trophy, Gamepad2, Monitor, Mail, Swords, Plus, Minus, Trash2, GripVertical, Flame, ExternalLink, PlayCircle, Image as ImageIcon, Eye, EyeOff, Users, Sparkles, Tv2, Star, Copy, X as XIcon, FlaskConical } from 'lucide-react';
import { UserBadgeIcons } from '../components/UserBadgeIcons';
import { isMentorHandle } from '../utils/mentors';
import { Top8Friends, Top8Games, AddTopFriendPanel, ManageTopGamesPanel } from '../components/Top8Section';
import { ShareModal } from '../components/ShareModal';
import { LinkOpenModal } from '../components/LinkOpenModal';
import { getPlatformUrl } from '../utils/platformLinks';
import { getStoredLinkPreference, openLink } from '../utils/openExternalLink';
import { useProfileMeta } from '../hooks/useProfileMeta';
import { Header } from '../components/Header';
import { ProfileSkeleton } from '../components/ProfileSkeleton';
import { PostCard } from '../components/PostCard';
import { GameList } from '../components/GameList';
import { ProfilePictureLightbox } from '../components/ProfilePictureLightbox';
import { PlatformIcon, getHandleLabel, getPlatformName } from '../components/PlatformIcon';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { FollowButton } from '../components/FollowButton';
import { WritePostButton } from '../components/WritePostButton';
import { GameTimeline } from '../components/GameTimeline';
import { useAppData } from '../context/AppDataContext';
import type { User, SocialPlatform, GameListType } from '../data/data';
import { formatNumber } from '../utils/formatNumber';
import { useBlueskyData } from '../hooks/useBlueskyData';
import { profiles as profilesAPI, posts as postsAPI, profiles, lfgFlares as lfgFlaresAPI, streamArchivesAPI, top8API, vipListAPI } from '../utils/supabase';
import { toast } from 'sonner';
import useSWR from 'swr';
import type { LFGFlare, StreamArchive } from '../utils/supabase';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

// Helper component to linkify mentions
function LinkifyMentions({ text }: { text: string }) {
  const parts = (text ?? '').split(/(@\w+)/g);
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

type ProfileTab = 'lists' | 'posts' | 'likes' | 'about' | 'media' | 'timeline' | 'insights';

// List type selection state type
type ListTypeOption = 'recently-played' | 'favorite' | 'wishlist' | 'library';

const BIO_MAX_LENGTH = 150;

export function Profile({ initialProfile }: { initialProfile?: any } = {}) {
  const navigate = useNavigate();
  const { userId: _userId, handle: _handle, slug: _slug } = useParams();
  const _isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(_slug || '');
  const userId = _userId || (_isUUID ? _slug : undefined);
  const handle = _handle || (!_isUUID && _slug ? _slug : undefined);
  const { currentUser, isAuthenticated, groups, updateGameList, updateCurrentUser, posts, deletePost, likePost, unlikePost, likedPosts, repostedPosts, repostPost, unrepostPost, getUserById, getUserByHandle, blockUser, unblockUser, muteUser, unmuteUser, blockedUsers, mutedUsers, followingIds, addToVIPList, removeFromVIPList, vipListIds } = useAppData() as any;
  const normalizedHandle = handle ? handle.replace(/^@/, '').toLowerCase() : null;
  const { data: swrHandleProfile } = useSWR(
    normalizedHandle ? `profile-handle:${normalizedHandle}` : null,
    async () => {
      const cached = getUserByHandle(handle!);
      if (cached) return cached;
      return profiles.getByHandle(handle!).then(u => u ?? null).catch(() => null);
    },
    {
      fallbackData: (initialProfile && normalizedHandle === (initialProfile.handle || '').replace(/^@/, '').toLowerCase())
        ? initialProfile
        : undefined,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );
  const handleFetchedUser = swrHandleProfile ?? null;
  const [showListTypeSelector, setShowListTypeSelector] = useState(false);
  const [showListLimitTray, setShowListLimitTray] = useState(false);

  // List drag-and-drop reorder
  const DEFAULT_LIST_ORDER = ['recentlyPlayed', 'playedBefore', 'favorites', 'wishlist', 'library', 'completed'] as const;
  const [listOrder, setListOrder] = useState<string[]>(() => {
    const saved = (currentUser?.game_lists as any)?.listOrder;
    // Accept saved orders of either 4 (legacy) or 5 (with completed) or 6 (with playedBefore)
    if (Array.isArray(saved) && saved.length >= 4) {
      const withPlayedBefore = saved.includes('playedBefore') ? saved : [...saved, 'playedBefore'];
      return withPlayedBefore.includes('completed') ? withPlayedBefore : [...withPlayedBefore, 'completed'];
    }
    return [...DEFAULT_LIST_ORDER];
  });
  const [listDragIdx, setListDragIdx] = useState<number | null>(null);
  const [listDragOverIdx, setListDragOverIdx] = useState<number | null>(null);
  const [listDragPos, setListDragPos] = useState<{ x: number; y: number } | null>(null);
  const [listDragLabel, setListDragLabel] = useState<string | null>(null);
  // Pointer-based drag state (works on mobile touch)
  const listDragPtrRef = useRef<{ fromIdx: number; currentOver: number | null } | null>(null);
  const listItemElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [pinnedPostId, setPinnedPostId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('lists');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [pendingLinkUrl, setPendingLinkUrl] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(() => {
    const id = userId || '';
    return id ? followingIds.has(id) : false;
  });
  const [profileUserPosts, setProfileUserPosts] = useState<any[]>([]);
  const [profileLikedPosts, setProfileLikedPosts] = useState<any[]>([]);
  const [likesLoading, setLikesLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [mutualFollowers, setMutualFollowers] = useState<any[]>([]);
  const [freshFollowerCount, setFreshFollowerCount] = useState<number>(0);
  const [freshFollowingCount, setFreshFollowingCount] = useState<number>(0);
  const [canViewHandles, setCanViewHandles] = useState(false);
  const [handlePopup, setHandlePopup] = useState<{ platform: string; handle: string; label: string } | null>(null);

  // LFG Flare state
  const [activeFlares, setActiveFlares] = useState<LFGFlare[]>([]);

  // Stream archives
  const [streamArchives, setStreamArchives] = useState<StreamArchive[]>([]);
  const [retentionDue, setRetentionDue] = useState<StreamArchive[]>([]);
  const [retentionPromptIdx, setRetentionPromptIdx] = useState(0);

  // Top 8
  const [topFriendIds, setTopFriendIds] = useState<string[]>([]);
  const [topGameIds, setTopGameIds] = useState<string[]>([]);
  const [showAddFriendPanel, setShowAddFriendPanel] = useState(false);
  const [showTopGamesPicker, setShowTopGamesPicker] = useState(false);
  // Add Content module expansion
  const [addContentOpen, setAddContentOpen] = useState(false);

  // Local override for displayed_communities (About tab group visibility toggles)
  const [localDisplayedIds, setLocalDisplayedIds] = useState<string[] | null | undefined>(undefined);

  // Insight contributor badge — state only; effect placed after profileUser is declared below
  const [hasInsightContribution, setHasInsightContribution] = useState(false);


  // Scroll to top only when navigating to a different profile, not on remount of the same one
  useEffect(() => {
    const key = 'forge-last-profile';
    const current = (handle ?? userId ?? '').replace(/^@/, '').toLowerCase();
    if (sessionStorage.getItem(key) !== current) {
      sessionStorage.setItem(key, current);
      window.scrollTo(0, 0);
    }
  }, [userId, handle]);

  // Determine which user profile to show
  const isOwnProfile = handle
    ? handle.replace(/^@/, '').toLowerCase() === (currentUser?.handle || '').replace(/^@/, '').toLowerCase()
    : !userId || userId === currentUser?.id;
  const profileUser = isOwnProfile
    ? currentUser
    : handle
      ? handleFetchedUser
      : getUserById(userId || '');

  // Sync pinned post id from profile data
  useEffect(() => {
    setPinnedPostId((profileUser as any)?.pinned_post_id ?? null);
  }, [(profileUser as any)?.pinned_post_id]);

  // Fetch Bluesky data for Topic accounts (if applicable)
  const blueskyData = useBlueskyData(profileUser || currentUser);

  // Use Bluesky avatar for topic accounts (UUID-based from Supabase) and synthetic topic IDs
  // from data.ts (e.g. 'user-ign'). Prevents stale Bluesky data bleeding onto own profile.
  const profileUserId = (profileUser as any)?.id || userId || '';
  const isTopicAccount = ((profileUser || currentUser) as any)?.account_type === 'topic'
    || /^user-|^studio-/.test(profileUserId);
  const profilePicture = (isTopicAccount ? blueskyData.avatar : undefined) || profileUser?.profile_picture || undefined;

  // Dynamic OG meta tags for social share previews
  useProfileMeta({
    displayName: profileUser?.display_name || '',
    handle: (profileUser?.handle || handle || ''),
    bio: profileUser?.bio ?? undefined,
    profilePicture: profilePicture ?? undefined,
  });

  // Insight contributor badge fetch
  useEffect(() => {
    const uid = (profileUser as any)?.id;
    if (!uid || (profileUser as any)?.account_type === 'topic') return;
    setHasInsightContribution(false);
    import('../utils/supabase').then(({ supabase }) => {
      supabase.from('game_insights').select('id', { count: 'exact', head: true }).eq('user_id', uid)
        .then(({ count }) => { if ((count ?? 0) > 0) setHasInsightContribution(true); });
    });
  }, [(profileUser as any)?.id]);

  // Sync follow state from followingIds. For topic accounts, followingIds stores the synthetic ID
  // (e.g. "user-ign") rather than the UUID, so we check both.
  useEffect(() => {
    if (isOwnProfile || !profileUser?.id) return;
    const syntheticId = `user-${(profileUser.handle || '').replace(/^@/, '').toLowerCase()}`;
    setIsFollowing(
      followingIds.has(profileUser.id) ||
      ((profileUser as any).account_type === 'topic' && followingIds.has(syntheticId))
    );
  }, [isOwnProfile, profileUser?.id, profileUser?.handle, followingIds]);

  // Fetch fresh follower/following counts from the follows table (source of truth)
  // No cache seed — the profile's stored follower_count can be stale and causes a flash
  useEffect(() => {
    if (!profileUser?.id) return;
    Promise.all([
      profiles.getFollowerCount(profileUser.id),
      profiles.getFollowingCount(profileUser.id),
    ]).then(([fc, fwc]) => {
      setFreshFollowerCount(fc);
      setFreshFollowingCount(fwc);
    }).catch(() => {});
  }, [profileUser?.id]);

  // Load mutual followers (people you follow who also follow this profile)
  useEffect(() => {
    if (isOwnProfile || !currentUser?.id || !profileUser?.id) return;
    profiles.getMutualFollowers(currentUser.id, profileUser.id)
      .then(setMutualFollowers)
      .catch(() => setMutualFollowers([]));
  }, [isOwnProfile, currentUser?.id, profileUser?.id]);

  // Determine if current viewer can see handle strings on this profile
  useEffect(() => {
    if (isOwnProfile) { setCanViewHandles(true); return; }
    if (!profileUser?.id) { setCanViewHandles(false); return; }
    const visibility: string[] = (profileUser as any).platform_tags_visibility ?? ['all'];
    if (visibility.includes('all')) { setCanViewHandles(true); return; }
    if (!currentUser?.id) { setCanViewHandles(false); return; }
    if (visibility.includes('followers') && followingIds.has(profileUser.id)) { setCanViewHandles(true); return; }
    if (visibility.includes('vip_list')) {
      vipListAPI.checkAccess(profileUser.id, currentUser.id)
        .then((ok: boolean) => setCanViewHandles(ok))
        .catch(() => setCanViewHandles(false));
    } else {
      setCanViewHandles(false);
    }
  }, [isOwnProfile, profileUser?.id, (profileUser as any)?.platform_tags_visibility, currentUser?.id, followingIds]);

  // Load the profile user's posts + reposts directly from Supabase
  useEffect(() => {
    if (!profileUser?.id) return;
    Promise.all([
      postsAPI.getByUser(profileUser.id),
      postsAPI.getRepostsByUser(profileUser.id),
    ]).then(async ([userPosts, userReposts]) => {
      const all = [...userPosts, ...userReposts];
      all.sort((a, b) =>
        new Date((b as any).repostedAt || b.created_at).getTime() - new Date((a as any).repostedAt || a.created_at).getTime()
      );
      // Resolve quotedPost for any post that has quote_post_id
      const quoteIds = [...new Set(
        all.filter((p: any) => p.quote_post_id && !p.quotedPost).map((p: any) => p.quote_post_id as string)
      )];
      if (quoteIds.length > 0) {
        try {
          const quotedPosts = await postsAPI.getManyByIds(quoteIds);
          const byId = new Map(quotedPosts.map((p: any) => [p.id, p]));
          setProfileUserPosts(all.map((p: any) =>
            p.quote_post_id && byId.has(p.quote_post_id) ? { ...p, quotedPost: byId.get(p.quote_post_id) } : p
          ));
          return;
        } catch { /* fall through */ }
      }
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

  // Insights tab
  const [userInsights, setUserInsights] = useState<any[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  useEffect(() => {
    if (activeTab !== 'insights' || !profileUser?.id) return;
    setInsightsLoading(true);
    fetch(`/api/insights/game-insights?userId=${encodeURIComponent(profileUser.id)}`)
      .then(r => r.ok ? r.json() : [])
      .then(setUserInsights)
      .catch(() => setUserInsights([]))
      .finally(() => setInsightsLoading(false));
  }, [activeTab, profileUser?.id]);

  // Must be called before any early returns to satisfy rules of hooks
  const mediaPosts = useMemo(() =>
    profileUserPosts.filter(p => !p.repostedBy && ((p as any).images?.length > 0 || (p as any).video)),
    [profileUserPosts]
  );

  // Load stream archives
  useEffect(() => {
    if (isOwnProfile && currentUser?.id) {
      streamArchivesAPI.getForUser(currentUser.id).then(setStreamArchives).catch(() => {});
      streamArchivesAPI.autoDeleteOverdue(currentUser.id).catch(() => {});
      streamArchivesAPI.getRetentionDue(currentUser.id).then(due => {
        setRetentionDue(due);
        due.forEach(a => streamArchivesAPI.markRetentionPrompted(a.id));
      }).catch(() => {});
    } else if (!isOwnProfile && profileUser?.id) {
      streamArchivesAPI.getPublicForUser(profileUser.id).then(setStreamArchives).catch(() => {});
    }
  }, [isOwnProfile, currentUser?.id, profileUser?.id]);

  // Sync top_friends and top_games from the displayed profile
  useEffect(() => {
    const tf: string[] = (profileUser as any)?.top_friends ?? [];
    const tg: string[] = (profileUser as any)?.top_games ?? [];
    setTopFriendIds(tf);
    setTopGameIds(tg);
  }, [(profileUser as any)?.top_friends, (profileUser as any)?.top_games]);

  // Auto-set onboarding_complete when all 4 tasks are done
  useEffect(() => {
    if (!isOwnProfile || !(currentUser as any) || (currentUser as any).onboarding_complete) return;
    const glCheck = (currentUser as any)?.game_lists ?? {};
    const hasList = ['recentlyPlayed', 'playedBefore', 'favorites', 'wishlist', 'library'].some((k: string) => (glCheck[k] ?? []).length > 0);
    if (
      !!currentUser?.profile_picture &&
      hasList &&
      profileUserPosts.length > 0 &&
      ((currentUser as any).communities?.length ?? 0) > 0
    ) {
      updateCurrentUser({ onboarding_complete: true } as any);
    }
  }, [isOwnProfile, currentUser?.id, profileUserPosts.length]);

  // If profile not loaded yet, show skeleton
  if (!profileUser) {
    return <ProfileSkeleton />;
  }

  // Suspended account — show limited view for anyone viewing it
  if (!isOwnProfile && profileUser?.suspended) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <Header />
        <div className="w-full max-w-2xl mx-auto px-4 pt-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
            <span className="text-3xl text-muted-foreground">👤</span>
          </div>
          <h1 className="text-xl font-semibold">{profileUser.display_name || profileUser.handle}</h1>
          <p className="text-muted-foreground text-sm">@{(profileUser.handle || '').replace(/^@/, '')}</p>
          <div className="mt-6 px-6 py-4 bg-secondary rounded-xl max-w-xs">
            <p className="text-sm text-muted-foreground">This account isn't available right now.</p>
          </div>
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
    navigate(`/edit-game-list/${listType}`);
  };

  const handleOpenGameListEditWithSearch = (listType: GameListType) => {
    navigate(`/edit-game-list/${listType}?search=1`);
  };

  const handlePinPost = async (postId: string) => {
    if (!currentUser?.id) return;
    const newPinnedId = pinnedPostId === postId ? null : postId;
    setPinnedPostId(newPinnedId);
    await updateCurrentUser({ pinned_post_id: newPinnedId });
  };

  // Wrap deletePost to also remove the post from local profileUserPosts immediately
  const handleDeletePost = async (postId: string) => {
    await deletePost(postId);
    setProfileUserPosts(prev => prev.filter(p => p.id !== postId));
  };

  // Get liked posts from the feed (what we have in context)
  // likedPostsList unused — likes tab now fetches per-profile from DB

  const isBlocked = blockedUsers.has(profileUser?.id || '');
  const isMuted = mutedUsers.has(profileUser?.id || '');

  const handlePlatformTagClick = async (platform: string, fullHandle: string) => {
    if (!canViewHandles) return;
    const url = getPlatformUrl(platform, fullHandle);
    if (url) {
      const pref = getStoredLinkPreference();
      if (pref) { await openLink(url, pref); return; }
      setPendingLinkUrl(url);
      return;
    }
    const label = getHandleLabel(platform);
    const toCopy = platform === 'nintendo' ? fullHandle.replace(/-/g, '') : fullHandle;
    try { await navigator.clipboard.writeText(toCopy); } catch {}
    toast.success(`${label} copied to clipboard`);
    setHandlePopup({ platform, handle: fullHandle, label });
  };

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
      'battlenet': 'Battle.net',
      'riot': 'Riot Games',
      'kick': 'Kick',
      'trovo': 'Trovo',
    };
    return labels[platform] || platform;
  };

  // For other users' profiles: if they have no lists, treat active tab as 'posts'
  // so the empty Lists section (including "No game lists yet") is never shown.
  const _glCheck = (profileUser as any)?.game_lists ?? (profileUser as any)?.gameLists ?? {};
  const profileHasLists = ['recentlyPlayed', 'playedBefore', 'favorites', 'wishlist', 'library'].some(k => (_glCheck[k] ?? []).length > 0);
  const _timelineUnlocked = (() => {
    const now = Date.now();
    const premiumDate = Date.UTC(2026, 5, 1); // June 1, 2026
    const allDate = Date.UTC(2026, 7, 1);     // August 1, 2026
    return now >= allDate || (now >= premiumDate && !!(currentUser as any)?.is_premium);
  })();
  const timelineVisible = _timelineUnlocked && (isOwnProfile || (profileUser as any)?.show_gaming_timeline !== false);
  const effectiveTab = (!isOwnProfile && !profileHasLists && activeTab === 'lists')
    ? 'posts'
    : (!timelineVisible && activeTab === 'timeline')
    ? 'posts'
    : activeTab;

  // About tab content — rendered in both desktop left column and mobile About tab
  const renderAboutContent = () => (
    <div className="pb-4">
      {profileUser.interests && profileUser.interests.length > 0 && (() => {
        const playstyleInterests = profileUser.interests!.filter(i => i.category === 'playstyle');
        const genreInterests = profileUser.interests!.filter(i => i.category === 'genre');
        const platformInterests = profileUser.interests!.filter(i => i.category === 'platform');
        return (
          <>
            {playstyleInterests.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Playstyle</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {playstyleInterests.map(interest => (
                    <span key={interest.id} className="px-3 py-1.5 bg-secondary text-foreground rounded-full text-sm font-medium">{interest.label}</span>
                  ))}
                </div>
              </div>
            )}
            {genreInterests.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Gamepad2 className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Genres</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {genreInterests.map(interest => (
                    <span key={interest.id} className="px-3 py-1.5 bg-secondary text-foreground rounded-full text-sm font-medium">{interest.label}</span>
                  ))}
                </div>
              </div>
            )}
            {platformInterests.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Platforms</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {platformInterests.map(interest => (
                    <span key={interest.id} className="px-3 py-1.5 bg-secondary text-foreground rounded-full text-sm font-medium">{interest.label}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {profileUser.platforms && profileUser.platforms.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Gamepad2 className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Gaming Platforms</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {profileUser.platforms.map((platform: string) => {
              const platformHandle = profileUser.platformHandles?.[platform] ?? (profileUser as any).platform_handles?.[platform];
              const showHandle = profileUser.showPlatformHandles?.[platform] ?? (profileUser as any).show_platform_handles?.[platform];
              const displayHandle = canViewHandles && showHandle && platformHandle ? platformHandle : undefined;
              const clickable = canViewHandles && showHandle && platformHandle;
              return clickable ? (
                <button key={platform} onClick={() => handlePlatformTagClick(platform, platformHandle)} className="cursor-pointer">
                  <PlatformIcon platform={platform} userHandle={displayHandle} showHandle={true} />
                </button>
              ) : (
                <PlatformIcon key={platform} platform={platform} userHandle={displayHandle} showHandle={true} />
              );
            })}
          </div>
        </div>
      )}

      {(() => {
        const selectedPlatforms: SocialPlatform[] = (profileUser as any).social_platforms ?? (profileUser as any).socialPlatforms ?? [];
        const platformsWithHandles = selectedPlatforms.filter(platform => {
          const handle = profileUser.socialHandles?.[platform] ?? (profileUser as any).social_handles?.[platform];
          return !!handle;
        });
        if (platformsWithHandles.length === 0) return null;
        return (
          <div className="mb-6">
            <h3 className="text-sm text-muted-foreground uppercase tracking-wide mb-3">Social Accounts</h3>
            <div className="flex flex-wrap gap-2">
              {platformsWithHandles.map(platform => {
                const handle = profileUser.socialHandles?.[platform] ?? (profileUser as any).social_handles?.[platform];
                const showHandle = profileUser.showSocialHandles?.[platform] ?? (profileUser as any).show_social_handles?.[platform];
                const linkUrl = canViewHandles && handle ? getPlatformUrl(platform, handle) : null;
                const chip = (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full text-sm max-w-[220px]">
                    <PlatformIcon platform={platform} className="w-4 h-4 shrink-0" />
                    <span className="font-medium shrink-0">{getSocialPlatformLabel(platform)}</span>
                    {showHandle && handle && <span className="text-muted-foreground truncate">· {handle.startsWith('@') ? handle : `@${handle}`}</span>}
                    {linkUrl && <ExternalLink className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
                  </div>
                );
                return linkUrl ? (
                  <button key={platform} onClick={() => handlePlatformTagClick(platform, handle)} className="cursor-pointer hover:opacity-80 transition-opacity">
                    {chip}
                  </button>
                ) : (
                  <div key={platform}>{chip}</div>
                );
              })}
            </div>
          </div>
        );
      })()}

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
            <h3 className="text-sm text-muted-foreground uppercase tracking-wide mb-3">External Links</h3>
            <div className="space-y-2">
              {links.map(link => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 bg-secondary rounded-lg hover:bg-secondary/70 transition-colors">
                  <span className="text-sm font-medium">{link.label}</span>
                  <span className="text-sm text-accent text-xs">View profile →</span>
                </a>
              ))}
            </div>
          </div>
        );
      })()}

      {(() => {
        const links: { url: string; title: string }[] = profileUser.profile_links ?? (profileUser as any).profileLinks ?? [];
        if (links.length === 0) return null;
        return (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Links</h3>
            </div>
            <div className="space-y-2">
              {links.slice(1, 4).map((link, i) => {
                let domain = link.url;
                try { domain = new URL(link.url).hostname.replace('www.', ''); } catch {}
                const label = link.title || domain;
                return (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2.5 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors group">
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-accent shrink-0 transition-colors" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">{label}</p>
                      {link.title && <p className="text-xs text-muted-foreground truncate">{domain}</p>}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        );
      })()}

      {profileUser.about && (
        <div>
          <h3 className="text-sm text-muted-foreground uppercase tracking-wide mb-3">About</h3>
          <p className="text-sm leading-relaxed">{profileUser.about}</p>
        </div>
      )}

      {(() => {
        const isForgeSprite = (profileUser as any)?.onboarding_complete;
        const joinYear = profileUser?.created_at ? new Date(profileUser.created_at).getFullYear() : null;
        const isEarlyAdopter = joinYear === 2026;
        const isMentor = isMentorHandle(profileUser.handle || '');
        const ALPHA_CUTOFF = new Date('2026-05-19');
        const isAlphaTester = !!profileUser.created_at && (profileUser as any).account_type !== 'topic' && new Date(profileUser.created_at) < ALPHA_CUTOFF;
        if (!isForgeSprite && !isEarlyAdopter && !isMentor && !isAlphaTester && !hasInsightContribution) return null;
        return (
          <div className="mt-6 pt-4 border-t border-border/50 flex flex-wrap gap-2">
            {isAlphaTester && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-full">
                <FlaskConical className="w-3.5 h-3.5 text-fuchsia-300" />
                <span className="text-xs font-semibold text-fuchsia-300">Alpha Tester</span>
              </div>
            )}
            {isForgeSprite && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 rounded-full">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-violet-300 shrink-0">
                  <path d="M11 11c-2-4-9-3-7 2 1 3 6 2 7 0z" opacity="0.9"/>
                  <path d="M13 11c2-4 9-3 7 2-1 3-6 2-7 0z" opacity="0.9"/>
                  <path d="M11 12c-2 2-6 6-3 8 2 1 4-3 3-8z" opacity="0.7"/>
                  <path d="M13 12c2 2 6 6 3 8-2 1-4-3-3-8z" opacity="0.7"/>
                  <ellipse cx="12" cy="13" rx="1.2" ry="2.5"/>
                  <circle cx="12" cy="9" r="1.8"/>
                </svg>
                <span className="text-xs font-semibold text-violet-300">Forge Sprite</span>
              </div>
            )}
            {isEarlyAdopter && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400">Early Adopter</span>
              </div>
            )}
            {isMentor && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-amber-400 shrink-0">
                  <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
                </svg>
                <span className="text-xs font-semibold text-amber-400">Mentor</span>
              </div>
            )}
            {hasInsightContribution && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="text-xs font-semibold text-accent">Insight Author</span>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <div className="w-full max-w-2xl lg:max-w-7xl mx-auto">
        <div className="lg:flex lg:gap-6 lg:items-start lg:pt-8 lg:pl-12 lg:pr-6 overflow-hidden lg:overflow-visible">
        {/* LEFT COLUMN — profile header + about (desktop) */}
        <div className="lg:w-[340px] lg:shrink-0 lg:sticky lg:top-[72px] lg:self-start">
        {/* Profile Header */}
        <div className="bg-card px-6 pt-6 pb-4 rounded-b-2xl lg:rounded-2xl mb-4" style={{ backgroundImage: 'radial-gradient(ellipse at 85% 0%, rgba(255,255,255,0.055) 0%, transparent 55%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.18)' }}>
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
                    className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
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
                        {(vipListIds as Set<string>)?.has(profileUser.id) ? (
                          <DropdownMenuItem onClick={() => {
                            removeFromVIPList(profileUser.id);
                            toast.success(`${profileUser.display_name || ('@' + (profileUser.handle || '').replace(/^@/, ''))} removed from your VIP list`);
                          }}>
                            <Minus className="w-4 h-4 mr-2" />
                            Remove from VIP
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => {
                            addToVIPList(profileUser.id);
                            toast.success(`${profileUser.display_name || ('@' + (profileUser.handle || '').replace(/^@/, ''))} added to your VIP list`);
                          }}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add to VIP
                          </DropdownMenuItem>
                        )}
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
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button onClick={() => setIsLightboxOpen(true)} className="cursor-pointer shrink-0">
                <ProfileAvatar
                  username={profileUser.display_name || profileUser.handle || '?'}
                  profilePicture={profilePicture}
                  size="xl"
                  userId={profileUser.id}
                />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-xl font-semibold line-clamp-2 break-words">{profileUser.display_name || profileUser.handle}</h1>
                  <UserBadgeIcons handle={profileUser.handle || ''} createdAt={profileUser.created_at} />
                </div>
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
          <p className="mb-3 text-[0.9375rem] break-words">
            <LinkifyMentions text={profileUser.bio} />
          </p>

          {/* First link preview */}
          {(() => {
            const links: { url: string; title: string }[] = profileUser.profile_links ?? (profileUser as any).profileLinks ?? [];
            const first = links[0];
            if (!first) return null;
            let domain = first.url;
            try { domain = new URL(first.url).hostname.replace('www.', ''); } catch {}
            const label = first.title || domain;
            return (
              <a
                href={first.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 mb-3 text-sm text-accent hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[220px]">{label}</span>
              </a>
            );
          })()}

          {/* Stats and Share Button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-4">
              <button
                onClick={() => navigate(isOwnProfile ? '/followers' : `/followers/${profileUser.id}`)}
                className="text-left hover:opacity-70 transition-opacity"
              >
                <p className="text-xl font-semibold">{formatNumber(freshFollowerCount)}</p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </button>
              <button
                onClick={() => navigate(isOwnProfile ? '/following' : `/following/${profileUser.id}`)}
                className="text-left hover:opacity-70 transition-opacity"
              >
                <p className="text-xl font-semibold">{isOwnProfile ? formatNumber(followingIds.size) : formatNumber(freshFollowingCount)}</p>
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
                {(() => {
                  const n = mutualFollowers.slice(0, 2).map((u: any) => u.display_name || u.handle);
                  const b = (s: string) => <span className="text-foreground font-medium">{s}</span>;
                  const sep = (s: string) => <span className="font-normal">{s}</span>;
                  if (mutualFollowers.length === 1) {
                    return <>Followed by {b(n[0])}</>;
                  } else if (mutualFollowers.length === 2) {
                    return <>Followed by {b(n[0])}{sep(' and ')}{b(n[1])}</>;
                  } else {
                    return <>Followed by {b(n[0])}{sep(', ')}{b(n[1])}{sep(', and ')}{b(`${mutualFollowers.length - 2} others`)}</>;
                  }
                })()}
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
                  // Read both camelCase (normalized) and snake_case (raw DB) field names
                  const platformHandle =
                    profileUser.platformHandles?.[platform] ??
                    (profileUser as any).platform_handles?.[platform];
                  const showHandle =
                    profileUser.showPlatformHandles?.[platform] ??
                    (profileUser as any).show_platform_handles?.[platform];
                  
                  const displayHandle = canViewHandles && showHandle && platformHandle ? platformHandle : undefined;
                  const clickable = canViewHandles && showHandle && platformHandle;
                  return clickable ? (
                    <button key={platform} onClick={() => handlePlatformTagClick(platform, platformHandle)} className="cursor-pointer">
                      <PlatformIcon platform={platform} userHandle={displayHandle} showHandle={true} />
                    </button>
                  ) : (
                    <PlatformIcon key={platform} platform={platform} userHandle={displayHandle} showHandle={true} />
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
                            <span title="Creator"><Crown className="w-3.5 h-3.5 text-accent" /></span>
                          )}
                          {membership.role === 'moderator' && (
                            <span title="Moderator"><Shield className="w-3.5 h-3.5 text-accent" /></span>
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

        {/* About — desktop only, shown below profile header in left column */}
        {(() => {
          const hasAboutContent = (
            (profileUser.interests && profileUser.interests.length > 0) ||
            (profileUser.platforms && profileUser.platforms.length > 0) ||
            ((profileUser as any).social_platforms ?? (profileUser as any).socialPlatforms ?? []).length > 0 ||
            isUnclaimedAccount ||
            ((profileUser.profile_links ?? (profileUser as any).profileLinks ?? []) as any[]).length > 0 ||
            profileUser.about
          );
          if (!hasAboutContent) return null;
          return (
            <div className="hidden lg:block bg-card rounded-2xl px-6 py-4 mb-4">
              {renderAboutContent()}
            </div>
          );
        })()}
        </div>{/* end left column */}

        {/* RIGHT COLUMN — LFG, tabs, tab content */}
        <div className="min-w-0 lg:flex-1 lg:max-w-2xl overflow-visible">

        {/* Active LFG Flares — preview first flare, link to full list */}
        {activeFlares.length > 0 && (
          <div className="px-4 mb-3 space-y-2">
            {/* Preview: show only the first flare */}
            {(() => {
              const flare = activeFlares[0];
              return (
                <div
                  key={flare.id}
                  onClick={() => navigate(`/flare/${flare.id}`)}
                  className="flex items-start gap-3 p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-2 border-orange-400/50 rounded-xl cursor-pointer hover:border-orange-400/80 transition-all"
                >
                  <Flame className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-bold uppercase tracking-wide text-orange-400">
                        {flare.flare_type === 'lfg' ? 'LFG' : 'LFM'}
                      </span>
                      <span className="text-sm font-semibold truncate">{flare.game_title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Need {flare.players_needed}{flare.group_size ? `/${flare.group_size}` : ''} players
                      {flare.game_mode ? ` · ${flare.game_mode}` : ''}
                      {flare.scheduled_for ? ` · ${new Date(flare.scheduled_for).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                    </p>
                    <p className="text-xs text-orange-400/50 mt-0.5">
                      Expires {new Date(flare.expires_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {isOwnProfile && (
                    <button
                      onClick={e => { e.stopPropagation(); lfgFlaresAPI.remove(flare.id).then(() => setActiveFlares(prev => prev.filter(f => f.id !== flare.id))); }}
                      className="p-1.5 hover:bg-destructive/20 rounded-lg transition-colors shrink-0"
                      title="Remove flare"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  )}
                </div>
              );
            })()}
            {/* View all link when there are multiple flares */}
            {activeFlares.length > 1 && (
              <button
                onClick={() => navigate(`/flares/${profileUser.id}`)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-orange-400 hover:text-orange-300 transition-colors"
              >
                <Flame className="w-3.5 h-3.5" />
                View all {activeFlares.length} active LFG flares
              </button>
            )}
          </div>
        )}


        {/* Top 8 Friends & Games — always visible above tabs */}
        {(topFriendIds.length > 0 || topGameIds.length > 0) && (
          <div className="mb-2 lg:mt-4 space-y-0">
            <Top8Friends
              friendIds={topFriendIds}
              isOwnProfile={isOwnProfile}
              canAdd={topFriendIds.length < 8}
              onAdd={() => { setShowTopGamesPicker(false); setShowAddFriendPanel(true); }}
              onRemove={isOwnProfile ? async (id) => {
                if (!currentUser?.id) return;
                await top8API.removeTopFriend(currentUser.id, id);
                setTopFriendIds(prev => prev.filter(x => x !== id));
                await updateCurrentUser({ top_friends: topFriendIds.filter(x => x !== id) } as any);
              } : undefined}
            />
            <Top8Games
              gameIds={topGameIds}
              isOwnProfile={isOwnProfile}
              onManage={isOwnProfile ? () => { setShowAddFriendPanel(false); setShowTopGamesPicker(true); } : undefined}
            />
          </div>
        )}

        {/* Top 8 panels — rendered outside the "has content" gate so they work even when lists are empty */}
        {showAddFriendPanel && isOwnProfile && currentUser?.id && (
          <div className="px-4">
            <AddTopFriendPanel
              currentUserId={currentUser.id}
              existingFriendIds={topFriendIds}
              onClose={() => setShowAddFriendPanel(false)}
            />
          </div>
        )}
        {showTopGamesPicker && isOwnProfile && currentUser?.id && (
          <div className="px-4">
            <ManageTopGamesPanel
              currentUserId={currentUser.id}
              currentTopGameIds={topGameIds}
              onClose={() => setShowTopGamesPicker(false)}
              onUpdate={(ids) => {
                setTopGameIds(ids);
                updateCurrentUser({ top_games: ids } as any);
              }}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-border pl-4 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(() => {
            const gameLists = profileUser.game_lists ?? profileUser.gameLists ?? {};
            const hasLists = ['recentlyPlayed','playedBefore','favorites','wishlist','library'].some(k => (gameLists[k] ?? []).length > 0);
            if (!isOwnProfile && !hasLists) return null;
            return (
              <button
                onClick={() => setActiveTab('lists')}
                className={`shrink-0 px-4 py-3 font-medium transition-colors border-b-2 ${
                  effectiveTab === 'lists'
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
            className={`shrink-0 px-4 py-3 font-medium transition-colors border-b-2 ${
              effectiveTab === 'posts'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Posts
          </button>
          {(isOwnProfile || profileUser?.likes_public !== false) && (
            <button
              onClick={() => setActiveTab('likes')}
              className={`shrink-0 px-4 py-3 font-medium transition-colors border-b-2 ${
                effectiveTab === 'likes'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Likes
            </button>
          )}
          {(mediaPosts.length > 0 || streamArchives.length > 0) && (
            <button
              onClick={() => setActiveTab('media')}
              className={`shrink-0 px-4 py-3 font-medium transition-colors border-b-2 ${
                effectiveTab === 'media'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Media
            </button>
          )}
          {timelineVisible && (
            <button
              onClick={() => setActiveTab('timeline')}
              className={`shrink-0 px-4 py-3 font-medium transition-colors border-b-2 ${
                effectiveTab === 'timeline'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Timeline
            </button>
          )}
          <button
            onClick={() => setActiveTab('insights')}
            className={`shrink-0 px-4 py-3 font-medium transition-colors border-b-2 ${
              effectiveTab === 'insights'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Insights
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`lg:hidden shrink-0 px-4 py-3 font-medium transition-colors border-b-2 ${
              effectiveTab === 'about'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            About
          </button>
        </div>

        {/* Tab Content */}
        {effectiveTab === 'lists' && (
          <div className="space-y-6 overflow-visible">

            {(() => {
              const ALL_LISTS: { key: 'recentlyPlayed' | 'playedBefore' | 'favorites' | 'wishlist' | 'library' | 'completed'; listType: GameListType; label: string }[] = [
                { key: 'recentlyPlayed', listType: 'recently-played', label: 'Recently Played' },
                { key: 'playedBefore', listType: 'played-before', label: "I've Played Before" },
                { key: 'favorites', listType: 'favorite', label: 'Favorite Games' },
                { key: 'wishlist', listType: 'wishlist', label: 'Wishlist' },
                { key: 'library', listType: 'library', label: 'Library' },
                { key: 'completed', listType: 'completed', label: 'Completed Games' },
              ];
              // Sort by user's saved order
              const orderedLists = listOrder
                .map(k => ALL_LISTS.find(l => l.key === k))
                .filter(Boolean) as typeof ALL_LISTS;
              // Append any missing (safety)
              ALL_LISTS.forEach(l => { if (!orderedLists.find(o => o.key === l.key)) orderedLists.push(l); });

              const gameLists = profileUser.game_lists ?? profileUser.gameLists ?? {};
              const hiddenListKeys: string[] = (gameLists as any).hiddenLists ?? [];
              const hasAnyList = ALL_LISTS.some(l => (gameLists[l.key] ?? []).length > 0 && !hiddenListKeys.includes(l.key));

              const handleHideList = (key: string) => {
                const existing = currentUser?.game_lists ?? {} as any;
                const hiddenLists: string[] = existing.hiddenLists ?? [];
                if (!hiddenLists.includes(key)) {
                  updateCurrentUser({ game_lists: { ...existing, hiddenLists: [...hiddenLists, key] } });
                }
              };

              const handleShowList = (key: string) => {
                const existing = currentUser?.game_lists ?? {} as any;
                const hiddenLists: string[] = existing.hiddenLists ?? [];
                updateCurrentUser({ game_lists: { ...existing, hiddenLists: hiddenLists.filter((k: string) => k !== key) } });
              };

              const handleGripPointerDown = (i: number, label: string) => (e: React.PointerEvent) => {
                e.preventDefault();
                (e.currentTarget as Element).setPointerCapture(e.pointerId);
                listDragPtrRef.current = { fromIdx: i, currentOver: i };
                setListDragIdx(i);
                setListDragLabel(label);
                setListDragPos({ x: e.clientX, y: e.clientY });
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
                setListDragPos({ x: e.clientX, y: e.clientY });
                // Auto-scroll page when dragging near viewport edges
                const EDGE = 100;
                const SPEED = 8;
                if (e.clientY < EDGE) {
                  window.scrollBy({ top: -Math.ceil(SPEED * (1 - e.clientY / EDGE) * 3), behavior: 'instant' as ScrollBehavior });
                } else if (e.clientY > window.innerHeight - EDGE) {
                  window.scrollBy({ top: Math.ceil(SPEED * (1 - (window.innerHeight - e.clientY) / EDGE) * 3), behavior: 'instant' as ScrollBehavior });
                }
              };
              const handleGripPointerUp = (i: number) => (_e: React.PointerEvent) => {
                if (!listDragPtrRef.current || listDragPtrRef.current.fromIdx !== i) return;
                const from = i;
                const to = listDragPtrRef.current.currentOver;
                listDragPtrRef.current = null;
                setListDragPos(null);
                setListDragLabel(null);
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
                setListDragPos(null);
                setListDragLabel(null);
              };

              let visibleListCount = 0;
              return (
                <>
                  {orderedLists.map(({ key, listType, label }, i) => {
                    const games = gameLists[key] ?? [];
                    if (games.length === 0) return null;
                    if (hiddenListKeys.includes(key)) return null;
                    if (visibleListCount >= 4) return null;
                    visibleListCount++;
                    const isDragging = listDragIdx === i;
                    const isOver = listDragOverIdx === i && listDragIdx !== i;
                    return (
                      <div
                        key={listType}
                        ref={el => { listItemElsRef.current[i] = el; }}
                        className={`rounded-xl overflow-visible transition-all duration-150 ${
                          isDragging ? 'opacity-30 scale-[0.98] pointer-events-none' : isOver ? 'ring-2 ring-accent/50 bg-accent/5 scale-[1.01]' : ''
                        }`}
                      >
                        <GameList
                          title={label}
                          games={games}
                          sortable={listType === 'library'}
                          onEdit={isOwnProfile ? () => handleOpenGameListEdit(listType) : undefined}
                          onAddGame={isOwnProfile ? () => handleOpenGameListEditWithSearch(listType) : undefined}
                          onDelete={isOwnProfile ? () => updateGameList(listType, []) : undefined}
                          onHide={isOwnProfile ? () => handleHideList(key) : undefined}
                          listType={listType}
                          showFirstOnly={true}
                          dragHandle={isOwnProfile}
                          onGripPointerDown={isOwnProfile ? handleGripPointerDown(i, label) : undefined}
                          onGripPointerMove={isOwnProfile ? handleGripPointerMove(i) : undefined}
                          onGripPointerUp={isOwnProfile ? handleGripPointerUp(i) : undefined}
                          onGripPointerCancel={isOwnProfile ? handleGripPointerCancel : undefined}
                        />
                      </div>
                    );
                  })}

                  {/* Add Content module for own profile */}
                  {isOwnProfile && (
                    <div className="px-4">
                      {addContentOpen ? (
                        <div className="bg-card/50 border border-border rounded-xl p-4">
                          <p className="text-sm font-medium mb-3">Add content to your profile</p>
                          <div className="space-y-2">
                            {/* Top 8 Friends */}
                            <button
                              onClick={() => { setAddContentOpen(false); setShowAddFriendPanel(true); }}
                              disabled={topFriendIds.length >= 8}
                              className="w-full flex items-center gap-3 px-3 py-2.5 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm text-left disabled:opacity-50"
                            >
                              <Star className="w-4 h-4 text-yellow-400 shrink-0" />
                              <div>
                                <span className="font-medium">Top Friends</span>
                                <span className="text-muted-foreground ml-2 text-xs">({topFriendIds.length}/8)</span>
                              </div>
                            </button>
                            {/* Top 8 Games */}
                            <button
                              onClick={() => { setAddContentOpen(false); setShowTopGamesPicker(true); }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm text-left"
                            >
                              <Gamepad2 className="w-4 h-4 text-accent shrink-0" />
                              <div>
                                <span className="font-medium">Top Games</span>
                                <span className="text-muted-foreground ml-2 text-xs">({topGameIds.length}/8)</span>
                              </div>
                            </button>
                            {/* Divider */}
                            <div className="border-t border-border/50 pt-2 mt-1">
                              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Game Lists</p>
                            </div>
                            {/* Hidden lists — show on profile */}
                            {ALL_LISTS.filter(({ key }) => hiddenListKeys.includes(key) && (gameLists[key] ?? []).length > 0).map(({ key, label }) => (
                              <button
                                key={`show-${key}`}
                                onClick={() => { setAddContentOpen(false); handleShowList(key); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 bg-accent/10 border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors text-sm text-left"
                              >
                                <span className="text-accent">{label}</span>
                              </button>
                            ))}
                            {/* Empty lists */}
                            {ALL_LISTS.filter(({ key }) => (gameLists[key] ?? []).length === 0).map(({ listType, label }) => (
                              <button
                                key={listType}
                                onClick={() => { setAddContentOpen(false); handleOpenGameListEdit(listType); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm text-left"
                              >
                                <span>{label}</span>
                              </button>
                            ))}
                            {((gameLists as any).lfg ?? []).length === 0 && (
                              <button
                                onClick={() => { setAddContentOpen(false); handleOpenGameListEdit('lfg'); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-400/30 rounded-lg hover:border-orange-400/60 transition-colors text-sm text-left"
                              >
                                <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                <span className="text-orange-300">Looking for Group</span>
                              </button>
                            )}
                            {(() => {
                              const isPremium = (currentUser as any)?.is_premium;
                              return (
                                <button
                                  onClick={() => { setAddContentOpen(false); navigate(isPremium ? '/create-custom-list' : '/premium'); }}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${isPremium ? 'bg-secondary hover:bg-secondary/80' : 'bg-secondary/40 text-muted-foreground'}`}
                                >
                                  <span>Custom List</span>
                                  {!isPremium && <Crown className="w-3.5 h-3.5 text-accent/60 ml-auto shrink-0" />}
                                </button>
                              );
                            })()}
                          </div>
                          <button onClick={() => setAddContentOpen(false)} className="mt-3 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (visibleListCount >= 4) { setShowListLimitTray(true); } else { setAddContentOpen(true); }
                          }}
                          className="w-full flex items-center gap-4 p-4 bg-card/50 border-2 border-dashed border-muted rounded-xl hover:border-accent/50 hover:bg-card transition-colors text-left"
                        >
                          <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium text-sm">Add content</p>
                            <p className="text-xs text-muted-foreground">Top Friends, Top Games, game lists & more</p>
                          </div>
                        </button>
                      )}
                    </div>
                  )}


                  {/* Media collage — up to 4 preview images/videos above Recent Posts */}
                  {mediaPosts.length > 0 && (
                    <div className="px-4 mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm text-muted-foreground uppercase tracking-wide">Media</h3>
                        <button onClick={() => setActiveTab('media')} className="text-xs text-accent hover:underline">
                          View all media ({mediaPosts.length})
                        </button>
                      </div>
                      {(() => {
                        const preview = mediaPosts.slice(0, 4);
                        const gridCols = preview.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-4';
                        return (
                          <div className={`grid gap-1 mb-2 ${gridCols}`}>
                            {preview.map((post, idx) => {
                              const images: string[] = (post as any).images ?? [];
                              const firstSrc = images[0] ?? '';
                              const isVideo = /\.(mp4|mov|webm|ogg)(\?|$|#)/i.test(firstSrc);
                              // 3 items on mobile: last spans both columns; on desktop all items are in one row
                              const spanFull = preview.length === 3 && idx === 2;
                              return (
                                <div
                                  key={post.id}
                                  onClick={() => navigate(`/post/${post.id}`)}
                                  className={`relative cursor-pointer overflow-hidden rounded-lg bg-muted/30 aspect-[3/2] md:aspect-video ${spanFull ? 'col-span-2 md:col-span-1' : ''}`}
                                >
                                  {isVideo ? (
                                    <video src={firstSrc} className="w-full h-full object-cover" muted playsInline />
                                  ) : (
                                    <img src={firstSrc} alt="" className="w-full h-full object-cover" />
                                  )}
                                  {isVideo && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                                      <PlayCircle className="w-8 h-8 text-white drop-shadow" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {isOwnProfile && (
                    <div className="lg:hidden mt-2 mb-3 px-4">
                      <button
                        onClick={() => navigate('/create-flare')}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm border-2 border-orange-500/60 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 hover:border-orange-500/80 transition-all"
                      >
                        <Flame className="w-4 h-4" />
                        {activeFlares.length > 0 ? 'Add another LFG Flare' : 'Create LFG Flare'}
                      </button>
                    </div>
                  )}

                  {/* Posts below lists */}
                  {profileUserPosts.length > 0 && (
                    <div className="mt-4 px-4">
                      <h3 className="text-sm text-muted-foreground uppercase tracking-wide mb-3">Recent Posts</h3>
                      <div className="flex flex-col gap-3 sm:gap-6">
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
                            onDelete={isOwnProfile && !post.repostedBy ? handleDeletePost : undefined}
                            onPin={isOwnProfile && !post.repostedBy ? handlePinPost : undefined}
                            isPinned={!!pinnedPostId && post.id === pinnedPostId && !post.repostedBy}
                            isLiked={likedPosts.has(post.id)}
                            isReposted={repostedPosts.has(post.id)}
                          />
                        ));
                      })()}
                      </div>
                      {profileUserPosts.length > 5 && (
                        <button
                          onClick={() => setActiveTab('posts')}
                          className="w-full py-3 text-sm text-accent hover:underline"
                        >
                          View all posts ({profileUserPosts.length})
                        </button>
                      )}
                    </div>
                  )}

                  {/* LFG List — only render when there are games */}
                  {((gameLists as any).lfg ?? []).length > 0 && (
                    <div className="px-4">
                      <GameList
                        key="lfg"
                        listType="lfg"
                        title="Looking for Group"
                        games={(gameLists as any).lfg}
                        onEdit={isOwnProfile ? () => handleOpenGameListEdit('lfg') : undefined}
                        onDelete={isOwnProfile ? () => updateGameList('lfg', []) : undefined}
                      />
                    </div>
                  )}

                  {/* Custom Lists — only render when lists exist */}
                  {((gameLists as any).customLists ?? []).length > 0 && (
                    (gameLists as any).customLists.map((list: any) => (
                      <GameList
                        key={list.id}
                        title={list.name}
                        games={list.games ?? []}
                        showFirstOnly={true}
                      />
                    ))
                  )}
                </>
              );
            })()}
          </div>
        )}

        {effectiveTab === 'posts' && (
          <div className="px-4 flex flex-col gap-3 sm:gap-6">
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
                    onDelete={isOwnProfile && !post.repostedBy ? handleDeletePost : undefined}
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
          <div className="px-4 flex flex-col gap-3 sm:gap-6">
            {likesLoading ? (
              <div className="flex flex-col gap-3 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-xl p-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted/50 shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="flex items-center gap-2">
                          <div className="h-4 bg-muted/50 rounded w-28" />
                          <div className="h-3 bg-muted/25 rounded w-16" />
                        </div>
                        <div className="h-3.5 bg-muted/30 rounded w-full" />
                        <div className="h-3.5 bg-muted/30 rounded w-5/6" />
                        <div className="h-3 bg-muted/20 rounded w-4/5" />
                      </div>
                    </div>
                  </div>
                ))}
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

        {effectiveTab === 'media' && (
          <div className="px-4 pb-24">
            {/* Retention prompts */}
            {isOwnProfile && retentionDue.length > 0 && retentionPromptIdx < retentionDue.length && (() => {
              const archive = retentionDue[retentionPromptIdx];
              return (
                <div className="mb-4 bg-amber-950/40 border border-amber-600/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Tv2 className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-amber-200">Keep this archived stream?</p>
                      <p className="text-xs text-amber-300/70 mt-0.5 truncate">"{archive.title}"</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This archive is over 1 year old. It will be auto-deleted in 3 months if you don't decide.
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => setRetentionPromptIdx(i => i + 1)}
                          className="px-3 py-1.5 bg-accent text-accent-foreground text-xs font-medium rounded-lg"
                        >
                          Keep it
                        </button>
                        <button
                          onClick={() => {
                            streamArchivesAPI.softDelete(archive.id);
                            setStreamArchives(prev => prev.filter(a => a.id !== archive.id));
                            setRetentionPromptIdx(i => i + 1);
                          }}
                          className="px-3 py-1.5 border border-border text-xs rounded-lg hover:bg-secondary transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Twitch stream archives */}
            {streamArchives.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Tv2 className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-muted-foreground">Stream Archives</h3>
                  {isOwnProfile && (
                    <button
                      onClick={() => navigate('/settings/twitch-archive')}
                      className="ml-auto text-xs text-accent hover:underline"
                    >
                      Manage
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {streamArchives.slice(0, isOwnProfile ? undefined : 10).map(archive => {
                    const h = Math.floor(archive.duration_seconds / 3600);
                    const m = Math.floor((archive.duration_seconds % 3600) / 60);
                    const dur = h > 0 ? `${h}h ${m}m` : `${m}m`;
                    const vodUrl = (archive as any).twitch_vod_url ?? null;
                    return (
                      <div
                        key={archive.id}
                        className={`flex items-center gap-3 bg-card rounded-xl overflow-hidden ${vodUrl ? 'cursor-pointer hover:bg-card/80 transition-colors' : ''}`}
                        onClick={vodUrl ? () => window.open(vodUrl, '_blank', 'noopener,noreferrer') : undefined}
                      >
                        {archive.thumbnail_url ? (
                          <div className="relative w-24 h-14 shrink-0 bg-muted overflow-hidden">
                            <img src={archive.thumbnail_url} alt={archive.title} className="w-full h-full object-cover" />
                            {vodUrl && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <PlayCircle className="w-5 h-5 text-white drop-shadow" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-24 h-14 shrink-0 bg-muted flex items-center justify-center">
                            <Tv2 className="w-5 h-5 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 py-2 pr-3">
                          <p className="text-sm font-medium truncate">{archive.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(archive.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {dur}
                          </p>
                        </div>
                        {vodUrl && <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mr-3" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {mediaPosts.length === 0 && streamArchives.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No photos or videos yet</p>
              </div>
            ) : mediaPosts.length === 0 ? null : (
              <div className="grid grid-cols-3 gap-1">
                {mediaPosts.map(post => {
                  const images: string[] = (post as any).images ?? [];
                  const firstSrc = images[0] ?? '';
                  const isVideo = /\.(mp4|mov|webm|ogg)(\?|$|#)/i.test(firstSrc);
                  const gameTitle: string | null = (post as any).game_title ?? ((post as any).game_titles?.[0]) ?? null;
                  const gameId: string | null = (post as any).game_id ?? ((post as any).game_ids?.[0]) ?? null;
                  const communityId: string | null = (post as any).community_id ?? null;
                  const groupObj = communityId ? groups.find((g: any) => g.id === communityId) : null;
                  const groupName: string | null = groupObj?.name ?? null;
                  const hasTag = !!(gameTitle || groupName);
                  return (
                    <div key={post.id} className="relative overflow-hidden rounded-lg bg-muted/30 aspect-square">
                      {/* Main tile — click → post detail */}
                      <div
                        onClick={() => navigate(`/post/${post.id}`)}
                        className="absolute inset-0 cursor-pointer"
                      >
                        {isVideo ? (
                          <video src={firstSrc} className="w-full h-full object-cover" muted playsInline />
                        ) : (
                          <img src={firstSrc} alt="" className="w-full h-full object-cover" />
                        )}
                        {isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <PlayCircle className="w-7 h-7 text-white drop-shadow" />
                          </div>
                        )}
                      </div>
                      {/* Game/group label — always visible overlay, click → game or group page */}
                      {hasTag && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (gameId) navigate(`/game/${gameId}`);
                            else if (communityId) navigate(`/group/${communityId}`);
                          }}
                          className="absolute bottom-0 left-0 right-0 px-1.5 py-1.5 bg-gradient-to-t from-black/75 to-transparent flex items-center gap-1 text-left"
                        >
                          {gameTitle ? (
                            <Gamepad2 className="w-2.5 h-2.5 text-white/80 shrink-0" />
                          ) : (
                            <Users className="w-2.5 h-2.5 text-white/80 shrink-0" />
                          )}
                          <span className="text-white text-[10px] font-medium truncate leading-tight">
                            {gameTitle ?? groupName}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {effectiveTab === 'timeline' && (
          <div className="pb-24">
            {isOwnProfile && (profileUser as any)?.show_gaming_timeline === false && (
              <div className="mx-4 mb-4 px-4 py-3 rounded-xl bg-secondary/50 border border-border text-sm text-muted-foreground">
                Your Gaming Timeline is hidden from other users. You can show it again in <button className="text-accent underline" onClick={() => {}}>Edit Profile</button>.
              </div>
            )}
            <GameTimeline userId={profileUser.id} />
          </div>
        )}

        {effectiveTab === 'insights' && (
          <div className="px-4 pb-24">
            {insightsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(n => (
                  <div key={n} className="bg-card rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-muted/40 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted/30 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : userInsights.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">No insights submitted yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userInsights.map((insight: any) => (
                  <button
                    key={insight.id}
                    onClick={() => navigate(`/game/${insight.game_id}/insight/${insight.id}`)}
                    className="w-full text-left bg-card rounded-xl p-4 hover:border-accent/30 transition-colors"
                    style={{ border: insight.status === 'approved' ? '1px solid rgba(34,197,94,0.15)' : insight.status === 'rejected' ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(139,92,246,0.1)' }}
                  >
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {insight.status === 'approved' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 uppercase tracking-wide">Approved</span>
                      )}
                      {insight.status === 'pending' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 uppercase tracking-wide">Pending</span>
                      )}
                      {insight.status === 'rejected' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 uppercase tracking-wide">Rejected</span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium truncate max-w-[160px]">{insight.game_title}</span>
                    </div>
                    {insight.title && <p className="text-sm font-semibold leading-snug mb-1">{insight.title}</p>}
                    <p className={`line-clamp-2 leading-snug ${insight.title ? 'text-xs text-muted-foreground' : 'text-sm font-medium'}`}>{insight.query}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {effectiveTab === 'about' && (
          <div className="lg:hidden px-4 pb-24">
            {renderAboutContent()}
            {profileUser.communities && profileUser.communities.length > 0 && (() => {
              const rawDisplayIds = localDisplayedIds !== undefined
                ? localDisplayedIds
                : (profileUser.displayed_communities ?? (profileUser as any).displayedCommunities ?? null);

              const toggleGroupVisibility = async (communityId: string) => {
                const allIds = profileUser.communities!.map((m: any) => m.community_id);
                const currentShown = rawDisplayIds ?? allIds;
                const isShown = currentShown.includes(communityId);
                const newIds = isShown
                  ? currentShown.filter((id: string) => id !== communityId)
                  : [...currentShown, communityId];
                setLocalDisplayedIds(newIds);
                try {
                  await updateCurrentUser({ displayed_communities: newIds } as any);
                } catch {}
              };

              return (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Groups</h3>
                  </div>
                  <div className="flex flex-col gap-2">
                    {profileUser.communities.map((membership: any) => {
                      const group = groups.find((g: any) => g.id === membership.community_id);
                      if (!group) return null;
                      const allIds = profileUser.communities!.map((m: any) => m.community_id);
                      const currentShown = rawDisplayIds ?? allIds;
                      const isVisible = currentShown.includes(membership.community_id);
                      return (
                        <div key={membership.community_id} className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => navigate(`/group/${group.id}`)}
                            className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm text-left"
                          >
                            {group.profile_picture ? (
                              <img src={group.profile_picture} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <Users className="w-3 h-3 text-muted-foreground" />
                              </div>
                            )}
                            <span className="truncate font-medium">{group.name}</span>
                            {membership.role === 'creator' && <Crown className="w-3.5 h-3.5 text-accent shrink-0" />}
                            {membership.role === 'moderator' && <Shield className="w-3.5 h-3.5 text-accent shrink-0" />}
                          </button>
                          {isOwnProfile && (
                            <button
                              onClick={() => toggleGroupVisibility(membership.community_id)}
                              title={isVisible ? 'Hide from profile' : 'Show on profile'}
                              className={`p-2 rounded-lg transition-colors shrink-0 ${isVisible ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
                            >
                              {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        </div>{/* end right column */}
        </div>{/* end lg:flex wrapper */}
      </div>

      {/* Drag ghost — floats under cursor while reordering lists */}
      {listDragIdx !== null && listDragPos && listDragLabel && (
        <div
          className="fixed z-50 pointer-events-none select-none"
          style={{ left: listDragPos.x - 12, top: listDragPos.y - 20 }}
        >
          <div className="flex items-center gap-2 px-3 py-2 bg-card border border-accent/40 rounded-xl shadow-2xl backdrop-blur-sm">
            <GripVertical className="w-4 h-4 text-accent/60 shrink-0" />
            <span className="text-sm font-medium">{listDragLabel}</span>
          </div>
        </div>
      )}

      {/* Write Post Button */}
      <WritePostButton />

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

      {/* Link open preference modal */}
      {pendingLinkUrl && (
        <LinkOpenModal
          url={pendingLinkUrl}
          onClose={() => setPendingLinkUrl(null)}
        />
      )}

      {/* Report Modal */}
      {/* 4-list limit tray */}
      {showListLimitTray && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-safe" onClick={() => setShowListLimitTray(false)}>
          <div className="bg-card/95 backdrop-blur-xl rounded-t-2xl w-full max-w-lg p-6 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto -mt-1 mb-2" />
            <h2 className="text-base font-semibold">4-list limit reached</h2>
            <p className="text-sm text-muted-foreground">
              Your profile shows up to 4 game lists at once. To add a new one, hide an existing list first — your games will be saved.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Tip: Use the <span className="text-foreground font-medium">⋮</span> menu on any list to hide it from your profile.
            </p>
            <button
              onClick={() => setShowListLimitTray(false)}
              className="w-full py-3 bg-secondary rounded-xl font-medium text-sm hover:bg-secondary/80 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

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

      {/* Handle popup modal */}
      {handlePopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setHandlePopup(null)}
        >
          <div
            className="bg-sidebar rounded-2xl w-full max-w-xs p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{getPlatformName(handlePopup.platform)}</h2>
              <button
                onClick={() => setHandlePopup(null)}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-secondary rounded-xl px-4 py-3 space-y-1">
              <p className="text-xs text-muted-foreground">{handlePopup.label}</p>
              <div className="flex items-center gap-3">
                <p className="flex-1 font-mono text-sm break-all">{handlePopup.handle}</p>
                <button
                  onClick={async () => {
                    const toCopy = handlePopup.platform === 'nintendo'
                      ? handlePopup.handle.replace(/-/g, '')
                      : handlePopup.handle;
                    try { await navigator.clipboard.writeText(toCopy); } catch {}
                    toast.success(`${handlePopup.label} copied to clipboard`);
                  }}
                  className="shrink-0 p-2 rounded-lg hover:bg-card transition-colors text-muted-foreground hover:text-foreground"
                  title={`Copy ${handlePopup.label}`}
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating desktop action buttons */}
      {isAuthenticated && (
        <div className="hidden lg:flex fixed bottom-6 right-6 z-40 flex-col gap-2 items-end">
          <button
            onClick={() => navigate('/new-post')}
            className="flex items-center gap-2 px-4 py-3 bg-accent text-accent-foreground rounded-xl shadow-lg hover:bg-accent/90 transition-all font-medium text-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
              <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
              <line x1="16" y1="8" x2="2" y2="22" />
              <line x1="17.5" y1="15" x2="9" y2="15" />
            </svg>
            New Post
          </button>
          {isOwnProfile && (
            <button
              onClick={() => navigate('/create-flare')}
              className="flex items-center gap-2 px-4 py-3 border-2 border-orange-500/60 bg-orange-950 text-orange-300 rounded-xl hover:bg-orange-900 hover:border-orange-500/80 transition-all font-medium text-sm"
            >
              <Flame className="w-4 h-4" />
              {activeFlares.length > 0 ? 'Add LFG Flare' : 'Create LFG Flare'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}