// Forge Logo Component - Used for the official @forge account
export function ForgeLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <div className={`${sizes[size]} bg-primary rounded-full flex items-center justify-center`}>
      <svg 
        className={`${iconSizes[size]} text-accent fill-current`}
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M13 2L3 14h8l-2 8 10-12h-8l2-8z" />
      </svg>
    </div>
  );
}

// Export a data URL version for use in profile pictures
export function getForgeLogoDataURL(): string {
  // Create SVG as a data URL
  const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" rx="100" fill="#7C3AED"/>
      <path d="M110 40L60 120h60l-20 80 60-80h-60l20-80z" fill="#84CC16" stroke="#84CC16" stroke-width="1.5"/>
    </svg>
  `;
  
  return 'data:image/svg+xml;base64,' + btoa(svg);
}
