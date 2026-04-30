import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { ArrowLeft, Edit2, Users, Upload, Copy, Check, X, PenSquare, MoreHorizontal } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { GameCard } from '../components/GameCard';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { EditGameListsModal } from '../components/EditGameListsModal';
import { Header } from '../components/Header';
import { profiles as profilesAPI } from '../utils/supabase';
import type { Game, GameListType } from '../data/data';

const LIST_LABELS: Record<GameListType, string> = {
  'recently-played': 'Recently Played',
  'played-before': "I've Played Before",
  'favorite': 'Favorite Games',
  'wishlist': 'Wishlist',
  'library': 'Library',
  'completed': 'Completed Games',
  'custom': 'Custom List',
  'lfg': 'Looking for Group',
};

const LIST_KEY_MAP: Record<GameListType, string> = {
  'recently-played': 'recentlyPlayed',
  'played-before': 'playedBefore',
  'favorite': 'favorites',
  'wishlist': 'wishlist',
  'library': 'library',
  'completed': 'completed',
  'custom': 'custom',
  'lfg': 'lfg',
};

export function ListView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const listType = (searchParams.get('type') || 'library') as GameListType;
  const isBrowseMode = searchParams.get('browse') === 'true';
  const viewUserId = searchParams.get('userId');
  const { currentUser, users, updateGameList } = useAppData();

  const [sortOrder, setSortOrder] = useState<'default' | 'a-z' | 'z-a'>('default');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showShareTray, setShowShareTray] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  // Holds a user fetched from the DB when not found in context
  const [fetchedViewUser, setFetchedViewUser] = useState<any>(null);
  const [loadingViewUser, setLoadingViewUser] = useState(false);

  // Always start at the top of the list
  useLayoutEffect(() => { window.scrollTo(0, 0); }, []);

  const EDIT_MODAL_KEY = `forge-edit-list-open-${listType}`;

  // Restore edit modal open state across page navigations / browser restores
  useEffect(() => {
    if (localStorage.getItem(EDIT_MODAL_KEY) === '1') {
      setIsEditModalOpen(true);
    }
  }, []);

  const openEditModal = () => {
    localStorage.setItem(EDIT_MODAL_KEY, '1');
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    localStorage.removeItem(EDIT_MODAL_KEY);
    setIsEditModalOpen(false);
  };

  const listKey = LIST_KEY_MAP[listType];

  // If viewing another user's list via userId param — try context first, then DB
  const contextViewUser = viewUserId ? users.find(u => u.id === viewUserId) : null;
  const viewUser = contextViewUser ?? fetchedViewUser;

  useEffect(() => {
    if (!viewUserId || contextViewUser) return;
    // Not in context — fetch from DB
    setLoadingViewUser(true);
    profilesAPI.getById(viewUserId)
      .then(u => { if (u) setFetchedViewUser(u); })
      .catch(() => {})
      .finally(() => setLoadingViewUser(false));
  }, [viewUserId, contextViewUser]);

  const isViewingOtherUser = !!viewUserId;
  // Show skeleton when we're waiting on another user's data
  const showSkeleton = isViewingOtherUser && !viewUser && loadingViewUser;

  const sourceUser = viewUser ?? (isViewingOtherUser ? null : currentUser);
  const gameLists = (sourceUser as any)?.game_lists ?? (sourceUser as any)?.gameLists ?? {};
  const games: Game[] = sourceUser ? (gameLists[listKey] ?? []) : [];

  const sortedGames = sortOrder === 'default'
    ? [...games]
    : [...games].sort((a, b) =>
        sortOrder === 'a-z'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
      );

  const cycleSortOrder = () => {
    setSortOrder(s => s === 'default' ? 'a-z' : s === 'a-z' ? 'z-a' : 'default');
  };
  const sortLabel = sortOrder === 'default' ? 'Default' : sortOrder === 'a-z' ? 'A-Z' : 'Z-A';

  const handleSaveGameList = (updatedGames: Game[]) => {
    updateGameList(listType, updatedGames);
  };

  // Other users who have games in this list type (only public lists)
  const usersWithList = users.filter(u => {
    if (u.id === currentUser?.id) return false;
    if (u.lists_public === false) return false;
    const ul = u.game_lists ?? u.gameLists ?? {};
    return (ul[listKey] ?? []).length > 0;
  });

  // Share helpers
  const getShareUrl = () => {
    const base = window.location.origin;
    const uid = viewUserId ?? currentUser?.id ?? '';
    return `${base}/list?type=${listType}&userId=${uid}`;
  };

  const handleShare = async () => {
    const url = getShareUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: `${title} — Forge`, url });
        return;
      } catch {}
    }
    setShowShareTray(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const title = LIST_LABELS[listType] ?? 'Games';

  if (isBrowseMode) {
    const ownGames: Game[] = games;
    const allEntries = [
      ...(ownGames.length > 0 && currentUser ? [{ user: currentUser, games: ownGames, isSelf: true }] : []),
      ...usersWithList.map(u => ({ user: u, games: (u.game_lists ?? (u as any).gameLists ?? {})[listKey] ?? [] as Game[], isSelf: false })),
    ];

    return (
      <div className="min-h-screen pb-20">
        <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border">
          <div className="w-full max-w-2xl lg:max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">{title} Lists</h1>
              <p className="text-sm text-muted-foreground">{allEntries.length} {allEntries.length === 1 ? 'list' : 'lists'}</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-2xl lg:max-w-3xl mx-auto px-4 py-4 space-y-4">
          {allEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No {title} lists yet</p>
            </div>
          ) : (
            allEntries.map(({ user: u, games: uGames, isSelf }) => (
              <div
                key={u.id}
                className={`bg-card rounded-xl p-4 cursor-pointer hover:bg-card/80 transition-colors ${isSelf ? 'border border-accent/30' : ''}`}
                onClick={() => navigate(isSelf ? `/list?type=${listType}` : `/list?type=${listType}&userId=${u.id}`)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <ProfileAvatar
                    username={(u as any).display_name || (u as any).displayName || u.handle || '?'}
                    profilePicture={(u as any).profile_picture || (u as any).profilePicture}
                    size="md"
                    userId={u.id}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{(u as any).display_name || (u as any).displayName || u.handle}</p>
                      {isSelf && <span className="text-xs text-accent font-medium">You</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{uGames.length} games</p>
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {uGames.slice(0, 6).map((game: Game) => {
                    const cover = (game as any).artwork?.find((a: any) => a.artwork_type === 'cover')?.url
                      ?? (game as any).artwork?.[0]?.url
                      ?? game.coverArt;
                    return cover ? (
                      <img
                        key={game.id}
                        src={cover}
                        alt={game.title}
                        className="w-12 h-16 object-cover rounded shrink-0"
                      />
                    ) : (
                      <div key={game.id} className="w-12 h-16 rounded shrink-0 bg-secondary flex items-center justify-center">
                        <span className="text-xs text-muted-foreground text-center px-1 leading-tight">{game.title.slice(0,10)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Game-card grid skeleton — shown while loading another user's list
  if (showSkeleton) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <Header />
        <div className="w-full max-w-2xl lg:max-w-5xl mx-auto px-4 lg:px-7 py-6 animate-pulse">
          {/* Header bar skeleton */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-muted/40 shrink-0" />
            <div className="space-y-1.5">
              <div className="h-5 bg-muted/50 rounded w-36" />
              <div className="h-3 bg-muted/30 rounded w-20" />
            </div>
          </div>
          {/* Game card grid — 2 cols mobile, 3 cols desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                {/* Cover — aspect-[3/4] portrait */}
                <div className="w-full aspect-[3/4] rounded-lg bg-muted/40" />
                {/* Title line */}
                <div className="h-3 bg-muted/40 rounded w-3/4" />
                {/* Subtitle line */}
                <div className="h-3 bg-muted/25 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-lg sticky top-0 z-10 border-b border-border">
        <div className="w-full max-w-2xl lg:max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold">{title}</h1>
                <p className="text-sm text-muted-foreground">
                  {viewUser ? `${viewUser.display_name || viewUser.handle}'s list · ` : ''}{games.length} games
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cycleSortOrder}
                className="px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
              >
                {sortLabel}
              </button>

              {/* Desktop: individual action buttons */}
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => {
                    const uid = viewUserId ?? currentUser?.id ?? '';
                    navigate(`/new-post?attachListType=${listType}&attachListUserId=${uid}`);
                  }}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                  title="Post about this list"
                >
                  <PenSquare className="w-5 h-5" />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                  title="Share list"
                >
                  <Upload className="w-5 h-5" />
                </button>
                {!viewUser && (
                  <button
                    onClick={openEditModal}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    title="Edit list"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Mobile: 3-dot overflow menu */}
              <div className="relative sm:hidden" ref={overflowRef}>
                <button
                  onClick={() => setShowOverflow(v => !v)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                  title="More actions"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {showOverflow && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowOverflow(false)} />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={() => {
                          setShowOverflow(false);
                          const uid = viewUserId ?? currentUser?.id ?? '';
                          navigate(`/new-post?attachListType=${listType}&attachListUserId=${uid}`);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary transition-colors text-left"
                      >
                        <PenSquare className="w-4 h-4 shrink-0" />
                        Post about this list
                      </button>
                      <button
                        onClick={() => { setShowOverflow(false); handleShare(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary transition-colors text-left"
                      >
                        <Upload className="w-4 h-4 shrink-0" />
                        Share list
                      </button>
                      {!viewUser && (
                        <button
                          onClick={() => { setShowOverflow(false); openEditModal(); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary transition-colors text-left"
                        >
                          <Edit2 className="w-4 h-4 shrink-0" />
                          Edit list
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Games Grid */}
      <div className="w-full max-w-2xl lg:max-w-5xl mx-auto px-4 lg:px-7 py-6">
        <div className="lg:flex lg:gap-6 lg:items-start">
          {/* Main — games grid */}
          <div className="lg:flex-1 lg:min-w-0">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
              {sortedGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  showHours={listType === 'recently-played'}
                  fullWidth
                />
              ))}
            </div>

            {games.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No games in this list yet</p>
                <button
                  onClick={openEditModal}
                  className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
                >
                  Add Games
                </button>
              </div>
            )}

            {/* Other users with this list — mobile only (below games) */}
            {usersWithList.length > 0 && (
              <div className="mt-10 lg:hidden">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">{title} Lists</h2>
                  {usersWithList.length > 3 && (
                    <button
                      onClick={() => navigate(`/list?type=${listType}&browse=true`)}
                      className="text-sm text-accent hover:underline"
                    >
                      See all ({usersWithList.length})
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {usersWithList.slice(0, 3).map(u => {
                const ul = u.game_lists ?? u.gameLists ?? {};
                const uGames: Game[] = ul[listKey] ?? [];
                return (
                  <div
                    key={u.id}
                    className="bg-card rounded-xl p-4 cursor-pointer hover:bg-card/80 transition-colors"
                    onClick={() => navigate(`/list?type=${listType}&userId=${u.id}`)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <ProfileAvatar
                        username={u.display_name || u.displayName || u.handle || '?'}
                        profilePicture={u.profile_picture || u.profilePicture}
                        size="sm"
                        userId={u.id}
                      />
                      <div>
                        <p className="font-semibold text-sm">{u.display_name || u.displayName || u.handle}</p>
                        <p className="text-xs text-muted-foreground">{uGames.length} games</p>
                      </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {uGames.slice(0, 6).map(game => {
                        const cover = (game as any).artwork?.find((a: any) => a.artwork_type === 'cover')?.url
                          ?? (game as any).artwork?.[0]?.url
                          ?? game.coverArt;
                        return cover ? (
                          <img
                            key={game.id}
                            src={cover}
                            alt={game.title}
                            className="w-10 h-14 object-cover rounded shrink-0"
                          />
                        ) : (
                          <div key={game.id} className="w-10 h-14 rounded shrink-0 bg-secondary flex items-center justify-center">
                            <span className="text-xs text-muted-foreground text-center px-1 leading-tight">{game.title.slice(0, 8)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
                </div>
              </div>
            )}
          </div>{/* end main col */}

          {/* RIGHT SIDEBAR — desktop only: Others with this list */}
          <div className="hidden lg:block lg:w-[280px] lg:shrink-0 lg:sticky lg:top-[72px] lg:self-start">
            <div className="bg-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">{title} Lists</h2>
                {usersWithList.length > 3 && (
                  <button
                    onClick={() => navigate(`/list?type=${listType}&browse=true`)}
                    className="text-xs text-accent hover:underline"
                  >
                    See all ({usersWithList.length})
                  </button>
                )}
              </div>
              {usersWithList.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No one else has a {title.toLowerCase()} list yet</p>
                </div>
              ) : (
              <div className="space-y-3">
                  {usersWithList.slice(0, 5).map(u => {
                    const ul = u.game_lists ?? u.gameLists ?? {};
                    const uGames: Game[] = ul[listKey] ?? [];
                    return (
                      <div
                        key={u.id}
                        className="cursor-pointer hover:bg-secondary rounded-xl p-3 -mx-2 transition-colors"
                        onClick={() => navigate(`/list?type=${listType}&userId=${u.id}`)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <ProfileAvatar
                            username={u.display_name || u.displayName || u.handle || '?'}
                            profilePicture={u.profile_picture || u.profilePicture}
                            size="sm"
                            userId={u.id}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{u.display_name || u.displayName || u.handle}</p>
                            <p className="text-xs text-muted-foreground">{uGames.length} games</p>
                          </div>
                        </div>
                        <div className="flex gap-1 overflow-x-auto">
                          {uGames.slice(0, 5).map(game => {
                            const cover = (game as any).artwork?.find((a: any) => a.artwork_type === 'cover')?.url
                              ?? (game as any).artwork?.[0]?.url
                              ?? game.coverArt;
                            return cover ? (
                              <img key={game.id} src={cover} alt={game.title} className="w-8 h-12 object-cover rounded shrink-0" />
                            ) : (
                              <div key={game.id} className="w-8 h-12 rounded shrink-0 bg-secondary flex items-center justify-center">
                                <span className="text-[9px] text-muted-foreground text-center px-0.5 leading-tight">{game.title.slice(0, 4)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>{/* end lg:flex */}
      </div>

      {/* Share Tray */}
      {showShareTray && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4">
          <div className="w-full sm:max-w-sm bg-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Share List</h3>
              <button onClick={() => setShowShareTray(false)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
              <span className="text-sm text-muted-foreground truncate flex-1">{getShareUrl()}</span>
            </div>
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-accent-foreground rounded-xl font-medium hover:bg-accent/90 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      {/* Edit Game Lists Modal */}
      <EditGameListsModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSave={handleSaveGameList}
        currentGames={games}
        listType={listType}
      />
    </div>
  );
}
