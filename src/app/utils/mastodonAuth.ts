const REDIRECT_URI =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? `${window.location.origin}/auth/mastodon/callback`
    : 'https://forge-social.app/auth/mastodon/callback';

const SCOPES = 'read:accounts write:favourites write:statuses write:follows';

interface MastodonClientCredentials {
  client_id: string;
  client_secret: string;
}

interface MastodonProfile {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  avatar: string;
  note: string;
}

/**
 * Registers the Forge app with a Mastodon instance dynamically.
 * Stores client credentials in localStorage under `mastodon-client-{instance}`.
 */
export async function registerMastodonApp(instance: string): Promise<MastodonClientCredentials> {
  const storageKey = `mastodon-client-${instance}`;
  const cached = localStorage.getItem(storageKey);

  if (cached) {
    return JSON.parse(cached) as MastodonClientCredentials;
  }

  const res = await fetch(`https://${instance}/api/v1/apps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Forge',
      redirect_uris: REDIRECT_URI,
      scopes: SCOPES,
      website: 'https://forge-social.app',
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Failed to register app with ${instance}: ${detail}`);
  }

  const data = await res.json();
  const credentials: MastodonClientCredentials = {
    client_id: data.client_id,
    client_secret: data.client_secret,
  };

  localStorage.setItem(storageKey, JSON.stringify(credentials));
  return credentials;
}

/**
 * Initiates Mastodon OAuth flow.
 * Registers the app if needed, stores the instance in localStorage,
 * generates a CSRF state token, and redirects to the Mastodon authorize page.
 */
export async function initiateMastodonLogin(instance: string): Promise<void> {
  const { client_id } = await registerMastodonApp(instance);

  // Generate and store CSRF state
  const state = crypto.randomUUID();
  localStorage.setItem('mastodon-oauth-state', state);
  localStorage.setItem('mastodon-instance', instance);

  const params = new URLSearchParams({
    client_id,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    state,
  });

  window.location.href = `https://${instance}/oauth/authorize?${params.toString()}`;
}

/**
 * Exchanges an OAuth authorization code for an access token.
 * Reads the instance and client credentials from localStorage.
 */
export async function exchangeMastodonCode(code: string, instance: string): Promise<string> {
  const storageKey = `mastodon-client-${instance}`;
  const cached = localStorage.getItem(storageKey);

  if (!cached) {
    throw new Error(`No client credentials found for instance: ${instance}`);
  }

  const { client_id, client_secret } = JSON.parse(cached) as MastodonClientCredentials;

  const res = await fetch(`https://${instance}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id,
      client_secret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      code,
      scope: SCOPES,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Failed to exchange Mastodon OAuth code: ${detail}`);
  }

  const data = await res.json();

  if (!data.access_token) {
    throw new Error('No access_token in Mastodon token response');
  }

  return data.access_token as string;
}

/**
 * Fetches the authenticated Mastodon user's profile.
 */
export async function getMastodonProfile(instance: string, accessToken: string): Promise<MastodonProfile> {
  const res = await fetch(`https://${instance}/api/v1/accounts/verify_credentials`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Failed to fetch Mastodon profile from ${instance}: ${detail}`);
  }

  return res.json() as Promise<MastodonProfile>;
}

/**
 * Normalizes a Mastodon handle to @username@instance format.
 * If the acct already includes the instance (remote accounts), use it directly.
 * Otherwise append the instance.
 */
export function normalizeMastodonHandle(acct: string, instance: string): string {
  // Remote accounts already have the instance in their acct field (e.g. "user@other.social")
  if (acct.includes('@')) {
    return `@${acct}`;
  }

  // Local accounts only have the username
  return `@${acct}@${instance}`;
}

/** Gets the stored Mastodon access token for the given instance (set after OAuth). */
export function getStoredMastodonToken(instance: string): string | null {
  return localStorage.getItem(`forge-mastodon-token-${instance}`);
}

/** Stores the Mastodon access token after OAuth. */
export function storeMastodonToken(instance: string, token: string): void {
  localStorage.setItem(`forge-mastodon-token-${instance}`, token);
  localStorage.setItem('forge-mastodon-last-instance', instance);
}

/** Gets the instance of the most recently linked Mastodon account. */
export function getLastMastodonInstance(): string | null {
  return localStorage.getItem('forge-mastodon-last-instance');
}

async function mastodonPost(instance: string, token: string, path: string): Promise<any> {
  const res = await fetch(`https://${instance}/api/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Mastodon API error ${res.status} on ${path}`);
  return res.json();
}

export async function favouriteMastodonPost(instance: string, token: string, statusId: string): Promise<void> {
  await mastodonPost(instance, token, `statuses/${statusId}/favourite`);
}

export async function unfavouriteMastodonPost(instance: string, token: string, statusId: string): Promise<void> {
  await mastodonPost(instance, token, `statuses/${statusId}/unfavourite`);
}

export async function boostMastodonPost(instance: string, token: string, statusId: string): Promise<void> {
  await mastodonPost(instance, token, `statuses/${statusId}/reblog`);
}

export async function unboostMastodonPost(instance: string, token: string, statusId: string): Promise<void> {
  await mastodonPost(instance, token, `statuses/${statusId}/unreblog`);
}

export async function replyToMastodonPost(instance: string, token: string, inReplyToId: string, text: string): Promise<void> {
  const res = await fetch(`https://${instance}/api/v1/statuses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: text, in_reply_to_id: inReplyToId }),
  });
  if (!res.ok) throw new Error(`Mastodon reply failed: ${res.status}`);
}

export async function followMastodonAccount(instance: string, token: string, accountId: string): Promise<void> {
  await mastodonPost(instance, token, `accounts/${accountId}/follow`);
}

export async function unfollowMastodonAccount(instance: string, token: string, accountId: string): Promise<void> {
  await mastodonPost(instance, token, `accounts/${accountId}/unfollow`);
}

/** Fetch posts from an arbitrary Mastodon account by instance + account ID (public, no auth needed). */
export async function fetchMastodonAccountPosts(instance: string, accountId: string, limit = 10): Promise<any[]> {
  try {
    const res = await fetch(
      `https://${instance}/api/v1/accounts/${accountId}/statuses?limit=${limit}&exclude_replies=true`
    );
    if (!res.ok) return [];
    const statuses = await res.json();
    return statuses
      .filter((s: any) => s.content && !s.reblog)
      .map((s: any) => {
        const text = s.content
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
          .trim();
        const images = s.media_attachments?.filter((m: any) => m.type === 'image').map((m: any) => m.url);
        return {
          id: `mastodon-${s.id}`,
          userId: `masto-${instance}-${accountId}`,
          content: text,
          timestamp: new Date(s.created_at),
          likes: s.favourites_count ?? 0,
          reposts: s.reblogs_count ?? 0,
          comments: s.replies_count ?? 0,
          images: images?.length ? images : undefined,
          platform: 'mastodon' as const,
          url: s.card?.url ?? undefined,
          externalUrl: s.url,
        };
      });
  } catch {
    return [];
  }
}
