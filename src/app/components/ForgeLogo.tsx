import ForgeSVG from '../../assets/forge-logo.svg?react';

export function ForgeLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const containerSizes = { sm: 'w-8 h-8', md: 'w-12 h-12', lg: 'w-16 h-16', xl: 'w-24 h-24' };
  const iconSizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8', xl: 'w-12 h-12' };

  return (
    <div className={`${containerSizes[size]} bg-primary rounded-full flex items-center justify-center`}>
      <ForgeSVG className={iconSizes[size]} />
    </div>
  );
}
