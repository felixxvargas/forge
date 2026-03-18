import { Platform } from '../data/data';

interface PlatformIconProps {
  platform: Platform;
  className?: string;
  userHandle?: string;
  showHandle?: boolean;
}

export function PlatformIcon({ platform, className = "w-5 h-5", userHandle, showHandle }: PlatformIconProps) {
  const iconClass = className;
  
  const getPlatformLabel = (platform: Platform): string => {
    const labels: Record<Platform, string> = {
      'steam': 'Steam',
      'epic': 'Epic Games',
      'ea': 'EA',
      'playstation': 'PlayStation',
      'nintendo': 'Nintendo',
      'xbox': 'Xbox',
      'pc': 'PC',
      'gog': 'GOG',
      'ubisoft': 'Ubisoft',
      'rockstar': 'Rockstar',
      'battlenet': 'Battle.net',
      'riot': 'Riot'
    };
    return labels[platform] || platform;
  };

  const renderIcon = () => {
    switch (platform) {
      case 'steam':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10c-4.6 0-8.4-3.1-9.6-7.3l3.3 1.4c.3 1.3 1.5 2.2 2.9 2.2 1.6 0 2.9-1.3 2.9-2.9v-.1l4.1-2.9h.1c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4v.1l-2.9 4.1c-.2 0-.4-.1-.6-.1-1.6 0-2.9 1.3-2.9 2.9 0 .1 0 .3.1.4l-3.4-1.4C2.1 13.2 2 12.6 2 12 2 6.5 6.5 2 12 2m0 1.5c-4.7 0-8.5 3.8-8.5 8.5 0 .3 0 .6.1.9l2.1.9c.4-.8 1.2-1.4 2.2-1.6l2.2-3.1v-.1c0-1.8 1.5-3.3 3.3-3.3s3.3 1.5 3.3 3.3-1.5 3.3-3.3 3.3h-.1l-3.1 2.2c0 .1 0 .3-.1.4 0 1.1-.9 2-2 2s-2-.9-2-2c0-.1 0-.2.1-.3l-2.5-1c.5 3.3 3.4 5.8 6.8 5.8 3.9 0 7-3.1 7-7s-3.1-7-7-7m4.5 4.5c0 1.2-1 2.2-2.2 2.2s-2.2-1-2.2-2.2 1-2.2 2.2-2.2 2.2 1 2.2 2.2z" />
          </svg>
        );
      
      case 'epic':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M3 3h18v18H3V3m15 15V6H6v12h12M8 8h8v2H8V8m0 3h8v2H8v-2m0 3h5v2H8v-2z" />
          </svg>
        );
      
      case 'ea':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M16.635 3L24 21h-4.687l-1.23-3H11.4l-1.23 3H5.484L12.85 3h3.784M14.742 7.5l-2.054 5.625h4.108L14.742 7.5M3.5 9v3h4.313v2.25H3.5V18h6v-2.25H5.812V11.25H9.5V9H3.5z" />
          </svg>
        );
      
      case 'playstation':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M8.985 2.596v17.548l3.069 1.838V7.344L8.985 2.596zm11.85 9.618l-4.7-1.505v4.157l4.7 1.503c.656.204.969.545.969 1.002 0 .456-.313.792-.969.996l-4.7 1.505V22l4.684-1.505c2.285-.705 3.848-1.946 3.848-3.799 0-1.854-1.563-3.092-3.832-3.482zM8.985 17v4.095l4.538 1.396c1.188.365 2.082.68 3.116 1.054v-5.01c-1.053-.374-2.291-.699-3.504-1.042L8.985 17z"/>
          </svg>
        );
      
      case 'nintendo':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M7.5 2C5 2 3 4 3 6.5v11C3 20 5 22 7.5 22h1c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1h-1m6.5 0c-.55 0-1 .45-1 1v18c0 .55.45 1 1 1h1c2.5 0 4.5-2 4.5-4.5v-11C19.5 4 17.5 2 15 2h-1m1.5 2c1.39 0 2.5 1.11 2.5 2.5v11c0 1.39-1.11 2.5-2.5 2.5V4m-9 4.5A1.5 1.5 0 0 1 7.5 10 1.5 1.5 0 0 1 6 8.5 1.5 1.5 0 0 1 7.5 7 1.5 1.5 0 0 1 9 8.5Z" />
          </svg>
        );
      
      case 'xbox':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M4.102 21.033A11.947 11.947 0 0 0 12 24a11.96 11.96 0 0 0 7.902-2.967c1.877-1.912-4.316-8.709-7.902-11.417-3.582 2.708-9.779 9.505-7.898 11.417zm11.16-14.406c2.5 2.961 7.484 10.313 6.076 12.912A11.942 11.942 0 0 0 24 12.004a11.95 11.95 0 0 0-3.57-8.536 12.004 12.004 0 0 0-2.398-1.962s-2.797 2.914-2.77 5.121zM3.566 3.472A11.947 11.947 0 0 0 0 12.004a11.939 11.939 0 0 0 2.662 7.535c-1.406-2.6 3.58-9.951 6.08-12.912.023-2.207-2.771-5.119-2.771-5.119a12.006 12.006 0 0 0-2.405 1.964zM12 6.846S9.047 3.645 7.834 2.523C8.826 2.195 9.878 2 11 2h2c1.121 0 2.174.195 3.166.523C14.953 3.645 12 6.846 12 6.846z" />
          </svg>
        );
      
      case 'gog':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-1h2v1h-2zm1.5-2.5h-1c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-1.5c0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5c0 2.5-3 2.75-3 5z" />
          </svg>
        );
      
      case 'ubisoft':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c4.41 0 8 3.59 8 8 0 1.48-.41 2.86-1.12 4.06l-1.87-1.87C17.63 13.47 18 12.77 18 12c0-3.31-2.69-6-6-6s-6 2.69-6 6c0 .77.37 1.47 1 1.94L5.12 16.06C4.41 14.86 4 13.48 4 12c0-4.41 3.59-8 8-8zm0 4c2.21 0 4 1.79 4 4 0 .74-.21 1.43-.58 2.02L12 10.59 8.58 14.02C8.21 13.43 8 12.74 8 12c0-2.21 1.79-4 4-4z" />
          </svg>
        );
      
      case 'rockstar':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M12 2l2.5 7.5H22l-6.5 5 2.5 7.5L12 17l-6.5 5 2.5-7.5-6.5-5h7.5z" />
          </svg>
        );
      
      case 'battlenet':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c.93 0 1.82.18 2.65.5L12 8.17 9.35 5.5C10.18 5.18 11.07 5 12 5zm-5 2.17L9.17 12 7 14.17V7.17zm10 9.66L14.83 12 17 9.83v6.83zm-5 2.67c-.93 0-1.82-.18-2.65-.5L12 15.83l2.65 2.67c-.83.32-1.72.5-2.65.5z" />
          </svg>
        );
      
      case 'riot':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M12 2L2 7v10l10 5 10-5V7l-10-5zm0 2.18L19.82 8 12 11.82 4.18 8 12 4.18zM4 9.47l7 3.5v7.85l-7-3.5V9.47zm16 0v7.85l-7 3.5v-7.85l7-3.5z" />
          </svg>
        );
      
      case 'pc':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M4 6h16v10H4V6m16-2H4c-1.11 0-2 .89-2 2v10a2 2 0 0 0 2 2h6v2H8v2h8v-2h-2v-2h6a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
          </svg>
        );
      
      default:
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6m4 18H6V4h7v5h5v11m-6-1v-4.5l-2.5 1.5L10 15v-4.5H8V16h8v-5.5h-2V15l-2.5-1.5L9 15Z" />
          </svg>
        );
    }
  };
  
  // If being used as a badge with userHandle
  if (showHandle && userHandle) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg">
        {renderIcon()}
        <span className="text-sm font-medium">{userHandle}</span>
      </div>
    );
  }
  
  // If being used as a badge without userHandle (show platform name)
  if (showHandle) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg">
        {renderIcon()}
        <span className="text-sm font-medium capitalize">{getPlatformLabel(platform)}</span>
      </div>
    );
  }
  
  // Just the icon
  return renderIcon();
}