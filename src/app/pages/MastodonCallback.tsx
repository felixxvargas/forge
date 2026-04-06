import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { supabase } from '../utils/supabase';
import { exchangeMastodonCode, getMastodonProfile, normalizeMastodonHandle, storeMastodonToken } from '../utils/mastodonAuth';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export function MastodonCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Completing Mastodon sign-in…');

  useEffect(() => {
    (async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error || !code) {
          navigate('/login');
          return;
        }

        const instance = localStorage.getItem('mastodon-instance');
        if (!instance) {
          navigate('/login');
          return;
        }

        setStatus('Exchanging authorization code…');
        const accessToken = await exchangeMastodonCode(code, instance);
        // Store token for ongoing interactions (favourites, boosts, replies, follows)
        storeMastodonToken(instance, accessToken);

        setStatus('Fetching your Mastodon profile…');
        const mastodonProfile = await getMastodonProfile(instance, accessToken);
        const normalizedHandle = normalizeMastodonHandle(mastodonProfile.acct, instance);

        setStatus('Verifying your identity…');
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/social-auth`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              provider: 'mastodon',
              handle: mastodonProfile.acct,
              displayName: mastodonProfile.display_name || mastodonProfile.username,
              avatar: mastodonProfile.avatar,
              bio: mastodonProfile.note?.replace(/<[^>]+>/g, '') || '',
              accessToken,
              instance,
              accountId: mastodonProfile.id,
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
          setStatus('Signing you in…');
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: data.token_hash,
            type: 'email',
          });
          if (otpError) {
            console.error('verifyOtp error:', otpError);
            navigate('/login');
            return;
          }
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            localStorage.setItem('forge-access-token', sessionData.session.access_token);
            localStorage.setItem('forge-user-id', sessionData.session.user.id);
            localStorage.setItem('forge-logged-in', 'true');
          }
          navigate('/feed', { replace: true });
        } else {
          const encoded = encodeURIComponent(JSON.stringify(data.providerProfile));
          navigate(`/auth/social-claim?data=${encoded}`, { replace: true });
        }
      } catch (err) {
        console.error('MastodonCallback error:', err);
        navigate('/login');
      }
    })();
  }, [navigate, searchParams]);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center">
      <LoadingSpinner />
      <p className="text-muted-foreground mt-4 text-sm">{status}</p>
    </div>
  );
}
