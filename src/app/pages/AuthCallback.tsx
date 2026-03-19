import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      try {
        console.log('[AuthCallback] Processing OAuth callback...');
        
        const supabase = createClient(
          `https://${projectId}.supabase.co`,
          publicAnonKey
        );

        // Get the session from the URL (Supabase handles the hash automatically)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthCallback] Error getting session:', error);
          navigate('/login');
          return;
        }

        if (!session) {
          console.error('[AuthCallback] No session found');
          navigate('/login');
          return;
        }

        console.log('[AuthCallback] Session found:', session.user.email);
        
        // Save auth data to localStorage
        localStorage.setItem('forge-access-token', session.access_token);
        localStorage.setItem('forge-user-id', session.user.id);
        localStorage.setItem('forge-logged-in', 'true');
        
        // Fetch user profile from backend
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-17285bd7/auth/me`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          }
        );
        
        const data = await response.json();
        
        if (data.profile) {
          console.log('[AuthCallback] User profile loaded');
          localStorage.setItem('forge-current-user', JSON.stringify(data.profile));
          
          // Check if onboarding is complete (has handle and interests)
          const hasHandle = data.profile.handle && data.profile.handle.length > 0;
          const hasInterests = data.profile.interests && data.profile.interests.length > 0;
          
          if (hasHandle && hasInterests) {
            console.log('[AuthCallback] Onboarding complete, redirecting to feed');
            localStorage.setItem('forge-onboarding-complete', 'true');
            navigate('/feed');
          } else {
            console.log('[AuthCallback] Onboarding incomplete, redirecting to onboarding');
            navigate('/onboarding');
          }
        } else {
          console.error('[AuthCallback] No profile in response');
          navigate('/onboarding');
        }
      } catch (error) {
        console.error('[AuthCallback] Error:', error);
        navigate('/login');
      }
    }

    handleCallback();
  }, [navigate]);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center">
      <LoadingSpinner />
      <p className="text-muted-foreground mt-4">Completing sign in...</p>
    </div>
  );
}
