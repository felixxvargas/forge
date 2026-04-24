import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowRight, Check, ChevronDown, Gamepad2, Sparkles, TrendingUp, Users, X } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Header } from '../components/Header';
import { PostCard } from '../components/PostCard';
import { GroupIcon } from '../components/GroupIcon';
import { WritePostButton } from '../components/WritePostButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LoginModule } from '../components/LoginModule';
import { SocialAuthButtons } from '../components/SocialAuthButtons';
import { useAppData } from '../context/AppDataContext';
import { posts as postsAPI } from '../utils/supabase';
import { fetchAllGamingMediaPosts, topicAccountBlueskyHandles } from '../utils/bluesky';
import { topicAccounts } from '../data/data';
import ForgeSVG from '../../assets/forge-logo.svg?react';

// Reverse map: Bluesky handle → topic account (built once at module level)
const BSKY_HANDLE_TO_TOPIC: Record<string, any> = {};
for (const [topicId, handle] of Object.entries(topicAccountBlueskyHandles)) {
  const account = topicAccounts.find(a => a.id === topicId);
  if (account) BSKY_HANDLE_TO_TOPIC[handle] = account;
}

type FeedMode = 'following' | 'for-you' | 'trending' | { type: 'group'; id: string } | { type: 'game'; id: string; title: string };

const FEED_MODE_KEY = 'forge-feed-mode';

/** Restore the last chosen feed mode if it was saved today; otherwise default to 'following'. */
function loadPersistedFeedMode(): FeedMode {
  try {
    const raw = localStorage.getItem(FEED_MODE_KEY);
    if (!raw) return 'following';
    const { mode, savedAt } = JSON.parse(raw);
    const savedDate = new Date(savedAt);
    const today = new Date();
    if (savedDate.toDateString() !== today.toDateString()) return 'following';
    if (mode === 'for-you' || mode === 'trending') return mode;
  } catch { /* ignore */ }
  return 'following';
}

/** Returns true when a topic-account post has no real content (URL-only text, no images). */
function isUsableTopicPost(p: any): boolean {
  const hasImages = (p.images?.length ?? 0) > 0 || (p.image_urls?.length ?? 0) > 0;
  const text = (p.content ?? '').trim();
  // Treat posts whose entire text is a bare URL (with nothing else) as empty
  const hasRealText = text.length >= 5 && !/^https?:\/\/\S+\s*$/.test(text);
  return hasImages || hasRealText;
}

export function Feed() {
  const { posts: contextPosts, currentUser, isAuthenticated, groups, likePost, unlikePost, likedPosts, repostedPosts, repostPost, unrepostPost, deletePost, blockedUsers, mutedUsers, isLoading, topicPostsReady, followedGameIds, signInWithGoogle } = useAppData() as any;
  const [searchParams] = useSearchParams();
  const [feedMode, setFeedMode] = useState<FeedMode>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'trending') return 'trending';
    if (tab === 'for-you') return 'for-you';
    return loadPersistedFeedMode();
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMutedPosts, setShowMutedPosts] = useState<Set<string>>(new Set());
  const [dynamicPosts, setDynamicPosts] = useState<any[] | null>(null);
  const [dynamicLoading, setDynamicLoading] = useState(false);
  const navigate = useNavigate();

  // Scroll direction for group banner hide/show
  const [scrolledDown, setScrolledDown] = useState(false);
  const lastScrollY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      if (Math.abs(current - lastScrollY.current) < 4) return;
      setScrolledDown(current > lastScrollY.current && current > 60);
      lastScrollY.current = current;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Persist the selected feed mode for the rest of the day so it survives page reloads
  useEffect(() => {
    if (feedMode === 'for-you' || feedMode === 'trending') {
      localStorage.setItem(FEED_MODE_KEY, JSON.stringify({ mode: feedMode, savedAt: Date.now() }));
    } else if (feedMode === 'following') {
      localStorage.removeItem(FEED_MODE_KEY);
    }
  }, [feedMode]);

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
        const [trendingRes, liveRes] = await Promise.allSettled([
          postsAPI.getTrendingFeed(40),
          fetchAllGamingMediaPosts(8),
        ]);
        const trending: any[] = trendingRes.status === 'fulfilled' ? trendingRes.value : [];
        const live: any[] = liveRes.status === 'fulfilled'
          ? (liveRes.value as any[]).map(p => {
              const topicAccount = BSKY_HANDLE_TO_TOPIC[p.userId];
              if (!topicAccount) return null;
              return {
                ...p,
                author: topicAccount,
                user_id: topicAccount.id,
                created_at: p.timestamp instanceof Date ? p.timestamp.toISOString() : (p.timestamp ?? p.created_at),
                like_count: p.likes ?? 0,
                repost_count: p.reposts ?? 0,
                comment_count: p.comments ?? 0,
              };
            }).filter((p): p is NonNullable<typeof p> => !!p && isUsableTopicPost(p))
          : [];
        const merged = [...trending, ...live].sort((a: any, b: any) =>
          new Date(b.created_at || b.timestamp || 0).getTime() - new Date(a.created_at || a.timestamp || 0).getTime()
        );
        setDynamicPosts(merged);
      } else if (feedMode === 'for-you') {
        const [nativeRes, topicRes] = await Promise.allSettled([
          postsAPI.getForYouFeed(currentUser?.id ?? '', Array.from(followedGameIds), 35),
          fetchAllGamingMediaPosts(6),
        ]);
        const native: any[] = nativeRes.status === 'fulfilled' ? nativeRes.value : [];
        const topicRaw: any[] = topicRes.status === 'fulfilled' ? (topicRes.value as any[]) : [];
        const topic = topicRaw.map(p => {
          const topicAccount = BSKY_HANDLE_TO_TOPIC[p.userId];
          if (!topicAccount) return null;
          return {
            ...p,
            author: topicAccount,
            user_id: topicAccount.id,
            created_at: p.timestamp instanceof Date ? p.timestamp.toISOString() : (p.timestamp ?? p.created_at),
            like_count: p.likes ?? 0,
            repost_count: p.reposts ?? 0,
            comment_count: p.comments ?? 0,
          };
        }).filter((p): p is NonNullable<typeof p> => !!p && isUsableTopicPost(p));
        // Interleave: ~1 topic post per 6 native posts so native content stays dominant
        const merged: any[] = [];
        let ti = 0;
        native.forEach((post, i) => {
          merged.push(post);
          if ((i + 1) % 6 === 0 && ti < topic.length) merged.push(topic[ti++]);
        });
        while (ti < topic.length) merged.push(topic[ti++]);
        setDynamicPosts(merged);
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
  // (unless ?tab=trending was explicitly requested)
  useEffect(() => {
    if (!isAuthenticated) {
      setFeedMode('trending');
    } else if (feedMode === 'trending' && searchParams.get('tab') !== 'trending') {
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

  const loading = isLoading || dynamicLoading || (feedMode === 'following' && isAuthenticated && !topicPostsReady);

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
                          <GroupIcon iconKey={group.icon} className="w-4 h-4" />
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
        <div className="divide-y divide-border">
          {[
            { lines: ['w-full', 'w-5/6', 'w-3/5'], hasImage: false },
            { lines: ['w-full', 'w-4/5'], hasImage: true },
            { lines: ['w-full', 'w-11/12', 'w-2/3'], hasImage: false },
            { lines: ['w-full', 'w-3/4'], hasImage: false },
            { lines: ['w-full', 'w-5/6', 'w-1/2'], hasImage: false },
          ].map((card, i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-muted/50 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-2.5">
                  {/* Name + handle + timestamp */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="h-3.5 bg-muted/60 rounded w-28" />
                    <div className="h-3 bg-muted/35 rounded w-20" />
                    <div className="h-3 bg-muted/25 rounded w-8 ml-auto" />
                  </div>
                  {/* Text lines */}
                  {card.lines.map((w, j) => (
                    <div key={j} className={`h-3.5 bg-muted/50 rounded ${w}`} />
                  ))}
                  {/* Image placeholder (some cards) */}
                  {card.hasImage && (
                    <div className="h-44 bg-muted/25 rounded-xl" />
                  )}
                  {/* Action bar */}
                  <div className="flex items-center gap-5 pt-0.5">
                    <div className="h-4 bg-muted/30 rounded w-10" />
                    <div className="h-4 bg-muted/30 rounded w-10" />
                    <div className="h-4 bg-muted/30 rounded w-10" />
                    <div className="h-4 bg-muted/30 rounded w-6 ml-auto" />
                  </div>
                </div>
              </div>
            </div>
          ))}
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

      {/* Group feed sticky navigation banner */}
      {typeof feedMode === 'object' && feedMode.type === 'group' && (() => {
        const grp = groups.find((g: any) => g.id === (feedMode as any).id);
        return grp ? (
          <div
            className={`sticky top-14 z-20 transition-transform duration-200 ${scrolledDown ? '-translate-y-full' : 'translate-y-0'}`}
            style={{ background: 'rgba(var(--card)/0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid hsl(var(--border))' }}
          >
            <div className="w-full max-w-2xl mx-auto xl:max-w-[1024px] px-4 xl:pr-[calc(264px+24px+16px)] py-2">
              <button
                onClick={() => navigate(`/group/${grp.id}`)}
                className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
              >
                <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center shrink-0 overflow-hidden">
                  {grp.profile_picture
                    ? <img src={grp.profile_picture} alt="" className="w-full h-full object-cover" />
                    : <GroupIcon iconKey={grp.icon} className="w-3.5 h-3.5 text-accent" />}
                </div>
                <span className="text-sm font-semibold truncate">{grp.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-accent shrink-0 ml-0.5" />
              </button>
            </div>
          </div>
        ) : null;
      })()}

      {/* Desktop 2-col layout: feed + right rail */}
      <div className="xl:grid xl:grid-cols-[1fr_264px] xl:gap-6 xl:max-w-[1024px] xl:mx-auto">
        <div className="min-w-0">
          {feedContent}
        </div>

        {/* Right rail — xl+ only. pt matches feedContent's py-6 + selector (~2rem line-height) + mb-6 so the first box top-aligns with the first post. */}
        <aside className="hidden xl:flex flex-col gap-4 pt-20 pr-4 sticky top-14 self-start max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          {isAuthenticated ? (
            <>
              {followedGames.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-4">
                  <h3 className="font-semibold text-sm mb-3 text-foreground">Followed Games</h3>
                  <div className="space-y-0.5">
                    {followedGames.slice(0, 8).map(game => (
                      <button
                        key={game.id}
                        onClick={() => select({ type: 'game', id: game.id, title: game.title })}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors truncate
                          ${isMode({ type: 'game', id: game.id, title: game.title })
                            ? 'text-accent font-medium bg-accent/10'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                      >
                        {game.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {userGroups.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-4">
                  <h3 className="font-semibold text-sm mb-3 text-foreground">Your Groups</h3>
                  <div className="space-y-0.5">
                    {userGroups.slice(0, 5).map((group: any) => (
                      <button
                        key={group.id}
                        onClick={() => select({ type: 'group', id: group.id })}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors truncate
                          ${isMode({ type: 'group', id: group.id })
                            ? 'text-accent font-medium bg-accent/10'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                      >
                        {group.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <ForgeSVG width="24" height="19" aria-hidden="true" />
                <span className="font-black text-lg text-accent">Forge</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-accent/15 text-accent">Beta</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-snug">Connect with gamers across all platforms</p>
              <Link to="/signup" className="w-full block text-center py-2.5 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-semibold text-sm mb-2">
                Create account
              </Link>
              <Link to="/login" className="w-full block text-center py-2.5 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium text-sm mb-4">
                Sign in
              </Link>
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="px-2 bg-card text-muted-foreground">or continue with</span></div>
              </div>
              <button
                onClick={() => signInWithGoogle()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm border border-gray-200 shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
            </div>
          )}
        </aside>
      </div>

      {isAuthenticated && <WritePostButton />}

      {/* Mobile guest sticky CTA — sits above bottom nav */}
      {!isAuthenticated && (
        <div className="md:hidden fixed left-0 right-0 z-40 bg-card/80 backdrop-blur-md backdrop-saturate-150 border-t-2 border-accent/30 px-4 py-3 flex items-center gap-3" style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Join Forge</p>
            <p className="text-xs text-muted-foreground truncate">Connect across platforms</p>
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

      {/* First-visit overlay for md desktop guests (right rail handles xl+) */}
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
