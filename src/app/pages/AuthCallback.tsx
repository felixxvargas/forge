import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../utils/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';

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

        // Always re-fetch so we route based on the actual DB state
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, handle')
          .eq('id', session.user.id)
          .maybeSingle();

        navigate(profile?.handle ? '/feed' : '/onboarding');
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
