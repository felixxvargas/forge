import { useState, useEffect, useRef } from 'react';
import { X, Image as ImageIcon, Link as LinkIcon, Gamepad2, Search, Hash } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { ImageUpload } from './ImageUpload';
import { ProfileAvatar } from './ProfileAvatar';
import { gamesAPI } from '../utils/api';
import { gameSearchCache, buildHighlightedHtml, gameCoverCache } from '../utils/mentionHighlight';
import type { User } from '../data/data';

interface WritePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WritePostModal({ isOpen, onClose }: WritePostModalProps) {
  const { createPost, currentUser, users } = useAppData();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState<any[]>([]);
  const [selectedGames, setSelectedGames] = useState<{ id: string; title: string }[]>([]);
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  // @mention state
  const [mentionSuggestions, setMentionSuggestions] = useState<User[]>([]);
  const [atGameResults, setAtGameResults] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  // # game hash state
  const [hashGameResults, setHashGameResults] = useState<any[]>([]);
  const [showHashGames, setShowHashGames] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gameSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hashSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const atGameSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Store trigger start index to reliably replace text even after focus loss
  const mentionTriggerIndex = useRef<number>(-1);
  const hashTriggerIndex = useRef<number>(-1);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [content]);

  if (!isOpen) return null;

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    const cursorPos = e.target.selectionStart;
    const before = newContent.slice(0, cursorPos);

    // Check for @mention — allow spaces and unicode (é, apostrophes, etc.)
    const mentionMatch = before.match(/@([\w\u00C0-\u024F\u1E00-\u1EFF ''\-]*)$/);
    if (mentionMatch) {
      mentionTriggerIndex.current = before.lastIndexOf('@');
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
      // Also search games by name
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

    // Check for #game tag — allow spaces and unicode chars
    const hashMatch = before.match(/#([\w\u00C0-\u024F\u1E00-\u1EFF ''\-]+)$/);
    if (hashMatch) {
      hashTriggerIndex.current = before.lastIndexOf('#');
      const query = hashMatch[1].trim();
      setShowMentions(false);
      if (hashSearchTimer.current) clearTimeout(hashSearchTimer.current);
      if (query.length >= 1) {
        const cacheKey = query.toLowerCase();
        if (gameSearchCache.has(cacheKey)) {
          const cached = gameSearchCache.get(cacheKey)!;
          setHashGameResults(cached);
          setShowHashGames(cached.length > 0);
        } else {
          hashSearchTimer.current = setTimeout(async () => {
            setIsSearchingGames(true);
            try {
              const results = await gamesAPI.searchGames(query, 5);
              const list = Array.isArray(results) ? results : results?.games ?? [];
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
    setMentionSuggestions([]);
    setAtGameResults([]);
  };

  const handleMentionSelect = (user: User) => {
    const startIdx = mentionTriggerIndex.current;
    if (startIdx < 0) { setShowMentions(false); return; }
    const handle = (user.handle || '').startsWith('@') ? user.handle : `@${user.handle}`;
    const curPos = textareaRef.current?.selectionStart ?? content.length;
    const newContent = content.slice(0, startIdx) + handle + ' ' + content.slice(curPos);
    setContent(newContent);
    mentionTriggerIndex.current = -1;
    setShowMentions(false);
    setMentionSuggestions([]);
    setAtGameResults([]);
  };

  const handleAtGameSelect = (game: any) => {
    const startIdx = mentionTriggerIndex.current;
    if (startIdx < 0) { setShowMentions(false); setAtGameResults([]); return; }
    const curPos = textareaRef.current?.selectionStart ?? content.length;
    // Insert bare title (no @) — game is identified by the selected game chip
    const newContent = content.slice(0, startIdx) + game.title + ' ' + content.slice(curPos);
    setContent(newContent);
    const gameId = String(game.id ?? game.game_id ?? '');
    setSelectedGames(prev => prev.some(g => g.id === gameId) ? prev : [...prev, { id: gameId, title: game.title }]);
    // Populate cover cache from search result
    const cover = game.cover ?? game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? game.artwork?.[0]?.url ?? null;
    if (!gameCoverCache.has(gameId)) gameCoverCache.set(gameId, cover);
    mentionTriggerIndex.current = -1;
    setShowMentions(false);
    setMentionSuggestions([]);
    setAtGameResults([]);
  };

  const handleHashGameSelect = (game: any) => {
    const startIdx = hashTriggerIndex.current;
    if (startIdx < 0) { setShowHashGames(false); return; }
    // Remove from # to current cursor position, then show game as chip
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
  };

  const handleGameSearch = (q: string) => {
    setGameQuery(q);
    if (gameSearchTimer.current) clearTimeout(gameSearchTimer.current);
    if (!q.trim()) { setGameResults([]); return; }
    gameSearchTimer.current = setTimeout(async () => {
      setIsSearchingGames(true);
      try {
        const results = await gamesAPI.searchGames(q, 8);
        setGameResults(Array.isArray(results) ? results : results?.games ?? []);
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

  const handleSubmit = () => {
    if (!content.trim()) return;
    const images = imageUrl ? [imageUrl] : undefined;
    const imageAlts = altText ? [altText] : undefined;
    const gameIds = selectedGames.map(g => g.id);
    const gameTitles = selectedGames.map(g => g.title);
    createPost(content, images, linkUrl || undefined, imageAlts, undefined, gameIds[0], gameTitles[0], gameIds, gameTitles);
    setContent('');
    setImageUrl('');
    setAltText('');
    setLinkUrl('');
    setSelectedGames([]);
    setShowImageInput(false);
    setShowLinkInput(false);
    setShowGamePicker(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-card w-full max-w-2xl mx-auto rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold">Create Post</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {/* User info */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
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

          {/* Content */}
          <div className="p-4 relative">
            {/* Mirror + textarea stacked — mirror shows highlights, textarea handles input */}
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
                className="relative w-full min-h-[120px] bg-transparent resize-none outline-none text-base p-0"
                style={{ color: 'transparent', caretColor: 'var(--foreground)' }}
                autoFocus
              />
            </div>

          {/* @Mention + @Game suggestions */}
          {showMentions && (mentionSuggestions.length > 0 || atGameResults.length > 0) && (
            <div className="absolute z-10 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto w-[calc(100%-2rem)] mt-1">
              {mentionSuggestions.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-secondary/50">People</div>
                  {mentionSuggestions.map(user => (
                    <button
                      key={user.id}
                      className="w-full p-3 flex items-center gap-3 hover:bg-secondary transition-colors text-left"
                      onMouseDown={(e) => { e.preventDefault(); handleMentionSelect(user); }}
                    >
                      <ProfileAvatar
                        username={user.display_name || (user as any).displayName || user.handle || '?'}
                        profilePicture={user.profile_picture || (user as any).profilePicture}
                        userId={user.id}
                        size="sm"
                      />
                      <div>
                        <p className="font-medium text-sm">{user.display_name || (user as any).displayName || user.handle}</p>
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
                      className="w-full p-3 flex items-center gap-3 hover:bg-secondary transition-colors text-left"
                      onMouseDown={(e) => { e.preventDefault(); handleAtGameSelect(game); }}
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

          {/* # Game hash suggestions */}
          {showHashGames && hashGameResults.length > 0 && (
            <div className="absolute z-10 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto w-[calc(100%-2rem)] mt-1">
              {hashGameResults.map((game: any, i) => (
                <button
                  key={game.id ?? game.game_id ?? i}
                  className="w-full p-3 flex items-center gap-3 hover:bg-secondary transition-colors text-left"
                  onMouseDown={(e) => { e.preventDefault(); handleHashGameSelect(game); }}
                >
                  {game.cover && (
                    <img src={game.cover} alt="" className="w-8 h-10 rounded object-cover shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{game.title}</p>
                    {game.year && <p className="text-xs text-muted-foreground">{game.year}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Toolbar — always visible directly under the textarea */}
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-border">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowImageInput(!showImageInput)}
                className={`p-2 rounded-lg transition-colors ${showImageInput ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
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
            </div>
            <button
              onClick={handleSubmit}
              disabled={!content.trim()}
              className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Post
            </button>
          </div>

          {/* Image input */}
          {showImageInput && (
            <div className="mt-3 space-y-3">
              <ImageUpload
                onUpload={(url) => setImageUrl(url)}
                onRemove={() => { setImageUrl(''); setAltText(''); }}
                existingUrl={imageUrl}
                accept="image/*,video/*"
                maxSizeMB={50}
                bucketType="post"
              />
              {imageUrl && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Alt text (optional)</label>
                  <input
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Describe this image for accessibility"
                    className="w-full bg-secondary px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              )}
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

          {/* Gamepad picker */}
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
                      key={game.id ?? game.game_id ?? i}
                      onClick={() => handleSelectGame(game)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-sm flex items-center gap-2"
                    >
                      {game.cover && (
                        <img src={game.cover} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                      )}
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
                      className="text-xs text-muted-foreground hover:text-foreground"
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
      </div>
    </div>
  );
}
