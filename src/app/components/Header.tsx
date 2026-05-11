import { Bell, Settings } from 'lucide-react';
import { useNavigate } from '@/compat/router';
import { useAppData } from '../context/AppDataContext';
import ForgeLogo from '../../assets/forge-logo.svg?react';
import { BetaTag } from './ui/BetaTag';

interface HeaderProps {
  title?: string;
  showNotifications?: boolean;
  showSettings?: boolean;
}

export function Header({ title, showNotifications = true, showSettings = true }: HeaderProps) {
  const navigate = useNavigate();
  const { hasUnreadNotifications, unreadNotificationCount } = useAppData();

  return (
    <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
      <div className="w-full px-4 h-14 flex items-center relative">
        {/* Left zone */}
        <div className="flex-1 flex items-center">
          {title && <h1 className="text-2xl font-semibold">{title}</h1>}
        </div>

        {/* Center — absolutely positioned so it sits at true viewport center on desktop.
            The header lives inside a div offset by the sidebar (md:60px, lg:220px), so
            plain left-1/2 lands at content-area center, not viewport center. We compensate
            by subtracting half the sidebar width: calc(50% - 30px) on md, calc(50% - 110px) on lg. */}
        {!title && (
          <div className="md:hidden absolute left-1/2 -translate-x-1/2">
            <button
              className="p-2 rounded-lg hover:bg-secondary/60 transition-colors"
              onClick={() => { navigate('/feed'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              aria-label="Go to feed"
            >
              <div className="flex items-center gap-1.5">
                <ForgeLogo width="28" height="22" aria-hidden="true" />
                <BetaTag size="sm" />
              </div>
            </button>
          </div>
        )}

        {/* Right zone */}
        <div className="flex-1 flex items-center justify-end gap-1">
          {showNotifications && (
            <button
              onClick={() => navigate('/notifications')}
              className="group p-2 hover:bg-secondary rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Bell className="w-5 h-5" />
              {hasUnreadNotifications && (
                <span className="relative">
                  <span className="absolute inset-0 rounded-full bg-accent/50 animate-ping" aria-hidden="true" />
                  <span className="relative flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-accent text-accent-foreground text-xs font-semibold rounded-full transition-shadow group-hover:shadow-[0_0_8px_rgba(231,255,196,0.65)]">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount || ''}
                  </span>
                </span>
              )}
            </button>
          )}
          {showSettings && (
            <button
              onClick={() => navigate('/settings')}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}