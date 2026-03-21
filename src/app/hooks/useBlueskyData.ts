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
    // Try: explicit bluesky_handle field, then old ID mapping, then handle for topic accounts
    const blueskyHandle = (user as any).bluesky_handle
      || getBlueskyHandleForUser(user.id)
      || ((user as any).account_type === 'topic' ? ((user.handle || '').replace(/^@/, '') || undefined) : undefined);

    if (!blueskyHandle) {
      return;
    }

    let mounted = true;
    setBlueskyData(prev => ({ ...prev, isLoading: true }));

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
