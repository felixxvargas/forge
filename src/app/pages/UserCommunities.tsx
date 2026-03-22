import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Crown, Shield } from 'lucide-react';
import { Header } from '../components/Header';
import { useAppData } from '../context/AppDataContext';

export function UserCommunities() {
  const navigate = useNavigate();
  const { currentUser, groups } = useAppData();

  const userCommunities = (currentUser?.communities || [])
    .map((membership: any) => {
      const group = groups.find((c: any) => c.id === (membership.community_id ?? membership.communityId));
      return group ? { ...membership, ...group } : null;
    })
    .filter(Boolean);

  const formatJoinedDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2">Groups</h1>
          <p className="text-muted-foreground">
            {userCommunities.length} {userCommunities.length === 1 ? 'group' : 'groups'}
          </p>
        </div>

        {/* Groups list */}
        <div className="space-y-3">
          {userCommunities.map((item: any) => (
            <div
              key={item.communityId}
              onClick={() => navigate(`/group/${item.id}`)}
              className="bg-card rounded-xl p-4 hover:bg-card/80 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{item.name}</h3>
                    {item.role === 'creator' && (
                      <Crown className="w-4 h-4 text-accent" title="Creator" />
                    )}
                    {item.role === 'moderator' && (
                      <Shield className="w-4 h-4 text-accent" title="Moderator" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{item.memberCount.toLocaleString()} members</span>
                    <span>•</span>
                    <span>Joined {formatJoinedDate(item.joinedAt)}</span>
                    <span>•</span>
                    <span className="capitalize">{item.type}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {userCommunities.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No groups yet</p>
            <button
              onClick={() => navigate('/explore')}
              className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
            >
              Explore Groups
            </button>
          </div>
        )}
      </div>
    </div>
  );
}