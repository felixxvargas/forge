import { useState } from 'react';
import { X, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { ImageUpload } from './ImageUpload';
import { ProfileAvatar } from './ProfileAvatar';
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
  const [mentionSuggestions, setMentionSuggestions] = useState<User[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);

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
      setMentionQuery(query);
      
      // Filter users by handle or display name
      const filtered = users
        .filter(user => 
          user.handle.toLowerCase().includes(query) || 
          user.displayName.toLowerCase().includes(query)
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

  const handleSubmit = () => {
    if (!content.trim()) return;

    const images = imageUrl ? [imageUrl] : undefined;
    const imageAlts = altText ? [altText] : undefined;
    createPost(content, images, linkUrl || undefined, imageAlts);
    
    // Reset form
    setContent('');
    setImageUrl('');
    setAltText('');
    setLinkUrl('');
    setShowImageInput(false);
    setShowLinkInput(false);
    onClose();
  };

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
  };

  const handleImageRemove = () => {
    setImageUrl('');
    setAltText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-card w-full max-w-2xl mx-auto rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-semibold">Create Post</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <ProfileAvatar
            username={currentUser.displayName}
            profilePicture={currentUser.profilePicture}
            size="md"
          />
          <div>
            <p className="font-medium">{currentUser.displayName}</p>
            <p className="text-sm text-muted-foreground">{currentUser.handle}</p>
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
                    username={user.displayName}
                    profilePicture={user.profilePicture}
                    userId={user.id}
                    size="sm"
                  />
                  <div>
                    <p className="font-medium text-sm">{user.displayName}</p>
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
                onUpload={handleImageUpload} 
                onRemove={handleImageRemove}
                existingUrl={imageUrl}
                accept="image/*,video/*"
                maxSizeMB={50}
                bucketType="post"
              />
              
              {/* Alt text input - only show when image is uploaded */}
              {imageUrl && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Alt text (optional)
                  </label>
                  <input
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Describe this image for accessibility"
                    className="w-full bg-secondary px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-accent"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Help visually impaired users understand your image
                  </p>
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
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 border-t border-border sticky bottom-0 bg-card">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImageInput(!showImageInput)}
              className={`p-2 rounded-lg transition-colors ${
                showImageInput ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary'
              }`}
              title="Add image"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowLinkInput(!showLinkInput)}
              className={`p-2 rounded-lg transition-colors ${
                showLinkInput ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary'
              }`}
              title="Add link"
            >
              <LinkIcon className="w-5 h-5" />
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