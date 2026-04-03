import { X, Link as LinkIcon, Check, Mail, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Post, User } from '../data/data';
import MastodonIcon from '../../assets/icons/mastodon.svg?react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: Post;
  user?: User;
}

export function ShareModal({ isOpen, onClose, post, user }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  // Generate shareable URL based on what's being shared
  const getShareUrl = () => {
    const baseUrl = window.location.origin;
    if (post) {
      return `${baseUrl}/post/${post.id}`;
    } else if (user) {
      const handle = ((user.handle as string) || '').replace(/^@/, '');
      return handle ? `${baseUrl}/${handle}` : `${baseUrl}/profile/${user.id}`;
    }
    return baseUrl;
  };

  // Generate title and description
  const getShareTitle = () => {
    if (post) {
      return 'Check out this post on Forge';
    } else if (user) {
      return `${user.display_name || user.displayName || user.handle} on Forge`;
    }
    return 'Forge - Gaming Social Platform';
  };

  const getShareDescription = () => {
    if (post) {
      return post.content.slice(0, 100) + (post.content.length > 100 ? '...' : '');
    } else if (user) {
      return user.bio;
    }
    return 'Connect with gamers across platforms';
  };

  const url = getShareUrl();
  const title = getShareTitle();
  const description = getShareDescription();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
        onClose();
      } catch (err) {
        // User cancelled or error occurred
        console.error('Share failed:', err);
      }
    } else {
      // Fallback to copy
      handleCopyLink();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pb-20 sm:pb-0">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="relative w-full max-w-md mx-4 bg-card rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Share</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Preview */}
            <div className="p-3 bg-secondary/50 rounded-lg flex items-center gap-3">
              {user && (
                user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.displayName || user.handle}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
                    <UserIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                )
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{title}</p>
                {description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{description}</p>
                )}
              </div>
            </div>

            {/* Share options */}
            <div className="space-y-2">
              {/* Native Share (if supported) */}
              {navigator.share && (
                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center gap-3 p-3 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                    <LinkIcon className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">Share via...</p>
                    <p className="text-xs text-muted-foreground">Open share menu</p>
                  </div>
                </button>
              )}

              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                disabled={copied}
                className="w-full flex items-center gap-3 p-3 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                  {copied ? (
                    <Check className="w-5 h-5 text-accent" />
                  ) : (
                    <LinkIcon className="w-5 h-5 text-accent" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0 overflow-hidden">
                  <p className="font-medium">{copied ? 'Link copied!' : 'Copy link'}</p>
                  <p className="text-xs text-muted-foreground truncate">{url}</p>
                </div>
              </button>

              {/* Social Media Shares */}
              <div className="flex gap-2">
                {/* Bluesky */}
                <button
                  onClick={() => window.open(`https://bsky.app/intent/compose?text=${encodeURIComponent(title + '\n' + url)}`, '_blank')}
                  className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center"
                  title="Share on Bluesky"
                >
                  <svg width="20" height="20" viewBox="0 0 568 501" fill="currentColor" className="text-accent">
                    <path d="M123.121 33.664C188.241 82.553 258.281 181.68 284 234.873c25.719-53.192 95.759-152.32 160.879-201.21C491.866-1.611 568-28.906 568 57.947c0 17.346-9.945 145.713-15.778 166.555-20.275 72.453-94.155 90.933-159.875 79.748C507.222 323.8 536.444 388.56 473.922 453.32c-119.011 122.22-171.175-30.644-184.995-69.806-2.01-5.559-2.912-8.324-2.927-6.49-.015-1.834-.917.931-2.927 6.49-13.82 39.162-65.984 192.026-184.995 69.806-62.522-64.76-33.3-129.52 81.75-149.07-65.72 11.185-139.6-7.295-159.875-79.748C9.945 203.66 0 75.293 0 57.947 0-28.906 76.134-1.611 123.121 33.664Z"/>
                  </svg>
                </button>
                {/* Mastodon */}
                <button
                  onClick={() => window.open(`https://mastodon.social/share?text=${encodeURIComponent(title + '\n' + url)}`, '_blank')}
                  className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center"
                  title="Share on Mastodon"
                >
                  <MastodonIcon className="w-5 h-5 text-accent" />
                </button>
                {/* Email */}
                <button
                  onClick={() => window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(description + '\n\n' + url)}`, '_blank')}
                  className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center"
                  title="Share via Email"
                >
                  <Mail className="w-5 h-5 text-accent" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}