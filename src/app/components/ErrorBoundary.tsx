import React from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertCircle, Home, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;
    let title = 'Something went wrong';
    let message = 'We encountered an unexpected error. Please try refreshing the page.';

    if (error?.message.includes('fetch') || error?.message.includes('network')) {
      title = 'Connection problem';
      message = "We couldn't connect to the server. Check your internet connection and try again.";
    }

    return (
      <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="mb-6 flex justify-center">
            <div className="bg-accent/10 p-4 rounded-full">
              <AlertCircle className="w-10 h-10 text-accent" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-3">{title}</h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">{message}</p>
          {error?.message && (
            <details className="mb-8 text-left">
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground mb-2">
                Technical details
              </summary>
              <div className="bg-card border border-border rounded-xl p-3 text-xs text-muted-foreground font-mono overflow-auto max-h-32">
                {error.message}
              </div>
            </details>
          )}
          <div className="flex flex-col gap-3">
            <Button onClick={() => window.history.back()} className="w-full">
              <ArrowLeft className="w-4 h-4" />
              Go back
            </Button>
            <div className="flex gap-3">
              <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
                <RefreshCw className="w-4 h-4" />
                Reload
              </Button>
              <Button onClick={() => { window.location.href = '/feed'; }} variant="outline" className="flex-1">
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
}
