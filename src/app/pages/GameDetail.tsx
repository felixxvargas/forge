import { useParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft, Users, MessageSquare, Gamepad2, Library, CheckCircle2, ChevronRight, TrendingUp, Clock, List, Flame, ExternalLink, Star, StarOff, Plus, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { PostCard } from '../components/PostCard';
import { Header } from '../components/Header';

import { posts as postsAPI, userGamesAPI, lfgFlares as lfgFlaresAPI } from '../utils/supabase';
import { toast } from 'sonner';
import type { LFGFlare } from '../utils/supabase';
import { gamesAPI } from '../utils/api';
import { loadRankMapOnly, getGameRank } from '../utils/gameRankings';

type PostSort = 'latest' | 'top';

export function GameDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId: rawGameId } = useParams();
  const gameId = rawGameId ? decodeURIComponent(rawGameId) : rawGameId;
  const { currentUser, session, followingIds, followedGameIds, followGame, unfollowGame, refreshFeed, likedPosts, likePost, unlikePost, repostedPosts, repostPost, unrepostPost, updateGameList } = useAppData();

  const [taggedPosts, setTaggedPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postSort, setPostSort] = useState<PostSort>('latest');
  const [game, setGame] = useState<any>(null);
  const [loadingGame, setLoadingGame] = useState(true);

  const [isPlayed, setIsPlayed] = useState(false);
  const [isOwned, setIsOwned] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [togglingPlayed, setTogglingPlayed] = useState(false);
  const [togglingOwned, setTogglingOwned] = useState(false);
  const [togglingFollowed, setTogglingFollowed] = useState(false);

  // Sync isFollowed from context (handles changes from other pages & initial load)
  useEffect(() => {
    if (gameId) setIsFollowed(followedGameIds.has(gameId));
  }, [followedGameIds, gameId]);

  const [players, setPlayers] = useState<any[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const [similarGames, setSimilarGames] = useState<any[]>([]);
  const [gameVersions, setGameVersions] = useState<any[]>([]);
  const [listCount, setListCount] = useState<number | null>(null);

  const [gameRank, setGameRank] = useState<number | null>(null);
  const [showAddToListTray, setShowAddToListTray] = useState(false);
  const [showPlayedTray, setShowPlayedTray] = useState(false);

  // Load trending rank using fast rank-map-only path (no cover-art batch fetch)
  useEffect(() => {
    if (!gameId) return;
    const cached = getGameRank(gameId);
    if (cached !== null) { setGameRank(cached); return; }
    loadRankMapOnly().then(() => {
      setGameRank(getGameRank(gameId) ?? null);
    }).catch(() => {});
  }, [gameId]);

  // LFG / LFM state
  const [myFlare, setMyFlare] = useState<LFGFlare | null>(null);
  const [gameFlares, setGameFlares] = useState<LFGFlare[]>([]);
  const [loadingFlares, setLoadingFlares] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    setLoadingGame(true);
    gamesAPI.getGame(gameId)
      .then((data: any) => setGame(data?.game ?? data ?? null))
      .catch(() => {
        const fallback = (location.state as any)?.fallbackGame ?? null;
        setGame(fallback);
      })
      .finally(() => setLoadingGame(false));
  }, [gameId]);

  // Load dependent data once game is loaded
  useEffect(() => {
    if (!game || !gameId) return;

    gamesAPI.getSimilarGames(gameId, game.genres ?? [], 8)
      .then((res: any) => setSimilarGames(Array.isArray(res) ? res : res?.games ?? []))
      .catch(() => {});

    gamesAPI.getGameVersions(gameId, game.title, 6)
      .then((res: any) => setGameVersions(Array.isArray(res) ? res : res?.games ?? []))
      .catch(() => {});
  }, [game?.id]);

  useEffect(() => {
    if (!gameId) return;
    setLoadingPosts(true);
    postsAPI.getByGame(gameId)
      .then(setTaggedPosts)
      .catch(() => setTaggedPosts([]))
      .finally(() => setLoadingPosts(false));
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    // Derive immediate state from local game lists (instant, no network)
    const playedBefore: any[] = currentUser?.game_lists?.playedBefore ?? [];
    const library: any[] = currentUser?.game_lists?.library ?? [];
    if (playedBefore.some((g: any) => String(g.id) === String(gameId))) setIsPlayed(true);
    if (library.some((g: any) => String(g.id) === String(gameId))) setIsOwned(true);

    if (!session?.user) return;
    // Confirm against user_games table (authoritative for played/owned; follow is tracked via followedGameIds context)
    userGamesAPI.getStatus(session.user.id, gameId)
      .then(({ played, owned }) => {
        setIsPlayed(p => p || played);
        setIsOwned(o => o || owned);
        // NOTE: isFollowed is intentionally NOT set here — followGame() stores data in
        // profiles.game_lists._followedGames (not user_games), so the context effect
        // at the top of this component is the authoritative source for follow state.
      })
      .catch(() => {});
  }, [gameId, session?.user?.id]);

  useEffect(() => {
    if (!gameId) return;
    setLoadingPlayers(true);
    userGamesAPI.getPlayersForGame(gameId)
      .then(setPlayers)
      .catch(() => {})
      .finally(() => setLoadingPlayers(false));
    userGamesAPI.getListCount(gameId)
      .then(setListCount)
      .catch(() => setListCount(0));
  }, [gameId]);

  // Load LFG flares for this game
  useEffect(() => {
    if (!gameId) return;
    setLoadingFlares(true);
    lfgFlaresAPI.getActiveForGame(gameId)
      .then(setGameFlares)
      .catch(() => setGameFlares([]))
      .finally(() => setLoadingFlares(false));
  }, [gameId]);

  // Check if current user has an active flare for this game
  useEffect(() => {
    if (!gameId || !session?.user) return;
    lfgFlaresAPI.getUserFlareForGame(session.user.id, gameId)
      .then(setMyFlare)
      .catch(() => setMyFlare(null));
  }, [gameId, session?.user?.id]);

  const handleTogglePlayed = async () => {
    if (!session?.user || !gameId || !game || togglingPlayed) return;
    setTogglingPlayed(true);
    try {
      if (isPlayed) {
        // Unmark: remove from user_games and from playedBefore list
        await userGamesAPI.remove(session.user.id, gameId, 'played');
        setIsPlayed(false);
        setPlayers(prev => prev.map(p => p.id === session!.user.id ? { ...p, played: false } : p)
          .filter(p => p.id !== session!.user.id || p.played || p.owned));
        if (currentUser) {
          const playedBefore: any[] = currentUser?.game_lists?.playedBefore ?? [];
          await updateGameList('played-before', playedBefore.filter((g: any) => String(g.id) !== String(gameId)));
        }
      } else {
        // Mark as played: add to user_games and to playedBefore list
        await userGamesAPI.add(session.user.id, gameId, 'played');
        setIsPlayed(true);
        if (currentUser) {
          setPlayers(prev => {
            const ex = prev.find(p => p.id === currentUser.id);
            if (ex) return prev.map(p => p.id === currentUser.id ? { ...p, played: true } : p);
            return [...prev, { ...currentUser, played: true, owned: isOwned }];
          });
          const playedBefore: any[] = currentUser?.game_lists?.playedBefore ?? [];
          if (!playedBefore.some((g: any) => String(g.id) === String(gameId))) {
            await updateGameList('played-before', [game, ...playedBefore]);
          }
        }
        // Show tray so user can optionally also add to Recently Played or Completed
        setShowPlayedTray(true);
      }
    } catch { /* ignore */ } finally { setTogglingPlayed(false); }
  };

  const handleAlsoAddToList = async (listType: 'recently-played' | 'completed') => {
    if (!session?.user || !gameId || !game || !currentUser) return;
    setShowPlayedTray(false);
    const listKey = listType === 'recently-played' ? 'recentlyPlayed' : 'completed';
    const list: any[] = currentUser?.game_lists?.[listKey] ?? [];
    if (!list.some((g: any) => String(g.id) === String(gameId))) {
      await updateGameList(listType, [game, ...list]);
    }
  };

  const handleToggleOwned = async () => {
    if (!session?.user || !gameId || togglingOwned) return;
    setTogglingOwned(true);
    try {
      if (isOwned) {
        await userGamesAPI.remove(session.user.id, gameId, 'owned');
        setIsOwned(false);
        setPlayers(prev => prev.map(p => p.id === session.user.id ? { ...p, owned: false } : p)
          .filter(p => p.id !== session.user.id || p.played || p.owned));
        // Sync library list
        const library: any[] = currentUser?.game_lists?.library ?? [];
        await updateGameList('library', library.filter((g: any) => String(g.id) !== String(gameId)));
      } else {
        await userGamesAPI.add(session.user.id, gameId, 'owned');
        setIsOwned(true);
        if (currentUser) {
          setPlayers(prev => {
            const ex = prev.find(p => p.id === currentUser.id);
            if (ex) return prev.map(p => p.id === currentUser.id ? { ...p, owned: true } : p);
            return [...prev, { ...currentUser, played: isPlayed, owned: true }];
          });
          // Sync library list — prepend game if not already present
          const library: any[] = currentUser?.game_lists?.library ?? [];
          if (!library.some((g: any) => String(g.id) === String(gameId))) {
            await updateGameList('library', [game, ...library]);
          }
        }
      }
    } catch { /* ignore */ } finally { setTogglingOwned(false); }
  };

  const handleToggleFollowed = async () => {
    if (!session?.user || !gameId || togglingFollowed) return;
    setTogglingFollowed(true);
    const wasFollowed = isFollowed;
    setIsFollowed(!wasFollowed); // optimistic update
    try {
      if (wasFollowed) {
        await unfollowGame(gameId);
      } else {
        await followGame(gameId);
        toast.success(`Following ${game?.title ?? 'game'}`);
      }
      refreshFeed();
    } catch {
      setIsFollowed(wasFollowed); // revert on error
    } finally { setTogglingFollowed(false); }
  };

  if (loadingGame) {
    return (
      <div className="min-h-screen pb-20">
        <Header />
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen pb-20">
        <Header />
        <div className="w-full max-w-2xl mx-auto px-6 py-12 text-center">
          <h2 className="text-2xl font-bold mb-2">Game not found</h2>
          <button onClick={() => navigate(-1)} className="text-accent hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  const coverUrl = game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url
    ?? game.artwork?.[0]?.url
    ?? game.coverArt;
  const screenshotUrl = game.artwork?.find((a: any) => a.artwork_type === 'screenshot')?.url;
  const bgUrl = screenshotUrl ?? coverUrl;

  const friends = players.filter(p => followingIds.has(p.id) && p.id !== currentUser?.id);
  const totalCount = players.length;
  const friendCount = friends.length;
  const platforms: string[] = game.platforms ?? (game.platform ? [game.platform] : []);

  // Sort posts
  const sortedPosts = [...taggedPosts].sort((a, b) => {
    if (postSort === 'top') {
      const engA = (a.like_count ?? 0) + (a.repost_count ?? 0) + (a.comment_count ?? 0);
      const engB = (b.like_count ?? 0) + (b.repost_count ?? 0) + (b.comment_count ?? 0);
      return engB - engA;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleLikeToggle = (postId: string) => {
    const isLiked = likedPosts.has(postId);
    isLiked ? unlikePost(postId) : likePost(postId);
    // Update local taggedPosts count so the number updates immediately without a refetch
    setTaggedPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, like_count: isLiked ? Math.max(0, (p.like_count ?? 0) - 1) : (p.like_count ?? 0) + 1 }
        : p
    ));
  };
  const handleRepostToggle = (postId: string) => {
    const isReposted = repostedPosts.has(postId);
    isReposted ? unrepostPost(postId) : repostPost(postId);
    setTaggedPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, repost_count: isReposted ? Math.max(0, (p.repost_count ?? 0) - 1) : (p.repost_count ?? 0) + 1 }
        : p
    ));
  };

  // Add-to-list tray helpers
  const addToListOptions: { listType: 'favorite' | 'wishlist' | 'completed'; label: string; key: string }[] = [
    { listType: 'favorite', label: 'Favorite Games', key: 'favorites' },
    { listType: 'wishlist', label: 'Wishlist', key: 'wishlist' },
    { listType: 'completed', label: 'Completed Games', key: 'completed' },
  ];
  const isGameInList = (key: string) => {
    const list: any[] = currentUser?.game_lists?.[key] ?? [];
    return list.some((g: any) => String(g.id) === String(gameId));
  };
  const handleToggleInList = async (listType: 'favorite' | 'wishlist' | 'completed', key: string) => {
    if (!session?.user || !game) return;
    const list: any[] = currentUser?.game_lists?.[key] ?? [];
    if (isGameInList(key)) {
      await updateGameList(listType, list.filter((g: any) => String(g.id) !== String(gameId)));
    } else {
      await updateGameList(listType, [game, ...list]);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <Header />

      <div className="w-full max-w-2xl lg:max-w-5xl mx-auto px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      </div>

      {/* Hero: blurred background + portrait cover */}
      <div className="relative w-full max-w-2xl lg:max-w-5xl mx-auto mb-6 rounded-2xl overflow-hidden">
        {bgUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center scale-110"
            style={{ backgroundImage: `url(${bgUrl})`, filter: 'blur(20px) brightness(0.35)' }}
          />
        ) : (
          <div className="absolute inset-0 bg-secondary" />
        )}
        <div className="relative flex justify-center items-center px-4 pt-8 pb-8 min-h-[320px]">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={game.title}
              className="relative z-10 w-48 rounded-xl shadow-2xl object-cover"
              style={{ aspectRatio: '3/4' }}
            />
          ) : (
            <div className="relative z-10 w-48 rounded-xl bg-card flex items-center justify-center" style={{ aspectRatio: '3/4' }}>
              <Gamepad2 className="w-16 h-16 text-muted-foreground/40" />
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-2xl lg:max-w-5xl mx-auto px-4">
        <div className="lg:flex lg:gap-6 lg:items-start">
        {/* LEFT COLUMN — game info + actions */}
        <div className="lg:w-[320px] lg:shrink-0 lg:sticky lg:top-[72px] lg:self-start">
        {/* Title + Year + Genres */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold mb-1">{game.title}</h1>
          <div className="flex items-center gap-3 mb-2">
            {(game.year || game.release_year) && (
              <p className="text-base text-muted-foreground">{game.year ?? game.release_year}</p>
            )}
            {gameRank !== null && gameRank <= 1000 ? (
              <button
                onClick={() => navigate('/trending-games')}
                className="flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                #{gameRank} on Forge
              </button>
            ) : listCount !== null && (listCount + taggedPosts.length) > 0 ? (
              <button
                onClick={() => navigate('/trending-games')}
                className="flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Trending
              </button>
            ) : null}
          </div>
          {game.genres && game.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {game.genres.map((g: string) => (
                <span key={g} className="px-2 py-0.5 text-xs bg-accent/15 text-accent rounded-full">{g}</span>
              ))}
            </div>
          )}
          {game.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{game.description}</p>
          )}
        </div>

        {/* Platform versions (other DB entries with similar title) */}
        {gameVersions.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Other Versions</h3>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {gameVersions.map((v: any) => {
                const vCover = v.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? v.artwork?.[0]?.url;
                const vPlatforms: string[] = v.platforms ?? [];
                return (
                  <button
                    key={v.id}
                    onClick={() => navigate(`/game/${v.id}`)}
                    className="flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl bg-card hover:bg-secondary transition-colors w-24"
                  >
                    {vCover ? (
                      <img src={vCover} alt={v.title} className="w-16 rounded-lg object-cover" style={{ aspectRatio: '3/4' }} />
                    ) : (
                      <div className="w-16 bg-secondary rounded-lg flex items-center justify-center" style={{ aspectRatio: '3/4' }}>
                        <Gamepad2 className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <p className="text-xs font-medium text-center line-clamp-2 leading-tight">{v.title}</p>
                    {vPlatforms[0] && (
                      <p className="text-xs text-muted-foreground text-center truncate w-full">{vPlatforms[0]}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Platforms — each pill links to store if applicable */}
        {platforms.length > 0 && (() => {
          const encodedTitle = encodeURIComponent(game.title);
          const storeUrl = (platform: string): string | null => {
            const p = platform.toLowerCase();
            if (p.includes('pc') || p.includes('windows') || p === 'steam') return `https://store.steampowered.com/search/?term=${encodedTitle}`;
            if (p.includes('playstation') || p === 'ps4' || p === 'ps5' || p === 'ps3' || p === 'ps2') return `https://store.playstation.com/search/${encodedTitle}`;
            if (p.includes('xbox')) return `https://www.xbox.com/en-US/search?q=${encodedTitle}`;
            if (p.includes('nintendo switch') || p === 'switch') return `https://www.nintendo.com/search/?q=${encodedTitle}&p=1&cat=gm&sort=score`;
            return null;
          };
          return (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Platforms</h3>
              <div className="flex flex-wrap gap-1.5">
                {platforms.map((platform: string) => {
                  const url = storeUrl(platform);
                  return url ? (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 text-foreground rounded-full transition-colors"
                    >
                      {platform}
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </a>
                  ) : (
                    <span key={platform} className="px-3 py-1 text-sm bg-secondary text-foreground rounded-full">{platform}</span>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Played / Owned action buttons */}
        {session?.user && (
          <>
            <div className="flex gap-3 mb-3">
              <button
                onClick={handleTogglePlayed}
                disabled={togglingPlayed}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
                  isPlayed
                    ? 'bg-emerald-500/20 border-2 border-emerald-500/60 text-emerald-400'
                    : 'bg-secondary border-2 border-transparent text-foreground hover:bg-secondary/80'
                }`}
              >
                {isPlayed ? <CheckCircle2 className="w-4 h-4" /> : <Gamepad2 className="w-4 h-4" />}
                {isPlayed ? 'Played ✓' : "I've Played This"}
              </button>
              <button
                onClick={handleToggleOwned}
                disabled={togglingOwned}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
                  isOwned
                    ? 'bg-sky-500/20 border-2 border-sky-500/60 text-sky-400'
                    : 'bg-secondary border-2 border-transparent text-foreground hover:bg-secondary/80'
                }`}
              >
                {isOwned ? <CheckCircle2 className="w-4 h-4" /> : <Library className="w-4 h-4" />}
                {isOwned ? 'In Library ✓' : 'I Own This'}
              </button>
            </div>
            <button
              onClick={handleToggleFollowed}
              disabled={togglingFollowed}
              className={`w-full flex items-center justify-center gap-2 py-3 mb-3 rounded-xl font-semibold text-sm transition-all ${
                isFollowed
                  ? 'bg-accent text-accent-foreground hover:bg-accent/80'
                  : 'bg-secondary border-2 border-border text-foreground hover:bg-secondary/80'
              }`}
            >
              {togglingFollowed ? (
                <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : isFollowed ? (
                <Check className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isFollowed ? 'Following' : 'Follow Game'}
            </button>
            {/* Add to List button */}
            <button
              onClick={() => setShowAddToListTray(true)}
              className="w-full flex items-center justify-center gap-2 py-3 mb-3 rounded-xl font-medium text-sm bg-secondary border-2 border-border text-foreground hover:bg-secondary/80 transition-all"
            >
              <List className="w-4 h-4" />
              Add to List
            </button>

            {/* LFG / LFM buttons — fire flare branding */}
            <div className="flex gap-3 mb-6">
              {myFlare ? (
                <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border-2 border-orange-400/50">
                  <Flame className="w-4 h-4 text-orange-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-orange-400 uppercase">{myFlare.flare_type === 'lfg' ? 'LFG Active' : 'LFM Active'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Need {myFlare.players_needed}{myFlare.group_size ? `/${myFlare.group_size}` : ''}
                      {myFlare.game_mode ? ` · ${myFlare.game_mode}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => lfgFlaresAPI.remove(myFlare.id).then(() => {
                      setMyFlare(null);
                      setGameFlares(prev => prev.filter(f => f.id !== myFlare.id));
                    })}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate(`/create-flare?type=lfg&gameId=${gameId}&gameTitle=${encodeURIComponent(game?.title ?? '')}`)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm bg-gradient-to-br from-orange-500/10 to-red-500/10 border-2 border-orange-400/50 text-orange-300 hover:border-orange-400/80 hover:from-orange-500/15 hover:to-red-500/15 transition-all"
                >
                  <Flame className="w-4 h-4" />
                  Looking for Group
                </button>
              )}
            </div>
          </>
        )}
        </div>{/* end left column */}

        {/* RIGHT COLUMN — social, stats, posts */}
        <div className="lg:flex-1 lg:min-w-0">

        {/* Friends preview — shown at the top, before stats */}
        {!loadingPlayers && friends.length > 0 && (
          <button
            onClick={() => navigate(`/game/${gameId}/players`)}
            className="w-full bg-card rounded-2xl p-4 mb-4 flex items-center gap-3 hover:bg-card/80 transition-colors text-left"
          >
            <div className="flex -space-x-2 shrink-0">
              {friends.slice(0, 5).map((user: any) => (
                <ProfileAvatar
                  key={user.id}
                  username={user.display_name || user.handle || '?'}
                  profilePicture={user.profile_picture ?? null}
                  size="sm"
                  userId={user.id}
                  className="border-2 border-card"
                />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {friends.slice(0, 2).map((u: any) => u.display_name || u.handle).join(', ')}
                {friends.length > 2 && ` and ${friends.length - 2} more`}
              </p>
              <p className="text-xs text-muted-foreground">
                {friends.length} friend{friends.length !== 1 ? 's' : ''} {friends.length === 1 ? 'plays' : 'play'} this game
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        )}

        {/* Stats row */}
        <div className="bg-card rounded-2xl p-4 mb-6 flex items-center divide-x divide-border">
          <button
            onClick={() => navigate(`/game/${gameId}/players`)}
            className="flex-1 flex flex-col items-center hover:bg-secondary/50 rounded-xl py-2 transition-colors"
          >
            <p className="text-2xl font-bold">{loadingPlayers ? '…' : totalCount}</p>
            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs">Players</span>
            </div>
          </button>
          <button
            onClick={() => navigate(`/game/${gameId}/players`)}
            className="flex-1 flex flex-col items-center hover:bg-secondary/50 rounded-xl py-2 transition-colors"
          >
            <p className="text-2xl font-bold">{loadingPlayers ? '…' : friendCount}</p>
            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs">Friends</span>
            </div>
          </button>
          <button
            onClick={() => navigate(`/game/${gameId}/lists`)}
            className="flex-1 flex flex-col items-center hover:bg-secondary/50 rounded-xl py-2 transition-colors"
          >
            <p className="text-2xl font-bold">{listCount === null ? '…' : listCount}</p>
            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
              <List className="w-3.5 h-3.5" />
              <span className="text-xs">On Lists</span>
            </div>
          </button>
          <div className="flex-1 flex flex-col items-center py-2">
            <p className="text-2xl font-bold">{taggedPosts.length}</p>
            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-xs">Posts</span>
            </div>
          </div>
        </div>

        {/* Group Finder — LFG/LFM flares for this game */}
        {(loadingFlares || gameFlares.length > 0) && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5 text-orange-400" />
              <h2 className="text-xl font-semibold">Active Flares</h2>
            </div>
            {loadingFlares ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (() => {
              // Sort: friends first, then everyone else
              const friendFlares = gameFlares.filter(f => followingIds.has((f as any).user?.id));
              const otherFlares = gameFlares.filter(f => !followingIds.has((f as any).user?.id));
              return [...friendFlares, ...otherFlares].map(flare => {
                const player = (flare as any).user;
                if (!player) return null;
                const isFriend = followingIds.has(player.id);
                return (
                  <div
                    key={flare.id}
                    className="flex items-start gap-3 p-3 bg-card rounded-xl mb-2 cursor-pointer hover:bg-card/80 transition-colors"
                    onClick={() => navigate(`/profile/${player.id}`)}
                  >
                    <ProfileAvatar
                      username={player.display_name || player.handle || '?'}
                      profilePicture={player.profile_picture ?? null}
                      size="md"
                      userId={player.id}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{player.display_name || player.handle}</span>
                        {isFriend && <span className="text-xs px-1.5 py-0.5 bg-accent/20 text-accent rounded-full">Friend</span>}
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                          flare.flare_type === 'lfg' ? 'bg-accent/20 text-accent' : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {flare.flare_type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Need {flare.players_needed}{flare.group_size ? `/${flare.group_size}` : ''} players
                        {flare.game_mode ? ` · ${flare.game_mode}` : ''}
                        {flare.scheduled_for ? ` · ${new Date(flare.scheduled_for).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                      </p>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* Posts section with Top / Latest filter */}
        {(loadingPosts || taggedPosts.length > 0) && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Posts</h2>
              <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
                <button
                  onClick={() => setPostSort('latest')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    postSort === 'latest' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Latest
                </button>
                <button
                  onClick={() => setPostSort('top')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    postSort === 'top' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  Top
                </button>
              </div>
            </div>
            {loadingPosts ? (
              <p className="text-muted-foreground text-sm">Loading posts…</p>
            ) : (
              <div>
                {sortedPosts.map(post => {
                  const author = post.author;
                  if (!author) return null;
                  return (
                    <PostCard
                      key={post.id}
                      post={post}
                      user={author}
                      onLike={handleLikeToggle}
                      onRepost={handleRepostToggle}
                      isLiked={likedPosts.has(post.id)}
                      isReposted={repostedPosts.has(post.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Similar Games module */}
        {similarGames.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Similar Games</h2>
            <div className="grid grid-cols-4 gap-3">
              {similarGames.slice(0, 8).map((g: any) => {
                const gCover = g.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? g.artwork?.[0]?.url;
                return (
                  <button
                    key={g.id}
                    onClick={() => navigate(`/game/${g.id}`)}
                    className="flex flex-col gap-1 group"
                  >
                    <div className="rounded-lg overflow-hidden bg-secondary" style={{ aspectRatio: '3/4' }}>
                      {gCover ? (
                        <img src={gCover} alt={g.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Gamepad2 className="w-6 h-6 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium line-clamp-2 leading-tight group-hover:text-accent transition-colors">{g.title}</p>
                    {g.year && <p className="text-xs text-muted-foreground">{g.year}</p>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        </div>{/* end right column */}
        </div>{/* end lg:flex wrapper */}
      </div>

      {/* Add to List tray */}
      {showAddToListTray && (
        <div className="fixed inset-0 z-50" onClick={() => setShowAddToListTray(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl pb-safe"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-4" />
            <p className="text-center font-semibold mb-3 px-4">Add to List</p>
            <div className="divide-y divide-border border-t border-border">
              {addToListOptions.map(({ listType, label, key }) => {
                const inList = isGameInList(key);
                return (
                  <button
                    key={listType}
                    onClick={() => handleToggleInList(listType, key)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary transition-colors text-left"
                  >
                    <span className="font-medium">{label}</span>
                    {inList && <Check className="w-5 h-5 text-accent shrink-0" />}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowAddToListTray(false)}
              className="w-full py-4 text-center text-sm text-muted-foreground border-t border-border"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Played list tray — shown after marking as played, optional secondary lists */}
      {showPlayedTray && (
        <div className="fixed inset-0 z-50" onClick={() => setShowPlayedTray(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl pb-safe"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-4" />
            <p className="text-center font-semibold mb-1 px-4">Also add to...</p>
            <p className="text-center text-sm text-muted-foreground mb-4 px-4">Added to I've Played Before. Want to also add it to another list?</p>
            <div className="divide-y divide-border border-t border-border">
              <button
                onClick={() => handleAlsoAddToList('recently-played')}
                className="w-full flex flex-col px-5 py-4 hover:bg-secondary transition-colors text-left"
              >
                <span className="font-medium">Recently Played</span>
                <span className="text-sm text-muted-foreground mt-0.5">I play this game regularly</span>
              </button>
              <button
                onClick={() => handleAlsoAddToList('completed')}
                className="w-full flex flex-col px-5 py-4 hover:bg-secondary transition-colors text-left"
              >
                <span className="font-medium">Completed</span>
                <span className="text-sm text-muted-foreground mt-0.5">I reached my goal in this game</span>
              </button>
            </div>
            <button
              onClick={() => setShowPlayedTray(false)}
              className="w-full py-4 text-center text-sm text-muted-foreground border-t border-border"
            >
              No thanks
            </button>
          </div>
        </div>
      )}


    </div>
  );
}
