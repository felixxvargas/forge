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
  },

  async unfollow(followerId: string, followingId: string) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    if (error) throw new Error(error.message);
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

  async report(reporterId: string, reportedId: string, reason: string) {
    const { error } = await supabase
      .from('reports')
      .insert({ reporter_id: reporterId, reported_id: reportedId, reason });
    if (error) throw new Error(error.message);
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
  },

  async unlike(userId: string, postId: string) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);
    if (error) throw new Error(error.message);
  },

  async getLikedIds(userId: string) {
    const { data } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId);
    return (data ?? []).map((r: any) => r.post_id);
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
// COMMUNITIES
// ============================================================
export const communities = {
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
  }
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
