import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, ExternalLink, Users } from 'lucide-react';
import { Header } from '../components/Header';
import { PostCard } from '../components/PostCard';
import { FollowButton } from '../components/FollowButton';
import { fetchBlueskyProfile, fetchBlueskyPosts, topicAccountBlueskyHandles } from '../utils/bluesky';
import { useAppData } from '../context/AppDataContext';
import { formatNumber } from '../utils/formatNumber';

// Reverse map: bsky handle → forge topic user id
const bskyHandleToForgeId: Record<string, string> = Object.fromEntries(
  Object.entries(topicAccountBlueskyHandles).map(([id, handle]) => [handle, id])
);

export function BlueskyProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { followingIds, likedPosts, repostedPosts } = useAppData() as any;

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const forgeId = handle ? bskyHandleToForgeId[handle] : undefined;
  const isFollowing = forgeId ? followingIds?.has(forgeId) : false;

  useEffect(() => {
    if (!handle) return;
    setLoading(true);
    Promise.all([
      fetchBlueskyProfile(handle),
      fetchBlueskyPosts(handle, 20),
    ]).then(([prof, postsData]) => {
      setProfile(prof);
      setPosts(postsData);
    }).finally(() => setLoading(false));
  }, [handle]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-24">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        ) : !profile ? (
          <div className="text-center py-20 text-muted-foreground">Profile not found.</div>
        ) : (
          <>
            {/* Profile header */}
            <div className="bg-card rounded-2xl p-5 mb-4">
              <div className="flex items-start gap-4">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.displayName}
                    className="w-16 h-16 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <h1 className="text-xl font-bold">{profile.displayName}</h1>
                      <p className="text-sm text-muted-foreground">@{profile.handle}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {forgeId && (
                        <FollowButton
                          userId={forgeId}
                          initialFollowingState={isFollowing}
                          size="sm"
                        />
                      )}
                      <a
                        href={`https://bsky.app/profile/${profile.handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Bluesky
                      </a>
                    </div>
                  </div>
                  {profile.description && (
                    <p className="text-sm mt-2 text-foreground/80 line-clamp-4">{profile.description}</p>
                  )}
                  <div className="flex gap-4 mt-3 text-sm">
                    <span>
                      <strong>{formatNumber(profile.followersCount)}</strong>{' '}
                      <span className="text-muted-foreground">followers</span>
                    </span>
                    <span>
                      <strong>{formatNumber(profile.followsCount)}</strong>{' '}
                      <span className="text-muted-foreground">following</span>
                    </span>
                    <span className="text-muted-foreground">
                      <strong>{formatNumber(profile.postsCount)}</strong> posts
                    </span>
                  </div>
                </div>
              </div>

              {/* Platform badge */}
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400">Bluesky</span>
                <span className="text-xs text-muted-foreground">Posts shown from Bluesky via AT Protocol</span>
              </div>
            </div>

            {/* Posts */}
            <div className="space-y-3">
              {posts.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">No posts found.</div>
              ) : (
                posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    user={{ id: post.userId, handle: profile.handle, displayName: profile.displayName, profilePicture: profile.avatar } as any}
                    isLiked={likedPosts?.has(post.id)}
                    isReposted={repostedPosts?.has(post.id)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
