import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

async function getAuthUser(token: string): Promise<{ id: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

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
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Server misconfigured' });
  res.setHeader('Cache-Control', 'no-store');

  const token = req.headers['authorization']?.replace('Bearer ', '');

  // GET — fetch pending edits for an entity
  if (req.method === 'GET') {
    const { entityId, editId } = req.query;
    try {
      if (editId) {
        const rows = await sb<any[]>('GET', `/game_wiki_entity_edits?id=eq.${encodeURIComponent(editId as string)}&limit=1&select=*,author:profiles!user_id(id,handle,display_name,profile_picture)`);
        return res.json(rows[0] ?? null);
      }
      if (!entityId) return res.status(400).json({ error: 'entityId or editId is required' });

      let myVotes: Record<string, string> = {};
      const edits = await sb<any[]>('GET', `/game_wiki_entity_edits?entity_id=eq.${encodeURIComponent(entityId as string)}&status=eq.pending&order=submitted_at.desc&limit=20&select=*,author:profiles!user_id(id,handle,display_name,profile_picture)`);

      if (token && edits.length > 0) {
        const user = await getAuthUser(token);
        if (user) {
          const editIds = edits.map((e: any) => e.id).join(',');
          const votes = await sb<any[]>('GET', `/game_wiki_entity_edit_votes?edit_id=in.(${editIds})&user_id=eq.${user.id}&select=edit_id,vote`);
          for (const v of votes) myVotes[v.edit_id] = v.vote;
        }
      }

      // Zero-vote auto-approval: apply pending edits with no votes after 24h on next read
      const now = Date.now();
      for (const e of edits) {
        if (e.approve_count + e.reject_count === 0) {
          const hours = (now - new Date(e.submitted_at).getTime()) / 3600000;
          if (hours >= 24) {
            const approvedAt = new Date().toISOString();
            sb('PATCH', `/game_wiki_entity_edits?id=eq.${e.id}`, {
              status: 'approved',
              approved_at: approvedAt,
              updated_at: approvedAt,
            }, 'return=minimal').catch(() => {});
            // Apply the edit content to the entity
            sb('PATCH', `/game_wiki_entities?id=eq.${e.entity_id}`, {
              ...e.content,
              updated_at: approvedAt,
            }, 'return=minimal').catch(() => {});
            e.status = 'approved';
            e.approved_at = approvedAt;
          }
        }
      }

      return res.json(edits.filter((e: any) => e.status === 'pending').map((e: any) => ({ ...e, myVote: myVotes[e.id] ?? null })));
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — submit a new edit proposal
  if (req.method === 'POST') {
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await getAuthUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { entityId, content } = req.body ?? {};
    if (!entityId || !content || typeof content !== 'object') {
      return res.status(400).json({ error: 'entityId and content object are required' });
    }

    // Only allow known fields in content
    const allowed = ['description', 'cover_image_url'];
    const safeContent: Record<string, string> = {};
    for (const key of allowed) {
      if (typeof content[key] === 'string') safeContent[key] = content[key].trim();
    }
    if (Object.keys(safeContent).length === 0) {
      return res.status(400).json({ error: 'content must include at least one valid field (description, cover_image_url)' });
    }

    try {
      const [edit] = await sb<any[]>('POST', '/game_wiki_entity_edits', {
        entity_id: entityId,
        user_id: user.id,
        content: safeContent,
        status: 'pending',
      });
      return res.status(201).json(edit);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PATCH — vote on an edit
  if (req.method === 'PATCH') {
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await getAuthUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { editId, vote } = req.body ?? {};
    if (!editId) return res.status(400).json({ error: 'editId is required' });
    if (vote !== 'approve' && vote !== 'reject') return res.status(400).json({ error: 'vote must be approve or reject' });

    try {
      const [edit] = await sb<any[]>('GET', `/game_wiki_entity_edits?id=eq.${editId}&limit=1`);
      if (!edit) return res.status(404).json({ error: 'Edit not found' });
      if (edit.status !== 'pending') return res.status(400).json({ error: 'Can only vote on pending edits' });
      if (edit.user_id === user.id) return res.status(400).json({ error: 'Cannot vote on your own edit' });

      // Upsert vote
      const existing = await sb<any[]>('GET', `/game_wiki_entity_edit_votes?edit_id=eq.${editId}&user_id=eq.${user.id}&limit=1`);
      if (existing.length > 0) {
        await sb('PATCH', `/game_wiki_entity_edit_votes?edit_id=eq.${editId}&user_id=eq.${user.id}`, { vote }, 'return=minimal');
      } else {
        await sb('POST', '/game_wiki_entity_edit_votes', { edit_id: editId, user_id: user.id, vote }, 'return=minimal');
      }

      // Recalculate counts
      const allVotes = await sb<any[]>('GET', `/game_wiki_entity_edit_votes?edit_id=eq.${editId}&select=vote`);
      const approveCount = allVotes.filter((v: any) => v.vote === 'approve').length;
      const rejectCount = allVotes.filter((v: any) => v.vote === 'reject').length;
      const total = approveCount + rejectCount;

      let newStatus = 'pending';
      let approvedAt: string | null = null;
      const submittedAt = new Date(edit.submitted_at).getTime();
      const hoursSince = (Date.now() - submittedAt) / 3600000;

      if (total >= 3 && approveCount / total >= 0.7 && hoursSince >= 24) {
        newStatus = 'approved';
        approvedAt = new Date().toISOString();
      } else if (total >= 3 && rejectCount / total > 0.5) {
        newStatus = 'rejected';
      }

      await sb('PATCH', `/game_wiki_entity_edits?id=eq.${editId}`, {
        approve_count: approveCount,
        reject_count: rejectCount,
        status: newStatus,
        ...(approvedAt ? { approved_at: approvedAt } : {}),
        updated_at: new Date().toISOString(),
      }, 'return=minimal');

      // If approved, apply the edit to the entity
      if (newStatus === 'approved') {
        const updates: Record<string, unknown> = { ...edit.content, updated_at: new Date().toISOString() };
        await sb('PATCH', `/game_wiki_entities?id=eq.${edit.entity_id}`, updates, 'return=minimal');
      }

      return res.json({ approveCount, rejectCount, status: newStatus, myVote: vote });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
