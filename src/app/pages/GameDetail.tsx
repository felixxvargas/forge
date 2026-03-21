import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Users, MessageSquare, Gamepad2, Library, CheckCircle2, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { PostCard } from '../components/PostCard';
import { Header } from '../components/Header';
import { posts as postsAPI, userGamesAPI } from '../utils/supabase';
import { gamesAPI } from '../utils/api';

export function GameDetail() {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const { currentUser, session, followingIds, likedPosts, likePost, unlikePost, repostedPosts, repostPost, unrepostPost } = useAppData();

  const [taggedPosts, setTaggedPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [game, setGame] = useState<any>(null);
  const [loadingGame, setLoadingGame] = useState(true);

  // Played/owned status for current user
  const [isPlayed, setIsPlayed] = useState(false);
  const [isOwned, setIsOwned] = useState(false);
  const [togglingPlayed, setTogglingPlayed] = useState(false);
  const [togglingOwned, setTogglingOwned] = useState(false);

  // All players for this game
  const [players, setPlayers] = useState<any[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    setLoadingGame(true);
    gamesAPI.getGame(gameId)
      .then((data: any) => setGame(data?.game ?? data ?? null))
      .catch(() => setGame(null))
      .finally(() => setLoadingGame(false));
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    setLoadingPosts(true);
    postsAPI.getByGame(gameId)
      .then(setTaggedPosts)
      .catch(() => setTaggedPosts([]))
      .finally(() => setLoadingPosts(false));
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !session?.user) return;
    userGamesAPI.getStatus(session.user.id, gameId)
      .then(({ played, owned }) => { setIsPlayed(played); setIsOwned(owned); })
      .catch(() => {});
  }, [gameId, session?.user?.id]);

  useEffect(() => {
    if (!gameId) return;
    setLoadingPlayers(true);
    userGamesAPI.getPlayersForGame(gameId)
      .then(setPlayers)
      .catch(() => {})
      .finally(() => setLoadingPlayers(false));
  }, [gameId]);

  const handleTogglePlayed = async () => {
    if (!session?.user || !gameId || togglingPlayed) return;
    setTogglingPlayed(true);
    try {
      if (isPlayed) {
        await userGamesAPI.remove(session.user.id, gameId, 'played');
        setIsPlayed(false);
        setPlayers(prev => {
          const updated = prev.map(p =>
            p.id === session.user.id ? { ...p, played: false } : p
          );
          // Remove user from list if they have no status left
          return updated.filter(p => p.id !== session.user.id || p.played || p.owned);
        });
      } else {
        await userGamesAPI.add(session.user.id, gameId, 'played');
        setIsPlayed(true);
        // Add current user to players if not already there
        if (currentUser) {
          setPlayers(prev => {
            const existing = prev.find(p => p.id === currentUser.id);
            if (existing) return prev.map(p => p.id === currentUser.id ? { ...p, played: true } : p);
            return [...prev, { ...currentUser, played: true, owned: isOwned }];
          });
        }
      }
    } catch { /* ignore */ }
    finally { setTogglingPlayed(false); }
  };

  const handleToggleOwned = async () => {
    if (!session?.user || !gameId || togglingOwned) return;
    setTogglingOwned(true);
    try {
      if (isOwned) {
        await userGamesAPI.remove(session.user.id, gameId, 'owned');
        setIsOwned(false);
        setPlayers(prev => {
          const updated = prev.map(p =>
            p.id === session.user.id ? { ...p, owned: false } : p
          );
          return updated.filter(p => p.id !== session.user.id || p.played || p.owned);
        });
      } else {
        await userGamesAPI.add(session.user.id, gameId, 'owned');
        setIsOwned(true);
        if (currentUser) {
          setPlayers(prev => {
            const existing = prev.find(p => p.id === currentUser.id);
            if (existing) return prev.map(p => p.id === currentUser.id ? { ...p, owned: true } : p);
            return [...prev, { ...currentUser, played: isPlayed, owned: true }];
          });
        }
      }
    } catch { /* ignore */ }
    finally { setTogglingOwned(false); }
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

  const handleLikeToggle = (postId: string) => {
    likedPosts.has(postId) ? unlikePost(postId) : likePost(postId);
  };
  const handleRepostToggle = (postId: string) => {
    repostedPosts.has(postId) ? unrepostPost(postId) : repostPost(postId);
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <Header />

      <div className="w-full max-w-2xl mx-auto px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      </div>

      {/* Hero: blurred background + portrait cover */}
      <div className="relative w-full max-w-2xl mx-auto mb-6 rounded-2xl overflow-hidden">
        {/* Blurred background */}
        {bgUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center scale-110"
            style={{ backgroundImage: `url(${bgUrl})`, filter: 'blur(20px) brightness(0.4)' }}
          />
        ) : (
          <div className="absolute inset-0 bg-secondary" />
        )}

        {/* Portrait cover art, full height */}
        <div className="relative flex justify-center items-end px-4 pt-10 pb-0 min-h-[320px]">
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

      <div className="w-full max-w-2xl mx-auto px-4">
        {/* Title + Year + Platforms */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold mb-1">{game.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground mb-3">
            {(game.year || game.release_year) && (
              <span className="text-base">{game.year ?? game.release_year}</span>
            )}
            {platforms.length > 0 && (
              <>
                {(game.year || game.release_year) && <span>·</span>}
                <div className="flex flex-wrap gap-1.5">
                  {platforms.map((p: string) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 text-xs bg-secondary text-foreground rounded-full"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Genres */}
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

        {/* Played / Owned action buttons */}
        {session?.user && (
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleTogglePlayed}
              disabled={togglingPlayed}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-colors ${
                isPlayed
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              {isPlayed ? <CheckCircle2 className="w-4 h-4" /> : <Gamepad2 className="w-4 h-4" />}
              {isPlayed ? 'Played' : "I've Played This"}
            </button>
            <button
              onClick={handleToggleOwned}
              disabled={togglingOwned}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-colors ${
                isOwned
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              {isOwned ? <CheckCircle2 className="w-4 h-4" /> : <Library className="w-4 h-4" />}
              {isOwned ? 'In Library' : 'I Own This'}
            </button>
          </div>
        )}

        {/* Stats row */}
        <div className="bg-card rounded-2xl p-4 mb-6 flex items-center divide-x divide-border">
          {/* Total Players — always shown */}
          <button
            onClick={() => navigate(`/game/${gameId}/players`)}
            className="flex-1 flex flex-col items-center hover:bg-secondary/50 rounded-xl py-2 transition-colors"
          >
            <p className="text-2xl font-bold">{loadingPlayers ? '…' : totalCount}</p>
            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs">Total Players</span>
            </div>
          </button>

          {/* Friends that Play — always shown */}
          <button
            onClick={() => navigate(`/game/${gameId}/players`)}
            className="flex-1 flex flex-col items-center hover:bg-secondary/50 rounded-xl py-2 transition-colors"
          >
            <p className="text-2xl font-bold">{loadingPlayers ? '…' : friendCount}</p>
            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs">Friends Play</span>
            </div>
          </button>

          {/* Tagged Posts */}
          <div className="flex-1 flex flex-col items-center py-2">
            <p className="text-2xl font-bold">{taggedPosts.length}</p>
            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-xs">Posts</span>
            </div>
          </div>
        </div>

        {/* Friends who play — mini preview */}
        {!loadingPlayers && friends.length > 0 && (
          <button
            onClick={() => navigate(`/game/${gameId}/players`)}
            className="w-full bg-card rounded-2xl p-4 mb-6 flex items-center gap-3 hover:bg-card/80 transition-colors text-left"
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
                {friends.length} friend{friends.length !== 1 ? 's' : ''} play this game
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        )}

        {/* Tagged Posts */}
        {(loadingPosts || taggedPosts.length > 0) && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Posts about {game.title}</h2>
            {loadingPosts ? (
              <p className="text-muted-foreground text-sm">Loading posts…</p>
            ) : (
              <div className="space-y-0">
                {taggedPosts.map(post => {
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
      </div>
    </div>
  );
}
