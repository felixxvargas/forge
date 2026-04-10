import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../utils/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { toast } from 'sonner';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Persist tokens so uploadAPI / apiRequest can use them
        localStorage.setItem('forge-access-token', session.access_token);
        if (session.refresh_token) {
          localStorage.setItem('forge-refresh-token', session.refresh_token);
        }
        localStorage.setItem('forge-user-id', session.user.id);
        localStorage.setItem('forge-logged-in', 'true');

        const meta = session.user.user_metadata ?? {};

        // Upsert with ignoreDuplicates: only creates the row when it doesn't exist.
        // ON CONFLICT (id) DO NOTHING — existing display_name / profile_picture are never overwritten.
        await supabase.from('profiles').upsert({
          id: session.user.id,
          display_name: meta.full_name || meta.name || session.user.email?.split('@')[0] || null,
          profile_picture: meta.avatar_url || meta.picture || null,
        }, { onConflict: 'id', ignoreDuplicates: true });

        // Apply pending profile from email signup onboarding (when email confirmation is enabled)
        const pendingProfileRaw = localStorage.getItem('forge-pending-profile');
        if (pendingProfileRaw) {
          try {
            const pending = JSON.parse(pendingProfileRaw);
            localStorage.removeItem('forge-pending-profile');
            await supabase.from('profiles').update({
              handle: pending.handle,
              display_name: pending.display_name,
              ...(pending.pronouns ? { pronouns: pending.pronouns } : {}),
              ...(pending.interests?.length ? { interests: pending.interests } : {}),
            }).eq('id', session.user.id);
            localStorage.setItem('forge-onboarding-complete', 'true');
            navigate('/feed', { replace: true });
            return;
          } catch {
            // Fall through to normal routing on error
          }
        }

        // Always re-fetch so we route based on the actual DB state
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, handle')
          .eq('id', session.user.id)
          .maybeSingle();

        // Handle account linking flow (set before Google OAuth redirect)
        const isLinking = localStorage.getItem('forge-linking-account') === 'true';
        if (isLinking) {
          localStorage.removeItem('forge-linking-account');
          localStorage.setItem('forge-save-linked-account', 'true');
          navigate('/settings');
          return;
        }

        // Apply pending social link (Bluesky/Mastodon account linking via magic link)
        const pendingSocialLink = localStorage.getItem('forge-pending-social-link');
        if (pendingSocialLink) {
          localStorage.removeItem('forge-pending-social-link');
          try {
            const link = JSON.parse(pendingSocialLink);
            const platform = link.provider; // 'bluesky' or 'mastodon'
            // Fetch current social_handles and merge
            const { data: currentProfile } = await supabase
              .from('profiles')
              .select('social_handles, social_platforms')
              .eq('id', session.user.id)
              .maybeSingle();
            const currentHandles = (currentProfile?.social_handles as Record<string, string>) ?? {};
            const currentPlatforms: string[] = currentProfile?.social_platforms ?? [];
            await supabase.from('profiles').update({
              social_handles: { ...currentHandles, [platform]: link.socialHandle },
              social_platforms: currentPlatforms.includes(platform)
                ? currentPlatforms
                : [...currentPlatforms, platform],
            }).eq('id', session.user.id);
            toast.success(`${platform === 'bluesky' ? 'Bluesky' : 'Mastodon'} account linked!`);
          } catch {
            // ignore link errors — user is still signed in
          }
          navigate('/feed', { replace: true });
          return;
        }

        const oauthIntent = localStorage.getItem('forge-oauth-intent');
        localStorage.removeItem('forge-oauth-intent');

        if (oauthIntent === 'signup' && profile?.handle) {
          // User tried to sign up but already has a Forge account — log them in and inform them
          toast.info('You already have a Forge account. Welcome back!');
          navigate('/feed');
        } else {
          navigate(profile?.handle ? '/feed' : '/onboarding');
        }
      } else {
        navigate('/login');
      }
    });
  }, [navigate]);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center">
      <LoadingSpinner />
      <p className="text-muted-foreground mt-4">Completing sign in...</p>
    </div>
  );
}
