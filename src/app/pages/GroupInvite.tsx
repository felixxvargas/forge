'use client';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Loader2, UserPlus, Check, Users, Clock } from 'lucide-react';
import { useParams, useNavigate } from '@/compat/router';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { Header } from '../components/Header';
import { groups as groupsAPI, profiles as profilesAPI } from '../utils/supabase';

type InviteTab = 'invite' | 'history';

function UserRow({
  user,
  isInvited,
  isLoading,
  isMember,
  onInvite,
}: {
  user: any;
  isInvited: boolean;
  isLoading: boolean;
  isMember: boolean;
  onInvite: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <ProfileAvatar
        username={user.display_name || user.handle || '?'}
        profilePicture={user.profile_picture}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{user.display_name || user.handle}</p>
        <p className="text-sm text-muted-foreground">@{(user.handle || '').replace(/^@/, '')}</p>
      </div>
      {isMember ? (
        <span className="text-xs text-muted-foreground px-3 py-1.5 rounded-lg bg-secondary shrink-0">Member</span>
      ) : (
        <button
          onClick={onInvite}
          disabled={isInvited || isLoading}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 shrink-0 ${
            isInvited
              ? 'bg-accent/20 text-accent cursor-default'
              : 'bg-accent text-accent-foreground hover:bg-accent/90'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isInvited ? (
            <><Check className="w-3.5 h-3.5" /> Added</>
          ) : (
            <><UserPlus className="w-3.5 h-3.5" /> Add</>
          )}
        </button>
      )}
    </div>
  );
}

export function GroupInvite() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { currentUser, groups } = useAppData() as any;

  const community = groups.find((g: any) => g.id === groupId);
  const [activeTab, setActiveTab] = useState<InviteTab>('invite');

  // Members (to exclude from invite list)
  const [members, setMembers] = useState<any[]>([]);
  useEffect(() => {
    if (!groupId) return;
    groupsAPI.getMembers(groupId).then(setMembers).catch(() => {});
  }, [groupId]);
  const memberIds = new Set(members.map((m: any) => m.id));

  // Suggestions: mutual follows + recently interacted
  const [friends, setFriends] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  useEffect(() => {
    if (!currentUser?.id) return;
    setLoadingSuggestions(true);
    Promise.allSettled([
      groupsAPI.getMutualFollowers(currentUser.id),
      groupsAPI.getRecentlyInteracted(currentUser.id, 15),
    ]).then(([friendsRes, recentRes]) => {
      setFriends(friendsRes.status === 'fulfilled' ? friendsRes.value : []);
      setRecentUsers(recentRes.status === 'fulfilled' ? recentRes.value : []);
    }).finally(() => setLoadingSuggestions(false));
  }, [currentUser?.id]);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await profilesAPI.search(searchQuery);
        setSearchResults(results.filter((u: any) => u.id !== currentUser?.id));
      } catch { setSearchResults([]); }
      finally { setIsSearching(false); }
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, currentUser?.id]);

  // Invite state
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  const handleInvite = async (userId: string) => {
    if (!groupId) return;
    setInvitingId(userId);
    try {
      await groupsAPI.addMember(groupId, userId, currentUser?.id);
      setInvitedIds(prev => new Set(prev).add(userId));
    } catch (e: any) {
      alert(e.message || 'Failed to add user.');
    } finally {
      setInvitingId(null);
    }
  };

  // Invite history tab
  const [inviteHistory, setInviteHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  useEffect(() => {
    if (activeTab !== 'history' || !groupId) return;
    setLoadingHistory(true);
    groupsAPI.getInvites(groupId).then(setInviteHistory).catch(() => {}).finally(() => setLoadingHistory(false));
  }, [activeTab, groupId]);

  const isAdmin = community?.creator_id === currentUser?.id ||
    (community?.moderatorIds ?? []).includes(currentUser?.id);

  // Determine display list for invite tab
  const isSearchActive = searchQuery.trim().length > 0;
  const displayList = isSearchActive ? searchResults : [];
  const friendSuggestions = friends.filter(u => !memberIds.has(u.id) && !invitedIds.has(u.id) && u.id !== currentUser?.id);
  const recentSuggestions = recentUsers.filter(u => !memberIds.has(u.id) && !friendSuggestions.some((f: any) => f.id === u.id) && u.id !== currentUser?.id);

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <div className="max-w-2xl mx-auto">
        {/* Back + title */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">Invite to {community?.name ?? 'Group'}</h1>
          </div>
        </div>

        {/* Admin-only tabs */}
        {isAdmin && (
          <div className="flex border-b border-border">
            {(['invite', 'history'] as InviteTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? 'text-accent border-b-2 border-accent'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'history' ? 'Invited' : 'Invite'}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'invite' && (
          <>
            {/* Search bar */}
            <div className="px-4 py-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by username or display name…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ fontSize: '16px' }}
                  className="w-full pl-9 pr-9 py-2.5 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Search results */}
            {isSearchActive ? (
              <div>
                {!isSearching && searchResults.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
                )}
                {displayList.map((user: any) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isInvited={invitedIds.has(user.id)}
                    isLoading={invitingId === user.id}
                    isMember={memberIds.has(user.id)}
                    onInvite={() => handleInvite(user.id)}
                  />
                ))}
              </div>
            ) : (
              /* Suggestions when no search query */
              <div>
                {loadingSuggestions ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {friendSuggestions.length > 0 && (
                      <section>
                        <div className="flex items-center gap-2 px-4 pt-5 pb-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Friends</h2>
                        </div>
                        {friendSuggestions.map((user: any) => (
                          <UserRow
                            key={user.id}
                            user={user}
                            isInvited={invitedIds.has(user.id)}
                            isLoading={invitingId === user.id}
                            isMember={memberIds.has(user.id)}
                            onInvite={() => handleInvite(user.id)}
                          />
                        ))}
                      </section>
                    )}
                    {recentSuggestions.length > 0 && (
                      <section>
                        <div className="flex items-center gap-2 px-4 pt-5 pb-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recently Interacted</h2>
                        </div>
                        {recentSuggestions.map((user: any) => (
                          <UserRow
                            key={user.id}
                            user={user}
                            isInvited={invitedIds.has(user.id)}
                            isLoading={invitingId === user.id}
                            isMember={memberIds.has(user.id)}
                            onInvite={() => handleInvite(user.id)}
                          />
                        ))}
                      </section>
                    )}
                    {friendSuggestions.length === 0 && recentSuggestions.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-10">Search for people to invite</p>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <div>
            {loadingHistory ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : inviteHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No invites sent yet</p>
              </div>
            ) : (
              inviteHistory.map((invite: any) => {
                const user = invite.invited_user;
                if (!user) return null;
                const hasSinceJoined = memberIds.has(user.id);
                const daysAgo = Math.floor((Date.now() - new Date(invite.invited_at).getTime()) / (1000 * 60 * 60 * 24));
                const timeLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;
                return (
                  <div key={invite.id} className="flex items-center gap-3 px-4 py-3">
                    <ProfileAvatar
                      username={user.display_name || user.handle || '?'}
                      profilePicture={user.profile_picture}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.display_name || user.handle}</p>
                      <p className="text-xs text-muted-foreground">@{(user.handle || '').replace(/^@/, '')} · Invited {timeLabel}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                      hasSinceJoined
                        ? 'bg-accent/15 text-accent'
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {hasSinceJoined ? 'Member' : 'Pending'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
