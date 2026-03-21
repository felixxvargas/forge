import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Heart, MessageCircle, Repeat2, UserPlus, Users, AtSign } from 'lucide-react';
import { Header } from '../components/Header';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { useAppData } from '../context/AppDataContext';
import { notifications as notificationsAPI } from '../utils/supabase';
import { formatTimeAgo } from '../utils/formatTimeAgo';

export function Notifications() {
  const navigate = useNavigate();
  const { session, markNotificationsAsRead } = useAppData();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    notificationsAPI.getForUser(session.user.id, 50)
      .then(setNotifs)
      .catch(() => {})
      .finally(() => setIsLoading(false));
    markNotificationsAsRead();
  }, [session?.user?.id]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':    return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'follow':  return <UserPlus className="w-5 h-5 text-accent" />;
      case 'repost':  return <Repeat2 className="w-5 h-5 text-green-500" />;
      case 'mention': return <AtSign className="w-5 h-5 text-accent" />;
      case 'communityInvite': return <Users className="w-5 h-5 text-accent" />;
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
      case 'communityInvite': return 'invited you to a community';
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
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
          </div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifs.map((notif) => {
              const actor = notif.actor;
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full px-4 py-4 flex items-start gap-3 rounded-xl transition-colors hover:bg-secondary ${
                    !notif.read ? 'bg-card' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">{getIcon(notif.type)}</div>
                  {actor && (
                    <ProfileAvatar
                      username={actor.display_name || actor.handle || '?'}
                      profilePicture={actor.profile_picture}
                      userId={actor.id}
                      size="sm"
                    />
                  )}
                  <div className="flex-1 text-left min-w-0">
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
                  {!notif.read && (
                    <div className="flex-shrink-0 w-2 h-2 bg-accent rounded-full mt-2" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
