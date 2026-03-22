import { useState, useEffect, useRef } from 'react';
import { Search, MessageSquare, User as UserIcon, Gamepad2, UserPlus, Users, Lock, X, Plus, ChevronRight, Swords } from 'lucide-react';
import { Header } from '../components/Header';
import { PostCard } from '../components/PostCard';
import { UserCard } from '../components/UserCard';
import { GroupIcon } from '../components/GroupIcon';
import { useNavigate } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { type User, type Group } from '../data/data';
import { posts as postsAPI, profiles as profilesAPI, lfgFlares as lfgFlaresAPI, supabase } from '../utils/supabase';
import { fetchAllGamingMediaPosts } from '../utils/bluesky';
import type { LFGFlare } from '../utils/supabase';
import { gamesAPI } from '../utils/api';

type ExploreTab = 'posts' | 'users' | 'games' | 'groups';

export function Explore() {
  const { posts, users, getUserById, followingIds, currentUser, groups, likePost, unlikePost, likedPosts, repostedPosts, repostPost, unrepostPost, blockedUsers, mutedUsers, isLoading } = useAppData();

  const [activeTab, setActiveTab] = useState<ExploreTab>(() => {
    const saved = localStorage.getItem('explore-active-tab');
    return (saved as ExploreTab) || 'posts';
  });

  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('explore-search-query') ?? '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [topicPosts, setTopicPosts] = useState<any[]>([]);
  const [livePosts, setLivePosts] = useState<any[]>([]);
  const [loadingTopicPosts, setLoadingTopicPosts] = useState(false);
  const [showMutedPosts, setShowMutedPosts] = useState<Set<string>>(new Set());
  const [hideSearchBar, setHideSearchBar] = useState(false);
  const [dbGames, setDbGames] = useState<any[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [trendingCounts, setTrendingCounts] = useState<Record<string, number>>({});
  const [listCounts, setListCounts] = useState<Record<string, number>>({});
  const [lfgPlayers, setLfgPlayers] = useState<LFGFlare[]>([]);
  const [loadingLfg, setLoadingLfg] = useState(false);
  const [groupGameTitles, setGroupGameTitles] = useState<Record<string, string>>({});
  const [postSort, setPostSort] = useState<'latest' | 'top'>('latest');

  // Global search state
  const [searchPosts, setSearchPosts] = useState<any[]>([]);
  const [searchGames, setSearchGames] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('explore-active-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('explore-search-query', searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setHideSearchBar(false);
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setHideSearchBar(true);
      } else if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setHideSearchBar(false);
      }
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'groups') return;
    setLoadingLfg(true);
    lfgFlaresAPI.getActive(50)
      .then(setLfgPlayers)
      .finally(() => setLoadingLfg(false));
  }, [activeTab]);

  // Fetch game titles for all unique game IDs across all groups
  useEffect(() => {
    if (activeTab !== 'groups') return;
    const allIds = [...new Set(groups.flatMap((g: any) => g.game_ids ?? []))];
    if (allIds.length === 0) return;
    gamesAPI.getGames(allIds)
      .then((res: any) => {
        const list: any[] = Array.isArray(res) ? res : res?.games ?? [];
        const map: Record<string, string> = {};
        for (const game of list) map[String(game.id)] = game.title;
        setGroupGameTitles(map);
      })
      .catch(() => {});
  }, [activeTab, groups]);

  useEffect(() => {
    if (activeTab !== 'games') return;

    // Post tag counts per game
    (async () => {
      try {
        const { data } = await supabase.from('posts').select('game_id').not('game_id', 'is', null);
        if (!data) return;
        const counts: Record<string, number> = {};
        for (const row of data) {
          if (row.game_id) counts[row.game_id] = (counts[row.game_id] ?? 0) + 1;
        }
        setTrendingCounts(counts);
      } catch {}
    })();

    // Unique list-adds per game (one per user, even across played + owned)
    (async () => {
      try {
        const { data } = await supabase.from('user_games').select('game_id, user_id');
        if (!data) return;
        const byGame: Record<string, Set<string>> = {};
        for (const row of data) {
          if (!row.game_id) continue;
          if (!byGame[row.game_id]) byGame[row.game_id] = new Set();
          byGame[row.game_id].add(row.user_id);
        }
        const counts: Record<string, number> = {};
        for (const [gId, us] of Object.entries(byGame)) counts[gId] = us.size;
        setListCounts(counts);
      } catch {}
    })();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'games') return;
    // When search is active the overlay handles games — don't fire a competing request
    if (searchQuery.trim()) return;
    if (dbGames.length > 0) return;
    setLoadingGames(true);
    const load = gamesAPI.listGames(100, 0);
    load
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.games ?? [];
        setDbGames(list);
      })
      .catch(() => {})
      .finally(() => setLoadingGames(false));
  }, [activeTab, searchQuery]);

  useEffect(() => {
    if (activeTab !== 'posts') return;

    const load = async () => {
      setLoadingTopicPosts(true);
      try {
        const [supabasePosts, live] = await Promise.allSettled([
          postsAPI.getTopicPosts(100),
          fetchAllGamingMediaPosts(8),
        ]);
        if (supabasePosts.status === 'fulfilled') setTopicPosts(supabasePosts.value);
        if (live.status === 'fulfilled') setLivePosts(live.value as any[]);
      } catch {}
      finally { setLoadingTopicPosts(false); }
    };

    load();
    // Re-fetch live posts every 5 minutes
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Global search: debounce and fetch posts + games in parallel
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!searchQuery.trim()) {
      setSearchPosts([]);
      setSearchGames([]);
      setSearchLoading(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const [postsRes, gamesRes] = await Promise.allSettled([
          postsAPI.search(searchQuery),
          gamesAPI.searchGames(searchQuery, 20),
        ]);
        setSearchPosts(postsRes.status === 'fulfilled' ? postsRes.value : []);
        setSearchGames(gamesRes.status === 'fulfilled'
          ? (Array.isArray(gamesRes.value) ? gamesRes.value : (gamesRes.value as any)?.games ?? [])
          : []);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const handleLikeToggle = (postId: string) => {
    if (likedPosts.has(postId)) {
      unlikePost(postId);
    } else {
      likePost(postId);
    }
  };

  const handleRepost = (postId: string) => {
    if (repostedPosts.has(postId)) {
      unrepostPost(postId);
    } else {
      repostPost(postId);
    }
  };

  const handleComment = (postId: string) => {
    console.log('Comment on post:', postId);
  };

  const handleShowMutedPost = (postId: string) => {
    setShowMutedPosts(prev => new Set([...prev, postId]));
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const goToTab = (tab: ExploreTab, keepSearch = false) => {
    if (!keepSearch) setSearchQuery('');
    setActiveTab(tab);
  };

  const seenPostIds = new Set<string>();
  const allExplorePosts = [
    ...topicPosts,
    ...livePosts,
    ...posts, // all user posts (own + followed)
  ].filter(post => {
    if (!post.content?.trim()) return false;
    if (seenPostIds.has(post.id)) return false;
    seenPostIds.add(post.id);
    const uid = post.user_id || post.userId || '';
    if (blockedUsers.has(uid)) return false;
    if (mutedUsers.has(uid) && !showMutedPosts.has(post.id)) return false;
    return true;
  }).sort((a, b) => {
    if (postSort === 'top') {
      const engA = (a.like_count ?? 0) + (a.repost_count ?? 0) + (a.comment_count ?? 0);
      const engB = (b.like_count ?? 0) + (b.repost_count ?? 0) + (b.comment_count ?? 0);
      return engB - engA;
    }
    return new Date(b.created_at || b.timestamp).getTime() - new Date(a.created_at || a.timestamp).getTime();
  });
  // Keep backward compat alias
  const gamingMediaPosts = allExplorePosts;

  const filteredUsers = users.filter(user => {
    if (user.id === currentUser?.id) return false;
    if (blockedUsers.has(user.id)) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (user.display_name || user.displayName || '').toLowerCase().includes(query) ||
      user.handle.toLowerCase().includes(query) ||
      (user.bio || '').toLowerCase().includes(query)
    );
  });

  const filteredGroups = groups.filter(group => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (group.name || '').toLowerCase().includes(query) ||
      (group.description || '').toLowerCase().includes(query)
    );
  });

  const filteredGames = dbGames
    .filter(game => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (game.title || '').toLowerCase().includes(query) ||
        (game.genres && game.genres.some((g: string) => g.toLowerCase().includes(query)))
      );
    })
    .sort((a, b) => {
      // Score = post tags + unique list adds (each user counted once per game)
      const scoreA = (trendingCounts[a.id] ?? 0) + (listCounts[a.id] ?? 0);
      const scoreB = (trendingCounts[b.id] ?? 0) + (listCounts[b.id] ?? 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.year ?? 0) - (a.year ?? 0);
    });

  const isSearchActive = searchQuery.trim().length > 0;

  // Search result sections
  const searchUsers = filteredUsers.slice(0, 4);
  const searchGroupResults = filteredGroups.slice(0, 3);
  const searchPostResults = searchPosts.filter(p => {
    const uid = p.user_id || p.userId || '';
    return !blockedUsers.has(uid);
  }).slice(0, 3);
  const searchGameResults = searchGames.slice(0, 4);

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <Header title="Explore" />

      {/* Search Bar */}
      <div className={`sticky top-14 z-20 bg-black border-b border-gray-800 transition-all duration-300 ${hideSearchBar ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search users, games, posts, groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="w-full pl-10 pr-10 py-3 bg-gray-900 border border-gray-800 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs — always visible, dimmed when search active (except on games tab) */}
      <div className={`sticky z-10 transition-all duration-300 border-b border-gray-800 bg-black ${hideSearchBar ? 'top-14' : 'top-[118px]'} ${isSearchActive && activeTab !== 'games' ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="max-w-2xl mx-auto w-full flex">
          {(['posts', 'users', 'games', 'groups'] as ExploreTab[]).map(tab => {
            const icons: Record<ExploreTab, React.ReactNode> = {
              posts: <MessageSquare className="w-5 h-5" />,
              users: <UserIcon className="w-5 h-5" />,
              games: <Gamepad2 className="w-5 h-5" />,
              groups: <Users className="w-5 h-5" />,
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1 font-medium transition-colors min-h-[60px] ${
                  activeTab === tab
                    ? 'text-purple-500 border-b-2 border-purple-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {icons[tab]}
                <span className="text-xs capitalize">{tab}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4">

        {/* ── GLOBAL SEARCH OVERLAY ── (not shown on games tab — that tab handles its own search) */}
        {isSearchActive && activeTab !== 'games' ? (
          <div className="space-y-6">
            {searchLoading && (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              </div>
            )}

            {/* Users */}
            {searchUsers.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-white">Users</h2>
                  {filteredUsers.length > 4 && (
                    <button
                      onClick={() => goToTab('users')}
                      className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
                    >
                      See all {filteredUsers.length} <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {searchUsers.map(user => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>
              </section>
            )}

            {/* Games */}
            {searchGameResults.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-white">Games</h2>
                  {searchGames.length > 4 && (
                    <button
                      onClick={() => goToTab('games', true)}
                      className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
                    >
                      See all <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {searchGameResults.map(game => {
                    const coverArt = game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url;
                    return (
                      <div
                        key={game.id}
                        className="group cursor-pointer"
                        onClick={() => navigate(`/game/${game.id}`)}
                      >
                        <div className="aspect-[3/4] rounded-lg overflow-hidden mb-1 bg-gray-900">
                          {coverArt ? (
                            <img
                              src={coverArt}
                              alt={game.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Gamepad2 className="w-6 h-6 text-gray-700" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-medium line-clamp-2 group-hover:text-purple-400 transition-colors">
                          {game.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Posts */}
            {searchPostResults.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-white">Posts</h2>
                  {searchPosts.length > 3 && (
                    <button
                      onClick={() => goToTab('posts')}
                      className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
                    >
                      See all {searchPosts.length} <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {searchPostResults.map(post => {
                    const user = post.author;
                    if (!user) return null;
                    return (
                      <PostCard
                        key={post.id}
                        post={post}
                        user={user}
                        onLike={() => handleLikeToggle(post.id)}
                        onRepost={() => handleRepost(post.id)}
                        onComment={() => handleComment(post.id)}
                        isLiked={likedPosts.has(post.id)}
                        isReposted={repostedPosts.has(post.id)}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* Groups */}
            {searchGroupResults.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-white">Groups</h2>
                  {filteredGroups.length > 3 && (
                    <button
                      onClick={() => goToTab('groups')}
                      className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
                    >
                      See all {filteredGroups.length} <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {searchGroupResults.map(group => (
                    <GroupCard key={group.id} group={group} gameTitles={groupGameTitles} />
                  ))}
                </div>
              </section>
            )}

            {/* No results */}
            {!searchLoading &&
              searchUsers.length === 0 &&
              searchGameResults.length === 0 &&
              searchPostResults.length === 0 &&
              searchGroupResults.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">No results for "{searchQuery}"</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ── NORMAL TABBED CONTENT ── */}
            {activeTab === 'posts' && (
              <div className="space-y-4">
                {/* Latest / Top sort toggle */}
                <div className="flex gap-2">
                  {(['latest', 'top'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setPostSort(s)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        postSort === s
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {s === 'latest' ? 'Latest' : 'Top'}
                    </button>
                  ))}
                </div>
                {loadingTopicPosts ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="mt-4 text-gray-400">Loading gaming news...</p>
                  </div>
                ) : gamingMediaPosts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No posts to display</p>
                  </div>
                ) : (
                  gamingMediaPosts.map(post => {
                    const user = post.author;
                    if (!user) return null;
                    const uid = post.user_id || post.userId || '';
                    const isMuted = mutedUsers.has(uid);
                    const isShown = showMutedPosts.has(post.id);

                    if (isMuted && !isShown) {
                      return (
                        <div key={post.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-2">Post from muted user</p>
                          <button
                            onClick={() => handleShowMutedPost(post.id)}
                            className="text-purple-500 text-sm hover:text-purple-400"
                          >
                            Show anyway
                          </button>
                        </div>
                      );
                    }

                    return (
                      <PostCard
                        key={post.id}
                        post={post}
                        user={user!}
                        onLike={() => handleLikeToggle(post.id)}
                        onRepost={() => handleRepost(post.id)}
                        onComment={() => handleComment(post.id)}
                        isLiked={likedPosts.has(post.id)}
                        isReposted={repostedPosts.has(post.id)}
                      />
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No users found</p>
                  </div>
                ) : (
                  filteredUsers.map(user => (
                    <UserCard key={user.id} user={user} />
                  ))
                )}
              </div>
            )}

            {activeTab === 'games' && (
              <>
                {isSearchActive && (
                  <p className="text-sm text-gray-400 mb-3">
                    Results for "<span className="text-white">{searchQuery}</span>"
                  </p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {(isSearchActive ? searchLoading : loadingGames) ? (
                    <div className="col-span-full text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                      <p className="mt-4 text-gray-400">Loading games...</p>
                    </div>
                  ) : (isSearchActive ? searchGames : filteredGames).length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      <Gamepad2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{isSearchActive ? `No games found for "${searchQuery}"` : 'No games found'}</p>
                    </div>
                  ) : (
                    (isSearchActive ? searchGames : filteredGames).map(game => {
                      const coverArt = game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url
                        ?? game.coverArt;
                      const score = (trendingCounts[game.id] ?? 0) + (listCounts[game.id] ?? 0);
                      return (
                        <div
                          key={game.id}
                          className="group cursor-pointer relative"
                          onClick={() => navigate(`/game/${game.id}`)}
                        >
                          <div className="aspect-[3/4] rounded-lg overflow-hidden mb-2 bg-gray-900">
                            {coverArt ? (
                              <img
                                src={coverArt}
                                alt={game.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Gamepad2 className="w-8 h-8 text-gray-700" />
                              </div>
                            )}
                            {score > 0 && !isSearchActive && (
                              <div className="absolute top-1.5 left-1.5 bg-purple-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                🔥 {score}
                              </div>
                            )}
                          </div>
                          <h3 className="text-sm font-medium line-clamp-2 group-hover:text-purple-400 transition-colors">
                            {game.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">{game.year}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {activeTab === 'groups' && (
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/create-group')}
                  className="w-full flex items-center gap-3 p-4 bg-accent/10 border-2 border-dashed border-accent/40 rounded-lg hover:bg-accent/15 hover:border-accent/60 transition-colors text-accent"
                >
                  <Plus className="w-5 h-5 shrink-0" />
                  <span className="font-medium">Create a new group</span>
                </button>
                {filteredGroups.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No groups found</p>
                  </div>
                ) : (
                  filteredGroups.map(group => (
                    <GroupCard key={group.id} group={group} gameTitles={groupGameTitles} />
                  ))
                )}

                {/* Group Finder — active LFG flares */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Swords className="w-5 h-5 text-accent" />
                    <h2 className="font-semibold text-white">Group Finder</h2>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Active LFG flares from players looking to group up</p>
                  {loadingLfg ? (
                    <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
                  ) : lfgPlayers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Swords className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No active LFG flares right now</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lfgPlayers.map(flare => {
                        const player = (flare as any).user;
                        if (!player) return null;
                        return (
                          <div
                            key={flare.id}
                            onClick={() => navigate(`/profile/${player.id}`)}
                            className="p-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-purple-600 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              {player.profile_picture ? (
                                <img src={player.profile_picture} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                                  <UserIcon className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-white truncate">{player.display_name || player.handle}</p>
                                <p className="text-xs text-gray-500">@{(player.handle || '').replace(/^@/, '')}</p>
                              </div>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                flare.flare_type === 'lfg'
                                  ? 'bg-accent/20 text-accent'
                                  : 'bg-purple-500/20 text-purple-400'
                              }`}>
                                {flare.flare_type.toUpperCase()}
                              </span>
                            </div>
                            <div className="pl-12">
                              <p className="text-sm text-white font-medium">{flare.game_title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Need {flare.players_needed}{flare.group_size ? `/${flare.group_size}` : ''} players
                                {flare.game_mode ? ` · ${flare.game_mode}` : ''}
                                {flare.scheduled_for ? ` · ${new Date(flare.scheduled_for).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface GroupCardProps {
  group: Group;
  gameTitles?: Record<string, string>;
}

function GroupCard({ group, gameTitles }: GroupCardProps) {
  const { currentUser } = useAppData();
  const navigate = useNavigate();

  const isMember = currentUser?.communities?.some(
    membership => membership.community_id === group.id
  );

  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };


  const getTypeIcon = () => {
    switch (group.type) {
      case 'invite':
        return <Lock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={() => navigate(`/group/${group.id}`)}
      className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-purple-600 transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 flex items-center justify-center bg-secondary rounded-full text-accent flex-shrink-0 overflow-hidden">
          {group.profile_picture ? (
            <img src={group.profile_picture} alt={group.name} className="w-full h-full object-cover" />
          ) : (
            <GroupIcon iconKey={group.icon} className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{group.name}</h3>
            {getTypeIcon()}
          </div>
          <p className="text-sm text-gray-400 line-clamp-2 mb-2">{group.description}</p>
          <p className="text-xs text-gray-500">
            {(group.member_count ?? group.memberCount ?? 0).toLocaleString()} members
          </p>
          {(() => {
            const gameIds: string[] = (group as any).game_ids ?? [];
            if (gameIds.length === 0) return null;
            const firstName = gameTitles?.[String(gameIds[0])];
            if (!firstName) return null;
            const others = gameIds.length - 1;
            return (
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {firstName}{others > 0 ? ` and ${others} other game${others !== 1 ? 's' : ''}` : ''}
              </p>
            );
          })()}
        </div>
        {!isMember && (group.type?.trim() === 'open' || group.type?.trim() === 'request') && (
          <button
            onClick={handleJoinClick}
            className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium hover:bg-purple-700 transition-colors flex-shrink-0"
          >
            <UserPlus className="w-4 h-4 inline-block mr-1" />
            {group.type === 'request' ? 'Request' : 'Join'}
          </button>
        )}
      </div>
    </div>
  );
}
