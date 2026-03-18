import { useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { Heart, MessageCircle, Repeat2, UserPlus, Users } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useEffect } from 'react';

interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'repost' | 'follow' | 'communityInvite';
  postId?: string;
  communityId?: string;
  timestamp: Date;
  isRead: boolean;
  content?: string;
}

// Mock notifications data
const mockNotifications: Notification[] = [];

export function Notifications() {
  const navigate = useNavigate();
  const { getUserById, markNotificationsAsRead } = useAppData();

  // Mark notifications as read when page is viewed
  useEffect(() => {
    markNotificationsAsRead();
  }, [markNotificationsAsRead]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-accent" />;
      case 'repost':
        return <Repeat2 className="w-5 h-5 text-green-500" />;
      case 'communityInvite':
        return <Users className="w-5 h-5 text-accent" />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'follow':
        return 'started following you';
      case 'repost':
        return 'reposted your post';
      case 'communityInvite':
        return 'invited you to a community';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        <div className="space-y-1">
          {mockNotifications.map((notification) => {
            const user = getUserById(notification.userId);
            if (!user) return null;

            return (
              <button
                key={notification.id}
                onClick={() => navigate('/profile')}
                className={`w-full px-4 py-4 flex items-start gap-3 rounded-xl transition-colors hover:bg-secondary ${
                  !notification.isRead ? 'bg-card' : ''
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Avatar */}
                <img
                  src={user.profilePicture}
                  alt={user.displayName}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />

                {/* Content */}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">{user.displayName}</span>{' '}
                    <span className="text-muted-foreground">{getNotificationText(notification)}</span>
                  </p>
                  {notification.content && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      "{notification.content}"
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTimestamp(notification.timestamp)}
                  </p>
                </div>

                {/* Unread indicator */}
                {!notification.isRead && (
                  <div className="flex-shrink-0 w-2 h-2 bg-accent rounded-full mt-2"></div>
                )}
              </button>
            );
          })}
        </div>

        {mockNotifications.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
}