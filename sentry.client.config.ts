import * as Sentry from '@sentry/nextjs';

// DSN and release are replaced at build time by webpack DefinePlugin (next.config.ts maps VITE_ vars)
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN as string | undefined,
  environment: process.env.NODE_ENV,
  release: import.meta.env.VITE_SENTRY_RELEASE as string | undefined,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});

// Captures App Router client-side navigations as Sentry transactions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
