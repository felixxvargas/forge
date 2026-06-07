// Merged: game-insights + game-wiki-entities + game-wiki-entity-edits +
//         insight-conversations + cron-approve + extract-entities
// Routes dispatched by last URL path segment.
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const CRON_SECRET = process.env.CRON_SECRET ?? '';
const GEMINI_API_KEY = process.env.GEMINI_API ?? process.env.GEMINI_API_KEY ?? '';
const BATCH_SIZE = 20;

// ─── Shared helpers ───────────────────────────────────────────────────────────
async function getAuthUser(token: string): Promise<{ id: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` } });
  return res.ok ? res.json() : null;
}

async function sb<T = unknown>(method: string, path: string, body?: object, prefer = 'return=representation'): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json', Prefer: prefer },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : ([] as unknown as T);
}

async function sbAsUser<T = unknown>(method: string, path: string, userToken: string, body?: object): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json', Accept: 'application/json', Prefer: 'return=representation' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : ([] as unknown as T);
}

async function callGemini(prompt: string, maxTokens = 1024): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens } }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

// ─── game-insights ────────────────────────────────────────────────────────────
type ConversationMessage = { role: 'user' | 'assistant'; content: string; timestamp: string };

async function createNotification(userId: string, actorId: string, type: string, insightId: string) {
  try { await sb('POST', '/notifications', { user_id: userId, actor_id: actorId, type, metadata: { insight_id: insightId }, read: false }); } catch {}
}

async function extractAndUpsertEntities(insight: { id: string; game_id: string; game_title: string; title: string; content: string }): Promise<void> {
  const prompt = `You are extracting named entities from a game wiki insight about "${insight.game_title}".

Insight title: ${insight.title}
Insight content: ${insight.content}

Extract up to 5 notable named entities (characters, locations, items, mechanics, or lore concepts). For each entity provide name, type (character|location|item|mechanic|lore), and description (1-2 sentences).

Return ONLY a JSON array, no markdown:
[{ "name": "...", "type": "...", "description": "..." }]

If none qualify, return [].`;

  const raw = await callGemini(prompt, 1024);
  let entities: Array<{ name: string; type: string; description: string }> = [];
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    entities = JSON.parse(cleaned);
    if (!Array.isArray(entities)) entities = [];
  } catch { return; }

  const validTypes = new Set(['character', 'location', 'item', 'mechanic', 'lore']);
  for (const entity of entities.slice(0, 5)) {
    if (!entity.name?.trim() || !validTypes.has(entity.type)) continue;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/game_wiki_entities`, {
        method: 'POST',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({ game_id: insight.game_id, game_title: insight.game_title, name: entity.name.trim(), type: entity.type, description: entity.description?.trim() ?? '', source_insight_id: insight.id }),
      });
    } catch {}
  }
}

async function handleGameInsights(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const token = req.headers['authorization']?.replace('Bearer ', '');

  if (req.method === 'GET') {
    const { gameId, status, insightId: qInsightId, userId } = req.query;
    try {
      let insights: any[];
      if (qInsightId) {
        insights = await sb<any[]>('GET', `/game_insights?id=eq.${encodeURIComponent(qInsightId as string)}&limit=1&select=*,author:profiles!user_id(id,handle,display_name,profile_picture)`);
      } else if (userId) {
        const statusFilter = status ? `&status=eq.${status}` : '';
        insights = await sb<any[]>('GET', `/game_insights?user_id=eq.${encodeURIComponent(userId as string)}${statusFilter}&order=submitted_at.desc&limit=100&select=*,author:profiles!user_id(id,handle,display_name,profile_picture)`);
      } else {
        if (!gameId) return res.status(400).json({ error: 'gameId, insightId, or userId is required' });
        const statusFilter = status ? `&status=eq.${status}` : '';
        const { category } = req.query;
        const categoryFilter = category && category !== 'all' ? `&category=eq.${encodeURIComponent(category as string)}` : '';
        insights = await sb<any[]>('GET', `/game_insights?game_id=eq.${encodeURIComponent(gameId as string)}${statusFilter}${categoryFilter}&order=submitted_at.desc&limit=50&select=*,author:profiles!user_id(id,handle,display_name,profile_picture)`);
      }
      let myVotes: Record<string, string> = {};
      if (token) {
        const user = await getAuthUser(token);
        if (user && insights.length > 0) {
          const ids = insights.map((i: any) => i.id).join(',');
          const votes = await sb<any[]>('GET', `/game_insight_votes?insight_id=in.(${ids})&user_id=eq.${user.id}&select=insight_id,vote`);
          for (const v of votes) myVotes[v.insight_id] = v.vote;
        }
      }
      const now = Date.now();
      for (const i of insights) {
        if (i.status === 'pending' && i.approve_count + i.reject_count === 0) {
          const hours = (now - new Date(i.submitted_at).getTime()) / 3600000;
          if (hours >= 24) {
            const approvedAt = new Date().toISOString();
            sb('PATCH', `/game_insights?id=eq.${i.id}`, { status: 'approved', approved_at: approvedAt, updated_at: approvedAt }).catch(() => {});
            i.status = 'approved'; i.approved_at = approvedAt;
          }
        }
      }
      return res.json(qInsightId ? (insights.map((i: any) => ({ ...i, myVote: myVotes[i.id] ?? null }))[0] ?? null) : insights.map((i: any) => ({ ...i, myVote: myVotes[i.id] ?? null })));
    } catch (err: any) { return res.status(500).json({ error: err?.message ?? 'Failed to fetch insights' }); }
  }

  if (req.method === 'POST') {
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await getAuthUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { gameId, gameTitle, query, content, title, category } = req.body ?? {};
    if (!gameId || !gameTitle || !query?.trim() || !content?.trim()) return res.status(400).json({ error: 'gameId, gameTitle, query, and content are required' });
    const validCategories = ['characters', 'objects', 'locations', 'extras', 'enemies', 'quest'];
    const safeCategory = validCategories.includes(category) ? category : 'extras';
    const [insight] = await sbAsUser<any[]>('POST', '/game_insights', token, { user_id: user.id, game_id: gameId, game_title: gameTitle, query: query.trim(), content: content.trim(), title: title?.trim() || null, category: safeCategory, status: 'pending' });
    return res.status(201).json(insight);
  }

  if (req.method === 'PATCH') {
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await getAuthUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { insightId, vote, action } = req.body ?? {};
    if (!insightId) return res.status(400).json({ error: 'insightId is required' });

    if (action === 'set-category') {
      const { category } = req.body ?? {};
      const valid = ['characters', 'objects', 'locations', 'extras', 'enemies', 'quest'];
      if (!valid.includes(category)) return res.status(400).json({ error: 'Invalid category' });
      const [insight] = await sb<any[]>('GET', `/game_insights?id=eq.${insightId}&limit=1`);
      if (!insight) return res.status(404).json({ error: 'Insight not found' });
      if (insight.user_id !== user.id) return res.status(403).json({ error: 'Only the author can change category' });
      const updated = await sbAsUser<any[]>('PATCH', `/game_insights?id=eq.${insightId}`, token, { category, updated_at: new Date().toISOString() });
      if (!updated?.length) return res.status(500).json({ error: 'Category update did not modify any rows' });
      return res.json({ success: true });
    }

    if (action === 'edit-title') {
      const { title, content } = req.body ?? {};
      if (!title?.trim() && !content?.trim()) return res.status(400).json({ error: 'title or content is required' });
      const [insight] = await sb<any[]>('GET', `/game_insights?id=eq.${insightId}&limit=1`);
      if (!insight) return res.status(404).json({ error: 'Insight not found' });
      if (insight.user_id !== user.id) return res.status(403).json({ error: 'Only the author can edit this insight' });
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (title?.trim()) updates.title = title.trim();
      if (content?.trim()) updates.content = content.trim();
      const updated = await sbAsUser<any[]>('PATCH', `/game_insights?id=eq.${insightId}`, token, updates);
      if (!updated?.length) return res.status(500).json({ error: 'Edit did not modify any rows' });
      return res.json({ success: true });
    }

    if (action === 'edit-content') {
      const { title, content } = req.body ?? {};
      if (!title?.trim() && !content?.trim()) return res.status(400).json({ error: 'title or content is required' });
      const [insight] = await sb<any[]>('GET', `/game_insights?id=eq.${insightId}&limit=1`);
      if (!insight) return res.status(404).json({ error: 'Insight not found' });
      if (insight.user_id !== user.id) return res.status(403).json({ error: 'Only the author can edit this insight' });
      if (insight.status !== 'pending') return res.status(400).json({ error: 'Only pending insights can be edited' });
      const now = new Date().toISOString();
      // Delete votes as owner (RLS policy allows insight owner to delete votes on their insights)
      await sbAsUser('DELETE', `/game_insight_votes?insight_id=eq.${insightId}`, token);
      const updates: Record<string, any> = { approve_count: 0, reject_count: 0, submitted_at: now, updated_at: now };
      if (title?.trim()) updates.title = title.trim();
      if (content?.trim()) updates.content = content.trim();
      const updated = await sbAsUser<any[]>('PATCH', `/game_insights?id=eq.${insightId}`, token, updates);
      if (!updated?.length) return res.status(500).json({ error: 'Edit did not modify any rows' });
      return res.json({ success: true });
    }

    if (action === 're-review') {
      const [insight] = await sb<any[]>('GET', `/game_insights?id=eq.${insightId}&limit=1`);
      if (!insight) return res.status(404).json({ error: 'Insight not found' });
      if (insight.user_id !== user.id) return res.status(403).json({ error: 'Only the author can request re-review' });
      if (insight.status !== 'approved') return res.status(400).json({ error: 'Only approved insights can be re-reviewed' });
      if (insight.re_review_requested_at) return res.status(400).json({ error: 'Re-review already requested' });
      await sbAsUser('DELETE', `/game_insight_votes?insight_id=eq.${insightId}`, token);
      const updated = await sbAsUser<any[]>('PATCH', `/game_insights?id=eq.${insightId}`, token, { status: 'pending', approve_count: 0, reject_count: 0, approved_at: null, re_review_requested_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      if (!updated?.length) return res.status(500).json({ error: 'Re-review request did not modify any rows' });
      return res.json({ success: true });
    }

    if (vote !== 'approve' && vote !== 'reject') return res.status(400).json({ error: 'vote must be approve or reject' });
    const [insight] = await sb<any[]>('GET', `/game_insights?id=eq.${insightId}&limit=1`);
    if (!insight) return res.status(404).json({ error: 'Insight not found' });
    if (insight.status !== 'pending') return res.status(400).json({ error: 'Can only vote on pending insights' });
    if (insight.user_id === user.id) return res.status(400).json({ error: 'Cannot vote on your own insight' });
    const existingVotes = await sb<any[]>('GET', `/game_insight_votes?insight_id=eq.${insightId}&user_id=eq.${user.id}&limit=1`);
    if (existingVotes.length > 0) { await sb('PATCH', `/game_insight_votes?insight_id=eq.${insightId}&user_id=eq.${user.id}`, { vote }); }
    else { await sb('POST', '/game_insight_votes', { insight_id: insightId, user_id: user.id, vote }); }
    const allVotes = await sb<any[]>('GET', `/game_insight_votes?insight_id=eq.${insightId}&select=vote`);
    const approveCount = allVotes.filter((v: any) => v.vote === 'approve').length;
    const rejectCount = allVotes.filter((v: any) => v.vote === 'reject').length;
    const total = approveCount + rejectCount;
    let newStatus = insight.status, approvedAt = insight.approved_at;
    const hoursSince = (Date.now() - new Date(insight.submitted_at).getTime()) / 3600000;
    if (total >= 3 && approveCount / total >= 0.7 && hoursSince >= 24 && insight.status === 'pending') { newStatus = 'approved'; approvedAt = new Date().toISOString(); }
    await sb('PATCH', `/game_insights?id=eq.${insightId}`, { approve_count: approveCount, reject_count: rejectCount, status: newStatus, ...(approvedAt !== insight.approved_at ? { approved_at: approvedAt } : {}), updated_at: new Date().toISOString() });
    if (newStatus === 'approved' && insight.status === 'pending') {
      extractAndUpsertEntities(insight).catch(() => {});
      await createNotification(insight.user_id, user.id, 'insight_approved', insightId);
      const voters = await sb<any[]>('GET', `/game_insight_votes?insight_id=eq.${insightId}&select=user_id`);
      for (const voter of voters) { if (voter.user_id !== insight.user_id && voter.user_id !== user.id) await createNotification(voter.user_id, user.id, 'insight_approved', insightId); }
    }
    return res.json({ approveCount, rejectCount, status: newStatus, myVote: vote });
  }

  if (req.method === 'DELETE') {
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await getAuthUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { insightId } = req.query;
    if (!insightId) return res.status(400).json({ error: 'insightId is required' });
    const [insight] = await sb<any[]>('GET', `/game_insights?id=eq.${insightId}&user_id=eq.${user.id}&limit=1`);
    if (!insight) return res.status(404).json({ error: 'Insight not found or not yours' });
    const deleted = await sb<any[]>('DELETE', `/game_insights?id=eq.${insightId}&user_id=eq.${user.id}`);
    if (!Array.isArray(deleted) || deleted.length === 0) return res.status(500).json({ error: 'Delete failed' });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ─── game-wiki-entities ───────────────────────────────────────────────────────
async function handleGameWikiEntities(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    const { gameId, entityId, type } = req.query;
    try {
      if (entityId) {
        const rows = await sb<any[]>('GET', `/game_wiki_entities?id=eq.${encodeURIComponent(entityId as string)}&status=eq.active&limit=1`);
        return res.json(rows[0] ?? null);
      }
      if (!gameId) return res.status(400).json({ error: 'gameId or entityId is required' });
      const typeFilter = type && type !== 'all' ? `&type=eq.${encodeURIComponent(type as string)}` : '';
      return res.json(await sb<any[]>('GET', `/game_wiki_entities?game_id=eq.${encodeURIComponent(gameId as string)}&status=eq.active${typeFilter}&order=name.asc&limit=100`));
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  }
  if (req.method === 'PATCH') {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await getAuthUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { entityId, description } = req.body ?? {};
    if (!entityId || description === undefined) return res.status(400).json({ error: 'entityId and description are required' });
    try {
      await sb('PATCH', `/game_wiki_entities?id=eq.${entityId}`, { description: String(description).trim(), updated_at: new Date().toISOString() });
      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ─── game-wiki-entity-edits ───────────────────────────────────────────────────
async function handleGameWikiEntityEdits(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const token = req.headers['authorization']?.replace('Bearer ', '');

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
      const now = Date.now();
      for (const e of edits) {
        if (e.approve_count + e.reject_count === 0) {
          const hours = (now - new Date(e.submitted_at).getTime()) / 3600000;
          if (hours >= 24) {
            const approvedAt = new Date().toISOString();
            sb('PATCH', `/game_wiki_entity_edits?id=eq.${e.id}`, { status: 'approved', approved_at: approvedAt, updated_at: approvedAt }, 'return=minimal').catch(() => {});
            sb('PATCH', `/game_wiki_entities?id=eq.${e.entity_id}`, { ...e.content, updated_at: approvedAt }, 'return=minimal').catch(() => {});
            e.status = 'approved'; e.approved_at = approvedAt;
          }
        }
      }
      return res.json(edits.filter((e: any) => e.status === 'pending').map((e: any) => ({ ...e, myVote: myVotes[e.id] ?? null })));
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  }

  if (req.method === 'POST') {
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await getAuthUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { entityId, content } = req.body ?? {};
    if (!entityId || !content || typeof content !== 'object') return res.status(400).json({ error: 'entityId and content object are required' });
    const allowed = ['description', 'cover_image_url'];
    const safeContent: Record<string, string> = {};
    for (const key of allowed) { if (typeof content[key] === 'string') safeContent[key] = content[key].trim(); }
    if (!Object.keys(safeContent).length) return res.status(400).json({ error: 'content must include at least one valid field' });
    try {
      const [edit] = await sb<any[]>('POST', '/game_wiki_entity_edits', { entity_id: entityId, user_id: user.id, content: safeContent, status: 'pending' });
      return res.status(201).json(edit);
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  }

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
      const existing = await sb<any[]>('GET', `/game_wiki_entity_edit_votes?edit_id=eq.${editId}&user_id=eq.${user.id}&limit=1`);
      if (existing.length > 0) { await sb('PATCH', `/game_wiki_entity_edit_votes?edit_id=eq.${editId}&user_id=eq.${user.id}`, { vote }, 'return=minimal'); }
      else { await sb('POST', '/game_wiki_entity_edit_votes', { edit_id: editId, user_id: user.id, vote }, 'return=minimal'); }
      const allVotes = await sb<any[]>('GET', `/game_wiki_entity_edit_votes?edit_id=eq.${editId}&select=vote`);
      const approveCount = allVotes.filter((v: any) => v.vote === 'approve').length;
      const rejectCount = allVotes.filter((v: any) => v.vote === 'reject').length;
      const total = approveCount + rejectCount;
      const hoursSince = (Date.now() - new Date(edit.submitted_at).getTime()) / 3600000;
      let newStatus = 'pending', approvedAt: string | null = null;
      if (total >= 3 && approveCount / total >= 0.7 && hoursSince >= 24) { newStatus = 'approved'; approvedAt = new Date().toISOString(); }
      else if (total >= 3 && rejectCount / total > 0.5) { newStatus = 'rejected'; }
      await sb('PATCH', `/game_wiki_entity_edits?id=eq.${editId}`, { approve_count: approveCount, reject_count: rejectCount, status: newStatus, ...(approvedAt ? { approved_at: approvedAt } : {}), updated_at: new Date().toISOString() }, 'return=minimal');
      if (newStatus === 'approved') { await sb('PATCH', `/game_wiki_entities?id=eq.${edit.entity_id}`, { ...edit.content, updated_at: new Date().toISOString() }, 'return=minimal'); }
      return res.json({ approveCount, rejectCount, status: newStatus, myVote: vote });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ─── insight-conversations ────────────────────────────────────────────────────
function buildContinuationPrompt(gameTitle: string, history: ConversationMessage[], newMessage: string): string {
  const historyText = history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
  return `You are a gaming expert helping develop a detailed insight about "${gameTitle.replace(/"/g, "'")}".
Help the user refine and expand their insight through conversation. Keep each response focused, factual, and 2-4 paragraphs. Plain text, no markdown.

${historyText}

User: ${newMessage}

Respond directly:`;
}

async function handleInsightConversations(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const user = await getAuthUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { gameId, conversationId } = req.query;
    try {
      if (conversationId) {
        const rows = await sb<any[]>('GET', `/insight_conversations?id=eq.${encodeURIComponent(conversationId as string)}&user_id=eq.${user.id}&limit=1`);
        return res.json(rows[0] ?? null);
      }
      if (!gameId) return res.status(400).json({ error: 'gameId or conversationId is required' });
      return res.json(await sb<any[]>('GET', `/insight_conversations?user_id=eq.${user.id}&game_id=eq.${encodeURIComponent(gameId as string)}&status=eq.drafting&order=updated_at.desc&limit=10`));
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  }

  if (req.method === 'POST') {
    const { gameId, gameTitle, message } = req.body ?? {};
    if (!gameId || !gameTitle || !message?.trim()) return res.status(400).json({ error: 'gameId, gameTitle, and message are required' });
    if (message.length > 500) return res.status(400).json({ error: 'Message must be under 500 characters' });
    if (gameTitle.length > 100) return res.status(400).json({ error: 'Game title too long' });
    try {
      const firstPrompt = `You are a gaming expert helping players with "${gameTitle.replace(/"/g, "'")}". Answer the following question concisely and accurately.

Question: ${message.trim()}

Format your response EXACTLY like this:
Line 1: A SHORT HEADLINE (4-6 words, Title Case)
Line 2: ---
Line 3: CATEGORY: characters|objects|locations|extras|enemies|quest
Line 4: ---
Remaining: Your answer in 2-4 paragraphs. Plain text, no markdown.`;

      const raw = await callGemini(firstPrompt, 2048);
      const parts = raw.split('\n---\n');
      let title = '', category = 'extras', answer = raw;
      if (parts.length >= 3) { title = parts[0].trim(); const catMatch = parts[1].trim().match(/^CATEGORY:\s*(characters|objects|locations|extras|enemies|quest)/i); if (catMatch) category = catMatch[1].toLowerCase(); answer = parts.slice(2).join('\n---\n').trim(); }
      else if (parts.length === 2) { title = parts[0].trim(); answer = parts[1].trim(); }
      const now = new Date().toISOString();
      const messages: ConversationMessage[] = [{ role: 'user', content: message.trim(), timestamp: now }, { role: 'assistant', content: answer, timestamp: now }];
      const [conversation] = await sb<any[]>('POST', '/insight_conversations', { user_id: user.id, game_id: gameId, game_title: gameTitle, messages, status: 'drafting' });
      return res.status(201).json({ ...conversation, latestAnswer: answer, title, category });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  }

  if (req.method === 'PATCH') {
    const { conversationId, message, action, insightId } = req.body ?? {};
    if (!conversationId) return res.status(400).json({ error: 'conversationId is required' });
    try {
      const rows = await sb<any[]>('GET', `/insight_conversations?id=eq.${conversationId}&user_id=eq.${user.id}&limit=1`);
      const convo = rows[0];
      if (!convo) return res.status(404).json({ error: 'Conversation not found' });
      if (action === 'publish') {
        if (insightId) { const linked = await sb<any[]>('GET', `/game_insights?id=eq.${insightId}&limit=1`); if (!linked[0] || linked[0].user_id !== user.id) return res.status(403).json({ error: 'Insight not yours' }); }
        await sb('PATCH', `/insight_conversations?id=eq.${conversationId}`, { status: 'published', insight_id: insightId ?? null, updated_at: new Date().toISOString() }, 'return=minimal');
        return res.json({ success: true });
      }
      if (action === 'abandon') {
        await sb('PATCH', `/insight_conversations?id=eq.${conversationId}`, { status: 'abandoned', updated_at: new Date().toISOString() }, 'return=minimal');
        return res.json({ success: true });
      }
      if (!message?.trim()) return res.status(400).json({ error: 'message is required' });
      const history: ConversationMessage[] = convo.messages ?? [];
      const answer = await callGemini(buildContinuationPrompt(convo.game_title, history, message.trim()), 2048);
      const now = new Date().toISOString();
      const updatedMessages = [...history, { role: 'user' as const, content: message.trim(), timestamp: now }, { role: 'assistant' as const, content: answer, timestamp: now }];
      const [updated] = await sb<any[]>('PATCH', `/insight_conversations?id=eq.${conversationId}`, { messages: updatedMessages, updated_at: now });
      return res.json({ ...(updated ?? convo), messages: updatedMessages, latestAnswer: answer });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ─── cron-approve ─────────────────────────────────────────────────────────────
async function handleCronApprove(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!CRON_SECRET || req.headers['authorization'] !== `Bearer ${CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    const insights = await sb<any[]>('GET', `/game_insights?status=eq.pending&approve_count=eq.0&reject_count=eq.0&submitted_at=lt.${encodeURIComponent(cutoff)}&select=id`, undefined, 'return=representation');
    for (const i of insights) { await sb('PATCH', `/game_insights?id=eq.${i.id}`, { status: 'approved', approved_at: now, updated_at: now }, 'return=minimal'); }
    let approvedEdits = 0;
    try {
      const edits = await sb<any[]>('GET', `/game_wiki_entity_edits?status=eq.pending&approve_count=eq.0&reject_count=eq.0&submitted_at=lt.${encodeURIComponent(cutoff)}&select=id,entity_id,content`, undefined, 'return=representation');
      for (const e of edits) {
        await sb('PATCH', `/game_wiki_entity_edits?id=eq.${e.id}`, { status: 'approved', approved_at: now, updated_at: now }, 'return=minimal');
        if (e.entity_id && e.content && typeof e.content === 'object') { await sb('PATCH', `/game_wiki_entities?id=eq.${e.entity_id}`, { ...e.content, updated_at: now }, 'return=minimal'); }
        approvedEdits++;
      }
    } catch {}
    return res.json({ approved_insights: insights.length, approved_edits: approvedEdits });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
}

// ─── extract-entities ─────────────────────────────────────────────────────────
type EntityType = 'character' | 'location' | 'item' | 'mechanic' | 'lore';
type Entity = { name: string; type: EntityType; description: string };

async function extractEntitiesFromInsight(gameTitle: string, title: string, content: string): Promise<Entity[]> {
  const safe = (s: string) => s.replace(/"/g, "'");
  const prompt = `You are analyzing a game insight for "${safe(gameTitle)}".
Insight title: "${safe(title)}"
Content: ${content.slice(0, 3000)}
List every specific named entity mentioned. Return ONLY a JSON array:
[{ "name": "...", "type": "character|location|item|mechanic|lore", "description": "one sentence" }]`;
  const raw = await callGemini(prompt, 2048);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const validTypes = new Set<string>(['character', 'location', 'item', 'mechanic', 'lore']);
    return parsed.filter((e: any) => typeof e.name === 'string' && e.name.trim() && typeof e.type === 'string' && validTypes.has(e.type) && typeof e.description === 'string').map((e: any): Entity => ({ name: e.name.trim(), type: e.type as EntityType, description: e.description.trim() }));
  } catch { return []; }
}

async function handleExtractEntities(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!CRON_SECRET || req.headers['authorization'] !== `Bearer ${CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini API key not configured' });
  try {
    const now = new Date().toISOString();
    const insights = await sb<Array<{ id: string; game_id: string; game_title: string; title: string | null; content: string | null }>>('GET', `/game_insights?status=eq.approved&entities_extracted_at=is.null&select=id,game_id,game_title,title,content&limit=${BATCH_SIZE}`);
    if (!insights.length) return res.json({ processed: 0, entities_created: 0 });
    let processed = 0, entities_created = 0;
    for (const insight of insights) {
      const mark = () => sb('PATCH', `/game_insights?id=eq.${insight.id}`, { entities_extracted_at: now }, 'return=minimal');
      const contentText = (insight.content ?? '').trim(), titleText = (insight.title ?? '').trim();
      if (!contentText && !titleText) { await mark(); processed++; continue; }
      let entities: Entity[] = [];
      try { entities = await extractEntitiesFromInsight(insight.game_title, titleText, contentText); } catch (err) { console.error(`[extract-entities] Gemini failed for ${insight.id}:`, err); await mark(); processed++; continue; }
      for (const entity of entities) {
        try {
          await sb('POST', '/game_wiki_entities', { game_id: insight.game_id, game_title: insight.game_title, name: entity.name, type: entity.type, description: entity.description, source_insight_id: insight.id }, 'resolution=ignore-duplicates,return=minimal');
          entities_created++;
        } catch (err) { console.error(`[extract-entities] Upsert failed for "${entity.name}":`, err); }
      }
      await mark(); processed++;
    }
    return res.json({ processed, entities_created });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Server misconfigured' });
  const resource = (req.url ?? '').split('?')[0].split('/').pop() ?? '';
  if (resource === 'game-insights') return handleGameInsights(req, res);
  if (resource === 'game-wiki-entities') return handleGameWikiEntities(req, res);
  if (resource === 'game-wiki-entity-edits') return handleGameWikiEntityEdits(req, res);
  if (resource === 'insight-conversations') return handleInsightConversations(req, res);
  if (resource === 'cron-approve') return handleCronApprove(req, res);
  if (resource === 'extract-entities') return handleExtractEntities(req, res);
  return res.status(404).json({ error: 'Not found' });
}
