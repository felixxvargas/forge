import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    svgr(),
    // Sentry: upload source maps and create releases on every production build.
    // Requires SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT env vars (set in Vercel + .env.local).
    // Plugin is a no-op when SENTRY_AUTH_TOKEN is absent, so local dev without the token is safe.
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: {
        // Use SENTRY_RELEASE if explicitly set (e.g. by CI), otherwise fall back to git commit SHA
        name: process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? undefined,
        // Associate Sentry release with the commits since the last release
        setCommits: { auto: true },
        // Mark the release as deployed to the production environment after upload
        deploy: {
          env: process.env.VERCEL_ENV ?? 'production',
        },
      },
      sourcemaps: {
        // Upload source maps for all JS files in the build output
        assets: ['./dist/**'],
        // Strip the local path prefix so file names in Sentry match what's in the repo
        filesToDeleteAfterUpload: ['./dist/**/*.map'],
      },
      // Don't block the build if Sentry upload fails (network issues, missing token, etc.)
      errorHandler: (err) => {
        console.warn('[sentry-vite-plugin]', err.message);
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '/utils': path.resolve(__dirname, './utils'),
    },
  },
  // Inject the release identifier into the client bundle so Sentry.init can tag events with it.
  // SENTRY_RELEASE wins if set; otherwise falls back to the Vercel git SHA; falls back to 'dev'.
  define: {
    'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(
      process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev'
    ),
  },
  assetsInclude: ['**/*.csv'],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui';
          if (id.includes('/motion/') || id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('/d3/')) return 'vendor-charts';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('@sentry')) return 'vendor-sentry';
          // Keep react, react-dom, react-router, and scheduler together — splitting them apart
          // causes multiple React instance errors at runtime.
          if (id.includes('/react/') || id.includes('react-dom') || id.includes('react-router') || id.includes('/scheduler/')) return 'vendor-react';
        },
      },
    },
  },
})
