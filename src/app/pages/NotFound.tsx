import { useNavigate } from 'react-router';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-accent mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Go Back</span>
          </button>
          <button
            onClick={() => navigate('/feed')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg transition-colors"
          >
            <Home className="w-5 h-5" />
            <span>Go Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}
