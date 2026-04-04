import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SocialAuthRequest {
  provider: 'bluesky' | 'mastodon';
  did?: string;
  handle: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  accessToken: string;
  instance?: string;
  accountId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: SocialAuthRequest = await req.json();
    const { provider, did, handle, displayName, avatar, bio, accessToken, instance, accountId } = body;

    if (!provider || !handle || !accessToken) {
      return new Response(JSON.stringify({ error: 'Missing required fields: provider, handle, accessToken' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // --- Identity verification ---

    if (provider === 'bluesky') {
      if (!did) {
        return new Response(JSON.stringify({ error: 'Missing required field: did' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Resolve handle → DID via bsky.social (works as the directory for custom PDSes too)
      const resolveUrl = `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`;
      const resolveRes = await fetch(resolveUrl);

      if (!resolveRes.ok) {
        return new Response(JSON.stringify({ error: 'Failed to resolve Bluesky handle', detail: await resolveRes.text() }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const resolveData = await resolveRes.json();

      if (resolveData.did !== did) {
        return new Response(JSON.stringify({ error: 'Bluesky DID mismatch: handle does not resolve to the provided DID' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (provider === 'mastodon') {
      if (!instance || !accountId) {
        return new Response(JSON.stringify({ error: 'Missing required fields for Mastodon: instance, accountId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const verifyUrl = `https://${instance}/api/v1/accounts/verify_credentials`;
      const verifyRes = await fetch(verifyUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!verifyRes.ok) {
        return new Response(JSON.stringify({ error: 'Failed to verify Mastodon credentials', detail: await verifyRes.text() }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const verifyData = await verifyRes.json();

      if (verifyData.id !== accountId) {
        return new Response(JSON.stringify({ error: 'Mastodon account ID mismatch' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: 'Invalid provider. Must be "bluesky" or "mastodon"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Profile lookup ---

    let profileQuery = supabaseAdmin.from('profiles').select('id');
    let socialHandle: string;

    if (provider === 'bluesky') {
      profileQuery = profileQuery.filter("social_handles->>'bluesky'", 'eq', handle);
      socialHandle = handle;
    } else {
      // Mastodon: normalized @username@instance format
      const username = handle.startsWith('@') ? handle.slice(1) : handle;
      socialHandle = `@${username}@${instance}`;
      profileQuery = profileQuery.filter("social_handles->>'mastodon'", 'eq', socialHandle);
    }

    const { data: profiles, error: profileError } = await profileQuery.limit(1);

    if (profileError) {
      console.error('Profile query error:', profileError);
      return new Response(JSON.stringify({ error: 'Database error during profile lookup' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (profiles && profiles.length > 0) {
      // Profile found — generate a magic link token
      const profile = profiles[0];

      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id);

      if (userError || !userData?.user?.email) {
        console.error('getUserById error:', userError);
        return new Response(JSON.stringify({ error: 'Failed to retrieve user email' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const email = userData.user.email;

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });

      if (linkError || !linkData?.properties?.hashed_token) {
        console.error('generateLink error:', linkError);
        return new Response(JSON.stringify({ error: 'Failed to generate magic link' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const hashedToken = linkData.properties.hashed_token;

      return new Response(
        JSON.stringify({ found: true, token_hash: hashedToken, userId: profile.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Profile not found — return provider profile data for sign-up flow
    return new Response(
      JSON.stringify({
        found: false,
        providerProfile: {
          handle,
          displayName,
          avatar: avatar ?? null,
          bio: bio ?? null,
          provider,
          socialHandle,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
