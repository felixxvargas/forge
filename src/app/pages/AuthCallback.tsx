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

        // Upsert profile so new OAuth users always have a row
        const meta = session.user.user_metadata ?? {};
        await supabase.from('profiles').upsert({
          id: session.user.id,
          display_name: meta.full_name || meta.name || session.user.email?.split('@')[0] || null,
          profile_picture: meta.avatar_url || meta.picture || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        // Check if profile has a handle (onboarding complete)
        const { data } = await supabase
          .from('profiles')
          .select('handle')
          .eq('id', session.user.id)
          .maybeSingle();

        navigate(data?.handle ? '/feed' : '/onboarding');
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
