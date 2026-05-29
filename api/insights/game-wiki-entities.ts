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
  if (!res.ok) throw new Error(`${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : ([] as unknown as T);
}

async function getAuthUser(token: string): Promise<{ id: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Server misconfigured' });
  res.setHeader('Cache-Control', 'no-store');

  // GET — fetch entities for a game, or a single entity by id
  if (req.method === 'GET') {
    const { gameId, entityId, type } = req.query;
    try {
      if (entityId) {
        const rows = await sb<any[]>('GET', `/game_wiki_entities?id=eq.${encodeURIComponent(entityId as string)}&status=eq.active&limit=1`);
        return res.json(rows[0] ?? null);
      }
      if (!gameId) return res.status(400).json({ error: 'gameId or entityId is required' });
      const typeFilter = type && type !== 'all' ? `&type=eq.${encodeURIComponent(type as string)}` : '';
      const rows = await sb<any[]>('GET', `/game_wiki_entities?game_id=eq.${encodeURIComponent(gameId as string)}&status=eq.active${typeFilter}&order=name.asc&limit=100`);
      return res.json(rows);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PATCH — update entity description (approved edits only, applied server-side)
  // This endpoint is called by the entity-edits handler after an edit is approved
  if (req.method === 'PATCH') {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await getAuthUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { entityId, description } = req.body ?? {};
    if (!entityId || description === undefined) return res.status(400).json({ error: 'entityId and description are required' });

    try {
      await sb('PATCH', `/game_wiki_entities?id=eq.${entityId}`, {
        description: String(description).trim(),
        updated_at: new Date().toISOString(),
      });
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
