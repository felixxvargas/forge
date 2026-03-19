import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../utils/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Check if profile has a handle (onboarding complete)
        supabase.from('profiles').select('handle').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data?.handle) {
              navigate('/feed');
            } else {
              navigate('/onboarding');
            }
          });
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
