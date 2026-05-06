declare module '*.svg?react' {
  import type { FC, SVGProps } from 'react';
  const ReactComponent: FC<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}

// Augment ImportMeta so import.meta.env.VITE_* typechecks without vite/client.
// Runtime values are injected by webpack DefinePlugin in next.config.ts.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_PROJECT_ID: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GA_MEASUREMENT_ID: string;
  readonly VITE_HCAPTCHA_SITE_KEY: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  readonly VITE_TWITCH_CLIENT_ID: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_SENTRY_RELEASE: string;
  readonly MODE: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly hot: undefined;
}
