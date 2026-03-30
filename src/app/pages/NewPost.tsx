import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Image as ImageIcon, Link as LinkIcon, ArrowLeft, Gamepad2, Search, MessageCircle, Repeat2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { ImageUpload } from '../components/ImageUpload';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { gamesAPI } from '../utils/api';
import { gameSearchCache, buildHighlightedHtml, gameCoverCache } from '../utils/mentionHighlight';
import type { User } from '../data/data';

const POST_MAX_LENGTH = 600;

export function NewPost() {
  const navigate = useNavigate();
  const { createPost, currentUser, users } = useAppData();
  const [content, setContent] = useState(() => sessionStorage.getItem('forge-post-draft') ?? '');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState<any[]>([]);
  const [selectedGames, setSelectedGames] = useState<{ id: string; title: string }[]>([]);
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [disableComments, setDisableComments] = useState(() => localStorage.getItem('forge-default-comments-disabled') === 'true');
  const [disableReposts, setDisableReposts] = useState(() => localStorage.getItem('forge-default-reposts-disabled') === 'true');
  // Track visual viewport to position mention dropdown above the OSK on mobile
  const [viewportBottom, setViewportBottom] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // Distance from the bottom of the visual viewport to the bottom of the layout viewport
      const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
      setViewportBottom(Math.max(0, keyboardHeight));
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);
  const [error, setError] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<User[]>([]);
  const [atGameResults, setAtGameResults] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [hashGameResults, setHashGameResults] = useState<any[]>([]);
  const [showHashGames, setShowHashGames] = useState(false);

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

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value.slice(0, POST_MAX_LENGTH);
    setContent(newContent);
    if (newContent) {
      sessionStorage.setItem('forge-post-draft', newContent);
    } else {
      sessionStorage.removeItem('forge-post-draft');
    }

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
    setShowGamePicker(false);
    setGameQuery('');
    setGameResults([]);
  };

  const handleSubmit = async () => {
    if (!content.trim() || isPosting) return;
    setIsPosting(true);
    setError('');
    try {
      const images = imageUrl ? [imageUrl] : undefined;
      const gameIds = selectedGames.map(g => g.id);
      const gameTitles = selectedGames.map(g => g.title);
      await createPost(content, images, linkUrl || undefined, undefined, undefined, gameIds[0], gameTitles[0], gameIds, gameTitles, undefined, disableComments, disableReposts);
      sessionStorage.removeItem('forge-post-draft');
      navigate(-1);
    } catch (err: any) {
      setError(err.message || 'Failed to create post. Please try again.');
      setIsPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border shrink-0">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            disabled={isPosting}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Cancel</span>
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isPosting || content.length > POST_MAX_LENGTH}
            className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isPosting ? 'Posting...' : 'Post'}
          </button>
        </div>

      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
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
                ? buildHighlightedHtml(content, users, selectedGames[0] ?? null)
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
          />
        </div>

        {/* @Mention + @Game suggestions — fixed above the OSK */}
        {showMentions && (mentionSuggestions.length > 0 || atGameResults.length > 0) && (
          <div
            className="fixed left-2 right-2 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto"
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
                      username={user.display_name || user.handle || '?'}
                      profilePicture={user.profile_picture}
                      userId={user.id}
                      size="sm"
                    />
                    <div>
                      <p className="font-medium text-sm">{user.display_name || user.handle}</p>
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
          </div>
        )}

        {/* #Game hash suggestions — fixed above the OSK */}
        {showHashGames && hashGameResults.length > 0 && (
          <div
            className="fixed left-2 right-2 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto"
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

        {/* Toolbar */}
        <div className="flex items-center gap-1 pt-3 border-t border-border mt-2">
          <button
            onClick={() => setShowImageUpload(!showImageUpload)}
            className={`p-2 rounded-lg transition-colors ${showImageUpload ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
            title="Add image"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowLinkInput(!showLinkInput)}
            className={`p-2 rounded-lg transition-colors ${showLinkInput ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
            title="Add link"
          >
            <LinkIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowGamePicker(!showGamePicker)}
            className={`p-2 rounded-lg transition-colors ${(showGamePicker || selectedGames.length > 0) ? 'bg-primary/20 text-primary' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
            title="Tag a game"
          >
            <Gamepad2 className="w-5 h-5" />
          </button>
          <span className={`text-xs tabular-nums ml-auto mr-2 ${content.length >= POST_MAX_LENGTH ? 'text-red-500' : content.length >= POST_MAX_LENGTH * 0.9 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
            {content.length}/{POST_MAX_LENGTH}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDisableComments(v => !v)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors ${disableComments ? 'bg-destructive/15 text-destructive' : 'text-muted-foreground hover:bg-secondary'}`}
              title={disableComments ? 'Comments off' : 'Comments on'}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{disableComments ? 'Off' : 'On'}</span>
            </button>
            <button
              onClick={() => setDisableReposts(v => !v)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors ${disableReposts ? 'bg-destructive/15 text-destructive' : 'text-muted-foreground hover:bg-secondary'}`}
              title={disableReposts ? 'Reposts off' : 'Reposts on'}
            >
              <Repeat2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{disableReposts ? 'Off' : 'On'}</span>
            </button>
          </div>
        </div>

        {/* Image upload */}
        {showImageUpload && (
          <div className="mt-3">
            <ImageUpload
              onUpload={(url) => setImageUrl(url)}
              onRemove={() => setImageUrl('')}
              existingUrl={imageUrl}
              accept="image/*,video/*"
              maxSizeMB={50}
              bucketType="post"
            />
          </div>
        )}

        {/* Link input */}
        {showLinkInput && (
          <div className="mt-3 p-3 bg-secondary/50 rounded-lg">
            <label className="text-sm font-medium mb-2 block">Link URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') setShowLinkInput(false); }}
                placeholder="https://example.com"
                className="flex-1 bg-background px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-accent text-sm"
                autoFocus
              />
              <button
                onClick={() => setShowLinkInput(false)}
                disabled={!linkUrl.trim()}
                className="px-3 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Game picker */}
        {showGamePicker && (
          <div className="mt-3 p-3 bg-secondary/50 rounded-lg">
            <label className="text-sm font-medium mb-2 block">Tag a game</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={gameQuery}
                onChange={(e) => handleGameSearch(e.target.value)}
                placeholder="Search for a game..."
                className="w-full pl-9 pr-3 py-2 bg-background rounded-lg outline-none focus:ring-2 focus:ring-accent text-sm"
                autoFocus
              />
            </div>
            {isSearchingGames && (
              <p className="text-xs text-muted-foreground mt-2">Searching...</p>
            )}
            {gameResults.length > 0 && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {gameResults.map((game: any, i) => (
                  <button
                    key={game.id ?? i}
                    onClick={() => handleSelectGame(game)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-sm flex items-center gap-2"
                  >
                    <Gamepad2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{game.title}</span>
                    {game.year && <span className="text-muted-foreground text-xs ml-auto">{game.year}</span>}
                  </button>
                ))}
              </div>
            )}
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
    </div>
  );
}
