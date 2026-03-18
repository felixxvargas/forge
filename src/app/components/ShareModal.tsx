import { X, Link as LinkIcon, Check, Facebook, Twitter, MessageCircle, Mail } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Post, User } from '../data/data';

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
      return `${baseUrl}/profile/${user.id}`;
    }
    return baseUrl;
  };

  // Generate title and description
  const getShareTitle = () => {
    if (post) {
      return 'Check out this post on Forge';
    } else if (user) {
      return `${user.displayName} on Forge`;
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
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="font-medium text-sm mb-1">{title}</p>
              {description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
              )}
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
                <div className="flex-1 text-left">
                  <p className="font-medium">{copied ? 'Link copied!' : 'Copy link'}</p>
                  <p className="text-xs text-muted-foreground truncate">{url}</p>
                </div>
              </button>

              {/* Social Media Shares */}
              <div className="flex gap-2">
                <button
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')}
                  className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center"
                >
                  <Facebook className="w-5 h-5 text-accent" />
                </button>
                <button
                  onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank')}
                  className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center"
                >
                  <Twitter className="w-5 h-5 text-accent" />
                </button>
                <button
                  onClick={() => window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, '_blank')}
                  className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center"
                >
                  <MessageCircle className="w-5 h-5 text-accent" />
                </button>
                <button
                  onClick={() => window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(description + '\n\n' + url)}`, '_blank')}
                  className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center"
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