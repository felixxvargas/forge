import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const FCM_SA_RAW = process.env.FCM_SERVICE_ACCOUNT ?? '';

async function sb<T = unknown>(method: string, path: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : ([] as unknown as T);
}

async function getAuthUser(token: string): Promise<{ id: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  return res.ok ? res.json() : null;
}

// Build a short-lived Firebase OAuth access token from the service account JSON.
async function getFcmAccessToken(sa: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  const enc = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${enc(header)}.${enc(payload)}`;

  // Sign with RS256 using the service account private key
  const { createSign } = await import('crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = sign.sign(sa.private_key, 'base64url');
  const jwt = `${unsigned}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) throw new Error(`OAuth token exchange failed: ${await tokenRes.text()}`);
  const { access_token } = await tokenRes.json();
  return access_token as string;
}

async function sendFcm(accessToken: string, projectId: string, token: string, title: string, body: string, url: string): Promise<boolean> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: { url },
          android: { priority: 'high', notification: { sound: 'default' } },
        },
      }),
    }
  );
  return res.ok;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Server misconfigured' });

  // Validate admin
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const user = await getAuthUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const [profile] = await sb<Array<{ is_admin: boolean }>>('GET', `/profiles?id=eq.${user.id}&select=is_admin&limit=1`);
  if (!profile?.is_admin) return res.status(403).json({ error: 'Forbidden' });

  const { title, body: bodyText, url = '/feed' } = req.body ?? {};
  if (!title?.trim() || !bodyText?.trim()) {
    return res.status(400).json({ error: 'title and body are required' });
  }
  if (!FCM_SA_RAW) return res.status(500).json({ error: 'FCM_SERVICE_ACCOUNT not configured' });

  let sa: Record<string, string>;
  try { sa = JSON.parse(FCM_SA_RAW); } catch { return res.status(500).json({ error: 'FCM_SERVICE_ACCOUNT is not valid JSON' }); }

  // Fetch all device tokens
  const tokens = await sb<Array<{ token: string; user_id: string }>>('GET', '/device_tokens?select=token,user_id&order=created_at.desc');
  if (!tokens.length) return res.json({ sent: 0, failed: 0, message: 'No device tokens registered' });

  const accessToken = await getFcmAccessToken(sa);
  let sent = 0;
  let failed = 0;

  // Send in parallel batches of 50
  const BATCH = 50;
  for (let i = 0; i < tokens.length; i += BATCH) {
    const batch = tokens.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(({ token: t }) => sendFcm(accessToken, sa.project_id, t, title.trim(), bodyText.trim(), url))
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) sent++;
      else failed++;
    }
  }

  return res.json({ sent, failed, total: tokens.length });
}
