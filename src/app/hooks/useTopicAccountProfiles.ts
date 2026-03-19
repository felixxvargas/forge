import { useState, useEffect } from 'react';
import { fetchBlueskyProfile, getBlueskyHandleForUser } from '../utils/bluesky';

interface TopicAccountProfile {
  userId: string;
  avatar?: string;
  banner?: string;
}

// Cache for topic account profiles
const profileCache = new Map<string, TopicAccountProfile>();

export function useTopicAccountProfiles(userIds: string[]): Map<string, TopicAccountProfile> {
  const [profiles, setProfiles] = useState<Map<string, TopicAccountProfile>>(new Map());

  useEffect(() => {
    async function loadProfiles() {
      const newProfiles = new Map<string, TopicAccountProfile>();

      for (const userId of userIds) {
        // Check cache first
        if (profileCache.has(userId)) {
          newProfiles.set(userId, profileCache.get(userId)!);
          continue;
        }

        // Get Bluesky handle for this user
        const blueskyHandle = getBlueskyHandleForUser(userId);
        if (!blueskyHandle) {
          continue;
        }

        // Fetch profile from Bluesky
        const profile = await fetchBlueskyProfile(blueskyHandle);
        if (profile) {
          const topicProfile: TopicAccountProfile = {
            userId,
            avatar: profile.avatar,
            banner: profile.banner
          };
          
          profileCache.set(userId, topicProfile);
          newProfiles.set(userId, topicProfile);
        }
      }

      setProfiles(newProfiles);
    }

    loadProfiles();
  }, [userIds.join(',')]);

  return profiles;
}
