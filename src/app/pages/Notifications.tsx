import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Heart, MessageCircle, Repeat2, UserPlus, Users, AtSign, Flame, ChevronDown, Tv2 } from 'lucide-react';
import { Header } from '../components/Header';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { LFGFlareModal } from '../components/LFGFlareModal';
import { useAppData } from '../context/AppDataContext';
import { notifications as notificationsAPI, lfgFlares as lfgFlaresAPI, streamArchivesAPI } from '../utils/supabase';
import { formatTimeAgo } from '../utils/formatTimeAgo';

const RENEW_OPTIONS = [
  { label: '24 hours', minutes: 1440 },
  { label: '3 days',   minutes: 4320 },
  { label: '1 week',   minutes: 10080 },
  { label: '1 month',  minutes: 43200 },
];

export function Notifications() {
  const navigate = useNavigate();
  const { session, markNotificationsAsRead, followingIds, followUser, unfollowUser } = useAppData();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expiringFlares, setExpiringFlares] = useState<any[]>([]);
  const [followingInProgress, setFollowingInProgress] = useState<Set<string>>(new Set());
  const [renewingFlare, setRenewingFlare] = useState<string | null>(null);
  const [editFlare, setEditFlare] = useState<any | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    Promise.all([
      notificationsAPI.getForUser(session.user.id, 50),
      lfgFlaresAPI.getActiveForUser(session.user.id),
    ])
      .then(([n, flares]) => {
        setNotifs(n);
        // Show flares expiring within 7 days or already expired
        const threshold = Date.now() + 7 * 24 * 60 * 60 * 1000;
        setExpiringFlares(flares.filter(f => new Date(f.expires_at).getTime() < threshold));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    markNotificationsAsRead();
  }, [session?.user?.id]);

  const handleFollowBack = async (actorId: string) => {
    if (!actorId) return;
    setFollowingInProgress(prev => new Set([...prev, actorId]));
    try {
      if (followingIds.has(actorId)) {
        await unfollowUser(actorId);
      } else {
        await followUser(actorId);
      }
    } finally {
      setFollowingInProgress(prev => { const s = new Set(prev); s.delete(actorId); return s; });
    }
  };

  const handleRenewFlare = async (flare: any, minutes: number) => {
    setRenewingFlare(flare.id);
    try {
      await lfgFlaresAPI.extend(flare.id, minutes);
      setExpiringFlares(prev => prev.filter(f => f.id !== flare.id));
    } catch (e: any) {
      alert(e.message || 'Failed to renew flare.');
    } finally {
      setRenewingFlare(null);
    }
  };

  const handleStreamExpiryKeep = async (notif: any) => {
    const archiveId = notif.metadata?.archive_id ?? notif.post_id;
    if (!archiveId) return;
    await streamArchivesAPI.keepForAnotherYear(archiveId);
    setNotifs(prev => prev.filter(n => n.id !== notif.id));
  };

  const handleStreamExpiryDelete = async (notif: any) => {
    const archiveId = notif.metadata?.archive_id ?? notif.post_id;
    if (!archiveId) return;
    await streamArchivesAPI.softDelete(archiveId);
    setNotifs(prev => prev.filter(n => n.id !== notif.id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':    return <Heart className="w-5 h-5 text-accent fill-accent" />;
      case 'comment': return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'follow':  return <UserPlus className="w-5 h-5 text-accent" />;
      case 'repost':  return <Repeat2 className="w-5 h-5 text-green-500" />;
      case 'mention': return <AtSign className="w-5 h-5 text-accent" />;
      case 'communityInvite': return <Users className="w-5 h-5 text-accent" />;
      case 'stream_expiry': return <Tv2 className="w-5 h-5 text-amber-400" />;
      default: return null;
    }
  };

  const getText = (type: string) => {
    switch (type) {
      case 'like':    return 'liked your post';
      case 'comment': return 'commented on your post';
      case 'follow':  return 'started following you';
      case 'repost':  return 'reposted your post';
      case 'mention': return 'mentioned you in a post';
      case 'communityInvite': return 'invited you to a group';
      default: return 'interacted with you';
    }
  };

  const handleClick = (notif: any) => {
    if (notif.post_id) navigate(`/post/${notif.post_id}`);
    else if (notif.actor?.id) navigate(`/profile/${notif.actor.id}`);
  };

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>

        {isLoading ? (
          <div className="space-y-1">
            {['w-3/4', 'w-2/3', 'w-5/6', 'w-3/5', 'w-4/5', 'w-2/3', 'w-3/4'].map((w, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5 animate-pulse">
                <div className="w-5 h-5 rounded-full bg-muted/40 shrink-0 mt-0.5" />
                <div className="w-10 h-10 rounded-full bg-muted/40 shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5 pt-1">
                  <div className={`h-3 bg-muted/50 rounded ${w}`} />
                  <div className="h-2.5 bg-muted/30 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {/* ── LFG expiry alerts ── */}
            {expiringFlares.map(flare => {
              const isExpired = new Date(flare.expires_at) < new Date();
              const daysLeft = Math.ceil((new Date(flare.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const busy = renewingFlare === flare.id;
              return (
                <div key={`flare-${flare.id}`} className="px-4 py-4 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-3">
                  <div className="flex items-start gap-3">
                    <Flame className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">
                        {isExpired ? 'LFG flare expired' : `LFG flare expiring ${daysLeft <= 0 ? 'today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}`}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground">{flare.game_title}</span>
                        {' · '}{flare.flare_type === 'lfg' ? 'Looking for Group' : 'Looking for More'}
                        {flare.game_mode ? ` · ${flare.game_mode}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {/* Renew dropdown */}
                    <div className="relative flex items-stretch rounded-lg overflow-hidden border border-orange-400/40 text-sm">
                      <span className="px-3 py-2 bg-orange-500/15 text-orange-300 font-medium flex items-center">Renew</span>
                      <div className="relative">
                        <select
                          className="appearance-none pl-3 pr-7 py-2 bg-orange-500/10 text-orange-200 font-medium focus:outline-none cursor-pointer"
                          defaultValue={1440}
                          onChange={e => !busy && handleRenewFlare(flare, Number(e.target.value))}
                          disabled={busy}
                        >
                          {RENEW_OPTIONS.map(opt => (
                            <option key={opt.minutes} value={opt.minutes}>{opt.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-400 pointer-events-none" />
                      </div>
                    </div>
                    {/* Edit & Repost */}
                    <button
                      onClick={() => setEditFlare(flare)}
                      className="px-3 py-2 rounded-lg border border-orange-400/40 bg-orange-500/10 text-orange-300 text-sm font-medium hover:bg-orange-500/20 transition-colors"
                    >
                      Edit & Repost
                    </button>
                  </div>
                </div>
              );
            })}

            {/* ── Regular notifications ── */}
            {notifs.length === 0 && expiringFlares.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifs.map((notif) => {
                const actor = notif.actor;

                // Stream expiry notification — custom card with Keep/Delete actions
                if (notif.type === 'stream_expiry') {
                  const title = notif.metadata?.archive_title ?? 'Archived stream';
                  const durSec: number = notif.metadata?.duration_seconds ?? 0;
                  const h = Math.floor(durSec / 3600);
                  const m = Math.floor((durSec % 3600) / 60);
                  const dur = h > 0 ? `${h}h ${m}m` : `${m}m`;
                  return (
                    <div key={notif.id} className="px-4 py-4 bg-amber-950/30 border border-amber-600/25 rounded-xl">
                      <div className="flex items-start gap-3">
                        <Tv2 className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-amber-200">Stream archive expiring</p>
                          <p className="text-xs text-amber-300/80 mt-0.5 truncate">"{title}" · {dur}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            This archive is over 1 year old. Keep it for another year or delete it now.
                          </p>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleStreamExpiryKeep(notif)}
                              className="px-3 py-1.5 bg-accent text-accent-foreground text-xs font-medium rounded-lg"
                            >
                              Keep another year
                            </button>
                            <button
                              onClick={() => handleStreamExpiryDelete(notif)}
                              className="px-3 py-1.5 border border-border text-xs rounded-lg hover:bg-secondary transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground shrink-0">{formatTimeAgo(notif.created_at)}</p>
                      </div>
                    </div>
                  );
                }

                const isFollowNotif = notif.type === 'follow';
                const alreadyFollowing = actor ? followingIds.has(actor.id) : false;
                const followBusy = actor ? followingInProgress.has(actor.id) : false;
                return (
                  <div
                    key={notif.id}
                    className={`w-full px-4 py-4 flex items-start gap-3 rounded-xl transition-colors ${!notif.read ? 'bg-card' : 'hover:bg-secondary'}`}
                  >
                    <button className="flex items-start gap-3 flex-1 min-w-0 text-left" onClick={() => handleClick(notif)}>
                      <div className="flex-shrink-0 mt-1">{getIcon(notif.type)}</div>
                      {actor && (
                        <ProfileAvatar
                          username={actor.display_name || actor.handle || '?'}
                          profilePicture={actor.profile_picture}
                          userId={actor.id}
                          size="sm"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-semibold">
                            {actor?.display_name || actor?.handle || 'Someone'}
                          </span>{' '}
                          <span className="text-muted-foreground">{getText(notif.type)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimeAgo(notif.created_at)}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      {!notif.read && <div className="w-2 h-2 bg-accent rounded-full" />}
                      {isFollowNotif && actor && actor.id !== session?.user?.id && (
                        <button
                          onClick={() => handleFollowBack(actor.id)}
                          disabled={followBusy}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                            alreadyFollowing
                              ? 'bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                              : 'bg-accent text-accent-foreground hover:bg-accent/90'
                          }`}
                        >
                          {followBusy ? '…' : alreadyFollowing ? 'Following' : 'Follow Back'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Edit & Repost LFG modal */}
      {editFlare && (
        <LFGFlareModal
          isOpen={true}
          onClose={() => setEditFlare(null)}
          prefilledGame={{ id: editFlare.game_id, title: editFlare.game_title }}
          prefilledType={editFlare.flare_type}
          onCreated={() => {
            // Remove old flare and close
            lfgFlaresAPI.remove(editFlare.id).catch(() => {});
            setExpiringFlares(prev => prev.filter(f => f.id !== editFlare.id));
            setEditFlare(null);
          }}
        />
      )}
    </div>
  );
}
