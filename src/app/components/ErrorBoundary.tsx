import { useRouteError, useNavigate, isRouteErrorResponse } from 'react-router';
import { AlertCircle, Home, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

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
      message = "We encountered an unexpected error. Our team has been notified.";
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
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mb-6 flex justify-center">
          <div className="bg-purple-600/20 p-4 rounded-full">
            <AlertCircle className="w-12 h-12 text-purple-500" />
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold mb-3">{title}</h1>
        
        {/* Error Message */}
        <p className="text-gray-400 mb-8 leading-relaxed">
          {message}
        </p>

        {/* Error Details (collapsed by default) */}
        {showDetails && errorDetails && (
          <details className="mb-8 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400 mb-2">
              Technical details
            </summary>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-xs text-gray-400 font-mono overflow-auto max-h-32">
              {errorDetails}
            </div>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleGoBack}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go back
          </Button>
          
          <div className="flex gap-3">
            <Button
              onClick={handleReload}
              variant="outline"
              className="flex-1 border-gray-700 hover:border-gray-600 text-gray-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload
            </Button>
            
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex-1 border-gray-700 hover:border-gray-600 text-gray-300"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
        </div>

        {/* Support Message */}
        <p className="mt-8 text-xs text-gray-600">
          If this problem persists, please contact support
        </p>
      </div>
    </div>
  );
}
