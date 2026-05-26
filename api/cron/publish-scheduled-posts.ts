// Vercel Cron Function — publishes scheduled @forge posts.
// Schedule: vercel.json { "crons": [{ "path": "/api/cron/publish-scheduled-posts", "schedule": "0 9 * * *" }] }
// (Daily at 9am UTC)
//
// Required env vars: VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

async function supabase<T = unknown>(method: string, path: string, body?: object): Promise<T> {
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${path} failed: ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : ([] as unknown as T);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date().toISOString();

  const pending = await supabase<Array<{
    id: string;
    user_id: string;
    content: string;
    game_ids: string[];
    game_titles: string[];
    images: string[];
    url: string | null;
  }>>('GET', `/scheduled_posts?status=eq.pending&scheduled_at=lte.${encodeURIComponent(now)}&select=*`);

  if (!pending.length) {
    return res.json({ published: 0 });
  }

  let published = 0;
  for (const item of pending) {
    try {
      const gameIds: string[] = item.game_ids ?? [];
      const gameTitles: string[] = item.game_titles ?? [];
      const postBody: Record<string, unknown> = {
        user_id: item.user_id,
        content: item.content,
        images: item.images ?? [],
        image_alts: [],
        game_ids: gameIds,
        game_titles: gameTitles,
        game_id: gameIds[0] ?? null,
        game_title: gameTitles[0] ?? null,
        url: item.url ?? null,
      };

      const [newPost] = await supabase<Array<{ id: string }>>('POST', '/posts', postBody);

      await supabase('PATCH', `/scheduled_posts?id=eq.${item.id}`, {
        status: 'published',
        published_post_id: newPost.id,
      });

      published++;
    } catch (err) {
      console.error(`Failed to publish scheduled post ${item.id}:`, err);
      await supabase('PATCH', `/scheduled_posts?id=eq.${item.id}`, { status: 'failed' }).catch(() => {});
    }
  }

  return res.json({ published });
}
