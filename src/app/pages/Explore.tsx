import { useState, useEffect, useRef } from 'react';
import { Search, MessageSquare, User as UserIcon, Gamepad2, UserPlus, Users, Lock, X, Plus, ChevronRight, Flame } from 'lucide-react';
import { Header } from '../components/Header';
import { PostCard } from '../components/PostCard';
import { UserCard } from '../components/UserCard';
import { GroupIcon } from '../components/GroupIcon';
import { useNavigate, useNavigationType } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { useTopicAccountProfiles } from '../hooks/useTopicAccountProfiles';
import { type User, type Group, topicAccounts } from '../data/data';
import { posts as postsAPI, profiles as profilesAPI, lfgFlares as lfgFlaresAPI, groups as groupsAPI, supabase } from '../utils/supabase';
import { fetchAllGamingMediaPosts, searchBlueskyUsers, topicAccountBlueskyHandles, type ExternalUser } from '../utils/bluesky';
import { searchMastodonUsers } from '../utils/fediverse';
import type { LFGFlare } from '../utils/supabase';
import { gamesAPI } from '../utils/api';

type ExploreTab = 'posts' | 'users' | 'games' | 'groups';

export function Explore() {
  const { posts, users, getUserById, followingIds, currentUser, groups, likePost, unlikePost, likedPosts, repostedPosts, repostPost, unrepostPost, blockedUsers, mutedUsers, isLoading, followExternalUser, unfollowExternalUser, externalFollowIds, isAuthenticated } = useAppData() as any;

  const [activeTab, setActiveTab] = useState<ExploreTab>(() => {
    const saved = localStorage.getItem('explore-active-tab');
    return (saved as ExploreTab) || 'posts';
  });

  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('explore-search-query') ?? '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('forge-search-history') || '[]'); } catch { return []; }
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  const [postFilter, setPostFilter] = useState<'all' | 'forge'>('all');
  const [realFollowerCounts, setRealFollowerCounts] = useState<Record<string, number>>({});

  // Global search state
  const [searchPosts, setSearchPosts] = useState<any[]>([]);
  const [searchGames, setSearchGames] = useState<any[]>([]);
  const [externalUsers, setExternalUsers] = useState<ExternalUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks extra game IDs fetched to fill engagement gaps — reset on tab change
  const fetchedExtraGameIds = useRef<Set<string>>(new Set());

  const navigate = useNavigate();
  const navType = useNavigationType();
  // Tracks whether we've already processed the initial mount (to skip first tab-change effect)
  const didMountRef = useRef(false);

  // Pre-populate topic account avatar cache for all users in the list
  useTopicAccountProfiles(users.map(u => u.id));

  // On mount: restore position ONLY on back-navigation (POP); otherwise scroll to top.
  // We do NOT save on unmount — position is saved explicitly via onClickCapture below
  // so that it's only preserved when the user navigates forward to a detail view.
  useEffect(() => {
    if (navType === 'POP') {
      const saved = sessionStorage.getItem('explore-scroll-y');
      window.scrollTo(0, saved ? parseInt(saved, 10) : 0);
    } else {
      window.scrollTo(0, 0);
      sessionStorage.removeItem('explore-scroll-y'); // clear any stale position
    }
    didMountRef.current = true;
  }, []);

  // Tab change: always scroll to top and discard the saved position.
  // Skip the very first execution (initial mount) so we don't override the POP restore above.
  useEffect(() => {
    if (!didMountRef.current) return;
    window.scrollTo(0, 0);
    sessionStorage.removeItem('explore-scroll-y');
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('explore-active-tab', activeTab);
    fetchedExtraGameIds.current = new Set();
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

  // Fetch real follower counts from the follows table to replace stale cached counts
  useEffect(() => {
    if (activeTab !== 'users') return;
    const ids = users.filter(u => u.id !== currentUser?.id).map(u => u.id);
    if (ids.length === 0) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('follows')
          .select('following_id')
          .in('following_id', ids);
        const counts: Record<string, number> = {};
        for (const row of data ?? []) {
          counts[row.following_id] = (counts[row.following_id] ?? 0) + 1;
        }
        setRealFollowerCounts(counts);
      } catch {}
    })();
  }, [activeTab, users.length]);

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
  }, [activeTab]);

  // List-adds per game — computed from in-memory user data so it reflects the
  // current user's most recent additions immediately without depending on the
  // user_games table (which may lag or have RLS gaps).
  useEffect(() => {
    if (activeTab !== 'games') return;
    const counts: Record<string, number> = {};
    // Include all loaded users; prefer currentUser for up-to-date game_lists
    const allUsers = [
      ...users.filter(u => u.id !== currentUser?.id),
      ...(currentUser ? [currentUser] : []),
    ];
    for (const user of allUsers) {
      if (!user.game_lists) continue;
      const gl = user.game_lists as any;
      const seenForUser = new Set<string>();
      const entries = [
        ...(gl.recentlyPlayed ?? []),
        ...(gl.library ?? []),
        ...(gl.favorites ?? []),
        ...(gl.wishlist ?? []),
        ...(gl.completed ?? []),
      ];
      for (const game of entries) {
        if (!game?.id) continue;
        const gId = String(game.id);
        if (seenForUser.has(gId)) continue;
        seenForUser.add(gId);
        counts[gId] = (counts[gId] ?? 0) + 1;
      }
    }
    setListCounts(counts);
  }, [activeTab, users, currentUser]);

  useEffect(() => {
    if (activeTab !== 'games') return;
    // When search is active the overlay handles games — don't fire a competing request
    if (searchQuery.trim()) return;
    if (dbGames.length > 0) return;
    setLoadingGames(true);
    gamesAPI.listGames(500, 0)
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.games ?? [];
        setDbGames(list);
      })
      .catch(() => {})
      .finally(() => setLoadingGames(false));
  }, [activeTab, searchQuery]);

  // Supplementary fetch: any game with engagement (post tags / list adds) that
  // wasn't returned in the initial 500 still needs to be shown and sorted.
  useEffect(() => {
    if (activeTab !== 'games') return;
    if (loadingGames) return; // wait for the primary load to finish
    if (dbGames.length === 0) return; // primary load not done yet
    const countedIds = new Set([...Object.keys(trendingCounts), ...Object.keys(listCounts)]);
    if (countedIds.size === 0) return;
    const existingIds = new Set(dbGames.map((g: any) => String(g.id)));
    const missing = [...countedIds].filter(id => !existingIds.has(id) && !fetchedExtraGameIds.current.has(id));
    if (missing.length === 0) return;
    for (const id of missing) fetchedExtraGameIds.current.add(id);
    gamesAPI.getGames(missing)
      .then((res: any) => {
        const list: any[] = Array.isArray(res) ? res : res?.games ?? [];
        if (list.length > 0) {
          setDbGames(prev => {
            const existingSet = new Set(prev.map((g: any) => String(g.id)));
            return [...prev, ...list.filter((g: any) => !existingSet.has(String(g.id)))];
          });
        }
      })
      .catch(() => {});
  }, [activeTab, trendingCounts, listCounts, dbGames, loadingGames]);

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
        if (live.status === 'fulfilled') {
          // Enrich live Bluesky/Mastodon posts with their topic account author object
          // so PostCard can render them (it requires post.author to be set).
          const bskyHandleToTopic: Record<string, any> = {};
          for (const [topicId, handle] of Object.entries(topicAccountBlueskyHandles)) {
            const account = topicAccounts.find(a => a.id === topicId);
            if (account) bskyHandleToTopic[handle] = account;
          }
          const enriched = (live.value as any[]).map(p => {
            const topicAccount = bskyHandleToTopic[p.userId];
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
          }).filter(Boolean);
          setLivePosts(enriched);
        }
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
      setExternalUsers([]);
      setSearchLoading(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const [postsRes, gamesRes, bskyRes, mastoRes] = await Promise.allSettled([
          postsAPI.search(searchQuery),
          gamesAPI.searchGames(searchQuery, 20),
          searchBlueskyUsers(searchQuery, 5),
          searchMastodonUsers(searchQuery, 5),
        ]);
        setSearchPosts(postsRes.status === 'fulfilled' ? postsRes.value : []);
        setSearchGames(gamesRes.status === 'fulfilled'
          ? (Array.isArray(gamesRes.value) ? gamesRes.value : (gamesRes.value as any)?.games ?? [])
          : []);
        // Merge Bluesky + Mastodon results, deduplicate by externalUrl
        const bskyUsers = bskyRes.status === 'fulfilled' ? bskyRes.value : [];
        const mastoUsers = mastoRes.status === 'fulfilled' ? mastoRes.value : [];
        const seen = new Set<string>();
        const merged: ExternalUser[] = [];
        for (const u of [...bskyUsers, ...mastoUsers]) {
          if (!seen.has(u.externalUrl)) { seen.add(u.externalUrl); merged.push(u); }
        }
        setExternalUsers(merged.slice(0, 8));
        const trimmed = searchQuery.trim();
        if (trimmed) {
          setSearchHistory(prev => {
            const filtered = prev.filter(h => h.toLowerCase() !== trimmed.toLowerCase());
            const updated = [trimmed, ...filtered].slice(0, 10);
            localStorage.setItem('forge-search-history', JSON.stringify(updated));
            return updated;
          });
        }
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
    setShowSearchHistory(true);
    searchInputRef.current?.focus();
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
    if (post.repostedBy) return false;
    if (!post.content?.trim() && !post.images?.length && !post.url && !post.image_urls?.length) return false;
    if (seenPostIds.has(post.id)) return false;
    seenPostIds.add(post.id);
    const uid = post.user_id || post.userId || '';
    if (blockedUsers.has(uid)) return false;
    if (mutedUsers.has(uid) && !showMutedPosts.has(post.id)) return false;
    // Forge filter: only native Forge posts (no platform or platform === 'forge')
    if (postFilter === 'forge') {
      const platform = post.platform;
      if (platform && platform !== 'forge') return false;
    }
    return true;
  }).sort((a, b) => {
    // Forge filter always uses recency; otherwise respect Latest/Top setting
    if (postFilter !== 'forge' && postSort === 'top') {
      const engA = (a.like_count ?? 0) + (a.repost_count ?? 0) + (a.comment_count ?? 0);
      const engB = (b.like_count ?? 0) + (b.repost_count ?? 0) + (b.comment_count ?? 0);
      return engB - engA;
    }
    return new Date(b.created_at || b.timestamp).getTime() - new Date(a.created_at || a.timestamp).getTime();
  });
  // Keep backward compat alias
  const gamingMediaPosts = allExplorePosts;

  // Topic account handles allowed in Explore — verified connections only
  const ALLOWED_TOPIC_HANDLES = new Set(['xbox', 'itchio', 'gamespot', 'ign', 'pcgamer', 'massivelyop']);

  const filteredUsers = users.filter(user => {
    if (user.id === currentUser?.id) return false;
    if (blockedUsers.has(user.id)) return false;
    // Hide topic accounts that don't have a verified Bluesky connection
    if ((user as any).account_type === 'topic') {
      const handle = (user.handle || '').replace(/^@/, '').toLowerCase();
      if (!ALLOWED_TOPIC_HANDLES.has(handle)) return false;
    }
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
      // Score = IGDB/RAWG popularity + post tags + unique list adds
      const scoreA = (a.popularity_score ?? a.rating ?? 0) + (trendingCounts[a.id] ?? 0) + (listCounts[a.id] ?? 0);
      const scoreB = (b.popularity_score ?? b.rating ?? 0) + (trendingCounts[b.id] ?? 0) + (listCounts[b.id] ?? 0);
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
        <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search users, games, posts, groups..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSearchHistory(!e.target.value); }}
              onFocus={() => { setIsSearchFocused(true); if (!searchQuery) setShowSearchHistory(true); }}
              onBlur={() => { setIsSearchFocused(false); setTimeout(() => setShowSearchHistory(false), 150); }}
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
            {showSearchHistory && searchHistory.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden z-30 shadow-2xl">
                <div className="px-4 py-2 flex items-center justify-between border-b border-gray-800">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Recent searches</p>
                  <button
                    onMouseDown={e => {
                      e.preventDefault();
                      setSearchHistory([]);
                      localStorage.removeItem('forge-search-history');
                    }}
                    className="text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                {searchHistory.map((item, i) => (
                  <div key={i} className="flex items-center border-b border-gray-800/50 last:border-0">
                    <button
                      onMouseDown={e => {
                        e.preventDefault();
                        setSearchQuery(item);
                        setShowSearchHistory(false);
                      }}
                      className="flex-1 px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-colors text-left"
                    >
                      <Search className="w-4 h-4 text-gray-600 shrink-0" />
                      <span className="text-sm">{item}</span>
                    </button>
                    <button
                      onMouseDown={e => {
                        e.preventDefault();
                        const updated = searchHistory.filter((_, idx) => idx !== i);
                        setSearchHistory(updated);
                        localStorage.setItem('forge-search-history', JSON.stringify(updated));
                      }}
                      className="px-3 py-3 text-gray-600 hover:text-gray-300 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs — always visible, dimmed when search active (except on games tab) */}
      <div className={`sticky z-10 transition-all duration-300 border-b border-gray-800 bg-black ${hideSearchBar ? 'top-14' : 'top-[118px]'} ${isSearchActive && activeTab !== 'games' ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="max-w-2xl lg:max-w-3xl mx-auto w-full flex">
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

      {/* Content — onClickCapture saves scroll only when user clicks into a detail view */}
      <div
        className="max-w-2xl lg:max-w-3xl mx-auto px-4 py-4"
        onClickCapture={() => sessionStorage.setItem('explore-scroll-y', String(window.scrollY))}
      >

        {/* ── GLOBAL SEARCH OVERLAY ── (not shown on games tab — that tab handles its own search) */}
        {isSearchActive && activeTab !== 'games' ? (
          <div className="space-y-6">
            {searchLoading && (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              </div>
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

            {/* Users — Forge first, then external */}
            {(searchUsers.length > 0 || externalUsers.length > 0) && (
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
                  {/* Forge users first */}
                  {searchUsers.map(user => (
                    <UserCard key={user.id} user={{ ...user, follower_count: realFollowerCounts[user.id] ?? user.follower_count }} />
                  ))}
                  {/* External users (Bluesky + Mastodon) below, with separator */}
                  {externalUsers.length > 0 && (
                    <>
                      {searchUsers.length > 0 && (
                        <div className="flex items-center gap-2 py-1">
                          <div className="flex-1 h-px bg-gray-800" />
                          <span className="text-xs text-gray-600 font-medium">Also on the web</span>
                          <div className="flex-1 h-px bg-gray-800" />
                        </div>
                      )}
                      {externalUsers.map(u => (
                        <div
                          key={u.id}
                          onClick={() => u.platform === 'bluesky' ? navigate(`/bsky/${u.handle}`) : window.open(u.externalUrl, '_blank', 'noopener,noreferrer')}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-900/60 hover:bg-gray-800/80 transition-colors cursor-pointer"
                        >
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.displayName} className="w-10 h-10 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                              <UserIcon className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-white text-sm truncate">{u.displayName}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                u.platform === 'bluesky'
                                  ? 'bg-sky-500/20 text-sky-400'
                                  : 'bg-purple-500/20 text-purple-400'
                              }`}>
                                {u.platform === 'bluesky' ? 'Bluesky' : 'Mastodon'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">@{(u.handle || '').replace(/^@/, '')}</p>
                          </div>
                          {u.followerCount > 0 && (
                            <span className="text-xs text-gray-600 shrink-0">
                              {u.followerCount >= 1000 ? `${(u.followerCount / 1000).toFixed(1)}k` : u.followerCount}
                            </span>
                          )}
                          {isAuthenticated && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const efId = u.platform === 'bluesky'
                                  ? `bsky-${(u.handle || '').replace(/^@/, '')}`
                                  : `masto-${(() => { try { return new URL(u.externalUrl).hostname; } catch { return 'mastodon.social'; } })()}-${u.id.replace('mastodon-', '')}`;
                                const isFollowing = externalFollowIds?.has(efId);
                                if (isFollowing) {
                                  await unfollowExternalUser(efId);
                                } else {
                                  const instance = u.platform === 'mastodon'
                                    ? (() => { try { return new URL(u.externalUrl).hostname; } catch { return 'mastodon.social'; } })()
                                    : undefined;
                                  const accountId = u.platform === 'mastodon' ? u.id.replace('mastodon-', '') : undefined;
                                  await followExternalUser({
                                    id: efId,
                                    platform: u.platform,
                                    handle: (u.handle || '').replace(/^@/, ''),
                                    displayName: u.displayName,
                                    avatar: u.avatar,
                                    instance,
                                    accountId,
                                  });
                                }
                              }}
                              className={`shrink-0 px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                externalFollowIds?.has(
                                  u.platform === 'bluesky'
                                    ? `bsky-${(u.handle || '').replace(/^@/, '')}`
                                    : `masto-${(() => { try { return new URL(u.externalUrl).hostname; } catch { return 'mastodon.social'; } })()}-${u.id.replace('mastodon-', '')}`
                                )
                                  ? 'bg-gray-700 text-gray-300 hover:bg-red-900/40 hover:text-red-400'
                                  : 'bg-purple-600 text-white hover:bg-purple-500'
                              }`}
                            >
                              {externalFollowIds?.has(
                                u.platform === 'bluesky'
                                  ? `bsky-${(u.handle || '').replace(/^@/, '')}`
                                  : `masto-${(() => { try { return new URL(u.externalUrl).hostname; } catch { return 'mastodon.social'; } })()}-${u.id.replace('mastodon-', '')}`
                              ) ? 'Following' : 'Follow'}
                            </button>
                          )}
                        </div>
                      ))}
                    </>
                  )}
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
              externalUsers.length === 0 &&
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
                {/* Sort / filter chips */}
                <div className="flex gap-2 flex-wrap">
                  {(['latest', 'top'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => { setPostSort(s); setPostFilter('all'); }}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        postFilter === 'all' && postSort === s
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {s === 'latest' ? 'Latest' : 'Top'}
                    </button>
                  ))}
                  <button
                    onClick={() => setPostFilter(postFilter === 'forge' ? 'all' : 'forge')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      postFilter === 'forge'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    Forge
                  </button>
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
                    <UserCard key={user.id} user={{ ...user, follower_count: realFollowerCounts[user.id] ?? user.follower_count }} />
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
                    <>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="aspect-[3/4] rounded-lg bg-muted/50 mb-2" />
                          <div className="h-3 bg-muted/50 rounded mb-1.5 w-4/5" />
                          <div className="h-2.5 bg-muted/30 rounded w-1/3" />
                        </div>
                      ))}
                    </>
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
                              <div className="absolute top-1.5 left-1.5 bg-accent/80 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Flame className="w-2.5 h-2.5" />{score}
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

                {/* Active Flares — LFG flare branding */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <h2 className="font-semibold text-white">Active Flares</h2>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Players looking to group up right now</p>
                  {loadingLfg ? (
                    <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
                  ) : lfgPlayers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Flame className="w-10 h-10 mx-auto mb-3 opacity-40" />
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
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(
    currentUser?.communities?.some(m => m.community_id === group.id) ?? false
  );
  const [localMemberCount, setLocalMemberCount] = useState<number>(
    group.member_count ?? group.memberCount ?? 0
  );

  const handleJoinClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.id || joining) return;
    if (group.type === 'request') {
      navigate(`/group/${group.id}`);
      return;
    }
    setJoining(true);
    try {
      await groupsAPI.join(currentUser.id, group.id);
      setJoined(true);
      setLocalMemberCount(prev => prev + 1);
    } catch (err) {
      console.error('Failed to join group:', err);
    } finally {
      setJoining(false);
    }
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
            {localMemberCount.toLocaleString()} members
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
        {!joined && (group.type?.trim() === 'open' || group.type?.trim() === 'request') && (
          <button
            onClick={handleJoinClick}
            disabled={joining}
            className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium hover:bg-purple-700 transition-colors flex-shrink-0 disabled:opacity-60"
          >
            {joining ? (
              <span className="w-4 h-4 inline-block border-2 border-white border-t-transparent rounded-full animate-spin align-middle mr-1" />
            ) : (
              <UserPlus className="w-4 h-4 inline-block mr-1" />
            )}
            {group.type === 'request' ? 'Request' : 'Join'}
          </button>
        )}
        {joined && (
          <span className="px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-full text-xs font-medium flex-shrink-0">
            Joined ✓
          </span>
        )}
      </div>
    </div>
  );
}
