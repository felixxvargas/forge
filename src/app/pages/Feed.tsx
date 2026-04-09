import { useState, useEffect, useCallback } from 'react';
import { Check, ChevronDown, Gamepad2, Sparkles, TrendingUp, Users, X } from 'lucide-react';
import { Link } from 'react-router';
import { Header } from '../components/Header';
import { PostCard } from '../components/PostCard';
import { WritePostButton } from '../components/WritePostButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LoginModule } from '../components/LoginModule';
import { SocialAuthButtons } from '../components/SocialAuthButtons';
import { useAppData } from '../context/AppDataContext';
import { posts as postsAPI } from '../utils/supabase';
import ForgeSVG from '../../assets/forge-logo.svg?react';

type FeedMode = 'following' | 'for-you' | 'trending' | { type: 'group'; id: string } | { type: 'game'; id: string; title: string };

export function Feed() {
  const { posts: contextPosts, currentUser, isAuthenticated, groups, likePost, unlikePost, likedPosts, repostedPosts, repostPost, unrepostPost, deletePost, blockedUsers, mutedUsers, isLoading, followedGameIds } = useAppData();
  const [feedMode, setFeedMode] = useState<FeedMode>('following');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMutedPosts, setShowMutedPosts] = useState<Set<string>>(new Set());
  const [dynamicPosts, setDynamicPosts] = useState<any[] | null>(null);
  const [dynamicLoading, setDynamicLoading] = useState(false);

  // Guest: first-visit popup
  const [showGuestPopup, setShowGuestPopup] = useState(false);
  useEffect(() => {
    if (!isAuthenticated && !localStorage.getItem('forge-guest-seen')) {
      const t = setTimeout(() => setShowGuestPopup(true), 1200);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated]);
  const dismissGuestPopup = () => {
    localStorage.setItem('forge-guest-seen', '1');
    setShowGuestPopup(false);
  };

  const handleLikeToggle = (postId: string) => {
    const isLiked = likedPosts.has(postId);
    if (isLiked) unlikePost(postId);
    else likePost(postId);
    setDynamicPosts(prev => prev === null ? null : prev.map(p =>
      p.id === postId ? { ...p, like_count: isLiked ? Math.max(0, (p.like_count ?? 0) - 1) : (p.like_count ?? 0) + 1 } : p
    ));
  };

  const handleRepost = (postId: string) => {
    const isReposted = repostedPosts.has(postId);
    if (isReposted) {
      unrepostPost(postId);
      setDynamicPosts(prev => prev === null ? null : prev.map(p =>
        p.id === postId && !p.repostedBy ? { ...p, repost_count: Math.max(0, (p.repost_count ?? 0) - 1) } : p
      ).filter(p => !(p.id === postId && p.repostedBy === currentUser?.id)));
    } else {
      repostPost(postId);
      // Update dynamicPosts count for non-following feeds (AppDataContext handles postList)
      setDynamicPosts(prev => prev === null ? null : prev.map(p =>
        p.id === postId && !p.repostedBy ? { ...p, repost_count: (p.repost_count ?? 0) + 1 } : p
      ));
    }
  };

  const handleShowMutedPost = (postId: string) => {
    setShowMutedPosts(prev => new Set([...prev, postId]));
  };

  const userGroups = currentUser?.communities?.map((m: any) => groups.find(g => g.id === m.community_id)).filter(Boolean) ?? [];

  const followedGames = currentUser ? (() => {
    const gameListsRaw = (currentUser as any)?.game_lists ?? {};
    const allGames: { id: string; title: string }[] = [];
    for (const list of Object.values(gameListsRaw)) {
      if (!Array.isArray(list)) continue;
      for (const g of list as any[]) {
        if (g && g.id && g.title && !allGames.some(x => x.id === g.id)) {
          allGames.push({ id: String(g.id), title: g.title });
        }
      }
    }
    return allGames.filter(g => followedGameIds.has(g.id));
  })() : [];

  const loadDynamicFeed = useCallback(async () => {
    if (feedMode === 'following' && isAuthenticated) { setDynamicPosts(null); return; }
    setDynamicLoading(true);
    try {
      if (feedMode === 'trending' || !isAuthenticated) {
        const data = await postsAPI.getTrendingFeed(40);
        setDynamicPosts(data);
      } else if (feedMode === 'for-you') {
        const data = await postsAPI.getForYouFeed(currentUser?.id ?? '', Array.from(followedGameIds), 40);
        setDynamicPosts(data);
      } else if (typeof feedMode === 'object' && feedMode.type === 'game') {
        const data = await postsAPI.getGameFeed(feedMode.id, 40);
        setDynamicPosts(data);
      } else {
        setDynamicPosts(null);
      }
    } catch {
      setDynamicPosts([]);
    } finally {
      setDynamicLoading(false);
    }
  }, [feedMode, currentUser?.id, followedGameIds, isAuthenticated]);

  useEffect(() => {
    loadDynamicFeed();
  }, [loadDynamicFeed]);

  // For guests, always show trending; restore following when auth resolves
  useEffect(() => {
    if (!isAuthenticated) {
      setFeedMode('trending');
    } else if (feedMode === 'trending') {
      setFeedMode('following');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const sourcePosts = dynamicPosts !== null ? dynamicPosts : contextPosts;

  const filteredPosts = sourcePosts.filter(post => {
    // Allow posts with images/links even if text content is empty (Bluesky media posts)
    const hasContent = post.content?.trim() || post.images?.length || post.url || post.image_urls?.length;
    if (!hasContent) return false;
    if (blockedUsers.has(post.user_id)) return false;
    if (typeof feedMode === 'object' && feedMode.type === 'group') {
      return post.community_id === feedMode.id || post.communityId === feedMode.id;
    }
    return true;
  });

  const visiblePosts = filteredPosts.filter(post => !mutedUsers.has(post.user_id));
  const mutedFilteredPosts = filteredPosts.filter(post => mutedUsers.has(post.user_id) && !showMutedPosts.has(post.id));

  const getSelectedName = (): string => {
    if (feedMode === 'following') return 'Following';
    if (feedMode === 'for-you') return 'For You';
    if (feedMode === 'trending') return 'Trending';
    if (typeof feedMode === 'object' && feedMode.type === 'group') {
      return groups.find(g => g.id === feedMode.id)?.name ?? 'Group';
    }
    if (typeof feedMode === 'object' && feedMode.type === 'game') return feedMode.title;
    return 'Following';
  };

  const isMode = (m: FeedMode) => {
    if (typeof m === 'string') return feedMode === m;
    if (typeof feedMode === 'object') {
      if (m.type === 'group' && feedMode.type === 'group') return feedMode.id === m.id;
      if (m.type === 'game' && feedMode.type === 'game') return feedMode.id === m.id;
    }
    return false;
  };

  const select = (m: FeedMode) => { setFeedMode(m); setShowDropdown(false); setDynamicPosts(null); };

  const loading = isLoading || dynamicLoading;

  const feedContent = (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      {/* Feed selector */}
      <div className="mb-6 relative">
        <button
          onClick={() => isAuthenticated && setShowDropdown(!showDropdown)}
          className={`flex items-center gap-2 text-2xl font-semibold transition-colors ${isAuthenticated ? 'hover:text-accent cursor-pointer' : 'cursor-default'}`}
        >
          <span>{getSelectedName()}</span>
          {isAuthenticated && (
            <ChevronDown className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          )}
        </button>

        {showDropdown && isAuthenticated && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <div className="absolute top-full left-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-3 pt-3 pb-1 text-xs text-muted-foreground uppercase tracking-wide font-medium">Feeds</div>
              {([
                { mode: 'following' as FeedMode, label: 'Following', icon: <Users className="w-4 h-4 text-muted-foreground" /> },
                { mode: 'for-you' as FeedMode, label: 'For You', icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
                { mode: 'trending' as FeedMode, label: 'Trending', icon: <TrendingUp className="w-4 h-4 text-green-400" /> },
              ] as const).map(({ mode, label, icon }) => (
                <button
                  key={label}
                  onClick={() => select(mode)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-medium">{label}</span>
                  </div>
                  {isMode(mode) && <Check className="w-4 h-4 text-accent" />}
                </button>
              ))}

              {followedGames.length > 0 && (
                <>
                  <div className="px-3 pt-3 pb-1 text-xs text-muted-foreground uppercase tracking-wide font-medium border-t border-border/50">Followed Games</div>
                  {followedGames.map(game => (
                    <button
                      key={game.id}
                      onClick={() => select({ type: 'game', id: game.id, title: game.title })}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Gamepad2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium truncate max-w-[180px]">{game.title}</span>
                      </div>
                      {isMode({ type: 'game', id: game.id, title: game.title }) && <Check className="w-4 h-4 text-accent" />}
                    </button>
                  ))}
                </>
              )}

              {userGroups.length > 0 && (
                <>
                  <div className="px-3 pt-3 pb-1 text-xs text-muted-foreground uppercase tracking-wide font-medium border-t border-border/50">Your Groups</div>
                  {userGroups.map((group: any) => {
                    if (!group) return null;
                    return (
                      <button
                        key={group.id}
                        onClick={() => select({ type: 'group', id: group.id })}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span>{group.icon}</span>
                          <span className="font-medium">{group.name}</span>
                        </div>
                        {isMode({ type: 'group', id: group.id }) && <Check className="w-4 h-4 text-accent" />}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {loading && (
        <div className="py-12">
          <LoadingSpinner size="lg" text="Loading posts..." />
        </div>
      )}

      {!loading && (
        <div>
          {visiblePosts.map(post => {
            const user = post.author;
            if (!user) return null;
            return (
              <PostCard
                key={post.id + (post.repostedBy || '')}
                post={post}
                user={user}
                onLike={handleLikeToggle}
                onRepost={handleRepost}
                onComment={() => {}}
                onDelete={post.user_id === currentUser?.id ? deletePost : undefined}
                showDelete={post.user_id === currentUser?.id}
              />
            );
          })}
        </div>
      )}

      {!loading && mutedFilteredPosts.length > 0 && (
        <div className="mt-4">
          <div className="text-sm text-muted-foreground mb-2">Muted Posts</div>
          {mutedFilteredPosts.map(post => {
            const user = post.author;
            if (!user) return null;
            return (
              <PostCard
                key={post.id}
                post={post}
                user={user}
                onLike={handleLikeToggle}
                onRepost={handleRepost}
                onComment={() => {}}
                onDelete={post.user_id === currentUser?.id ? deletePost : undefined}
                showDelete={post.user_id === currentUser?.id}
                onShowMutedPost={handleShowMutedPost}
              />
            );
          })}
        </div>
      )}

      {!loading && filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">No posts yet</p>
          <p className="text-sm text-muted-foreground">
            {feedMode === 'following'
              ? 'Follow some gamers to see their posts here'
              : feedMode === 'for-you'
              ? 'Follow games and users to personalise this feed'
              : typeof feedMode === 'object' && feedMode.type === 'group'
              ? 'Be the first to post in this group!'
              : typeof feedMode === 'object' && feedMode.type === 'game'
              ? 'No posts for this game yet'
              : 'Nothing trending right now'}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen ${!isAuthenticated ? 'pb-36 md:pb-20' : 'pb-20'}`}>
      <Header />

      {feedContent}

      {isAuthenticated && <WritePostButton />}

      {/* Mobile guest sticky CTA — sits above bottom nav (bottom-nav height ~4rem) */}
      {!isAuthenticated && (
        <div className="md:hidden fixed left-0 right-0 z-40 bg-card border-t-2 border-accent/30 px-4 py-3 flex items-center gap-3" style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Join Forge</p>
            <p className="text-xs text-muted-foreground truncate">Connect with gamers everywhere</p>
          </div>
          <Link
            to="/signup"
            className="px-4 py-2 bg-accent text-accent-foreground rounded-full text-sm font-semibold whitespace-nowrap hover:bg-accent/90 transition-colors"
          >
            Sign up
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 bg-secondary text-foreground rounded-full text-sm font-semibold whitespace-nowrap hover:bg-secondary/80 transition-colors"
          >
            Log in
          </Link>
        </div>
      )}

      {/* Desktop sidebar for logged-out users */}
      {!isAuthenticated && (
        <aside className="hidden xl:block fixed top-[9rem] left-[calc(50%+22rem)] w-64">
          <div className="bg-card rounded-2xl border border-border p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <ForgeSVG width="24" height="19" aria-hidden="true" />
              <span className="font-black text-lg text-accent">Forge</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-accent/15 text-accent">Beta</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4 leading-snug">Connect with gamers across all platforms</p>
            <Link
              to="/signup"
              className="w-full block text-center py-2.5 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-semibold text-sm mb-2"
            >
              Create account
            </Link>
            <Link
              to="/login"
              className="w-full block text-center py-2.5 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium text-sm mb-4"
            >
              Sign in
            </Link>
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="px-2 bg-card text-muted-foreground">or continue with</span></div>
            </div>
            <SocialAuthButtons />
          </div>
        </aside>
      )}

      {/* First-visit full-screen overlay for desktop guests (md only — sidebar handles xl+) */}
      {!isAuthenticated && showGuestPopup && (
        <div className="hidden md:block xl:hidden fixed inset-0 z-50 overflow-y-auto">
          <button
            onClick={dismissGuestPopup}
            className="absolute top-4 right-4 z-10 p-2 bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <LoginModule variant="page" onSuccess={dismissGuestPopup} />
        </div>
      )}
    </div>
  );
}
