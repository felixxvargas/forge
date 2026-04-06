import ForgeSVG from '../../assets/forge-logo.svg?react';

// LoadingScreen component - Shows while app initializes
export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center">
          <ForgeSVG width="48" height="38" aria-hidden="true" />
        </div>
        <div className="text-foreground">Loading Forge...</div>
      </div>
    </div>
  );
}
