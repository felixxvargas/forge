import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Image as ImageIcon, Link as LinkIcon, ArrowLeft, Gamepad2, Search, MessageCircle, Repeat2, Plus, BookMarked, MoreHorizontal, PenSquare, LayoutList, Users, BarChart2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { useNavigate, useSearchParams, useBlocker, useLocation } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { ImageUpload } from '../components/ImageUpload';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { gamesAPI } from '../utils/api';
import { gameSearchCache, buildHighlightedHtml, gameCoverCache } from '../utils/mentionHighlight';
import type { User } from '../data/data';

const POST_MAX_LENGTH = 600;
const AUTO_DRAFT_KEY = 'forge-post-draft';
const DRAFTS_KEY = 'forge-post-drafts';

interface DraftData {
  content: string;
  games: { id: string; title: string }[];
  imageUrls: string[];
  linkUrl: string;
}

interface SavedDraft extends DraftData {
  id: string;
  savedAt: string;
}

function parseAutoDraft(): DraftData {
  try {
    const raw = localStorage.getItem(AUTO_DRAFT_KEY);
    if (!raw) return { content: '', games: [], imageUrls: [], linkUrl: '' };
    // Handle legacy plain-text format
    if (!raw.startsWith('{')) return { content: raw, games: [], imageUrls: [], linkUrl: '' };
    const parsed = JSON.parse(raw);
    // Backward compat: old drafts stored imageUrl (string), new ones store imageUrls (array)
    const imageUrls: string[] = parsed.imageUrls ?? (parsed.imageUrl ? [parsed.imageUrl] : []);
    return {
      content: parsed.content ?? '',
      games: parsed.games ?? [],
      imageUrls,
      linkUrl: parsed.linkUrl ?? '',
    };
  } catch {
    return { content: '', games: [], imageUrls: [], linkUrl: '' };
  }
}

function getSavedDrafts(): SavedDraft[] {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function NewPost() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const replyTo = searchParams.get('replyTo') ?? undefined;
  const quotePostId = searchParams.get('quotePostId') ?? undefined;
  const attachListType = searchParams.get('attachListType') ?? undefined;
  const attachListUserId = searchParams.get('attachListUserId') ?? undefined;
  const { createPost, currentUser, users, groups: contextGroups = [], posts: contextPosts = [], getUserById } = useAppData() as any;

  // Context passed when navigating from a group or game detail page
  const locationState = location.state as { groupId?: string; groupName?: string; gameId?: string; gameTitle?: string } | null;
  const groupId = locationState?.groupId ?? undefined;
  const groupName = locationState?.groupName ?? undefined;
  const stateGameId = locationState?.gameId ?? undefined;
  const stateGameTitle = locationState?.gameTitle ?? undefined;

  const LIST_KEY_MAP: Record<string, string> = {
    'recently-played': 'recentlyPlayed', 'played-before': 'playedBefore',
    'favorite': 'favorites', 'wishlist': 'wishlist', 'library': 'library',
    'completed': 'completed', 'custom': 'custom', 'lfg': 'lfg',
  };
  const LIST_LABELS: Record<string, string> = {
    'recently-played': 'Recently Played', 'played-before': "I've Played Before",
    'favorite': 'Favorite Games', 'wishlist': 'Wishlist', 'library': 'Library',
    'completed': 'Completed Games', 'custom': 'Custom List', 'lfg': 'Looking for Group',
  };

  // Scroll to top when compose screen opens
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const autoDraft = useRef<DraftData>(parseAutoDraft());

  const [content, setContent] = useState(autoDraft.current.content);
  const [imageUrls, setImageUrls] = useState<string[]>(autoDraft.current.imageUrls);
  const [imageAlts, setImageAlts] = useState<string[]>([]);
  const [activeAltIndex, setActiveAltIndex] = useState<number | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [linkUrl, setLinkUrl] = useState(autoDraft.current.linkUrl);
  const [openPanel, setOpenPanel] = useState<'image' | 'link' | 'game' | 'group' | 'list' | 'poll' | null>(null);
  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState<any[]>([]);
  const [selectedGames, setSelectedGames] = useState<{ id: string; title: string }[]>(() => {
    if (autoDraft.current.games.length > 0) return autoDraft.current.games;
    if (stateGameId && stateGameTitle) return [{ id: stateGameId, title: stateGameTitle }];
    return [];
  });
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [disableComments, setDisableComments] = useState(() => localStorage.getItem('forge-default-comments-disabled') === 'true');
  const [disableReposts, setDisableReposts] = useState(() => localStorage.getItem('forge-default-reposts-disabled') === 'true');
  const [threadPosts, setThreadPosts] = useState<string[]>([]);
  const [viewportBottom, setViewportBottom] = useState(0);
  const [error, setError] = useState('');
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<User[]>([]);
  const [atGameResults, setAtGameResults] = useState<any[]>([]);
  const [atGroupResults, setAtGroupResults] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [hashGameResults, setHashGameResults] = useState<any[]>([]);
  const [showHashGames, setShowHashGames] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(
    groupId && groupName ? { id: groupId, name: groupName } : null
  );

  // Drafts panel
  const [showDrafts, setShowDrafts] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>(getSavedDrafts);
  // Cancel confirmation
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // Poll state
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollEndDate, setPollEndDate] = useState('');
  // List picker
  const [pickedListType, setPickedListType] = useState<string | undefined>(attachListType);
  const [pickedListUserId, setPickedListUserId] = useState<string | undefined>(attachListUserId);

  // Build attached list snapshot from state (set either via URL params or in-compose picker)
  const attachedListData = useCallback((): object | undefined => {
    const listType = pickedListType;
    const listUserId = pickedListUserId;
    if (!listType || !listUserId) return undefined;
    const listOwner = users ? users.find((u: any) => u.id === listUserId) ?? currentUser : currentUser;
    if (!listOwner) return undefined;
    const listKey = LIST_KEY_MAP[listType] ?? listType;
    const gameLists = (listOwner as any).game_lists ?? (listOwner as any).gameLists ?? {};
    const games: any[] = gameLists[listKey] ?? [];
    const covers = games.slice(0, 4).map((g: any) =>
      g.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? g.artwork?.[0]?.url ?? g.coverArt ?? null
    ).filter(Boolean);
    return {
      listType,
      userId: listUserId,
      title: LIST_LABELS[listType] ?? listType,
      gameCount: games.length,
      covers,
    };
  }, [pickedListType, pickedListUserId, users, currentUser]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
      setViewportBottom(Math.max(0, keyboardHeight));
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);

  // Auto-save to localStorage on every relevant change
  useEffect(() => {
    const draft: DraftData = { content, games: selectedGames, imageUrls, linkUrl };
    if (content.trim() || selectedGames.length > 0 || imageUrls.length > 0 || linkUrl) {
      localStorage.setItem(AUTO_DRAFT_KEY, JSON.stringify(draft));
    } else {
      localStorage.removeItem(AUTO_DRAFT_KEY);
    }
  }, [content, selectedGames, imageUrls, linkUrl]);

  // Flush draft immediately when the page is hidden or unloaded (tab switch, app backgrounded, etc.)
  // useEffect auto-save is async — this catches any state that hasn't flushed yet.
  useEffect(() => {
    const flush = () => {
      // Read current values via closure (stale ref for content is fine here since
      // we're just flushing whatever was last rendered to localStorage)
      const raw = localStorage.getItem(AUTO_DRAFT_KEY);
      // If nothing is stored yet but the textarea has content, save it now
      if (!raw) {
        const el = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Post content"]');
        if (el?.value.trim()) {
          localStorage.setItem(AUTO_DRAFT_KEY, JSON.stringify({ content: el.value, games: [], imageUrl: '', linkUrl: '' }));
        }
      }
    };
    const onHide = () => flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionStartRef = useRef<number>(-1);
  const hashTriggerIndex = useRef<number>(-1);
  const gameSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hashSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const atGameSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [content]);

  const isDirty = content.trim() !== '' || selectedGames.length > 0 || imageUrls.length > 0 || !!linkUrl;

  // Block navigation (browser back, link clicks) when there's unsaved content
  // Do NOT block when posting is in progress — handleSubmit navigates on success
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    isDirty && !isPosting && currentLocation.pathname !== nextLocation.pathname
  );

  // When blocker fires, show the confirm dialog
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowCancelConfirm(true);
    }
  }, [blocker.state]);

  // When the page is restored from bfcache, if the blocker is stuck show the confirm dialog
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted && blocker.state === 'blocked') {
        setShowCancelConfirm(true);
      }
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, [blocker.state]);

  const handleCancel = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      localStorage.removeItem(AUTO_DRAFT_KEY);
      navigate(-1);
    }
  };

  const handleDiscard = () => {
    localStorage.removeItem(AUTO_DRAFT_KEY);
    setShowCancelConfirm(false);
    if (blocker.state === 'blocked') {
      blocker.proceed();
    } else {
      navigate(-1);
    }
  };

  const handleSaveDraft = () => {
    if (isDirty) {
      const drafts = getSavedDrafts();
      const newDraft: SavedDraft = {
        id: Date.now().toString(),
        content,
        games: selectedGames,
        imageUrls,
        linkUrl,
        savedAt: new Date().toISOString(),
      };
      const updated = [newDraft, ...drafts].slice(0, 20);
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
      setSavedDrafts(updated);
    }
    localStorage.removeItem(AUTO_DRAFT_KEY);
    // Clear form state so isDirty becomes false — prevents the navigation blocker
    // from re-firing and showing the "Save your post?" dialog a second time,
    // which would create a duplicate draft entry.
    setContent('');
    setSelectedGames([]);
    setImageUrls([]);
    setLinkUrl('');
    setShowCancelConfirm(false);
    if (blocker.state === 'blocked') {
      blocker.proceed();
    } else {
      navigate(-1);
    }
  };

  const handleRestoreDraft = (draft: SavedDraft) => {
    setContent(draft.content);
    setSelectedGames(draft.games);
    setImageUrls((draft as any).imageUrls ?? ((draft as any).imageUrl ? [(draft as any).imageUrl] : []));
    setLinkUrl(draft.linkUrl);
    // Remove from saved drafts
    const updated = savedDrafts.filter(d => d.id !== draft.id);
    setSavedDrafts(updated);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
    setShowDrafts(false);
  };

  const handleDeleteDraft = (id: string) => {
    const updated = savedDrafts.filter(d => d.id !== id);
    setSavedDrafts(updated);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value.slice(0, POST_MAX_LENGTH);
    setContent(newContent);

    const cursorPos = e.target.selectionStart ?? newContent.length;
    const before = newContent.slice(0, cursorPos);

    // @mention — allow spaces and unicode (é, apostrophes, etc.)
    const mentionMatch = before.match(/@([\w\u00C0-\u024F\u1E00-\u1EFF ''\-]*)$/);
    if (mentionMatch) {
      mentionStartRef.current = before.lastIndexOf('@');
      const query = mentionMatch[1].trim().toLowerCase();
      const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const normQuery = norm(query);
      const queryWords = normQuery.split(/\s+/).filter(Boolean);
      const scoreText = (text: string) => {
        const t = norm(text);
        if (!queryWords.length) return 0;
        return queryWords.filter(w => t.includes(w)).length;
      };
      const filtered = users
        .filter(u => {
          const handle = norm((u.handle || '').replace(/^@/, ''));
          const name = norm(u.display_name || '');
          return scoreText(handle) > 0 || scoreText(name) > 0;
        })
        .sort((a, b) => {
          const sa = Math.max(scoreText((a.handle || '').replace(/^@/, '')), scoreText(a.display_name || ''));
          const sb = Math.max(scoreText((b.handle || '').replace(/^@/, '')), scoreText(b.display_name || ''));
          return sb - sa;
        })
        .slice(0, 4);
      setMentionSuggestions(filtered);

      // Also search groups
      if (query.length >= 1) {
        const normQuery2 = norm(query);
        const groupMatches = (contextGroups as any[])
          .filter((g: any) => norm(g.name || '').includes(normQuery2))
          .slice(0, 3);
        setAtGroupResults(groupMatches);
      } else {
        setAtGroupResults([]);
      }

      setShowMentions(true);
      setShowHashGames(false);
      // Also search games
      if (atGameSearchTimer.current) clearTimeout(atGameSearchTimer.current);
      if (query.length >= 1) {
        const cacheKey = query.toLowerCase();
        if (gameSearchCache.has(cacheKey)) {
          setAtGameResults(gameSearchCache.get(cacheKey)!);
        } else {
          atGameSearchTimer.current = setTimeout(async () => {
            try {
              const results = await gamesAPI.searchGames(query, 5);
              const list = Array.isArray(results) ? results : (results as any)?.games ?? [];
              gameSearchCache.set(cacheKey, list);
              setAtGameResults(list);
            } catch { setAtGameResults([]); }
          }, 150);
        }
      } else {
        setAtGameResults([]);
      }
      return;
    }

    // #game tag — allow spaces and unicode chars
    const hashMatch = before.match(/#([\w\u00C0-\u024F\u1E00-\u1EFF ''\-]+)$/);
    if (hashMatch) {
      hashTriggerIndex.current = before.lastIndexOf('#');
      const query = hashMatch[1].trim();
      setShowMentions(false);
      if (hashSearchTimer.current) clearTimeout(hashSearchTimer.current);
      if (query.length >= 1) {
        const cacheKey = query.toLowerCase();
        if (gameSearchCache.has(cacheKey)) {
          const list = gameSearchCache.get(cacheKey)!;
          setHashGameResults(list);
          setShowHashGames(list.length > 0);
        } else {
          hashSearchTimer.current = setTimeout(async () => {
            setIsSearchingGames(true);
            try {
              const results = await gamesAPI.searchGames(query, 5);
              const list = Array.isArray(results) ? results : (results as any)?.games ?? [];
              gameSearchCache.set(cacheKey, list);
              setHashGameResults(list);
              setShowHashGames(list.length > 0);
            } catch {
              setShowHashGames(false);
            } finally {
              setIsSearchingGames(false);
            }
          }, 150);
        }
      } else {
        setShowHashGames(false);
      }
      return;
    }

    setShowMentions(false);
    setShowHashGames(false);
    setAtGameResults([]);
    setAtGroupResults([]);
    mentionStartRef.current = -1;
  };

  const placeCursor = (pos: number) => {
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const handleMentionSelect = (user: User) => {
    const startIdx = mentionStartRef.current;
    if (startIdx < 0) { setShowMentions(false); return; }
    const handle = (user.handle || '').startsWith('@') ? user.handle : `@${user.handle}`;
    const curPos = textareaRef.current?.selectionStart ?? content.length;
    const newContent = content.slice(0, startIdx) + handle + ' ' + content.slice(curPos);
    setContent(newContent);
    mentionStartRef.current = -1;
    setShowMentions(false);
    setMentionSuggestions([]);
    setAtGameResults([]);
    setAtGroupResults([]);
    placeCursor(startIdx + handle.length + 1);
  };

  const handleAtGameSelect = (game: any) => {
    const startIdx = mentionStartRef.current;
    if (startIdx < 0) { setShowMentions(false); setAtGameResults([]); return; }
    const curPos = textareaRef.current?.selectionStart ?? content.length;
    const newContent = content.slice(0, startIdx) + game.title + ' ' + content.slice(curPos);
    setContent(newContent);
    const gameId = String(game.id ?? game.game_id ?? '');
    setSelectedGames(prev => prev.some(g => g.id === gameId) ? prev : [...prev, { id: gameId, title: game.title }]);
    const cover = game.cover ?? game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? game.artwork?.[0]?.url ?? null;
    if (!gameCoverCache.has(gameId)) gameCoverCache.set(gameId, cover);
    mentionStartRef.current = -1;
    setShowMentions(false);
    setMentionSuggestions([]);
    setAtGameResults([]);
    placeCursor(startIdx + game.title.length + 1);
  };

  const handleAtGroupSelect = (group: any) => {
    const startIdx = mentionStartRef.current;
    if (startIdx < 0) { setShowMentions(false); setAtGroupResults([]); return; }
    const curPos = textareaRef.current?.selectionStart ?? content.length;
    const newContent = content.slice(0, startIdx) + group.name + ' ' + content.slice(curPos);
    setContent(newContent);
    setSelectedGroup({ id: group.id, name: group.name });
    mentionStartRef.current = -1;
    setShowMentions(false);
    setMentionSuggestions([]);
    setAtGameResults([]);
    setAtGroupResults([]);
    placeCursor(startIdx + group.name.length + 1);
  };

  const handleHashGameSelect = (game: any) => {
    const startIdx = hashTriggerIndex.current;
    if (startIdx < 0) { setShowHashGames(false); return; }
    const curPos = textareaRef.current?.selectionStart ?? content.length;
    const newContent = content.slice(0, startIdx) + content.slice(curPos);
    setContent(newContent.trimStart());
    const gameId = String(game.id ?? game.game_id ?? '');
    setSelectedGames(prev => prev.some(g => g.id === gameId) ? prev : [...prev, { id: gameId, title: game.title }]);
    const cover = game.cover ?? game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? game.artwork?.[0]?.url ?? null;
    if (!gameCoverCache.has(gameId)) gameCoverCache.set(gameId, cover);
    hashTriggerIndex.current = -1;
    setShowHashGames(false);
    setHashGameResults([]);
    placeCursor(startIdx);
  };

  const handleGameSearch = (q: string) => {
    setGameQuery(q);
    if (gameSearchTimer.current) clearTimeout(gameSearchTimer.current);
    if (!q.trim()) { setGameResults([]); return; }
    gameSearchTimer.current = setTimeout(async () => {
      setIsSearchingGames(true);
      try {
        const results = await gamesAPI.searchGames(q, 8);
        setGameResults(Array.isArray(results) ? results : (results as any)?.games ?? []);
      } catch {
        setGameResults([]);
      } finally {
        setIsSearchingGames(false);
      }
    }, 400);
  };

  const handleSelectGame = (game: any) => {
    const gameId = String(game.id ?? game.game_id ?? '');
    setSelectedGames(prev => prev.some(g => g.id === gameId) ? prev : [...prev, { id: gameId, title: game.title }]);
    const cover = game.cover ?? game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? game.artwork?.[0]?.url ?? null;
    if (!gameCoverCache.has(gameId)) gameCoverCache.set(gameId, cover);
    setGameQuery('');
    setGameResults([]);
  };

  const handleSubmit = async () => {
    if (!content.trim() || isPosting) return;
    if (isImageUploading) {
      setError('Please wait for your image to finish uploading.');
      return;
    }
    setIsPosting(true);
    setError('');
    try {
      const images = imageUrls.length > 0 ? imageUrls : undefined;
      const imageAltsFinal = imageUrls.length > 0 ? imageAlts.map(a => a.trim()) : undefined;
      const gameIds = selectedGames.map(g => g.id);
      const gameTitles = selectedGames.map(g => g.title);
      const activeCommunityId = selectedGroup?.id ?? groupId;
      const filledOptions = pollOptions.filter(o => o.trim());
      const pollData = filledOptions.length >= 2 && pollEndDate
        ? { options: filledOptions, end_date: new Date(pollEndDate).toISOString(), votes: {} }
        : undefined;
      let lastPostId = await createPost(
        content, images, linkUrl || undefined, imageAltsFinal, activeCommunityId,
        gameIds[0], gameTitles[0], gameIds, gameTitles, undefined,
        disableComments, disableReposts, replyTo, quotePostId, attachedListData(), pollData,
      );
      // Chain thread continuation posts as replies to the previous post
      for (const threadContent of threadPosts.filter(p => p.trim())) {
        if (!lastPostId) break;
        lastPostId = await createPost(
          threadContent, undefined, undefined, undefined, undefined,
          undefined, undefined, undefined, undefined, undefined,
          undefined, undefined, lastPostId,
        );
      }
      localStorage.removeItem(AUTO_DRAFT_KEY);
      // After posting to a group, go back to the group page so the post appears immediately
      if (activeCommunityId) {
        navigate(`/group/${activeCommunityId}`, { replace: true });
      } else {
        navigate('/feed', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create post. Please try again.');
      setIsPosting(false);
    }
  };

  // Drafts panel overlay
  if (showDrafts) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border shrink-0">
          <div className="flex items-center gap-4 p-4">
            <button
              onClick={() => setShowDrafts(false)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h2 className="text-lg font-semibold">Saved Drafts</h2>
          </div>
        </div>
        {savedDrafts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <BookMarked className="w-10 h-10 opacity-30" />
            <p>No saved drafts</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {savedDrafts.map(draft => (
              <div key={draft.id} className="p-4 flex gap-3 items-start hover:bg-secondary/30 transition-colors">
                <button
                  className="flex-1 min-w-0 text-left"
                  onClick={() => handleRestoreDraft(draft)}
                >
                  <p className="text-sm line-clamp-3 text-foreground">
                    {draft.content || <span className="text-muted-foreground italic">(no text)</span>}
                  </p>
                  {draft.games.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Gamepad2 className="w-3 h-3 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground truncate">
                        {draft.games.map(g => g.title).join(', ')}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {new Date(draft.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </button>
                <button
                  onClick={() => handleDeleteDraft(draft.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  title="Delete draft"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="sm:fixed sm:inset-0 sm:z-50 sm:flex sm:items-end sm:justify-center md:items-center sm:bg-black/60">
    <div className="w-full min-h-screen bg-background flex flex-col sm:min-h-0 sm:h-[92vh] sm:max-w-2xl sm:rounded-t-2xl md:rounded-2xl sm:overflow-hidden sm:shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border shrink-0">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            disabled={isPosting}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Cancel</span>
          </button>
          <div className="flex items-center gap-2">
            {savedDrafts.length > 0 && (
              <button
                onClick={() => setShowDrafts(true)}
                className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Drafts"
              >
                <BookMarked className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent text-accent-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                  {savedDrafts.length}
                </span>
              </button>
            )}
            {isDirty && (
              <button
                onClick={handleSaveDraft}
                disabled={isPosting}
                className="px-3 py-2 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors disabled:opacity-50"
              >
                Save Draft
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || isPosting || content.length > POST_MAX_LENGTH}
              className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isPosting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>

      {/* Group context banner */}
      {selectedGroup && (
        <div className="flex items-center gap-2 mx-4 mt-4 px-3 py-2 bg-accent/10 border border-accent/25 rounded-lg text-sm text-accent">
          <Users className="w-4 h-4 shrink-0" />
          <span className="flex-1">Posting to <span className="font-semibold">{selectedGroup.name}</span></span>
          {!groupId && (
            <button type="button" onClick={() => setSelectedGroup(null)} className="shrink-0 hover:text-accent/60 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div id="post-error" role="alert" className="mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {/* User info */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <ProfileAvatar
          username={currentUser?.display_name || currentUser?.handle || '?'}
          profilePicture={currentUser?.profile_picture}
          size="md"
        />
        <div>
          <p className="font-medium">{currentUser?.display_name || currentUser?.handle}</p>
          <p className="text-sm text-muted-foreground">{currentUser?.handle}</p>
        </div>
      </div>

      {/* Content area */}
      <div className="p-4 relative flex-1">
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-0 text-base pointer-events-none select-none overflow-hidden text-foreground"
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word', padding: 0 }}
            dangerouslySetInnerHTML={{
              __html: content
                ? buildHighlightedHtml(content, users, selectedGames[0] ?? null, selectedGroup ? [selectedGroup] : [])
                : '<span style="color:var(--muted-foreground)">What\'s on your mind? @mention people or games, #game to tag</span>',
            }}
          />
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            className="relative w-full min-h-[200px] bg-transparent resize-none outline-none text-base p-0"
            style={{ color: 'transparent', caretColor: 'var(--foreground)' }}
            autoFocus
            aria-label="Post content"
            aria-multiline="true"
            aria-required="true"
            aria-describedby={error ? 'post-error' : undefined}
          />
        </div>

        {/* @Mention + @Game + @Group suggestions — fixed above the OSK */}
        {showMentions && (mentionSuggestions.length > 0 || atGameResults.length > 0 || atGroupResults.length > 0) && (
          <div
            className="fixed left-2 right-2 z-50 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto"
            style={{ bottom: viewportBottom + 4 }}
          >
            {mentionSuggestions.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-secondary/50">People</div>
                {mentionSuggestions.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleMentionSelect(user); }}
                    className="w-full p-3 flex items-center gap-3 hover:bg-secondary transition-colors text-left"
                  >
                    <ProfileAvatar
                      username={(user as any).display_name || user.handle || '?'}
                      profilePicture={(user as any).profile_picture}
                      userId={user.id}
                      size="sm"
                    />
                    <div>
                      <p className="font-medium text-sm">{(user as any).display_name || user.handle}</p>
                      <p className="text-xs text-muted-foreground">@{(user.handle || '').replace(/^@/, '')}</p>
                    </div>
                  </button>
                ))}
              </>
            )}
            {atGameResults.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-secondary/50">Games</div>
                {atGameResults.map((game: any, i) => (
                  <button
                    key={game.id ?? game.game_id ?? i}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleAtGameSelect(game); }}
                    className="w-full p-3 flex items-center gap-3 hover:bg-secondary transition-colors text-left"
                  >
                    {(game.cover || game.artwork?.[0]?.url) && (
                      <img src={game.cover ?? game.artwork[0].url} alt="" className="w-8 h-10 rounded object-cover shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{game.title}</p>
                      {game.year && <p className="text-xs text-muted-foreground">{game.year}</p>}
                    </div>
                  </button>
                ))}
              </>
            )}
            {atGroupResults.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-secondary/50">Groups</div>
                {atGroupResults.map((group: any) => (
                  <button
                    key={group.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleAtGroupSelect(group); }}
                    className="w-full p-3 flex items-center gap-3 hover:bg-secondary transition-colors text-left"
                  >
                    <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="font-medium text-sm">{group.name}</p>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* #Game hash suggestions — fixed above the OSK */}
        {showHashGames && hashGameResults.length > 0 && (
          <div
            className="fixed left-2 right-2 z-50 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto"
            style={{ bottom: viewportBottom + 4 }}
          >
            {hashGameResults.map((game: any, i) => (
              <button
                key={game.id ?? i}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleHashGameSelect(game); }}
                className="w-full p-3 flex items-center gap-3 hover:bg-secondary transition-colors text-left"
              >
                <Gamepad2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-sm">{game.title}</p>
                  {game.year && <p className="text-xs text-muted-foreground">{game.year}</p>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Quoted post preview */}
        {quotePostId && (() => {
          const qp = (contextPosts as any[]).find((p: any) => p.id === quotePostId);
          const qUser = qp ? (getUserById?.(qp.user_id ?? qp.userId) ?? {}) : null;
          return (
            <div className="mt-3 rounded-xl border border-border bg-secondary/30 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Repeat2 className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="text-xs text-accent font-medium">Quoting</span>
              </div>
              {qp ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold truncate">{(qUser as any)?.display_name || (qUser as any)?.handle || '—'}</span>
                    <span className="text-xs text-muted-foreground">@{((qUser as any)?.handle || '').replace(/^@/, '')}</span>
                  </div>
                  <p className="text-sm text-foreground/80 line-clamp-3 whitespace-pre-wrap">{qp.content}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Original post</p>
              )}
            </div>
          );
        })()}

        {/* Attached list preview */}
        {pickedListType && (() => {
          const listData = attachedListData() as any;
          if (!listData) return null;
          return (
            <div className="mt-3 rounded-xl border border-accent/30 bg-accent/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <PenSquare className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="text-xs text-accent font-medium">Attaching List</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setPickedListType(undefined); setPickedListUserId(undefined); }}
                  className="p-0.5 hover:text-foreground text-muted-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1 shrink-0">
                  {listData.covers.length > 0 ? listData.covers.slice(0, 4).map((c: string, i: number) => (
                    <img key={i} src={c} alt="" className="w-10 h-14 object-cover rounded" />
                  )) : (
                    <div className="w-10 h-14 rounded bg-secondary flex items-center justify-center">
                      <Gamepad2 className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{listData.title}</p>
                  <p className="text-xs text-muted-foreground">{listData.gameCount} games</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Toolbar */}
        {/* togglePanel: opens a panel if none is open, closes if same, ignores if different open */}
        {(() => {
          const togglePanel = (p: typeof openPanel) => {
            if (openPanel === p) setOpenPanel(null);
            else if (openPanel === null) setOpenPanel(p);
            // else: blocked — a different panel is open
          };
          const blocked = (p: typeof openPanel) => openPanel !== null && openPanel !== p;
          return (
            <div className="flex items-center gap-1 pt-3 border-t border-border mt-2" role="toolbar" aria-label="Post formatting options">
              <button
                type="button"
                onClick={() => togglePanel('image')}
                disabled={blocked('image')}
                className={`p-2 rounded-lg transition-colors ${openPanel === 'image' || imageUrls.length > 0 ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'} disabled:opacity-30`}
                aria-label="Add image"
                aria-pressed={openPanel === 'image'}
              >
                <ImageIcon className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => togglePanel('link')}
                disabled={blocked('link')}
                className={`p-2 rounded-lg transition-colors ${openPanel === 'link' || linkUrl ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'} disabled:opacity-30`}
                aria-label="Add link"
                aria-pressed={openPanel === 'link'}
              >
                <LinkIcon className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => togglePanel('game')}
                disabled={blocked('game')}
                className={`p-2 rounded-lg transition-colors ${(openPanel === 'game' || selectedGames.length > 0) ? 'bg-primary/20 text-primary' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'} disabled:opacity-30`}
                aria-label="Tag a game"
                aria-pressed={openPanel === 'game' || selectedGames.length > 0}
              >
                <Gamepad2 className="w-5 h-5" aria-hidden="true" />
              </button>
              {(contextGroups as any[]).length > 0 && (
                <button
                  type="button"
                  onClick={() => togglePanel('group')}
                  disabled={blocked('group')}
                  className={`p-2 rounded-lg transition-colors ${(openPanel === 'group' || selectedGroup) ? 'bg-accent/20 text-accent' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'} disabled:opacity-30`}
                  aria-label="Tag a group"
                  aria-pressed={openPanel === 'group' || !!selectedGroup}
                >
                  <Users className="w-5 h-5" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => togglePanel('list')}
                disabled={blocked('list')}
                className={`p-2 rounded-lg transition-colors ${(openPanel === 'list' || pickedListType) ? 'bg-accent/20 text-accent' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'} disabled:opacity-30`}
                aria-label="Attach a game list"
              >
                <LayoutList className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => togglePanel('poll')}
                disabled={blocked('poll')}
                className={`p-2 rounded-lg transition-colors ${openPanel === 'poll' ? 'bg-accent/20 text-accent' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'} disabled:opacity-30`}
                aria-label="Create a poll"
              >
                <BarChart2 className="w-5 h-5" aria-hidden="true" />
              </button>
          <span className={`text-xs tabular-nums ml-auto mr-2 ${content.length >= POST_MAX_LENGTH ? 'text-red-500' : content.length >= POST_MAX_LENGTH * 0.9 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
            {content.length}/{POST_MAX_LENGTH}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`p-2 rounded-lg transition-colors ${(disableComments || disableReposts) ? 'bg-destructive/15 text-destructive' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                title="More options"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={() => setDisableComments(v => !v)}
                className={disableComments ? 'text-destructive' : ''}
              >
                <MessageCircle className="w-4 h-4 mr-2 shrink-0" />
                <span>{disableComments ? 'Enable comments' : 'Disable comments'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDisableReposts(v => !v)}
                className={disableReposts ? 'text-destructive' : ''}
              >
                <Repeat2 className="w-4 h-4 mr-2 shrink-0" />
                <span>{disableReposts ? 'Enable reposts' : 'Disable reposts'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
            </div>
          );
        })()}

        {/* ── Attachment Trays — only one open at a time ── */}

        {/* Image tray */}
        {openPanel === 'image' && (
          <div className="mt-3 bg-secondary/30 rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
              <span className="text-sm font-semibold flex items-center gap-1.5"><ImageIcon className="w-4 h-4" /> Photo / Video</span>
              <button type="button" onClick={() => setOpenPanel(null)} className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3 space-y-3">
              {/* Already-uploaded images grid */}
              {imageUrls.length > 0 && (
                <div className={`grid gap-2 ${imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {imageUrls.map((url, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden aspect-video bg-muted/30">
                      <img src={url} alt={imageAlts[i] || ''} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setImageUrls(prev => prev.filter((_, j) => j !== i)); setImageAlts(prev => prev.filter((_, j) => j !== i)); if (activeAltIndex === i) setActiveAltIndex(null); }}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                        aria-label="Remove image"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAltIndex(activeAltIndex === i ? null : i)}
                        className={`absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${imageAlts[i]?.trim() ? 'bg-accent/80 text-accent-foreground' : 'bg-black/60 text-white hover:bg-black/80'}`}
                        aria-label={`${activeAltIndex === i ? 'Close' : 'Add'} alt text for image ${i + 1}`}
                      >
                        ALT
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* ALT text input for active image */}
              {activeAltIndex !== null && activeAltIndex < imageUrls.length && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground shrink-0">ALT {imageUrls.length > 1 ? `${activeAltIndex + 1}` : ''}</span>
                  <input
                    type="text"
                    value={imageAlts[activeAltIndex] ?? ''}
                    onChange={e => setImageAlts(prev => { const next = [...prev]; next[activeAltIndex] = e.target.value; return next; })}
                    onBlur={() => setActiveAltIndex(null)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setActiveAltIndex(null); }}
                    placeholder="Describe this image for screen readers…"
                    maxLength={500}
                    autoFocus
                    aria-label="Image alt text"
                    className="flex-1 bg-secondary/60 px-3 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-accent text-xs"
                  />
                </div>
              )}
              {/* Add image upload widget — up to 4 images */}
              {imageUrls.length < 4 && (
                <ImageUpload
                  key={uploadKey}
                  onUpload={(url) => {
                    setImageUrls(prev => [...prev, url]);
                    setActiveAltIndex(imageUrls.length); // open ALT for the new image
                    setUploadKey(k => k + 1);
                    setError('');
                  }}
                  onRemove={() => {}}
                  existingUrl=""
                  accept="image/*,video/*"
                  maxSizeMB={5}
                  bucketType="post"
                  onUploadingChange={setIsImageUploading}
                />
              )}
              {imageUrls.length >= 4 && (
                <p className="text-xs text-muted-foreground text-center py-1">Maximum 4 images per post</p>
              )}
            </div>
          </div>
        )}

        {/* Image attached chip (when tray closed but images exist) */}
        {imageUrls.length > 0 && openPanel !== 'image' && (
          <div className="mt-3 flex items-center gap-2 p-2 bg-secondary/40 rounded-lg">
            <div className="flex gap-1 shrink-0">
              {imageUrls.slice(0, 3).map((url, i) => (
                <img key={i} src={url} alt="" className="w-10 h-10 object-cover rounded" />
              ))}
              {imageUrls.length > 3 && (
                <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center text-xs text-muted-foreground">+{imageUrls.length - 3}</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{imageUrls.length} image{imageUrls.length > 1 ? 's' : ''} attached</p>
            </div>
            <button type="button" onClick={() => { setImageUrls([]); setImageAlts([]); setActiveAltIndex(null); }} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Link tray */}
        {openPanel === 'link' && (
          <div className="mt-3 bg-secondary/30 rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
              <span className="text-sm font-semibold flex items-center gap-1.5"><LinkIcon className="w-4 h-4" /> Add Link</span>
              <button type="button" onClick={() => setOpenPanel(null)} className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3 flex gap-2">
              <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && linkUrl.trim()) setOpenPanel(null); }}
                placeholder="https://example.com"
                className="flex-1 bg-background px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-accent text-sm" autoFocus />
              <button onClick={() => setOpenPanel(null)} disabled={!linkUrl.trim()}
                className="px-3 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-40">
                Add
              </button>
            </div>
          </div>
        )}

        {/* Game tray */}
        {openPanel === 'game' && (
          <div className="mt-3 bg-secondary/30 rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
              <span className="text-sm font-semibold flex items-center gap-1.5"><Gamepad2 className="w-4 h-4" /> Tag a Game</span>
              <button type="button" onClick={() => { setOpenPanel(null); setGameQuery(''); setGameResults([]); }} className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={gameQuery} onChange={(e) => handleGameSearch(e.target.value)}
                  placeholder="Search for a game…"
                  className="w-full pl-9 pr-3 py-2 bg-background rounded-lg outline-none focus:ring-2 focus:ring-accent text-sm" autoFocus />
              </div>
              {isSearchingGames && <p className="text-xs text-muted-foreground">Searching…</p>}
              {gameResults.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {gameResults.map((game: any, i) => (
                    <button key={game.id ?? i} onClick={() => { handleSelectGame(game); setOpenPanel(null); setGameQuery(''); setGameResults([]); }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-sm flex items-center gap-2">
                      <Gamepad2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span>{game.title}</span>
                      {game.year && <span className="text-muted-foreground text-xs ml-auto">{game.year}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Group tray */}
        {openPanel === 'group' && (
          <div className="mt-3 bg-secondary/30 rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
              <span className="text-sm font-semibold flex items-center gap-1.5"><Users className="w-4 h-4" /> Post to Group</span>
              <button type="button" onClick={() => setOpenPanel(null)} className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3 space-y-1 max-h-48 overflow-y-auto">
              {(contextGroups as any[]).map((group: any) => (
                <button key={group.id} onClick={() => { setSelectedGroup({ id: group.id, name: group.name }); setOpenPanel(null); }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm flex items-center gap-2 ${selectedGroup?.id === group.id ? 'bg-accent/20 text-accent' : 'hover:bg-secondary'}`}>
                  <Users className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span>{group.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* List tray */}
        {openPanel === 'list' && (
          <div className="mt-3 bg-secondary/30 rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
              <span className="text-sm font-semibold flex items-center gap-1.5"><LayoutList className="w-4 h-4" /> Attach Game List</span>
              <button type="button" onClick={() => setOpenPanel(null)} className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3 space-y-1 max-h-48 overflow-y-auto">
              {Object.entries(LIST_LABELS).map(([type, label]) => {
                const listKey = LIST_KEY_MAP[type] ?? type;
                const gameLists = (currentUser as any)?.game_lists ?? (currentUser as any)?.gameLists ?? {};
                const games: any[] = gameLists[listKey] ?? [];
                if (games.length === 0) return null;
                const covers = games.slice(0, 3).map((g: any) =>
                  g.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? g.artwork?.[0]?.url ?? g.coverArt ?? null
                ).filter(Boolean);
                return (
                  <button key={type} onClick={() => { setPickedListType(type); setPickedListUserId(currentUser?.id ?? ''); setOpenPanel(null); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${pickedListType === type ? 'bg-accent/15 border border-accent/30' : 'hover:bg-secondary'}`}>
                    <div className="flex gap-0.5 shrink-0">
                      {covers.length > 0 ? covers.map((c, i) => (
                        <img key={i} src={c} alt="" className="w-6 h-9 object-cover rounded" />
                      )) : (
                        <div className="w-6 h-9 rounded bg-secondary flex items-center justify-center"><Gamepad2 className="w-3 h-3 text-muted-foreground" /></div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{games.length} games</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Poll tray */}
        {openPanel === 'poll' && (
          <div className="mt-3 bg-secondary/30 rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
              <span className="text-sm font-semibold flex items-center gap-1.5"><BarChart2 className="w-4 h-4" /> Create Poll</span>
              <button type="button" onClick={() => { setOpenPanel(null); setPollOptions(['', '']); setPollEndDate(''); }} className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3 space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={opt} onChange={e => { const o = [...pollOptions]; o[i] = e.target.value; setPollOptions(o); }}
                    placeholder={`Option ${i + 1}${i < 2 ? ' (required)' : ''}`}
                    maxLength={80}
                    className="flex-1 bg-background px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-accent text-sm"
                    autoFocus={i === 0} />
                  {pollOptions.length > 2 && (
                    <button type="button" onClick={() => setPollOptions(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <button type="button" onClick={() => setPollOptions(prev => [...prev, ''])}
                  className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors">
                  <Plus className="w-4 h-4" /> Add option
                </button>
              )}
              <div className="pt-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Poll ends</label>
                <input type="datetime-local" value={pollEndDate} onChange={e => setPollEndDate(e.target.value)}
                  min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
                  className="w-full bg-background px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-accent text-sm" />
              </div>
              <button type="button"
                disabled={pollOptions.filter(o => o.trim()).length < 2 || !pollEndDate}
                onClick={() => setOpenPanel(null)}
                className="w-full py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-40">
                Set Poll
              </button>
            </div>
          </div>
        )}

        {/* Selected game tags */}
        {selectedGames.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedGames.map(g => {
              const cover = gameCoverCache.get(g.id) ?? null;
              return (
                <div key={g.id} className="flex items-center gap-2">
                  <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-secondary/60 max-w-[200px]">
                    {cover ? (
                      <img src={cover} alt={g.title} className="w-8 h-10 rounded-md object-cover shrink-0" />
                    ) : (
                      <Gamepad2 className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-none mb-0.5">Game</p>
                      <p className="text-sm font-semibold truncate leading-tight">{g.title}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedGames(prev => prev.filter(x => x.id !== g.id))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Thread continuation posts */}
      {threadPosts.map((threadContent, index) => (
        <div key={index} className="border-t border-border">
          <div className="flex gap-3 p-4">
            <div className="flex flex-col items-center gap-1">
              <ProfileAvatar
                username={currentUser?.display_name || currentUser?.handle || '?'}
                profilePicture={currentUser?.profile_picture}
                size="md"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">{currentUser?.display_name || currentUser?.handle}</p>
              <textarea
                value={threadContent}
                onChange={(e) => {
                  const val = e.target.value.slice(0, POST_MAX_LENGTH);
                  setThreadPosts(prev => prev.map((p, i) => i === index ? val : p));
                }}
                placeholder="Continue thread…"
                rows={3}
                className="w-full bg-transparent resize-none outline-none text-base"
                style={{ fontSize: '16px' }}
                autoFocus
              />
              <div className="flex items-center justify-between pt-1">
                <span className={`text-xs tabular-nums ${threadContent.length >= POST_MAX_LENGTH ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {threadContent.length}/{POST_MAX_LENGTH}
                </span>
                <button
                  onClick={() => setThreadPosts(prev => prev.filter((_, i) => i !== index))}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Add to thread button */}
      {!replyTo && (
        <div className="border-t border-border px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => setThreadPosts(prev => [...prev, ''])}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add to thread
          </button>
        </div>
      )}


      {/* Cancel confirmation dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Save your post?</h2>
            <p className="text-sm text-muted-foreground">Save this as a draft so you can come back to it later.</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSaveDraft}
                className="w-full px-4 py-2.5 bg-accent text-accent-foreground rounded-lg font-medium text-sm hover:bg-accent/90 transition-colors"
              >
                Save as Draft
              </button>
              <button
                onClick={handleDiscard}
                className="w-full px-4 py-2.5 bg-destructive/10 text-destructive rounded-lg text-sm hover:bg-destructive/20 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => {
                  setShowCancelConfirm(false);
                  if (blocker.state === 'blocked') blocker.reset();
                }}
                className="w-full px-4 py-2.5 bg-secondary rounded-lg text-sm hover:bg-secondary/80 transition-colors"
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
