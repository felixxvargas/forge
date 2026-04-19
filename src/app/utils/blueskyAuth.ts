import { BrowserOAuthClient } from '@atproto/oauth-client-browser';
import { Agent } from '@atproto/api';

const IS_DEV =
  typeof window !== 'undefined' && window.location.hostname === 'localhost';

const CLIENT_ID = IS_DEV
  ? 'http://localhost'
  : 'https://forge-social.app/client-metadata.json';

/**
 * Returns a configured BrowserOAuthClient instance.
 * Uses 'http://localhost' as clientId in dev, production metadata URL otherwise.
 */
export function getBlueskyOAuthClient(): BrowserOAuthClient {
  return new BrowserOAuthClient({
    clientId: CLIENT_ID,
    handleResolver: 'https://bsky.social',
  } as any);
}

/**
 * Initiates Bluesky OAuth for the given handle.
 * Redirects the browser to the Bluesky authorization page.
 */
export async function initiateBlueskyLogin(handle: string): Promise<void> {
  const client = getBlueskyOAuthClient();
  await client.signIn(handle, { scope: 'atproto transition:generic' });
}

/**
 * Handles the Bluesky OAuth callback.
 * Should be called on the /auth/bluesky/callback page.
 * Returns profile data or null if no active session is found.
 */
export async function handleBlueskyCallback(): Promise<{
  did: string;
  handle: string;
  displayName: string;
  avatar: string;
  bio: string;
} | null> {
  const client = getBlueskyOAuthClient();
  const result = await client.init();

  if (!result) {
    return null;
  }

  const { session } = result;
  const did = session.did;

  const agent = new Agent(session);
  const profileRes = await agent.getProfile({ actor: did });
  const profile = profileRes.data;

  return {
    did,
    handle: profile.handle,
    displayName: profile.displayName ?? '',
    avatar: profile.avatar ?? '',
    bio: profile.description ?? '',
  };
}
