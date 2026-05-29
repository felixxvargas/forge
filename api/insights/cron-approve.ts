import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const CRON_SECRET = process.env.CRON_SECRET ?? '';

async function sb<T = unknown>(method: string, path: string, body?: object, prefer = 'return=representation'): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: prefer,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : ([] as unknown as T);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'];
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!SERVICE_KEY) return res.status(500).json({ error: 'Server misconfigured' });

  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Auto-approve pending insights with 0 votes submitted more than 24h ago
    const insights = await sb<any[]>('GET',
      `/game_insights?status=eq.pending&approve_count=eq.0&reject_count=eq.0&submitted_at=lt.${encodeURIComponent(cutoff)}&select=id`,
      undefined, 'return=representation'
    );
    for (const i of insights) {
      await sb('PATCH', `/game_insights?id=eq.${i.id}`, {
        status: 'approved', approved_at: now, updated_at: now,
      }, 'return=minimal');
    }

    // Auto-approve pending entity edits with 0 votes submitted more than 24h ago
    const edits = await sb<any[]>('GET',
      `/game_wiki_entity_edits?status=eq.pending&approve_count=eq.0&reject_count=eq.0&submitted_at=lt.${encodeURIComponent(cutoff)}&select=id,entity_id,content`,
      undefined, 'return=representation'
    );
    for (const e of edits) {
      await sb('PATCH', `/game_wiki_entity_edits?id=eq.${e.id}`, {
        status: 'approved', approved_at: now, updated_at: now,
      }, 'return=minimal');
      if (e.entity_id && e.content && typeof e.content === 'object') {
        await sb('PATCH', `/game_wiki_entities?id=eq.${e.entity_id}`, {
          ...e.content, updated_at: now,
        }, 'return=minimal');
      }
    }

    return res.json({ approved_insights: insights.length, approved_edits: edits.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
