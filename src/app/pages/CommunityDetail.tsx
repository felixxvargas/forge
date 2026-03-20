import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Users, Lock, UserPlus, Settings, X } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { PostCard } from '../components/PostCard';

export function CommunityDetail() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { currentUser, posts, getUserById, likePost, unlikePost, users, communities } = useAppData();

  const community = communities.find((c: any) => c.id === communityId);
  const [isMember, setIsMember] = useState(
    currentUser?.communities?.some(c => c.community_id === communityId) || false
  );
  const [showMembersModal, setShowMembersModal] = useState(false);
  
  if (!community) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="w-full max-w-2xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold">Community not found</h2>
        </div>
      </div>
    );
  }

  const userMembership = currentUser?.communities?.find(c => c.community_id === communityId);
  const isCreator = (community.creator_id ?? community.creatorId) === currentUser?.id;
  const isModerator = (community.moderatorIds ?? []).includes(currentUser?.id);

  // Get all members
  const allMembers = community.memberIds
    ?.map(id => getUserById(id))
    .filter(Boolean) || [];

  // Separate friends from other members
  const friends = allMembers.filter(member => member.isFollowing);
  const otherMembers = allMembers.filter(member => !member.isFollowing);
  
  // Combine with friends first
  const sortedMembers = [...friends, ...otherMembers];

  // Get sample member avatars
  const memberAvatars = allMembers.slice(0, 3);

  // Filter posts to show only community posts
  const communityPosts = posts.filter(p => p.communityId === communityId);

  const handleJoinCommunity = () => {
    if (community.type === 'invite') {
      alert('This is an invite-only community. You need an invitation to join.');
      return;
    }
    
    if (community.type === 'request') {
      alert('Join request sent! You will be notified when approved.');
      return;
    }

    // Open community - join immediately
    setIsMember(true);
  };

  const getTypeLabel = () => {
    switch (community.type) {
      case 'open': return 'Open Community';
      case 'request': return 'Approval Required';
      case 'invite': return 'Invite Only';
    }
  };

  const getTypeIcon = () => {
    if (community.type === 'invite') return <Lock className="w-4 h-4" />;
    return null;
  };

  const handleLikeToggle = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post?.isLiked) {
      unlikePost(postId);
    } else {
      likePost(postId);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">{community.name}</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto">
        {/* Banner */}
        {community.banner && (
          <div className="h-32 overflow-hidden">
            <img 
              src={community.banner} 
              alt={community.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Community Info */}
        <div className="px-4 py-6 bg-card border-b border-border">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center text-3xl flex-shrink-0">
              {community.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold mb-2">{community.name}</h2>
              
              {/* Community Type */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                {getTypeIcon()}
                <span>{getTypeLabel()}</span>
              </div>
            </div>
          </div>

          {/* Friends who play - Left aligned under icon */}
          {friends.length > 0 && (
            <button
              onClick={() => setShowMembersModal(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <div className="flex -space-x-2">
                {friends.slice(0, 3).map((friend, index) => (
                  <img
                    key={friend.id || index}
                    src={friend.profilePicture}
                    alt={friend.displayName}
                    className="w-6 h-6 rounded-full border-2 border-card object-cover"
                    title={friend.displayName}
                  />
                ))}
              </div>
              <span>
                {friends.length} {friends.length === 1 ? 'friend plays' : 'friends play'}
              </span>
            </button>
          )}

          {/* Member count - Left aligned under icon */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Users className="w-4 h-4" />
            <span>{community.memberCount.toLocaleString()} members</span>
          </div>

          <p className="text-muted-foreground mb-4">{community.description}</p>

          <div className="flex gap-2">
            {!isMember ? (
              <button
                onClick={handleJoinCommunity}
                className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {community.type === 'invite' ? 'Invite Only' : community.type === 'request' ? 'Request to Join' : 'Join Community'}
              </button>
            ) : (
              <button
                className="px-6 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
              >
                Joined
              </button>
            )}
            {(isCreator || isModerator) && (
              <button
                className="p-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                title="Community Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Community Feed */}
        <div className="px-4 py-6">
          <h3 className="text-lg font-semibold mb-4">Community Posts</h3>
          {isMember ? (
            communityPosts.length > 0 ? (
              communityPosts.map(post => {
                const postUser = getUserById(post.userId);
                if (!postUser) return null;
                
                return (
                  <PostCard
                    key={post.id}
                    post={post}
                    user={postUser}
                    onLike={handleLikeToggle}
                  />
                );
              })
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No posts yet. Be the first to post in this community!</p>
              </div>
            )
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Join this community to see posts and participate
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-4 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Community Members</h2>
              <button
                onClick={() => setShowMembersModal(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {friends.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Friends ({friends.length})
                  </h3>
                  <div className="space-y-2">
                    {friends.map((friend) => (
                      <button
                        key={friend.id}
                        onClick={() => {
                          setShowMembersModal(false);
                          navigate(`/profile/${friend.id}`);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <img
                          src={friend.profilePicture}
                          alt={friend.displayName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 text-left">
                          <p className="font-semibold">{friend.displayName}</p>
                          <p className="text-sm text-muted-foreground">{friend.handle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {otherMembers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Other Members ({otherMembers.length})
                  </h3>
                  <div className="space-y-2">
                    {otherMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => {
                          setShowMembersModal(false);
                          navigate(`/profile/${member.id}`);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <img
                          src={member.profilePicture}
                          alt={member.displayName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 text-left">
                          <p className="font-semibold">{member.displayName}</p>
                          <p className="text-sm text-muted-foreground">{member.handle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}