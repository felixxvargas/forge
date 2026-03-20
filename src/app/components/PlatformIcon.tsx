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
      'riot': 'Riot',
    };
    return labels[platform] || platform;
  };

  const renderIcon = () => {
    switch (platform) {
      case 'steam':
        // Steam logo — ball with pipe and circle
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M11.979 0C5.678 0 .511 4.86.052 11.02l6.564 2.781c.556-.381 1.237-.6 1.97-.6.065 0 .13.003.194.007l2.948-4.27v-.06c0-2.63 2.14-4.769 4.77-4.769 2.63 0 4.77 2.14 4.77 4.77s-2.14 4.77-4.77 4.77h-.11l-4.21 3c.01.1.015.2.015.3 0 1.973-1.598 3.573-3.571 3.573-1.726 0-3.172-1.228-3.51-2.855l-4.74-1.961C2.373 20.67 6.856 24 12.16 24c6.603 0 11.96-5.356 11.96-11.96C24.12 5.357 18.763 0 12.16 0h-.181zM8.79 16.033c-.536.318-1.18.44-1.82.336a2.826 2.826 0 0 1-1.553-.84l-1.4-.58c.323.703.9 1.27 1.65 1.565.75.296 1.577.298 2.326.003.75-.295 1.367-.858 1.72-1.576l-.923.092zm8.92-8.12a3.18 3.18 0 1 0 0 6.36 3.18 3.18 0 0 0 0-6.36zm-.003 1.43a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5z" />
          </svg>
        );

      case 'epic':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M3 2v20h5v-7h5v-3H8V5h8V2H3zm10 0v3h5v14h-5v3h8V2h-8z" />
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
            <path d="M8.985 2.596v17.548l3.069 1.838V7.344L8.985 2.596zm11.85 9.618l-4.7-1.505v4.157l4.7 1.503c.656.204.969.545.969 1.002 0 .456-.313.792-.969.996l-4.7 1.505V22l4.684-1.505c2.285-.705 3.848-1.946 3.848-3.799 0-1.854-1.563-3.092-3.832-3.482zM8.985 17v4.095l4.538 1.396c1.188.365 2.082.68 3.116 1.054v-5.01c-1.053-.374-2.291-.699-3.504-1.042L8.985 17z" />
          </svg>
        );

      case 'nintendo':
        // Nintendo Switch icon — two Joy-Cons
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M14.942 2.994H9.058C5.26 2.994 2.994 5.26 2.994 9.058v5.884c0 3.798 2.266 6.064 6.064 6.064h5.884c3.798 0 6.064-2.266 6.064-6.064V9.058c0-3.798-2.266-6.064-6.064-6.064zm-5.884 1.5h5.884c2.987 0 4.564 1.577 4.564 4.564v5.884c0 2.987-1.577 4.564-4.564 4.564H9.058c-2.987 0-4.564-1.577-4.564-4.564V9.058c0-2.987 1.577-4.564 4.564-4.564zM9.5 7A1.5 1.5 0 0 0 8 8.5 1.5 1.5 0 0 0 9.5 10 1.5 1.5 0 0 0 11 8.5 1.5 1.5 0 0 0 9.5 7zm5 4a1.5 1.5 0 0 0-1.5 1.5A1.5 1.5 0 0 0 14.5 14 1.5 1.5 0 0 0 16 12.5 1.5 1.5 0 0 0 14.5 11z" />
          </svg>
        );

      case 'xbox':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M4.102 21.033A11.947 11.947 0 0 0 12 24a11.96 11.96 0 0 0 7.902-2.967c1.877-1.912-4.316-8.709-7.902-11.417-3.582 2.708-9.779 9.505-7.898 11.417zm11.16-14.406c2.5 2.961 7.484 10.313 6.076 12.912A11.942 11.942 0 0 0 24 12.004a11.95 11.95 0 0 0-3.57-8.536 12.004 12.004 0 0 0-2.398-1.962s-2.797 2.914-2.77 5.121zM3.566 3.472A11.947 11.947 0 0 0 0 12.004a11.939 11.939 0 0 0 2.662 7.535c-1.406-2.6 3.58-9.951 6.08-12.912.023-2.207-2.771-5.119-2.771-5.119a12.006 12.006 0 0 0-2.405 1.964zM12 6.846S9.047 3.645 7.834 2.523C8.826 2.195 9.878 2 11 2h2c1.121 0 2.174.195 3.166.523C14.953 3.645 12 6.846 12 6.846z" />
          </svg>
        );

      case 'gog':
        // GOG.com — wordmark-style G shape
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-2 5h4c1.657 0 3 1.343 3 3v1h-3v-1a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-1h-1v-1h4v2c0 1.657-1.343 3-3 3h-4c-1.657 0-3-1.343-3-3v-4c0-1.657 1.343-3 3-3z" />
          </svg>
        );

      case 'ubisoft':
        // Ubisoft swirl — concentric target with spiral tail
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c4.42 0 8 3.58 8 8s-3.58 8-8 8-8-3.58-8-8 3.58-8 8-8zm0 2c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 2c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        );

      case 'rockstar':
        // Rockstar Games — R* style
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M4 3h8c2.21 0 4 1.79 4 4 0 1.48-.81 2.77-2 3.46L16 14h-2.5l-1.62-3.5H7V14H4V3zm3 2v3.5h4.5c.83 0 1.5-.67 1.5-1.5v-.5C13 5.67 12.33 5 11.5 5H7zm11.12.69l-.88 2.59 1.94 1.41-2.44.02-.94 2.87-.93-2.87-2.44-.02 1.95-1.41L14.5 5.7 16 6.92l1.12-1.23z" />
          </svg>
        );

      case 'battlenet':
        // Battle.net — stylized B
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 5h4.5C16.43 7 18 8.57 18 10.5c0 .87-.35 1.66-.93 2.27C17.65 13.38 18 14.17 18 15c0 1.93-1.57 3.5-3.5 3.5H10V7zm2 2v2.5h2.5c.28 0 .5-.22.5-.5v-1.5c0-.28-.22-.5-.5-.5H12zm0 4.5V16h2.5c.83 0 1.5-.67 1.5-1.5S15.33 13 14.5 13H12v.5z" />
          </svg>
        );

      case 'riot':
        // Riot Games — stylized fist/shield
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7l-9-5zm0 2.18L19 8v4c0 4.5-3.25 8.72-7 9.9C8.25 20.72 5 16.5 5 12V8l7-3.82zM9 9v6h1.5v-2.5h2l1.5 2.5H15.5l-1.62-2.72C14.58 11.95 15 11.25 15 10.5 15 9.67 14.33 9 13.5 9H9zm1.5 1.5h2c.28 0 .5.22.5.5s-.22.5-.5.5h-2v-1z" />
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
            <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5v-3c0-.83.67-1.5 1.5-1.5h4c.83 0 1.5.67 1.5 1.5v3c0 .83-.67 1.5-1.5 1.5h-4zm.5-4v3h3v-3h-3z" />
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
