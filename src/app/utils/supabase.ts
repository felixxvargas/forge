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

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
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

  async getByHandle(handle: string) {
    const stripped = handle.replace(/^@/, '');
    // Try both with and without @ prefix, case-insensitive
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`handle.ilike.${stripped},handle.ilike.@${stripped}`)
      .limit(1)
      .single();
    return data ?? null;
  },

  async update(id: string, updates: Record<string, any>) {
    console.log('[profiles.update] payload →', JSON.stringify(updates));
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
    // Persist counter increments — fire-and-forget, don't block the call
    Promise.allSettled([
      supabase.from('profiles').select('follower_count').eq('id', followingId).single()
        .then(({ data }) => supabase.from('profiles').update({ follower_count: (data?.follower_count ?? 0) + 1 }).eq('id', followingId)),
      supabase.from('profiles').select('following_count').eq('id', followerId).single()
        .then(({ data }) => supabase.from('profiles').update({ following_count: (data?.following_count ?? 0) + 1 }).eq('id', followerId)),
    ]).catch(() => {});
  },

  async unfollow(followerId: string, followingId: string) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    if (error) throw new Error(error.message);
    // Persist counter decrements — fire-and-forget
    Promise.allSettled([
      supabase.from('profiles').select('follower_count').eq('id', followingId).single()
        .then(({ data }) => supabase.from('profiles').update({ follower_count: Math.max(0, (data?.follower_count ?? 0) - 1) }).eq('id', followingId)),
      supabase.from('profiles').select('following_count').eq('id', followerId).single()
        .then(({ data }) => supabase.from('profiles').update({ following_count: Math.max(0, (data?.following_count ?? 0) - 1) }).eq('id', followerId)),
    ]).catch(() => {});
  },

  async getFollowers(userId: string) {
    const { data, error } = await supabase
      .from('follows')
      .select('follower:profiles!follower_id(*)')
      .eq('following_id', userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => r.follower);
  },

  async getFollowing(userId: string) {
    const { data, error } = await supabase
      .from('follows')
      .select('following:profiles!following_id(*)')
      .eq('follower_id', userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => r.following);
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
        author:profiles!user_id(id, handle, display_name, profile_picture)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getFollowingFeed(userId: string, limit = 30, offset = 0) {
    // Get posts from people the user follows + own posts
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    const followingIds = (followingData ?? []).map((r: any) => r.following_id);
    followingIds.push(userId);

    const [{ data: postsData, error }, { data: repostsData }] = await Promise.all([
      supabase
        .from('posts')
        .select(`*, author:profiles!user_id(id, handle, display_name, profile_picture)`)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      supabase
        .from('reposts')
        .select(`user_id, created_at, post:posts!post_id(*, author:profiles!user_id(id, handle, display_name, profile_picture))`)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);
    if (error) throw new Error(error.message);

    const repostItems = (repostsData ?? [])
      .filter((r: any) => r.post)
      .map((r: any) => ({ ...r.post, repostedBy: r.user_id, repostedAt: r.created_at }));

    const seen = new Set<string>();
    const merged = [...(postsData ?? []), ...repostItems].filter((p: any) => {
      const key = p.id + (p.repostedBy || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    merged.sort((a: any, b: any) =>
      new Date(b.repostedAt || b.created_at).getTime() - new Date(a.repostedAt || a.created_at).getTime()
    );
    return merged.slice(0, limit);
  },

  async getById(postId: string) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!user_id(id, handle, display_name, profile_picture)
      `)
      .eq('id', postId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getByUser(userId: string) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!user_id(id, handle, display_name, profile_picture)
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
        author:profiles!user_id(id, handle, display_name, profile_picture)
      `)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create(userId: string, content: string, options: {
    images?: string[];
    imageAlts?: string[];
    url?: string;
    communityId?: string;
    gameId?: string;
    gameTitle?: string;
  } = {}) {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content,
        images: options.images ?? [],
        image_alts: options.imageAlts ?? [],
        url: options.url ?? null,
        community_id: options.communityId ?? null,
        game_id: options.gameId ?? null,
        game_title: options.gameTitle ?? null,
      })
      .select(`
        *,
        author:profiles!user_id(id, handle, display_name, profile_picture)
      `)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async delete(postId: string) {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);
    if (error) throw new Error(error.message);
  },

  async like(userId: string, postId: string) {
    const { error } = await supabase
      .from('likes')
      .insert({ user_id: userId, post_id: postId });
    if (error && error.code !== '23505') throw new Error(error.message);
    // Persist like_count increment — fire-and-forget
    Promise.allSettled([
      supabase.from('posts').select('like_count').eq('id', postId).single()
        .then(({ data }) => supabase.from('posts').update({ like_count: (data?.like_count ?? 0) + 1 }).eq('id', postId)),
    ]).catch(() => {});
  },

  async unlike(userId: string, postId: string) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);
    if (error) throw new Error(error.message);
    // Persist like_count decrement — fire-and-forget
    Promise.allSettled([
      supabase.from('posts').select('like_count').eq('id', postId).single()
        .then(({ data }) => supabase.from('posts').update({ like_count: Math.max(0, (data?.like_count ?? 0) - 1) }).eq('id', postId)),
    ]).catch(() => {});
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
      .select(`post_id, created_at, post:posts!post_id(*, author:profiles!user_id(id, handle, display_name, profile_picture))`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => r.post).filter(Boolean);
  },

  async repost(userId: string, postId: string) {
    const { error } = await supabase
      .from('reposts')
      .insert({ user_id: userId, post_id: postId });
    if (error && error.code !== '23505') throw new Error(error.message);
  },

  async unrepost(userId: string, postId: string) {
    const { error } = await supabase
      .from('reposts')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);
    if (error) throw new Error(error.message);
  },

  async getRepostedIds(userId: string) {
    const { data } = await supabase
      .from('reposts')
      .select('post_id')
      .eq('user_id', userId);
    return (data ?? []).map((r: any) => r.post_id);
  },

  async getRepostsByUser(userId: string) {
    const { data, error } = await supabase
      .from('reposts')
      .select(`user_id, created_at, post:posts!post_id(*, author:profiles!user_id(id, handle, display_name, profile_picture))`)
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
        author:profiles!user_id(id, handle, display_name, profile_picture)
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
      .select(`*, author:profiles!user_id(id, handle, display_name, profile_picture, account_type)`)
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
        author:profiles!user_id(id, handle, display_name, profile_picture)
      `)
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
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
    const ext = file.name.split('.').pop();
    const path = `groups/${groupId}.${ext}`;
    const { error } = await supabase.storage
      .from('forge-avatars')
      .upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('forge-avatars').getPublicUrl(path);
    const url = data.publicUrl;
    await supabase.from('communities').update({ profile_picture: url }).eq('id', groupId);
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

  async updateGroup(communityId: string, updates: { name?: string; description?: string; type?: string }) {
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
    supabase.from('communities').select('member_count').eq('id', communityId).single()
      .then(({ data }) => supabase.from('communities').update({ member_count: Math.max(0, (data?.member_count ?? 0) - 1) }).eq('id', communityId))
      .catch(() => {});
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
    supabase.from('communities').select('member_count').eq('id', communityId).single()
      .then(({ data: d }) => supabase.from('communities').update({ member_count: Math.max(0, (d?.member_count ?? 0) - 1) }).eq('id', communityId))
      .catch(() => {});
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
      .select(`*, author:profiles!user_id(id, handle, display_name, profile_picture)`)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create(userId: string, postId: string, content: string) {
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: userId, content })
      .select(`*, author:profiles!user_id(id, handle, display_name, profile_picture)`)
      .single();
    if (error) throw new Error(error.message);
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
    // Decrement comment_count on the parent post — fire-and-forget
    if (comment?.post_id) {
      Promise.allSettled([
        supabase.from('posts').select('comment_count').eq('id', comment.post_id).single()
          .then(({ data }) => supabase.from('posts').update({ comment_count: Math.max(0, (data?.comment_count ?? 0) - 1) }).eq('id', comment.post_id)),
      ]).catch(() => {});
    }
  },
};

// ============================================================
// USER GAMES (played / owned declarations)
// ============================================================
export const userGamesAPI = {
  async getStatus(userId: string, gameId: string): Promise<{ played: boolean; owned: boolean }> {
    const { data } = await supabase
      .from('user_games')
      .select('status')
      .eq('user_id', userId)
      .eq('game_id', gameId);
    const played = (data ?? []).some((r: any) => r.status === 'played');
    const owned  = (data ?? []).some((r: any) => r.status === 'owned');
    return { played, owned };
  },

  async add(userId: string, gameId: string, status: 'played' | 'owned') {
    const { error } = await supabase
      .from('user_games')
      .upsert({ user_id: userId, game_id: gameId, status }, { onConflict: 'user_id,game_id,status', ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  },

  async remove(userId: string, gameId: string, status: 'played' | 'owned') {
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

  async send(senderId: string, recipientId: string, content: string) {
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({ sender_id: senderId, recipient_id: recipientId, content })
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
