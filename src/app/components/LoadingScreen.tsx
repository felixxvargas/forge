// LoadingScreen component - Shows while app initializes
export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-4xl">⚡</div>
        <div className="text-foreground">Loading Forge...</div>
      </div>
    </div>
  );
}
