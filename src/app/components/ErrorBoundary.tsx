import { useRouteError, useNavigate, isRouteErrorResponse } from '@/compat/router';
import * as Sentry from '@sentry/react';
import { AlertCircle, Home, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  // Report unhandled errors to Sentry (only non-404/401/403 errors)
  if (error instanceof Error) {
    Sentry.captureException(error);
  } else if (isRouteErrorResponse(error) && error.status >= 500) {
    Sentry.captureMessage(`Route error ${error.status}: ${error.statusText}`, 'error');
  }

  // Determine error type and user-friendly message
  let title = "Something went wrong";
  let message = "We encountered an unexpected error. Please try again.";
  let showDetails = false;
  let errorDetails = "";

  if (isRouteErrorResponse(error)) {
    // Handle React Router errors (404, etc.)
    if (error.status === 404) {
      title = "Page not found";
      message = "The page you're looking for doesn't exist or has been moved.";
    } else if (error.status === 401) {
      title = "Unauthorized";
      message = "You need to be logged in to access this page.";
    } else if (error.status === 403) {
      title = "Access denied";
      message = "You don't have permission to access this page.";
    } else if (error.status === 500) {
      title = "Server error";
      message = "Our servers are having trouble. Please try again in a moment.";
    } else {
      title = `Error ${error.status}`;
      message = error.statusText || "An unexpected error occurred.";
    }
  } else if (error instanceof Error) {
    // Handle JavaScript errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      title = "Connection problem";
      message = "We couldn't connect to the server. Check your internet connection and try again.";
    } else if (error.message.includes('not found')) {
      title = "Not found";
      message = "The content you're looking for couldn't be found.";
    } else {
      title = "Something went wrong";
      message = "We encountered an unexpected error. Please try refreshing the page.";
      errorDetails = error.message;
      showDetails = true;
    }
  }

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/feed');
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        {/* Error icon */}
        <div className="mb-6 flex justify-center">
          <div className="bg-accent/10 p-4 rounded-full">
            <AlertCircle className="w-10 h-10 text-accent" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-3">{title}</h1>

        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          {message}
        </p>

        {/* Error details (collapsed) */}
        {showDetails && errorDetails && (
          <details className="mb-8 text-left">
            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground mb-2">
              Technical details
            </summary>
            <div className="bg-card border border-border rounded-xl p-3 text-xs text-muted-foreground font-mono overflow-auto max-h-32">
              {errorDetails}
            </div>
          </details>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleGoBack}
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </Button>

          <div className="flex gap-3">
            <Button
              onClick={handleReload}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4" />
              Reload
            </Button>

            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex-1"
            >
              <Home className="w-4 h-4" />
              Home
            </Button>
          </div>
        </div>

        <p className="mt-8 text-xs text-muted-foreground/50">
          If this keeps happening, please contact support.
        </p>
      </div>
    </div>
  );
}
