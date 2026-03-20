import { useState, useRef } from 'react';
import { X, Image as ImageIcon, Link as LinkIcon, Gamepad2, Search } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { ImageUpload } from './ImageUpload';
import { ProfileAvatar } from './ProfileAvatar';
import { gamesAPI } from '../utils/api';
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
  const [selectedGame, setSelectedGame] = useState<{ id: string; title: string } | null>(null);
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<User[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const gameSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!isOpen) return null;

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Check for @ mentions
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newContent.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      const filtered = users
        .filter(user =>
          user.handle.toLowerCase().includes(query) ||
          (user.display_name || user.displayName || '').toLowerCase().includes(query)
        )
        .slice(0, 5);
      setMentionSuggestions(filtered);
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionSuggestions([]);
    }
  };

  const handleMentionSelect = (user: User) => {
    const cursorPosition = content.length;
    const textBeforeCursor = content.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const startIndex = textBeforeCursor.lastIndexOf('@');
      const newContent = content.slice(0, startIndex) + user.handle + ' ' + content.slice(cursorPosition);
      setContent(newContent);
    }
    setShowMentions(false);
    setMentionSuggestions([]);
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
    setSelectedGame({ id: String(game.id ?? game.game_id ?? ''), title: game.title });
    setShowGamePicker(false);
    setGameQuery('');
    setGameResults([]);
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    const images = imageUrl ? [imageUrl] : undefined;
    const imageAlts = altText ? [altText] : undefined;
    createPost(content, images, linkUrl || undefined, imageAlts, undefined, selectedGame?.id, selectedGame?.title);
    setContent('');
    setImageUrl('');
    setAltText('');
    setLinkUrl('');
    setSelectedGame(null);
    setShowImageInput(false);
    setShowLinkInput(false);
    setShowGamePicker(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-card w-full max-w-2xl mx-auto rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-semibold">Create Post</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

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

        {/* Content */}
        <div className="p-4 relative">
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="What's on your mind? Use @username to mention other gamers"
            className="w-full min-h-[120px] bg-transparent resize-none outline-none text-base"
            autoFocus
          />

          {/* Mention suggestions */}
          {showMentions && mentionSuggestions.length > 0 && (
            <div className="absolute z-10 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto w-[calc(100%-2rem)] mt-1">
              {mentionSuggestions.map(user => (
                <button
                  key={user.id}
                  className="w-full p-3 flex items-center gap-3 hover:bg-secondary transition-colors text-left"
                  onClick={() => handleMentionSelect(user)}
                >
                  <ProfileAvatar
                    username={user.display_name || user.displayName || user.handle || '?'}
                    profilePicture={user.profile_picture || user.profilePicture}
                    userId={user.id}
                    size="sm"
                  />
                  <div>
                    <p className="font-medium text-sm">{user.display_name || user.displayName || user.handle}</p>
                    <p className="text-xs text-muted-foreground">{user.handle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

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
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-background px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-accent"
              />
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

          {/* Selected game tag */}
          {selectedGame && (
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Gamepad2 className="w-3.5 h-3.5" />
                {selectedGame.title}
              </span>
              <button
                onClick={() => setSelectedGame(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 border-t border-border sticky bottom-0 bg-card">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImageInput(!showImageInput)}
              className={`p-2 rounded-lg transition-colors ${showImageInput ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary'}`}
              title="Add image"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowLinkInput(!showLinkInput)}
              className={`p-2 rounded-lg transition-colors ${showLinkInput ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary'}`}
              title="Add link"
            >
              <LinkIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowGamePicker(!showGamePicker)}
              className={`p-2 rounded-lg transition-colors ${(showGamePicker || selectedGame) ? 'bg-primary/20 text-primary' : 'hover:bg-secondary'}`}
              title="Tag a game"
            >
              <Gamepad2 className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!content.trim()}
            className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}
