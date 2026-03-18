// Supabase credentials loaded from environment variables.
// Local dev: add VITE_SUPABASE_PROJECT_ID + VITE_SUPABASE_ANON_KEY to .env.local
// Vercel: add them in Project Settings → Environment Variables

export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!projectId || !publicAnonKey) {
  console.error(
    '[Forge] ⚠️  Missing Supabase env vars! Set VITE_SUPABASE_PROJECT_ID and VITE_SUPABASE_ANON_KEY'
  );
}