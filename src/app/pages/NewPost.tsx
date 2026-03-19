import { useState } from 'react';
import { X, Image as ImageIcon, Link as LinkIcon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { ImageUpload } from '../components/ImageUpload';
import { ProfileAvatar } from '../components/ProfileAvatar';
import type { User } from '../data/data';

export function NewPost() {
  const navigate = useNavigate();
  const { createPost, currentUser, users } = useAppData();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<User[]>([]);
  const [showMentions, setShowMentions] = useState(false);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Check for @ mentions
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newContent.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      
      // Filter users by handle or display name
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
    // Replace the current @query with @handle
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

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
  };

  const handleImageRemove = () => {
    setImageUrl('');
  };

  const handleSubmit = async () => {
    if (!content.trim() || isPosting) return;

    setIsPosting(true);
    setError('');

    try {
      // Debug: Check if access token exists
      const token = localStorage.getItem('forge-access-token');
      console.log('[NewPost] Access token exists:', !!token);
      if (!token) {
        throw new Error('Not signed in. Please sign in to post.');
      }
      
      const images = imageUrl ? [imageUrl] : undefined;
      await createPost(content, images, linkUrl || undefined);
      
      // Navigate back to previous page (usually feed)
      navigate(-1);
    } catch (err: any) {
      console.error('Error creating post:', err);
      setError(err.message || 'Failed to create post. Please try again.');
      setIsPosting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleAddLink = () => {
    setShowLinkInput(!showLinkInput);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header with Cancel and Post buttons */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={handleCancel}
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

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
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
      <div className="p-4">
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="What's on your mind? Use @username to mention other gamers"
          className="w-full min-h-[200px] bg-transparent resize-none outline-none text-base"
          autoFocus
        />

        {/* Image upload */}
        {showImageUpload && (
          <div className="mt-3">
            <ImageUpload
              onUpload={handleImageUpload}
              onRemove={handleImageRemove}
              existingUrl={imageUrl}
            />
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

        {/* Mention suggestions */}
        {showMentions && mentionSuggestions.length > 0 && (
          <div className="absolute z-10 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto w-full max-w-md">
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
      </div>

      {/* Bottom toolbar */}
      <div className="fixed bottom-20 left-0 right-0 bg-card border-t border-border p-4 md:bottom-0">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <button
            onClick={() => setShowImageUpload(!showImageUpload)}
            className={`p-2 rounded-lg transition-colors ${
              showImageUpload ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary'
            }`}
            title="Add image"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button
            onClick={handleAddLink}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Add link"
          >
            <LinkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}