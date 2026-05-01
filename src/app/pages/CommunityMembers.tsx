import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Loader2, ShieldOff, UserMinus, Crown, ShieldCheck } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { groups as groupsAPI } from '../utils/supabase';

export function CommunityMembers() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { currentUser, groups } = useAppData();

  const community = groups.find((c: any) => c.id === groupId);
  const creatorId = community?.creator_id ?? community?.creatorId ?? '';
  const isCreator = creatorId === currentUser?.id;
  const isModerator = (community?.moderatorIds ?? []).includes(currentUser?.id);
  const isAdmin = isCreator || isModerator;

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!groupId) return;
    groupsAPI.getMembers(groupId)
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [groupId]);

  const handleRemove = async (userId: string) => {
    if (!isAdmin || userId === creatorId) return;
    setActionLoading(userId);
    try {
      await groupsAPI.removeMember(groupId!, userId);
      setMembers(prev => prev.filter(m => m.id !== userId));
    } catch (e: any) {
      alert(e.message || 'Failed to remove member.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBan = async (userId: string) => {
    if (!isAdmin || userId === creatorId) return;
    if (!confirm('Ban this user from the group? They will be removed and cannot rejoin.')) return;
    setActionLoading(userId);
    try {
      await groupsAPI.banMember(groupId!, userId);
      setMembers(prev => prev.filter(m => m.id !== userId));
    } catch (e: any) {
      alert(e.message || 'Failed to ban member.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTransferAdmin = async (userId: string, displayName: string) => {
    if (!isCreator || userId === creatorId) return;
    if (!confirm(`Make ${displayName} the new group admin? You will lose admin privileges.`)) return;
    setActionLoading(userId);
    try {
      await groupsAPI.transferAdmin(groupId!, userId);
      // Update local member roles to reflect the change
      setMembers(prev => prev.map(m => {
        if (m.id === userId) return { ...m, role: 'creator' };
        if (m.id === currentUser?.id) return { ...m, role: 'member' };
        return m;
      }));
      navigate(-1);
    } catch (e: any) {
      alert(e.message || 'Failed to transfer admin.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Members</h1>
            {community && (
              <p className="text-sm text-muted-foreground">{community.name}</p>
            )}
          </div>
          {!loading && (
            <span className="ml-auto text-sm text-muted-foreground">{members.length}</span>
          )}
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No members found</p>
        ) : (
          <div className="space-y-1">
            {members.map((member: any) => {
              const isCreatorRow = member.id === creatorId;
              const busy = actionLoading === member.id;
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary transition-colors"
                >
                  <button
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    onClick={() => navigate(`/profile/${member.id}`)}
                  >
                    <ProfileAvatar
                      username={member.display_name || member.handle || '?'}
                      profilePicture={member.profile_picture}
                      userId={member.id}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold truncate">{member.display_name || member.handle}</p>
                        {isCreatorRow && (
                          <Crown className="w-3.5 h-3.5 text-accent shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">@{(member.handle || '').replace(/^@/, '')}</p>
                    </div>
                  </button>

                  {isAdmin && !isCreatorRow && member.id !== currentUser?.id && (
                    <div className="flex gap-1 shrink-0">
                      {isCreator && (
                        <button
                          onClick={() => handleTransferAdmin(member.id, member.display_name || member.handle || 'this user')}
                          disabled={busy}
                          className="p-2 rounded-lg hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors"
                          title="Make group admin"
                        >
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(member.id)}
                        disabled={busy}
                        className="p-2 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                        title="Remove from group"
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleBan(member.id)}
                        disabled={busy}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Ban from group"
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
