import { useState, useEffect, useCallback } from 'react';
import { Check, ChevronDown, Gamepad2, Flame, Users } from 'lucide-react';
import { Header } from '../components/Header';
import { PostCard } from '../components/PostCard';
import { WritePostButton } from '../components/WritePostButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAppData } from '../context/AppDataContext';
import { posts as postsAPI } from '../utils/supabase';

type FeedMode = 'following' | 'for-you' | 'trending' | { type: 'group'; id: string } | { type: 'game'; id: string; title: string };

export function Feed() {
  const { posts: contextPosts, currentUser, groups, likePost, unlikePost, likedPosts, repostedPosts, repostPost, unrepostPost, deletePost, blockedUsers, mutedUsers, isLoading, followedGameIds } = useAppData();
  const [feedMode, setFeedMode] = useState<FeedMode>('following');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMutedPosts, setShowMutedPosts] = useState<Set<string>>(new Set());
  const [dynamicPosts, setDynamicPosts] = useState<any[] | null>(null);
  const [dynamicLoading, setDynamicLoading] = useState(false);

  const handleLikeToggle = (postId: string) => {
    const isLiked = likedPosts.has(postId);
    if (isLiked) unlikePost(postId);
    else likePost(postId);
    // Sync dynamicPosts (trending/for-you/game feeds) which aren't in contextPosts
    setDynamicPosts(prev => prev === null ? null : prev.map(p =>
      p.id === postId ? { ...p, like_count: isLiked ? Math.max(0, (p.like_count ?? 0) - 1) : (p.like_count ?? 0) + 1 } : p
    ));
  };

  const handleRepost = (postId: string) => {
    const isReposted = repostedPosts.has(postId);
    if (isReposted) unrepostPost(postId);
    else repostPost(postId);
    setDynamicPosts(prev => prev === null ? null : prev.map(p =>
      p.id === postId && !p.repostedBy ? { ...p, repost_count: isReposted ? Math.max(0, (p.repost_count ?? 0) - 1) : (p.repost_count ?? 0) + 1 } : p
    ));
  };

  const handleShowMutedPost = (postId: string) => {
    setShowMutedPosts(prev => new Set([...prev, postId]));
  };

  const userGroups = currentUser?.communities?.map(m => groups.find(g => g.id === m.community_id)).filter(Boolean) ?? [];

  // Followed games (for dropdown items)
  const followedGames = currentUser ? (() => {
    const gameListsRaw = (currentUser as any)?.game_lists ?? {};
    const allGames: { id: string; title: string }[] = [];
    for (const list of Object.values(gameListsRaw)) {
      if (!Array.isArray(list)) continue;
      for (const g of list) {
        if (g && g.id && g.title && !allGames.some(x => x.id === g.id)) {
          allGames.push({ id: String(g.id), title: g.title });
        }
      }
    }
    return allGames.filter(g => followedGameIds.has(g.id));
  })() : [];

  const loadDynamicFeed = useCallback(async () => {
    if (feedMode === 'following') { setDynamicPosts(null); return; }
    setDynamicLoading(true);
    try {
      if (feedMode === 'trending') {
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
  }, [feedMode, currentUser?.id, followedGameIds]);

  useEffect(() => {
    loadDynamicFeed();
  }, [loadDynamicFeed]);

  // Source posts: dynamic for trending/for-you/game feeds, context for following/groups
  const sourcePosts = dynamicPosts !== null ? dynamicPosts : contextPosts;

  const filteredPosts = sourcePosts.filter(post => {
    if (!post.content?.trim()) return false;
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

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        {/* Feed selector */}
        <div className="mb-6 relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 text-2xl font-semibold hover:text-accent transition-colors"
          >
            <span>{getSelectedName()}</span>
            <ChevronDown className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <div className="absolute top-full left-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                {/* Core feeds */}
                <div className="px-3 pt-3 pb-1 text-xs text-muted-foreground uppercase tracking-wide font-medium">Feeds</div>
                {([
                  { mode: 'following' as FeedMode, label: 'Following', icon: <Users className="w-4 h-4 text-muted-foreground" /> },
                  { mode: 'for-you' as FeedMode, label: 'For You', icon: <Flame className="w-4 h-4 text-orange-400" /> },
                  { mode: 'trending' as FeedMode, label: 'Trending', icon: <Flame className="w-4 h-4 text-red-400" /> },
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

                {/* Followed games */}
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

                {/* Groups */}
                {userGroups.length > 0 && (
                  <>
                    <div className="px-3 pt-3 pb-1 text-xs text-muted-foreground uppercase tracking-wide font-medium border-t border-border/50">Your Groups</div>
                    {userGroups.map(group => {
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

      <WritePostButton />
    </div>
  );
}
