import type { NextConfig } from 'next';

const isAndroidBuild = process.env.NEXT_ANDROID_BUILD === 'true';

const nextConfig: NextConfig = {
  ...(isAndroidBuild && {
    output: 'export',
  }),

  webpack(config, { webpack }) {
    // SVG imports with ?react query (Vite-style) → SVGR React components
    config.module.rules.push({
      test: /\.svg$/i,
      resourceQuery: /react/,
      use: ['@svgr/webpack'],
    });

    // Map import.meta.env.VITE_* → values so existing source files work unchanged.
    // All VITE_ vars are client-safe (anon keys, measurement IDs, etc.).
    const viteEnv: Record<string, string> = {};
    const viteKeys = [
      'VITE_SUPABASE_PROJECT_ID',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_GA_MEASUREMENT_ID',
      'VITE_HCAPTCHA_SITE_KEY',
      'VITE_STRIPE_PUBLISHABLE_KEY',
      'VITE_TWITCH_CLIENT_ID',
      'VITE_SENTRY_DSN',
      'VITE_RAWG_API_KEY',
    ];
    for (const key of viteKeys) {
      viteEnv[`import.meta.env.${key}`] = JSON.stringify(process.env[key] ?? '');
    }
    // Vite mode / build flags
    viteEnv['import.meta.env.MODE'] = JSON.stringify(process.env.NODE_ENV ?? 'development');
    viteEnv['import.meta.env.PROD'] = String(process.env.NODE_ENV === 'production');
    viteEnv['import.meta.env.DEV'] = String(process.env.NODE_ENV !== 'production');
    // Sentry release tag (git SHA injected by Vercel or CI)
    viteEnv['import.meta.env.VITE_SENTRY_RELEASE'] = JSON.stringify(
      process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev'
    );
    // Vite HMR stub — ThemeContext guards on this; in Next.js it's always absent
    viteEnv['import.meta.hot'] = 'undefined';

    config.plugins.push(new webpack.DefinePlugin(viteEnv));
    return config;
  },

  images: {
    unoptimized: isAndroidBuild,
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },

  // Keep Vercel API routes in api/ alongside Next.js app/api/ routes
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
