import { useState, useEffect } from 'react';
import { fetchBlueskyProfile, fetchBlueskyPosts, getBlueskyHandleForUser } from '../utils/bluesky';
import type { User } from '../data/mockData';

interface BlueskyData {
  avatar?: string;
  banner?: string;
  posts: any[];
  isLoading: boolean;
}

export function useBlueskyData(user: User): BlueskyData {
  const [blueskyData, setBlueskyData] = useState<BlueskyData>({
    avatar: undefined,
    banner: undefined,
    posts: [],
    isLoading: false
  });

  useEffect(() => {
    // Try: explicit bluesky_handle field, then map by user ID, then by handle slug, then by display_name slug
    const handleSlug = (user.handle || '').replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    const displayNameSlug = ((user as any).display_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const isTopic = (user as any).account_type === 'topic';
    const blueskyHandle = (user as any).bluesky_handle
      || getBlueskyHandleForUser(user.id)
      || (isTopic ? (getBlueskyHandleForUser(handleSlug) || getBlueskyHandleForUser(displayNameSlug)) : undefined);

    if (!blueskyHandle) {
      return;
    }

    let mounted = true;
    // Reset avatar/banner immediately so stale data from a previous user never bleeds through
    setBlueskyData({ avatar: undefined, banner: undefined, posts: [], isLoading: true });

    async function loadBlueskyData() {
      try {
        const [profile, posts] = await Promise.all([
          fetchBlueskyProfile(blueskyHandle!),
          fetchBlueskyPosts(blueskyHandle!, 5)
        ]);

        if (!mounted) return;

        setBlueskyData({
          avatar: profile?.avatar,
          banner: profile?.banner,
          posts: posts || [],
          isLoading: false
        });
      } catch (error) {
        console.error('Error loading Bluesky data:', error);
        if (mounted) {
          setBlueskyData(prev => ({ ...prev, isLoading: false }));
        }
      }
    }

    loadBlueskyData();

    return () => {
      mounted = false;
    };
  }, [user.id]);

  return blueskyData;
}
