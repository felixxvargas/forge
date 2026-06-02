import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, token, platform = 'android' } = req.body as {
    userId?: string;
    token?: string;
    platform?: string;
  };

  if (!userId || !token) {
    return res.status(400).json({ error: 'userId and token are required' });
  }

  const supabaseRes = await fetch(`${SUPABASE_URL}/rest/v1/device_tokens`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ user_id: userId, token, platform }),
  });

  if (!supabaseRes.ok) {
    const err = await supabaseRes.text();
    console.error('device_tokens upsert failed:', err);
    return res.status(500).json({ error: 'Failed to register token' });
  }

  return res.json({ success: true });
}
