import { Bell, Settings } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import ForgeLogo from '../../assets/forge-logo.svg?react';

interface HeaderProps {
  title?: string;
  showNotifications?: boolean;
  showSettings?: boolean;
}

export function Header({ title, showNotifications = true, showSettings = true }: HeaderProps) {
  const navigate = useNavigate();
  const { hasUnreadNotifications } = useAppData();

  return (
    <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
      <div className="w-full max-w-2xl lg:max-w-3xl mx-auto px-4 h-14 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          {title && <h1 className="text-xl font-bold">{title}</h1>}
        </div>
        
        {/* Centered Logo */}
        {!title && (
          <button
            className="absolute left-1/2 -translate-x-1/2 p-2 rounded-lg hover:bg-secondary/60 transition-colors"
            onClick={() => { navigate('/feed'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            aria-label="Go to feed"
          >
            <div className="flex items-center gap-1.5">
              <ForgeLogo width="28" height="22" aria-hidden="true" />
              <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-accent/15 text-accent leading-none">beta</span>
            </div>
          </button>
        )}
        
        <div className="flex items-center gap-1">
          {showNotifications && (
            <button 
              onClick={() => navigate('/notifications')}
              className="p-2 hover:bg-secondary rounded-lg transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {hasUnreadNotifications && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-accent rounded-full" />
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