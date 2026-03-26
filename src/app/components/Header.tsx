import { Bell, Settings, ZapIcon } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAppData } from '../context/AppDataContext';

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
      <div className="w-full max-w-2xl mx-auto px-4 h-14 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          {title && <h1 className="text-xl font-bold">{title}</h1>}
        </div>
        
        {/* Centered Logo */}
        {!title && (
          <div className="absolute left-1/2 -translate-x-1/2">
            <img src="/src/assets/forge-logo.svg" className="w-5 h-5 fill-current" />
          </div>
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