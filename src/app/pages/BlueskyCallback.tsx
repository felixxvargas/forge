import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../utils/supabase';
import { handleBlueskyCallback } from '../utils/blueskyAuth';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export function BlueskyCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Completing Bluesky sign-in…');

  useEffect(() => {
    (async () => {
      try {
        const profile = await handleBlueskyCallback();
        if (!profile) {
          navigate('/login');
          return;
        }

        setStatus('Verifying your identity…');

        // Call our Edge Function to verify identity and look up / create Forge account
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/social-auth`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              provider: 'bluesky',
              did: profile.did,
              handle: profile.handle,
              displayName: profile.displayName,
              avatar: profile.avatar,
              bio: profile.bio,
              // accessToken is not a bearer token (uses DPOP), but we include handle+did
              // and the Edge Function verifies via public handle→DID resolution
              accessToken: profile.did, // Used as a placeholder; real verification is DID resolution
            }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          console.error('social-auth error:', data);
          navigate('/login');
          return;
        }

        if (data.found) {
          // Existing Forge user — sign them in via the magic link token
          setStatus('Signing you in…');
          const { error } = await supabase.auth.verifyOtp({
            token_hash: data.token_hash,
            type: 'email',
          });
          if (error) {
            console.error('verifyOtp error:', error);
            navigate('/login');
            return;
          }
          // Store auth state
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            localStorage.setItem('forge-access-token', sessionData.session.access_token);
            localStorage.setItem('forge-user-id', sessionData.session.user.id);
            localStorage.setItem('forge-logged-in', 'true');
          }
          navigate('/feed', { replace: true });
        } else {
          // New user — send to account claim/create flow
          const encoded = encodeURIComponent(JSON.stringify(data.providerProfile));
          navigate(`/auth/social-claim?data=${encoded}`, { replace: true });
        }
      } catch (err) {
        console.error('BlueskyCallback error:', err);
        navigate('/login');
      }
    })();
  }, [navigate]);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center">
      <LoadingSpinner />
      <p className="text-muted-foreground mt-4 text-sm">{status}</p>
    </div>
  );
}
