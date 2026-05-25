import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

async function sb<T = unknown>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : ([] as unknown as T);
}

async function validateAdmin(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return null; }

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  const { id: userId } = await userRes.json();

  const [profile] = await sb<Array<{ is_admin: boolean }>>('GET', `/profiles?id=eq.${userId}&select=is_admin&limit=1`);
  if (!profile?.is_admin) { res.status(403).json({ error: 'Forbidden' }); return null; }

  return userId;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Server misconfigured' });

  const userId = await validateAdmin(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const posts = await sb('GET', '/scheduled_posts?order=scheduled_at.desc&select=*');
    return res.json(posts);
  }

  if (req.method === 'POST') {
    const { action, content, scheduled_at, game_ids, game_titles } = req.body ?? {};

    if (action === 'trigger') {
      const origin = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://forge-social.app';
      const r = await fetch(`${origin}/api/cron/publish-scheduled-posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      return res.json(await r.json());
    }

    if (action === 'create') {
      if (!content || !scheduled_at) return res.status(400).json({ error: 'content and scheduled_at are required' });
      const { url } = req.body ?? {};
      const ids: string[] = Array.isArray(game_ids) ? game_ids : [];
      const titles: string[] = Array.isArray(game_titles) ? game_titles : [];
      const [created] = await sb<Array<object>>('POST', '/scheduled_posts', {
        user_id: userId,
        content,
        scheduled_at,
        url: url ?? null,
        game_ids: ids,
        game_titles: titles,
        status: 'pending',
        images: [],
      });
      return res.status(201).json(created);
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: 'id is required' });
    const [post] = await sb<Array<{ status: string }>>('GET', `/scheduled_posts?id=eq.${id}&select=status&limit=1`);
    if (!post) return res.status(404).json({ error: 'Not found' });
    if (post.status !== 'pending') return res.status(409).json({ error: 'Only pending posts can be deleted' });
    await sb('DELETE', `/scheduled_posts?id=eq.${id}`);
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
