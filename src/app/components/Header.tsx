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
            <svg width="20" height="16" viewBox="0 0 30 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Forge">
              <path d="M23.8546 22.0745C23.7979 22.282 23.7454 22.5338 23.5728 22.7707C23.5288 23.1602 15.1934 22.7982 14.7127 22.7861C14.2111 22.7735 14.1341 22.1925 14.2267 21.8101C14.4018 21.0873 14.3769 20.9666 13.4012 20.9113C12.5315 20.862 12.1966 20.8773 11.1815 20.8909C10.5502 20.8993 10.3816 20.9074 10.1126 21.6804C9.99697 22.0128 9.64876 22.8544 9.27062 22.8359C8.44573 22.7954 4.60944 23.0175 3.78419 23.0361C2.63975 23.062 1.45237 23.1342 0.410346 22.9347C-0.760071 22.6379 0.894435 18.5131 1.39725 16.955C1.90006 15.3969 2.56631 12.3622 4.16834 11.5331C6.34674 10.4057 9.05856 10.4719 10.9357 8.62745C11.583 7.99141 11.6584 7.36046 11.7806 6.62056C11.8589 6.14617 11.5027 5.70097 11.0902 5.39449C10.8029 5.18109 10.5792 5.00749 9.59795 4.65701C8.70017 4.33633 8.3743 4.21834 7.18528 4.01055C6.3735 3.86869 4.77876 4.05397 4.77876 3.24283C4.77876 2.87926 5.36739 0.899542 5.47746 0.622489C5.47741 -0.174039 6.13479 0.0211001 9.17101 0.0211077C14.9725 0.0211221 20.6141 0.0731651 26.4059 0.0732023C27.31 0.0732081 28.5337 0.0732023 29.2956 0.0732023C28.8365 2.44179 28.4822 3.21115 27.3705 3.38842C26.0435 3.60001 23.1275 4.35326 21.7334 4.95082C21.1549 5.25938 20.7193 5.52426 20.2956 5.78788C19.4622 6.30628 19.2417 7.64898 19.3112 8.67594C19.4076 10.101 23.3879 10.5443 25.071 11.5331C26.6525 11.8949 25.2559 16.7747 25.071 17.3973C24.5922 19.0097 24.2238 20.7229 23.8546 22.0745Z" fill="#E7FFC4"/>
            </svg>
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