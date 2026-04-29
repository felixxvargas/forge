import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

// ============================================================
// AUTH
// ============================================================
export const auth = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },

  async signIn(email: string, password: string, captchaToken?: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback: (session: any) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => callback(session));
  }
};

// ============================================================
// PROFILES
// ============================================================
export const profiles = {
  async getAll(limit = 100) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .not('handle', 'is', null)
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data; // null when no row exists
  },

  async getPublicKey(userId: string): Promise<string | null> {
    const { data } = await supabase
      .from('profiles')
      .select('public_key')
      .eq('id', userId)
      .maybeSingle();
    return data?.public_key ?? null;
  },

  async getByHandle(handle: string) {
    const stripped = handle.replace(/^@/, '');
    // Try both with and without @ prefix, case-insensitive
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`handle.ilike.${stripped},handle.ilike.@${stripped}`)
      .limit(1)
      .maybeSingle();
    return data ?? null;
  },

  async update(id: string, updates: Record<string, any>) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async search(query: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`handle.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async isFollowing(followerId: string, followingId: string) {
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();
    return !!data;
  },

  async follow(followerId: string, followingId: string) {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId });
    if (error && error.code !== '23505') throw new Error(error.message);
    // Sync stored counters to match actual follows table rows (same query as getFollowerCount/getFollowingCount)
    Promise.allSettled([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', followingId)
        .then(({ count }) => supabase.from('profiles').update({ follower_count: count ?? 0 }).eq('id', followingId)),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', followerId)
        .then(({ count }) => supabase.from('profiles').update({ following_count: count ?? 0 }).eq('id', followerId)),
    ]).catch(() => {});
  },

  async unfollow(followerId: string, followingId: string) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    if (error) throw new Error(error.message);
    // Sync stored counters to match actual follows table rows
    Promise.allSettled([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', followingId)
        .then(({ count }) => supabase.from('profiles').update({ follower_count: count ?? 0 }).eq('id', followingId)),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', followerId)
        .then(({ count }) => supabase.from('profiles').update({ following_count: count ?? 0 }).eq('id', followerId)),
    ]).catch(() => {});
  },

  async getFollowers(userId: string) {
    // Synthetic IDs (e.g. 'user-ign') are not valid UUIDs — querying with .eq('id', syntheticId)
    // would throw "invalid input syntax for type uuid". Detect them early and query directly.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (!isUuid) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .contains('game_lists', { _topicFollows: [userId] });
      return data ?? [];
    }
    // Check if this is a topic account — if so, followers are stored in _topicFollows of each follower's profile
    const profileResult = await supabase.from('profiles').select('account_type, handle').eq('id', userId).maybeSingle();
    if (profileResult.data?.account_type === 'topic') {
      const rawHandle = (profileResult.data.handle || '').replace(/^@/, '').toLowerCase();
      const syntheticId = `user-${rawHandle}`;
      const { data: followerProfiles } = await supabase
        .from('profiles')
        .select('*')
        .contains('game_lists', { _topicFollows: [syntheticId] });
      return followerProfiles ?? [];
    }
    const { data, error } = await supabase
      .from('follows')
      .select('follower:profiles!follower_id(*)')
      .eq('following_id', userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => r.follower);
  },

  async getFollowing(userId: string) {
    const [followsResult, profileResult] = await Promise.all([
      supabase.from('follows').select('following:profiles!following_id(*)').eq('follower_id', userId),
      supabase.from('profiles').select('game_lists').eq('id', userId).maybeSingle(),
    ]);
    if (followsResult.error) throw new Error(followsResult.error.message);
    const realFollowing = (followsResult.data ?? []).map((r: any) => r.following).filter(Boolean);

    // Also include topic accounts stored in _topicFollows (not in follows table)
    const topicFollowIds: string[] = profileResult.data?.game_lists?._topicFollows ?? [];
    let topicFollowing: any[] = [];
    if (topicFollowIds.length > 0) {
      const handles = topicFollowIds.map((id: string) => id.replace(/^user-/, ''));
      const { data: allTopicProfiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('account_type', 'topic');
      topicFollowing = (allTopicProfiles ?? []).filter((p: any) => {
        const h = (p.handle || '').replace(/^@/, '').toLowerCase();
        return handles.includes(h);
      });
    }
    return [...realFollowing, ...topicFollowing];
  },

  async getFollowingCount(userId: string): Promise<number> {
    const [followsResult, profileResult] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      supabase.from('profiles').select('game_lists').eq('id', userId).maybeSingle(),
    ]);
    const followsCount = followsResult.count ?? 0;
    const topicFollows: string[] = profileResult.data?.game_lists?._topicFollows ?? [];
    const externalFollows: any[] = profileResult.data?.game_lists?._externalFollows ?? [];
    return followsCount + topicFollows.length + externalFollows.length;
  },

  async getFollowerCount(userId: string): Promise<number> {
    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);
    return count ?? 0;
  },

  async block(blockerId: string, blockedId: string) {
    const { error } = await supabase
      .from('blocked_users')
      .insert({ blocker_id: blockerId, blocked_id: blockedId });
    if (error && error.code !== '23505') throw new Error(error.message);
  },

  async unblock(blockerId: string, blockedId: string) {
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);
    if (error) throw new Error(error.message);
  },

  async getBlockedIds(userId: string) {
    const { data } = await supabase
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', userId);
    return (data ?? []).map((r: any) => r.blocked_id);
  },

  async mute(muterId: string, mutedId: string) {
    const { error } = await supabase
      .from('muted_users')
      .insert({ muter_id: muterId, muted_id: mutedId });
    if (error && error.code !== '23505') throw new Error(error.message);
  },

  async unmute(muterId: string, mutedId: string) {
    const { error } = await supabase
      .from('muted_users')
      .delete()
      .eq('muter_id', muterId)
      .eq('muted_id', mutedId);
    if (error) throw new Error(error.message);
  },

  async getMutedIds(userId: string) {
    const { data } = await supabase
      .from('muted_users')
      .select('muted_id')
      .eq('muter_id', userId);
    return (data ?? []).map((r: any) => r.muted_id);
  },

  async getFollowingIds(userId: string) {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
    return (data ?? []).map((r: any) => r.following_id);
  },

  /** Returns profiles of people currentUser follows who also follow targetUserId. */
  async getMutualFollowers(currentUserId: string, targetUserId: string) {
    // Get IDs that currentUser follows
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId);
    const followingIds = (followingData ?? []).map((r: any) => r.following_id);
    if (followingIds.length === 0) return [];

    // Of those, find who also follows targetUserId
    const { data, error } = await supabase
      .from('follows')
      .select('follower:profiles!follower_id(id, handle, display_name, profile_picture)')
      .eq('following_id', targetUserId)
      .in('follower_id', followingIds);
    if (error) return [];
    return (data ?? []).map((r: any) => r.follower).filter(Boolean);
  },

  async report(reporterId: string, reportedId: string, reason: string) {
    const { error } = await supabase
      .from('reports')
      .insert({ reporter_id: reporterId, reported_id: reportedId, reason });
    if (error) throw new Error(error.message);
  },

  /** Returns profiles that have at least one game in their LFG list. */
  async getPlayersLookingForGroup(limit = 50) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, handle, display_name, profile_picture, game_lists')
      .not('game_lists->lfg', 'is', null)
      .limit(limit);
    if (error) return [];
    return (data ?? []).filter((p: any) => {
      const lfg = p.game_lists?.lfg;
      return Array.isArray(lfg) && lfg.length > 0;
    });
  },
};

// ============================================================
// POSTS
// ============================================================
export const posts = {
  async getFeed(limit = 30, offset = 0) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!user_id(id, handle, display_name, profile_picture, created_at)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(error.message);
    return (data ?? []).filter((p: any) => !p.reply_to);
  },

  async getFollowingFeed(userId: string, limit = 30, offset = 0, followedGameIds: string[] = [], memberGroupIds: string[] = []) {
    // Get posts from people the user follows + own posts
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    const followingIds = (followingData ?? []).map((r: any) => r.following_id);
    followingIds.push(userId);

    const namedQueries: { key: string; query: PromiseLike<any> }[] = [
      {
        key: 'posts',
        query: supabase
          .from('posts')
          .select(`*, author:profiles!user_id(id, handle, display_name, profile_picture, created_at)`)
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1),
      },
      {
        key: 'reposts',
        query: supabase
          .from('reposts')
          .select(`user_id, created_at, post:posts!post_id(*, author:profiles!user_id(id, handle, display_name, profile_picture, created_at))`)
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
          .limit(limit),
      },
    ];

    // Fetch posts tagged with followed games (if any)
    if (followedGameIds.length > 0) {
      namedQueries.push({
        key: 'gamePosts',
        query: supabase
          .from('posts')
          .select(`*, author:profiles!user_id(id, handle, display_name, profile_picture, created_at)`)
          .in('game_id', followedGameIds)
          .order('created_at', { ascending: false })
          .limit(limit),
      });
    }

    // Fetch posts from groups the user is a member of
    if (memberGroupIds.length > 0) {
      namedQueries.push({
        key: 'groupPosts',
        query: supabase
          .from('posts')
          .select(`*, author:profiles!user_id(id, handle, display_name, profile_picture, created_at)`)
          .in('community_id', memberGroupIds)
          .order('created_at', { ascending: false })
          .limit(limit),
      });
    }

    const results = await Promise.all(namedQueries.map(q => q.query));
    const resultMap: Record<string, any> = {};
    namedQueries.forEach((q, i) => { resultMap[q.key] = results[i]; });

    const { data: postsData, error } = resultMap.posts ?? {};
    const { data: repostsData } = resultMap.reposts ?? {};
    const gamePostsData: any[] = resultMap.gamePosts?.data ?? [];
    const groupPostsData: any[] = resultMap.groupPosts?.data ?? [];

    if (error) throw new Error(error.message);

    const repostItems = (repostsData ?? [])
      .filter((r: any) => r.post)
      .map((r: any) => ({ ...r.post, repostedBy: r.user_id, repostedAt: r.created_at }));

    // Merge all candidates and sort newest-first (reposts use repostedAt for freshness)
    const all = [...(postsData ?? []), ...repostItems, ...gamePostsData, ...groupPostsData];
    all.sort((a: any, b: any) =>
      new Date(b.repostedAt || b.created_at).getTime() - new Date(a.repostedAt || a.created_at).getTime()
    );

    // Deduplicate by post id — keep only the single most-recent entry per post
    // (avoids showing the original post AND a repost of the same post simultaneously)
    const seenIds = new Set<string>();
    const merged = all.filter((p: any) => {
      if (seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    });

    return merged.slice(0, limit);
  },

  async getTrendingFeed(limit = 30) {
    // Fetch recent posts (last 14 days) and rank by total engagement
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('posts')
      .select(`*, author:profiles!user_id(id, handle, display_name, profile_picture, created_at)`)
      .gte('created_at', cutoff)
      .order('like_count', { ascending: false })
      .limit(limit * 3);
    if (error) throw new Error(error.message);
    const posts = (data ?? []).filter((p: any) => p.content?.trim() && !p.reply_to);
    // Re-rank by composite engagement score
    posts.sort((a: any, b: any) => {
      const scoreA = (a.like_count ?? 0) + (a.repost_count ?? 0) * 2 + (a.comment_count ?? 0) * 3;
      const scoreB = (b.like_count ?? 0) + (b.repost_count ?? 0) * 2 + (b.comment_count ?? 0) * 3;
      return scoreB - scoreA;
    });
    return posts.slice(0, limit);
  },

  async getForYouFeed(userId: string, followedGameIds: string[] = [], limit = 30) {
    // Blend: posts tagged with followed games + trending from network + recent trending
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [gamePostsRes, trendingRes] = await Promise.all([
      followedGameIds.length > 0
        ? supabase
            .from('posts')
            .select(`*, author:profiles!user_id(id, handle, display_name, profile_picture, created_at)`)
            .in('game_id', followedGameIds)
            .order('created_at', { ascending: false })
            .limit(limit)
        : Promise.resolve({ data: [] as any[], error: null }),
      supabase
        .from('posts')
        .select(`*, author:profiles!user_id(id, handle, display_name, profile_picture, created_at)`)
        .gte('created_at', cutoff)
        .neq('user_id', userId)
        .order('like_count', { ascending: false })
        .limit(limit),
    ]);

    const gamePosts: any[] = gamePostsRes.data ?? [];
    const trendingPosts: any[] = trendingRes.data ?? [];

    const seen = new Set<string>();
    const merged = [...gamePosts, ...trendingPosts].filter((p: any) => {
      if (!p.content?.trim() || p.reply_to) return false;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    // Score: game-follow match + engagement
    merged.sort((a: any, b: any) => {
      const gameA = followedGameIds.includes(String(a.game_id)) ? 1000 : 0;
      const gameB = followedGameIds.includes(String(b.game_id)) ? 1000 : 0;
      const engA = (a.like_count ?? 0) + (a.repost_count ?? 0) * 2 + (a.comment_count ?? 0) * 3;
      const engB = (b.like_count ?? 0) + (b.repost_count ?? 0) * 2 + (b.comment_count ?? 0) * 3;
      return (gameB + engB) - (gameA + engA);
    });

    return merged.slice(0, limit);
  },

  async getGameFeed(gameId: string, limit = 30) {
    const { data, error } = await supabase
      .from('posts')
      .select(`*, author:profiles!user_id(id, handle, display_name, profile_picture, created_at)`)
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).filter((p: any) => p.content?.trim());
  },

  async getById(postId: string) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!user_id(id, handle, display_name, profile_picture, created_at)
      `)
      .eq('id', postId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getByReplyTo(postId: string) {
    const { data, error } = await supabase
      .from('posts')
      .select(`*, author:profiles!user_id(id, handle, display_name, profile_picture, created_at)`)
      .eq('reply_to', postId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  /** Fetch Forge comments on an external post (stored with url = 'forge-comment:{externalId}'). */
  async getExternalComments(externalPostId: string) {
    const { data, error } = await supabase
      .from('posts')
      .select(`*, author:profiles!user_id(id, handle, display_name, profile_picture, created_at)`)
      .eq('url', `forge-comment:${externalPostId}`)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getByUser(userId: string) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!user_id(id, handle, display_name, profile_picture, created_at)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getByCommunity(communityId: string) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!user_id(id, handle, display_name, profile_picture, created_at)
      `)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getNewPostCountSince(communityId: string, since: string): Promise<number> {
    const { count, error } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .gt('created_at', since);
    if (error) return 0;
    return count ?? 0;
  },

  async create(userId: string, content: string, options: {
    images?: string[];
    imageAlts?: string[];
    url?: string;
    communityId?: string;
    gameId?: string;
    gameTitle?: string;
    gameIds?: string[];
    gameTitles?: string[];
    platform?: string;
    flareId?: string;
    commentsDisabled?: boolean;
    repostsDisabled?: boolean;
    replyTo?: string;
    quotePostId?: string;
    attachedList?: object;
    poll?: object;
  } = {}) {
    // Content moderation check
    if (content && content.trim().length >= 3) {
      const { checkContent } = await import('./moderation');
      const modResult = await checkContent(content);
      if (!modResult.ok) throw new Error(modResult.reason || 'Content violates community guidelines.');
    }
    // Support multi-game tagging: game_ids/game_titles arrays are the source of truth.
    // game_id/game_title kept for backward compat (first entry mirrors the array).
    const gameIds = options.gameIds ?? (options.gameId ? [options.gameId] : []);
    const gameTitles = options.gameTitles ?? (options.gameTitle ? [options.gameTitle] : []);
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content,
        images: options.images ?? [],
        image_alts: options.imageAlts ?? [],
        url: options.url ?? null,
        community_id: options.communityId ?? null,
        game_id: gameIds[0] ?? null,
        game_title: gameTitles[0] ?? null,
        game_ids: gameIds,
        game_titles: gameTitles,
        ...(options.platform ? { platform: options.platform } : {}),
        ...(options.flareId ? { flare_id: options.flareId } : {}),
        ...(options.commentsDisabled ? { comments_disabled: true } : {}),
        ...(options.repostsDisabled ? { reposts_disabled: true } : {}),
        ...(options.replyTo ? { reply_to: options.replyTo } : {}),
        ...(options.quotePostId ? { quote_post_id: options.quotePostId } : {}),
        ...(options.attachedList ? { attached_list: options.attachedList } : {}),
        ...(options.poll ? { poll: options.poll } : {}),
      })
      .select(`
        *,
        author:profiles!user_id(id, handle, display_name, profile_picture, created_at)
      `)
      .single();
    if (error) throw new Error(error.message);
    // Increment comment_count on the parent post (fire-and-forget)
    if (options.replyTo) {
      Promise.resolve(supabase.rpc('increment_comment_count', { post_id: options.replyTo })).catch(() =>
        supabase.from('posts').select('comment_count').eq('id', options.replyTo!).single().then(({ data: p }) =>
          supabase.from('posts').update({ comment_count: (p?.comment_count ?? 0) + 1 }).eq('id', options.replyTo!)
        )
      );
    }
    // Sync repost_count on the quoted post — quote posts count toward repost_count (fire-and-forget)
    if (options.quotePostId) {
      Promise.resolve(supabase.rpc('sync_repost_count', { p_post_id: options.quotePostId })).catch(() => {});
    }
    return data;
  },

  async delete(postId: string) {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);
    if (error) throw new Error(error.message);
  },

  async removeFromGroup(postId: string) {
    const { error } = await supabase
      .from('posts')
      .update({ community_id: null })
      .eq('id', postId);
    if (error) throw new Error(error.message);
  },

  async like(userId: string, postId: string) {
    const { error } = await supabase
      .from('likes')
      .insert({ user_id: userId, post_id: postId });
    if (error && error.code !== '23505') throw new Error(error.message);
    // Try RPC first; if it errors (doesn't exist or fails), fall back to read-modify-write
    const { error: rpcError } = await supabase.rpc('increment_like_count', { post_id: postId });
    if (rpcError) {
      const { data } = await supabase.from('posts').select('like_count').eq('id', postId).single();
      await supabase.from('posts').update({ like_count: (data?.like_count ?? 0) + 1 }).eq('id', postId);
    }
  },

  async unlike(userId: string, postId: string) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);
    if (error) throw new Error(error.message);
    // Try RPC first; if it errors (doesn't exist or fails), fall back to read-modify-write
    const { error: rpcError } = await supabase.rpc('decrement_like_count', { post_id: postId });
    if (rpcError) {
      const { data } = await supabase.from('posts').select('like_count').eq('id', postId).single();
      await supabase.from('posts').update({ like_count: Math.max(0, (data?.like_count ?? 0) - 1) }).eq('id', postId);
    }
  },

  async getLikedIds(userId: string) {
    const { data } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId);
    return (data ?? []).map((r: any) => r.post_id);
  },

  async getLikedPosts(userId: string) {
    const { data, error } = await supabase
      .from('likes')
      .select(`post_id, created_at, post:posts!post_id(*, author:profiles!user_id(id, handle, display_name, profile_picture, created_at))`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => r.post).filter(Boolean);
  },

  async repost(userId: string, postId: string) {
    const { error } = await supabase
      .from('reposts')
      .insert({ user_id: userId, post_id: postId });
    // 23505 = unique violation (already reposted) — treat as a no-op, not an error
    if (error && error.code !== '23505') throw new Error(error.message);
    // trg_repost_count trigger handles repost_count update automatically (SECURITY DEFINER, bypasses RLS)
  },

  async unrepost(userId: string, postId: string) {
    const { error } = await supabase
      .from('reposts')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);
    if (error) throw new Error(error.message);
    // trg_repost_count trigger handles repost_count update automatically
  },

  async getRepostedIds(userId: string) {
    const { data } = await supabase
      .from('reposts')
      .select('post_id')
      .eq('user_id', userId);
    return (data ?? []).map((r: any) => r.post_id);
  },

  async getPostLikers(postId: string) {
    const { data, error } = await supabase
      .from('likes')
      .select(`user_id, created_at, user:profiles!user_id(id, handle, display_name, profile_picture, bio)`)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => r.user).filter(Boolean);
  },

  async getPostReposters(postId: string) {
    const { data, error } = await supabase
      .from('reposts')
      .select(`user_id, created_at, user:profiles!user_id(id, handle, display_name, profile_picture, bio)`)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => r.user).filter(Boolean);
  },

  async getQuotePosts(postId: string) {
    const { data, error } = await supabase
      .from('posts')
      .select(`*, author:profiles!user_id(id, handle, display_name, profile_picture, created_at)`)
      .eq('quote_post_id', postId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getRepostsByUser(userId: string) {
    const { data, error } = await supabase
      .from('reposts')
      .select(`user_id, created_at, post:posts!post_id(*, author:profiles!user_id(id, handle, display_name, profile_picture, created_at))`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? [])
      .filter((r: any) => r.post)
      .map((r: any) => ({ ...r.post, repostedBy: r.user_id, repostedAt: r.created_at }));
  },

  async search(query: string) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!user_id(id, handle, display_name, profile_picture, created_at)
      `)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getTopicPosts(limit = 50) {
    const { data, error } = await supabase
      .from('posts')
      .select(`*, author:profiles!user_id(id, handle, display_name, profile_picture, created_at, account_type)`)
      .in('platform', ['bluesky', 'mastodon'])
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getByGame(gameId: string) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!user_id(id, handle, display_name, profile_picture, created_at)
      `)
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    // Only show posts tagged with exactly one game (not multi-game posts)
    return (data ?? []).filter((p: any) => !p.game_ids || p.game_ids.length <= 1);
  }
};

// ============================================================
// GROUPS
// ============================================================
export const groups = {
  async getAll() {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .order('member_count', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getUserCommunities(userId: string) {
    const { data, error } = await supabase
      .from('community_members')
      .select('community:communities(*), role')
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({ ...r.community, role: r.role }));
  },

  /** Returns lightweight membership rows: [{ community_id, role }] */
  async getUserMemberships(userId: string): Promise<Array<{ community_id: string; role: string }>> {
    const { data } = await supabase
      .from('community_members')
      .select('community_id, role')
      .eq('user_id', userId);
    return data ?? [];
  },

  async updateGroupImage(groupId: string, file: File): Promise<string> {
    // Get user session to build a user-ID-prefixed path, which satisfies the
    // storage RLS policy (policies typically require path starts with auth.uid()).
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    const userId = session.user.id;
    const ext = file.name.split('.').pop() || 'bin';
    const timestamp = Date.now();
    const bucket = 'forge-community-icons';
    const path = `${userId}/group-${groupId}-${timestamp}.${ext}`;

    // Upload via REST API with Bearer token (same approach as uploadAPI in api.ts)
    const storageUrl = `https://${projectId}.supabase.co/storage/v1/object/${bucket}/${path}`;
    const res = await fetch(storageUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: file,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Upload failed');
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    const url = `${data.publicUrl}?t=${timestamp}`;
    const { error: updateError } = await supabase.from('communities').update({ profile_picture: url }).eq('id', groupId);
    if (updateError) throw new Error(updateError.message);
    return url;
  },

  async create(userId: string, name: string, description: string, icon: string, type: string) {
    const { data, error } = await supabase
      .from('communities')
      .insert({ name, description, icon, type, creator_id: userId, member_count: 1 })
      .select()
      .single();
    if (error) throw new Error(error.message);
    // Auto-join as creator
    await supabase.from('community_members').insert({
      community_id: data.id,
      user_id: userId,
      role: 'creator'
    });
    return data;
  },

  async join(userId: string, communityId: string) {
    const { error } = await supabase
      .from('community_members')
      .insert({ community_id: communityId, user_id: userId });
    if (error && error.code !== '23505') throw new Error(error.message);
    await supabase.rpc('increment_member_count', { community_id: communityId });
  },

  async leave(userId: string, communityId: string) {
    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  async isMember(userId: string, communityId: string) {
    const { data } = await supabase
      .from('community_members')
      .select('user_id')
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .maybeSingle();
    return !!data;
  },

  async updateGameIds(communityId: string, gameIds: string[]) {
    const { error } = await supabase
      .from('communities')
      .update({ game_ids: gameIds })
      .eq('id', communityId);
    if (error) throw new Error(error.message);
  },

  async updateGroup(communityId: string, updates: { name?: string; description?: string; type?: string; posts_public?: boolean }) {
    const { error } = await supabase
      .from('communities')
      .update(updates)
      .eq('id', communityId);
    if (error) throw new Error(error.message);
  },

  async getMembers(communityId: string) {
    const { data, error } = await supabase
      .from('community_members')
      .select('user_id, role, member:profiles!user_id(id, handle, display_name, profile_picture)')
      .eq('community_id', communityId);
    if (error) return [];
    return (data ?? []).map((r: any) => ({ ...r.member, role: r.role })).filter(Boolean);
  },

  async removeMember(communityId: string, userId: string) {
    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    // Decrement member count — fire-and-forget
    Promise.resolve(
      supabase.from('communities').select('member_count').eq('id', communityId).single()
        .then(({ data }) => supabase.from('communities').update({ member_count: Math.max(0, (data?.member_count ?? 0) - 1) }).eq('id', communityId))
    ).catch(() => {});
  },

  async banMember(communityId: string, userId: string) {
    // Remove from community first
    const { error: removeErr } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', userId);
    if (removeErr) throw new Error(removeErr.message);
    // Add to banned list stored as JSONB on the community row
    const { data } = await supabase.from('communities').select('banned_member_ids').eq('id', communityId).single();
    const current: string[] = data?.banned_member_ids ?? [];
    if (!current.includes(userId)) {
      await supabase.from('communities').update({ banned_member_ids: [...current, userId] }).eq('id', communityId);
    }
    // Decrement member count — fire-and-forget
    Promise.resolve(
      supabase.from('communities').select('member_count').eq('id', communityId).single()
        .then(({ data: d }) => supabase.from('communities').update({ member_count: Math.max(0, (d?.member_count ?? 0) - 1) }).eq('id', communityId))
    ).catch(() => {});
  },

  async addMember(communityId: string, userId: string) {
    const { error } = await supabase.rpc('add_community_member_invite', {
      p_community_id: communityId,
      p_user_id: userId,
    });
    if (error) throw new Error(error.message);
  },

  async transferAdmin(communityId: string, newCreatorId: string) {
    // Get current creator so we can demote them
    const { data: community, error: fetchErr } = await supabase
      .from('communities')
      .select('creator_id')
      .eq('id', communityId)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    const oldCreatorId = community.creator_id;

    // Promote new admin on the community row
    const { error: updateErr } = await supabase
      .from('communities')
      .update({ creator_id: newCreatorId })
      .eq('id', communityId);
    if (updateErr) throw new Error(updateErr.message);

    // Update roles in community_members
    await supabase
      .from('community_members')
      .update({ role: 'creator' })
      .eq('community_id', communityId)
      .eq('user_id', newCreatorId);
    if (oldCreatorId) {
      await supabase
        .from('community_members')
        .update({ role: 'member' })
        .eq('community_id', communityId)
        .eq('user_id', oldCreatorId);
    }
  },
};

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notifications = {
  async getForUser(userId: string, limit = 30) {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!actor_id(id, handle, display_name, profile_picture)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async markAllRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  async deleteFollowNotification(actorId: string, userId: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('type', 'follow')
      .eq('actor_id', actorId)
      .eq('user_id', userId);
    if (error) console.error('Failed to delete follow notification:', error.message);
  },

  async createMention(userId: string, actorId: string, postId: string) {
    const { error } = await supabase
      .from('notifications')
      .insert({ user_id: userId, actor_id: actorId, type: 'mention', post_id: postId, read: false });
    if (error) console.error('Failed to create mention notification:', error.message);
  },

  async create(type: string, userId: string, actorId: string, postId?: string) {
    const { error } = await supabase
      .from('notifications')
      .insert({ user_id: userId, actor_id: actorId, type, post_id: postId ?? null, read: false });
    if (error) console.error('Failed to create notification:', error.message);
  },

  async getUnreadCount(userId: string) {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    return count ?? 0;
  }
};

// ============================================================
// COMMENTS
// ============================================================
export const commentsAPI = {
  async getByPostId(postId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select(`*, author:profiles!user_id(id, handle, display_name, profile_picture, created_at)`)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create(userId: string, postId: string, content: string) {
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: userId, content })
      .select(`*, author:profiles!user_id(id, handle, display_name, profile_picture, created_at)`)
      .single();
    if (error) throw new Error(error.message);
    // Persist comment_count increment atomically via rpc; fall back to read-modify-write
    Promise.resolve(supabase.rpc('increment_comment_count', { post_id: postId })).catch(() =>
      supabase.from('posts').select('comment_count').eq('id', postId).single().then(({ data: p }) =>
        supabase.from('posts').update({ comment_count: (p?.comment_count ?? 0) + 1 }).eq('id', postId)
      )
    );
    // Notify the post owner (fire-and-forget, skip self-comments)
    supabase.from('posts').select('user_id').eq('id', postId).single()
      .then(({ data: post }) => {
        if (post?.user_id && post.user_id !== userId) {
          supabase.from('notifications').insert({
            user_id: post.user_id, actor_id: userId, type: 'comment', post_id: postId, read: false,
          });
        }
      });
    return data;
  },

  async like(userId: string, commentId: string) {
    const { error } = await supabase
      .from('comment_likes')
      .insert({ user_id: userId, comment_id: commentId });
    if (error && error.code !== '23505') throw new Error(error.message);
  },

  async unlike(userId: string, commentId: string) {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('user_id', userId)
      .eq('comment_id', commentId);
    if (error) throw new Error(error.message);
  },

  async getLikedCommentIds(userId: string, postId: string) {
    const { data } = await supabase
      .from('comment_likes')
      .select('comment_id, comments!comment_id(post_id)')
      .eq('user_id', userId);
    return new Set<string>((data ?? []).map((r: any) => r.comment_id));
  },

  async delete(userId: string, commentId: string) {
    // Fetch post_id before deleting so we can decrement comment_count
    const { data: comment } = await supabase
      .from('comments')
      .select('post_id')
      .eq('id', commentId)
      .eq('user_id', userId)
      .maybeSingle();
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    if (comment?.post_id) {
      Promise.resolve(supabase.rpc('decrement_comment_count', { post_id: comment.post_id })).catch(() =>
        supabase.from('posts').select('comment_count').eq('id', comment.post_id).single().then(({ data }) =>
          supabase.from('posts').update({ comment_count: Math.max(0, (data?.comment_count ?? 0) - 1) }).eq('id', comment.post_id)
        )
      );
    }
  },
};

// ============================================================
// USER GAMES (played / owned declarations)
// ============================================================
export const userGamesAPI = {
  async getStatus(userId: string, gameId: string): Promise<{ played: boolean; owned: boolean; followed: boolean }> {
    const { data } = await supabase
      .from('user_games')
      .select('status')
      .eq('user_id', userId)
      .eq('game_id', gameId);
    const played   = (data ?? []).some((r: any) => r.status === 'played');
    const owned    = (data ?? []).some((r: any) => r.status === 'owned');
    const followed = (data ?? []).some((r: any) => r.status === 'followed');
    return { played, owned, followed };
  },

  /** Returns all game IDs that the user follows. */
  async getFollowedGameIds(userId: string): Promise<string[]> {
    const { data } = await supabase
      .from('user_games')
      .select('game_id')
      .eq('user_id', userId)
      .eq('status', 'followed');
    return (data ?? []).map((r: any) => String(r.game_id));
  },

  async add(userId: string, gameId: string, status: 'played' | 'owned' | 'followed') {
    const { error } = await supabase
      .from('user_games')
      .upsert({ user_id: userId, game_id: gameId, status }, { onConflict: 'user_id,game_id,status', ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  },

  async remove(userId: string, gameId: string, status: 'played' | 'owned' | 'followed') {
    const { error } = await supabase
      .from('user_games')
      .delete()
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .eq('status', status);
    if (error) throw new Error(error.message);
  },

  /** Returns all unique players for a game, with played/owned flags. */
  async getPlayersForGame(gameId: string) {
    const { data, error } = await supabase
      .from('user_games')
      .select('status, profile:profiles!user_id(id, handle, display_name, profile_picture)')
      .eq('game_id', gameId);
    if (error) throw new Error(error.message);

    const byUser: Record<string, any> = {};
    for (const row of data ?? []) {
      const p = (row as any).profile as any;
      if (!p) continue;
      if (!byUser[p.id]) byUser[p.id] = { ...p, played: false, owned: false };
      if ((row as any).status === 'played') byUser[p.id].played = true;
      if ((row as any).status === 'owned') byUser[p.id].owned = true;
    }
    return Object.values(byUser);
  },

  /** Count how many distinct users have this game. */
  async getPlayerCount(gameId: string): Promise<number> {
    const { data } = await supabase
      .from('user_games')
      .select('user_id')
      .eq('game_id', gameId);
    const unique = new Set((data ?? []).map((r: any) => r.user_id));
    return unique.size;
  },

  /**
   * Total unique "list adds" for a game:
   * - Each user who added the game to any personal list (played/owned) counts once.
   * - Each admin/creator of a group that has this game in game_ids counts once.
   * - The two sets are merged so a user who does both is only counted once.
   */
  async getListCount(gameId: string): Promise<number> {
    // Games are stored in profiles.game_lists as JSONB (recentlyPlayed, favorites, wishlist, library, lfg arrays)
    const { data } = await supabase
      .from('profiles')
      .select('id, game_lists')
      .not('game_lists', 'is', null);

    if (!data) return 0;

    return data.filter(profile => {
      const lists = profile.game_lists ?? {};
      return Object.values(lists).some((list: any) =>
        Array.isArray(list) && list.some((g: any) => String(g.id) === String(gameId))
      );
    }).length;
  },

  /**
   * Returns all users who have added this game to any personal list,
   * along with which list types they added it to.
   */
  async getListEntries(gameId: string): Promise<{ userId: string; handle: string; displayName: string; profilePicture?: string; listTypes: string[] }[]> {
    const { data } = await supabase
      .from('profiles')
      .select('id, handle, display_name, profile_picture, game_lists')
      .not('game_lists', 'is', null);

    if (!data) return [];

    const LIST_LABELS: Record<string, string> = {
      recentlyPlayed: 'Recently Played',
      favorites: 'Favorites',
      wishlist: 'Wishlist',
      library: 'Library',
      lfg: 'Looking for Group',
    };

    const results: { userId: string; handle: string; displayName: string; profilePicture?: string; listTypes: string[] }[] = [];
    for (const profile of data) {
      const lists = profile.game_lists ?? {};
      const listTypes: string[] = [];
      for (const [key, list] of Object.entries(lists)) {
        if (Array.isArray(list) && list.some((g: any) => String(g.id) === String(gameId)) && LIST_LABELS[key]) {
          listTypes.push(LIST_LABELS[key]);
        }
      }
      if (listTypes.length > 0) {
        results.push({
          userId: profile.id,
          handle: profile.handle ?? '',
          displayName: profile.display_name ?? profile.handle ?? '',
          profilePicture: profile.profile_picture ?? undefined,
          listTypes,
        });
      }
    }
    return results;
  },

  /** Returns communities that have this game in their game_ids list. */
  async getGroupsWithGame(gameId: string) {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .contains('game_ids', [gameId]);
    if (error) return [];
    return data ?? [];
  },
};

// ============================================================
// LFG FLARES
// ============================================================
export interface LFGFlare {
  id: string;
  user_id: string;
  game_id: string;
  game_title: string;
  flare_type: 'lfg' | 'lfm';
  players_needed: number;
  group_size?: number;
  game_mode?: string;
  scheduled_for?: string;
  expires_at: string;
  post_id?: string;
  community_id?: string;  // set for group flares
  thread_id?: string;     // linked group_thread for chat
  created_at: string;
  user?: any;             // joined profile
}

export const lfgFlares = {
  async create(userId: string, data: {
    game_id: string;
    game_title: string;
    flare_type: 'lfg' | 'lfm';
    players_needed: number;
    group_size?: number;
    game_mode?: string;
    scheduled_for?: string;
    expires_at: string;
    post_id?: string;
    community_id?: string;
  }): Promise<LFGFlare> {
    const { data: row, error } = await supabase
      .from('lfg_flares')
      .insert({ user_id: userId, ...data })
      .select()
      .single();
    if (error) throw new Error(error.message);
    // Auto-add creator as a member
    await supabase.from('lfg_flare_members').insert({ flare_id: row.id, user_id: userId, status: 'member' }).then(() => {});
    return row;
  },

  async getById(flareId: string): Promise<LFGFlare | null> {
    const { data } = await supabase
      .from('lfg_flares')
      .select('*, user:profiles!user_id(id, handle, display_name, profile_picture)')
      .eq('id', flareId)
      .maybeSingle();
    return data ?? null;
  },

  async updatePostId(flareId: string, postId: string) {
    await supabase.from('lfg_flares').update({ post_id: postId }).eq('id', flareId);
  },

  async updateThreadId(flareId: string, threadId: string) {
    await supabase.from('lfg_flares').update({ thread_id: threadId }).eq('id', flareId);
  },

  async setCommunityId(flareId: string, communityId: string) {
    const { error } = await supabase.from('lfg_flares').update({ community_id: communityId }).eq('id', flareId);
    if (error) throw new Error(error.message);
  },

  async remove(flareId: string) {
    const { error } = await supabase.from('lfg_flares').delete().eq('id', flareId);
    if (error) throw new Error(error.message);
  },

  async removeForUserGame(userId: string, gameId: string) {
    await supabase.from('lfg_flares').delete().eq('user_id', userId).eq('game_id', gameId);
  },

  /** Active flares for a specific user (not yet expired). */
  async getActiveForUser(userId: string): Promise<LFGFlare[]> {
    const { data, error } = await supabase
      .from('lfg_flares')
      .select('*')
      .eq('user_id', userId)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  },

  /** All active flares, joined with user profiles. */
  async getActive(limit = 50): Promise<LFGFlare[]> {
    const { data, error } = await supabase
      .from('lfg_flares')
      .select('*, user:profiles!user_id(id, handle, display_name, profile_picture)')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return data ?? [];
  },

  /** Active flares for a specific game, joined with user profiles. */
  async getActiveForGame(gameId: string): Promise<LFGFlare[]> {
    const { data, error } = await supabase
      .from('lfg_flares')
      .select('*, user:profiles!user_id(id, handle, display_name, profile_picture)')
      .eq('game_id', gameId)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  },

  /** Extend (renew) a flare's expiry by the given number of minutes from now. */
  async extend(flareId: string, minutes: number): Promise<void> {
    const newExpiry = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('lfg_flares')
      .update({ expires_at: newExpiry })
      .eq('id', flareId);
    if (error) throw new Error(error.message);
  },

  /** Check if user has an active flare for a specific game. */
  async getUserFlareForGame(userId: string, gameId: string): Promise<LFGFlare | null> {
    const { data } = await supabase
      .from('lfg_flares')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  },

  /** Active flares for a specific community/group. */
  async getActiveForCommunity(communityId: string): Promise<LFGFlare[]> {
    const { data } = await supabase
      .from('lfg_flares')
      .select('*, user:profiles!user_id(id, handle, display_name, profile_picture)')
      .eq('community_id', communityId)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    return data ?? [];
  },

  /** Check how many active flares a community has. */
  async getCommunityFlareCount(communityId: string): Promise<number> {
    const { count } = await supabase
      .from('lfg_flares')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .gte('expires_at', new Date().toISOString());
    return count ?? 0;
  },

  // ── Member management (requires lfg_flare_members table) ──────

  async getMembers(flareId: string): Promise<any[]> {
    const { data } = await supabase
      .from('lfg_flare_members')
      .select('status, user:profiles!user_id(id, handle, display_name, profile_picture)')
      .eq('flare_id', flareId)
      .eq('status', 'member')
      .order('joined_at', { ascending: true });
    return (data ?? []).map((r: any) => ({ ...r.user, status: r.status })).filter(Boolean);
  },

  async getPendingRequests(flareId: string): Promise<any[]> {
    const { data } = await supabase
      .from('lfg_flare_members')
      .select('status, joined_at, user:profiles!user_id(id, handle, display_name, profile_picture)')
      .eq('flare_id', flareId)
      .eq('status', 'pending')
      .order('joined_at', { ascending: true });
    return (data ?? []).map((r: any) => ({ ...r.user, requestedAt: r.joined_at })).filter(Boolean);
  },

  async isMember(flareId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('lfg_flare_members')
      .select('status')
      .eq('flare_id', flareId)
      .eq('user_id', userId)
      .maybeSingle();
    return data?.status === 'member';
  },

  async requestJoin(flareId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('lfg_flare_members')
      .insert({ flare_id: flareId, user_id: userId, status: 'pending' });
    if (error && error.code !== '23505') throw new Error(error.message);
  },

  async approveRequest(flareId: string, userId: string, threadId?: string): Promise<void> {
    const { error } = await supabase
      .from('lfg_flare_members')
      .update({ status: 'member' })
      .eq('flare_id', flareId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    // Add user to the flare's chat thread
    if (threadId) {
      const { data: thread } = await supabase.from('group_threads').select('participant_ids').eq('id', threadId).single();
      if (thread) {
        const updated = [...new Set([...thread.participant_ids, userId])];
        await supabase.from('group_threads').update({ participant_ids: updated }).eq('id', threadId);
      }
    }
  },

  async rejectRequest(flareId: string, userId: string): Promise<void> {
    await supabase.from('lfg_flare_members').delete().eq('flare_id', flareId).eq('user_id', userId);
  },

  /** Get or create the group_thread chat for a flare. */
  async getOrCreateThread(flare: LFGFlare): Promise<string> {
    if (flare.thread_id) return flare.thread_id;
    const { data: thread, error } = await supabase
      .from('group_threads')
      .insert({
        created_by: flare.user_id,
        name: `🔥 ${flare.game_title}`,
        participant_ids: [flare.user_id],
        flare_id: flare.id,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase.from('lfg_flares').update({ thread_id: thread.id }).eq('id', flare.id);
    return thread.id;
  },
};

// ============================================================
// DIRECT MESSAGES
// ============================================================
export const directMessages = {
  /** Returns all conversation threads for a user (one row per unique partner). */
  async getConversations(userId: string) {
    const { data, error } = await supabase
      .from('direct_messages')
      .select(`
        *,
        sender:profiles!sender_id(id, handle, display_name, profile_picture),
        recipient:profiles!recipient_id(id, handle, display_name, profile_picture)
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    // Group by conversation partner, keeping only the latest message per pair
    const seen = new Map<string, any>();
    for (const msg of data ?? []) {
      const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
      if (!seen.has(partnerId)) seen.set(partnerId, msg);
    }
    return Array.from(seen.values());
  },

  /** Returns all messages between two users, oldest first. */
  async getMessages(userId: string, partnerId: string) {
    const { data, error } = await supabase
      .from('direct_messages')
      .select(`*, sender:profiles!sender_id(id, handle, display_name, profile_picture)`)
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`
      )
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async send(senderId: string, recipientId: string, content: string, opts?: { encrypted?: boolean; iv?: string }) {
    // Only run moderation on plaintext — skip for encrypted payloads
    if (!opts?.encrypted && content && content.trim().length >= 3) {
      const { checkContent } = await import('./moderation');
      const modResult = await checkContent(content);
      if (!modResult.ok) throw new Error(modResult.reason || 'Message violates community guidelines.');
    }
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        content,
        ...(opts?.encrypted ? { encrypted: true, iv: opts.iv } : {}),
      })
      .select(`*, sender:profiles!sender_id(id, handle, display_name, profile_picture)`)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteConversation(userId: string, partnerId: string) {
    const { error } = await supabase
      .from('direct_messages')
      .delete()
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`);
    if (error) throw new Error(error.message);
  },

  /** Soft-delete a single message the current user sent. */
  async deleteMessage(messageId: string) {
    const { error } = await supabase
      .from('direct_messages')
      .update({ content: '', deleted: true })
      .eq('id', messageId);
    if (error) throw new Error(error.message);
  },

  /** Mark all unread messages FROM partnerId TO userId as read. */
  async markRead(userId: string, partnerId: string) {
    await supabase
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .eq('sender_id', partnerId)
      .is('read_at', null);
  },
};

// ============================================================
// GROUP MESSAGE THREADS
// Requires DB tables: group_threads, group_messages (see SQL below)
// ============================================================
export const groupThreads = {
  async create(creatorId: string, name: string, participantIds: string[]) {
    const allParticipants = [...new Set([creatorId, ...participantIds])];
    const { data, error } = await supabase
      .from('group_threads')
      .insert({ created_by: creatorId, name, participant_ids: allParticipants })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getForUser(userId: string) {
    const { data, error } = await supabase
      .from('group_threads')
      .select('*')
      .contains('participant_ids', [userId])
      .order('updated_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  },

  async getMessages(threadId: string) {
    const { data, error } = await supabase
      .from('group_messages')
      .select('*, sender:profiles!sender_id(id, handle, display_name, profile_picture)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    if (error) return [];
    return data ?? [];
  },

  async sendMessage(threadId: string, senderId: string, content: string) {
    if (content && content.trim().length >= 3) {
      const { checkContent } = await import('./moderation');
      const modResult = await checkContent(content);
      if (!modResult.ok) throw new Error(modResult.reason || 'Message violates community guidelines.');
    }
    const { data, error } = await supabase
      .from('group_messages')
      .insert({ thread_id: threadId, sender_id: senderId, content })
      .select('*, sender:profiles!sender_id(id, handle, display_name, profile_picture)')
      .single();
    if (error) throw new Error(error.message);
    await supabase
      .from('group_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId);
    return data;
  },

  async getParticipants(participantIds: string[]) {
    if (!participantIds.length) return [];
    const { data } = await supabase
      .from('profiles')
      .select('id, handle, display_name, profile_picture')
      .in('id', participantIds);
    return data ?? [];
  },

  async addParticipants(threadId: string, userIds: string[]) {
    const { data: thread } = await supabase
      .from('group_threads')
      .select('participant_ids')
      .eq('id', threadId)
      .single();
    if (!thread) throw new Error('Thread not found');
    const updated = [...new Set([...thread.participant_ids, ...userIds])];
    const { data, error } = await supabase
      .from('group_threads')
      .update({ participant_ids: updated, updated_at: new Date().toISOString() })
      .eq('id', threadId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async leave(threadId: string, userId: string) {
    const { data: thread } = await supabase
      .from('group_threads')
      .select('participant_ids, created_by')
      .eq('id', threadId)
      .single();
    if (!thread) throw new Error('Thread not found');
    const updated = (thread.participant_ids as string[]).filter(id => id !== userId);
    if (updated.length === 0) {
      await supabase.from('group_threads').delete().eq('id', threadId);
      return null;
    }
    const { data, error } = await supabase
      .from('group_threads')
      .update({ participant_ids: updated, updated_at: new Date().toISOString() })
      .eq('id', threadId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async delete(threadId: string) {
    const { error } = await supabase.from('group_threads').delete().eq('id', threadId);
    if (error) throw new Error(error.message);
  },

  async deleteMessage(messageId: string) {
    const { error } = await supabase
      .from('group_messages')
      .update({ content: '', deleted: true })
      .eq('id', messageId);
    if (error) throw new Error(error.message);
  },
};

// ============================================================
// STORAGE (profile pictures)
// ============================================================
export const storage = {
  async uploadProfilePicture(userId: string, file: File) {
    const ext = file.name.split('.').pop();
    const path = `avatars/${userId}.${ext}`;
    const { error } = await supabase.storage
      .from('forge-avatars')
      .upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('forge-avatars').getPublicUrl(path);
    return data.publicUrl;
  },

  async uploadPostImage(userId: string, file: File) {
    const path = `posts/${userId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from('forge-post-media')
      .upload(path, file);
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('forge-post-media').getPublicUrl(path);
    return data.publicUrl;
  }
};

// ============================================================
// POLL VOTES
// ============================================================
export const pollAPI = {
  async vote(postId: string, userId: string, optionIndex: number) {
    const { error } = await supabase
      .from('poll_votes')
      .upsert({ post_id: postId, user_id: userId, option_index: optionIndex }, { onConflict: 'post_id,user_id' });
    if (error) throw new Error(error.message);
  },

  async getVotes(postId: string): Promise<{ option_index: number; count: number }[]> {
    const { data, error } = await supabase
      .from('poll_votes')
      .select('option_index')
      .eq('post_id', postId);
    if (error) return [];
    const counts: Record<number, number> = {};
    for (const row of data ?? []) {
      counts[row.option_index] = (counts[row.option_index] ?? 0) + 1;
    }
    return Object.entries(counts).map(([k, v]) => ({ option_index: Number(k), count: v }));
  },

  async getUserVote(postId: string, userId: string): Promise<number | null> {
    const { data } = await supabase
      .from('poll_votes')
      .select('option_index')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();
    return data?.option_index ?? null;
  },
};

// ============================================================
// MESSAGE REACTIONS  (DM + Group)
// Table schema expected:
//   dm_reactions(id, message_id, user_id, emoji, created_at)  UNIQUE(message_id,user_id,emoji)
//   group_message_reactions(id, message_id, user_id, emoji, created_at)  UNIQUE(message_id,user_id,emoji)
// ============================================================

type ReactionRow = { message_id: string; user_id: string; emoji: string };

function groupReactions(rows: ReactionRow[]): Record<string, { emoji: string; userIds: string[] }[]> {
  const map: Record<string, Record<string, string[]>> = {};
  for (const r of rows) {
    if (!map[r.message_id]) map[r.message_id] = {};
    if (!map[r.message_id][r.emoji]) map[r.message_id][r.emoji] = [];
    map[r.message_id][r.emoji].push(r.user_id);
  }
  const result: Record<string, { emoji: string; userIds: string[] }[]> = {};
  for (const [msgId, emojiMap] of Object.entries(map)) {
    result[msgId] = Object.entries(emojiMap).map(([emoji, userIds]) => ({ emoji, userIds }));
  }
  return result;
}

export const dmReactionsAPI = {
  async getForMessages(messageIds: string[]) {
    if (!messageIds.length) return {};
    const { data } = await supabase
      .from('dm_reactions')
      .select('message_id, user_id, emoji')
      .in('message_id', messageIds);
    return groupReactions(data ?? []);
  },

  async toggle(messageId: string, userId: string, emoji: string) {
    const { data: existing } = await supabase
      .from('dm_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle();
    if (existing) {
      await supabase.from('dm_reactions').delete().eq('id', existing.id);
      return 'removed';
    }
    await supabase.from('dm_reactions').insert({ message_id: messageId, user_id: userId, emoji });
    return 'added';
  },
};

export const groupReactionsAPI = {
  async getForMessages(messageIds: string[]) {
    if (!messageIds.length) return {};
    const { data } = await supabase
      .from('group_message_reactions')
      .select('message_id, user_id, emoji')
      .in('message_id', messageIds);
    return groupReactions(data ?? []);
  },

  async toggle(messageId: string, userId: string, emoji: string) {
    const { data: existing } = await supabase
      .from('group_message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle();
    if (existing) {
      await supabase.from('group_message_reactions').delete().eq('id', existing.id);
      return 'removed';
    }
    await supabase.from('group_message_reactions').insert({ message_id: messageId, user_id: userId, emoji });
    return 'added';
  },
};

// ============================================================
// GROUP THREAD READ RECEIPTS
// Table: group_thread_reads(thread_id, user_id, last_read_at)
// ============================================================
export const groupThreadReadsAPI = {
  async markRead(threadId: string, userId: string) {
    await supabase
      .from('group_thread_reads')
      .upsert(
        { thread_id: threadId, user_id: userId, last_read_at: new Date().toISOString() },
        { onConflict: 'thread_id,user_id' }
      );
  },
  async getReads(threadId: string): Promise<{ user_id: string; last_read_at: string }[]> {
    const { data } = await supabase
      .from('group_thread_reads')
      .select('user_id, last_read_at')
      .eq('thread_id', threadId);
    return data ?? [];
  },
};

// ============================================================
// TOP 8 FRIENDS & GAMES
// ============================================================
export const top8API = {
  async sendFriendRequest(requesterId: string, recipientId: string) {
    // Upsert and get the request ID
    const { data, error } = await supabase.from('top_friend_requests').upsert(
      { requester_id: requesterId, recipient_id: recipientId, status: 'pending' },
      { onConflict: 'requester_id,recipient_id' }
    ).select('id').maybeSingle();
    if (error) throw new Error(error.message);
    // Remove any stale unread notification for the same pair first (no spam)
    await supabase.from('notifications')
      .delete()
      .eq('user_id', recipientId)
      .eq('actor_id', requesterId)
      .eq('type', 'top_friend_request')
      .eq('read', false);
    // Notify the recipient
    await supabase.from('notifications').insert({
      user_id: recipientId,
      actor_id: requesterId,
      type: 'top_friend_request',
      read: false,
      metadata: { requester_id: requesterId, request_id: data?.id },
    });
  },

  async hasPendingRequest(requesterId: string, recipientId: string): Promise<boolean> {
    const { data } = await supabase
      .from('top_friend_requests')
      .select('id')
      .eq('requester_id', requesterId)
      .eq('recipient_id', recipientId)
      .eq('status', 'pending')
      .maybeSingle();
    return !!data;
  },

  async acceptRequest(requestId: string, requesterId: string, recipientId: string) {
    await supabase.from('top_friend_requests').update({ status: 'accepted' }).eq('id', requestId);
    // Add each user to the other's top_friends array (up to 8)
    const addToTop = async (userId: string, friendId: string) => {
      const { data } = await supabase.from('profiles').select('top_friends').eq('id', userId).maybeSingle();
      const current: string[] = data?.top_friends ?? [];
      if (current.includes(friendId)) return;
      const updated = [...current, friendId].slice(0, 8);
      await supabase.from('profiles').update({ top_friends: updated }).eq('id', userId);
    };
    await Promise.all([addToTop(requesterId, recipientId), addToTop(recipientId, requesterId)]);
  },

  async declineRequest(requestId: string) {
    await supabase.from('top_friend_requests').update({ status: 'declined' }).eq('id', requestId);
  },

  async removeTopFriend(userId: string, friendId: string) {
    const { data } = await supabase.from('profiles').select('top_friends').eq('id', userId).maybeSingle();
    const current: string[] = data?.top_friends ?? [];
    await supabase.from('profiles').update({ top_friends: current.filter(id => id !== friendId) }).eq('id', userId);
  },

  async getTopFriendProfiles(userIds: string[]) {
    if (!userIds.length) return [];
    const { data } = await supabase
      .from('profiles')
      .select('id, handle, display_name, profile_picture, created_at')
      .in('id', userIds);
    return data ?? [];
  },

  async updateTopGames(userId: string, gameIds: string[]) {
    await supabase.from('profiles').update({ top_games: gameIds.slice(0, 8) }).eq('id', userId);
  },

  async getPendingRequestsForUser(userId: string) {
    const { data } = await supabase
      .from('top_friend_requests')
      .select('*, requester:profiles!requester_id(id, handle, display_name, profile_picture)')
      .eq('recipient_id', userId)
      .eq('status', 'pending');
    return data ?? [];
  },
};

// ============================================================
// STREAM ARCHIVES (Twitch VOD archiving)
// ============================================================
export interface StreamArchive {
  id: string;
  user_id: string;
  twitch_vod_id: string;
  title: string;
  duration_seconds: number;
  thumbnail_url: string | null;
  storage_path: string | null;
  download_status: 'pending' | 'downloading' | 'ready' | 'failed';
  recorded_at: string;
  created_at: string;
  retention_prompted_at: string | null;
  deleted_at: string | null;
}

export const streamArchivesAPI = {
  async getForUser(userId: string): Promise<StreamArchive[]> {
    const { data } = await supabase
      .from('stream_archives')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('recorded_at', { ascending: false });
    return (data ?? []) as StreamArchive[];
  },

  async getRetentionDue(userId: string): Promise<StreamArchive[]> {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('stream_archives')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .is('retention_prompted_at', null)
      .lt('recorded_at', oneYearAgo);
    return (data ?? []) as StreamArchive[];
  },

  async markRetentionPrompted(archiveId: string) {
    await supabase
      .from('stream_archives')
      .update({ retention_prompted_at: new Date().toISOString() })
      .eq('id', archiveId);
  },

  async softDelete(archiveId: string) {
    await supabase
      .from('stream_archives')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', archiveId);
  },

  async autoDeleteOverdue(userId: string) {
    // Auto-delete archives where retention prompt was shown > 3 months ago with no response
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('stream_archives')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .lt('retention_prompted_at', threeMonthsAgo);
  },

  async keepForAnotherYear(archiveId: string) {
    // Reset the recorded_at clock so this archive won't trigger again for another year
    await supabase
      .from('stream_archives')
      .update({ recorded_at: new Date().toISOString(), retention_prompted_at: null })
      .eq('id', archiveId);
  },

  async syncFromTwitch(userId: string, accessToken: string) {
    const { projectId } = await import('/utils/supabase/info');
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) throw new Error('Not authenticated');
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/twitch-vod-archive/sync`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ user_id: userId }),
      }
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
