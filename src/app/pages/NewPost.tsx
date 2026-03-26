import { useState, useEffect, useRef } from 'react';
import { X, Image as ImageIcon, Link as LinkIcon, ArrowLeft, Gamepad2, Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { ImageUpload } from '../components/ImageUpload';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { gamesAPI } from '../utils/api';
import { gameSearchCache, buildHighlightedHtml, gameCoverCache } from '../utils/mentionHighlight';
import type { User } from '../data/data';

export function NewPost() {
  const navigate = useNavigate();
  const { createPost, currentUser, users } = useAppData();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<{ id: string; title: string } | null>(null);
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
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
    const newContent = e.target.value;
    setContent(newContent);

    const cursorPos = e.target.selectionStart ?? newContent.length;
    const before = newContent.slice(0, cursorPos);

    // @mention — allow spaces so game titles like "Elden Ring" work
    const mentionMatch = before.match(/@([\w ]*)$/);
    if (mentionMatch) {
      mentionStartRef.current = before.lastIndexOf('@');
      const query = mentionMatch[1].trim().toLowerCase();
      const filtered = users
        .filter(u => {
          const handle = (u.handle || '').replace(/^@/, '').toLowerCase();
          const name = (u.display_name || '').toLowerCase();
          return handle.includes(query) || name.includes(query);
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

    // #game tag — allow spaces so "elden ring" etc. work
    const hashMatch = before.match(/#([\w ]+)$/);
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
  };

  const handleAtGameSelect = (game: any) => {
    const startIdx = mentionStartRef.current;
    if (startIdx < 0) { setShowMentions(false); setAtGameResults([]); return; }
    const curPos = textareaRef.current?.selectionStart ?? content.length;
    // Insert bare title (no @) — game is identified by the selectedGame chip
    const newContent = content.slice(0, startIdx) + game.title + ' ' + content.slice(curPos);
    setContent(newContent);
    const gameId = String(game.id ?? game.game_id ?? '');
    setSelectedGame({ id: gameId, title: game.title });
    const cover = game.cover ?? game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? game.artwork?.[0]?.url ?? null;
    if (!gameCoverCache.has(gameId)) gameCoverCache.set(gameId, cover);
    mentionStartRef.current = -1;
    setShowMentions(false);
    setMentionSuggestions([]);
    setAtGameResults([]);
  };

  const handleHashGameSelect = (game: any) => {
    const startIdx = hashTriggerIndex.current;
    if (startIdx < 0) { setShowHashGames(false); return; }
    const afterHash = content.slice(startIdx + 1);
    const wordEnd = afterHash.search(/[^\w]/);
    const tokenEnd = wordEnd === -1 ? content.length : startIdx + 1 + wordEnd;
    const newContent = content.slice(0, startIdx) + content.slice(tokenEnd);
    setContent(newContent.trimStart());
    const gameId = String(game.id ?? game.game_id ?? '');
    setSelectedGame({ id: gameId, title: game.title });
    const cover = game.cover ?? game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? game.artwork?.[0]?.url ?? null;
    if (!gameCoverCache.has(gameId)) gameCoverCache.set(gameId, cover);
    hashTriggerIndex.current = -1;
    setShowHashGames(false);
    setHashGameResults([]);
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
    setSelectedGame({ id: String(game.id ?? game.game_id ?? ''), title: game.title });
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
      await createPost(content, images, linkUrl || undefined, undefined, undefined, selectedGame?.id, selectedGame?.title);
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
            disabled={!content.trim() || isPosting}
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
                ? buildHighlightedHtml(content, users, selectedGame)
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

        {/* @Mention + @Game suggestions */}
        {showMentions && (mentionSuggestions.length > 0 || atGameResults.length > 0) && (
          <div className="absolute left-4 right-4 z-20 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
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

        {/* #Game hash suggestions */}
        {showHashGames && hashGameResults.length > 0 && (
          <div className="absolute left-4 right-4 z-20 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
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
            className={`p-2 rounded-lg transition-colors ${(showGamePicker || selectedGame) ? 'bg-primary/20 text-primary' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
            title="Tag a game"
          >
            <Gamepad2 className="w-5 h-5" />
          </button>
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

        {/* Selected game tag */}
        {selectedGame && (() => {
          const cover = gameCoverCache.get(selectedGame.id) ?? null;
          return (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-secondary/60 max-w-[260px]">
                {cover ? (
                  <img src={cover} alt={selectedGame.title} className="w-8 h-10 rounded-md object-cover shrink-0" />
                ) : (
                  <Gamepad2 className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-none mb-0.5">Game</p>
                  <p className="text-sm font-semibold truncate leading-tight">{selectedGame.title}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGame(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Remove
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
