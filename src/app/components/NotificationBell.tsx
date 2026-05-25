import { Bell } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

interface NotificationBellProps {
  onClick?: () => void;
  className?: string;
}

export function NotificationBell({ onClick, className }: NotificationBellProps) {
  const { hasUnreadNotifications, unreadNotificationCount } = useAppData();

  return (
    <button
      onClick={onClick}
      className={`group p-2 hover:bg-secondary rounded-lg transition-colors flex items-center gap-1.5 ${className ?? ''}`}
    >
      <Bell className="w-5 h-5" />
      {hasUnreadNotifications && (
        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-accent text-[#3f2d5f] text-xs font-semibold rounded-full shadow-[0_0_8px_rgba(231,255,196,0.65)]">
          {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount || ''}
        </span>
      )}
    </button>
  );
}
