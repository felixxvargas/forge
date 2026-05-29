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

async function sbAsUser<T = unknown>(method: string, path: string, userToken: string, body?: object): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${userToken}`,
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

async function sbAdmin<T = unknown>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=minimal',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : ([] as unknown as T);
}

async function createNotification(userId: string, actorId: string, type: string, insightId: string) {
  try {
    await sb('POST', '/notifications', {
      user_id: userId,
      actor_id: actorId,
      type,
      metadata: { insight_id: insightId },
      read: false,
    });
  } catch { /* notifications are best-effort */ }
}

const GEMINI_API_KEY = process.env.GEMINI_API ?? process.env.GEMINI_API_KEY ?? '';

async function callGeminiExtract(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

async function extractAndUpsertEntities(insight: { id: string; game_id: string; game_title: string; title: string; content: string; category: string }): Promise<void> {
  const prompt = `You are extracting named entities from a game wiki insight about "${insight.game_title}".

Insight title: ${insight.title}
Insight content: ${insight.content}

Extract up to 5 notable named entities (characters, locations, items, mechanics, or lore concepts) mentioned or described in this insight. For each entity, provide a brief description (1-2 sentences) based only on what the insight says.

Respond with a JSON array (no markdown, no code fences, just the raw array):
[
  { "name": "Entity Name", "type": "character|location|item|mechanic|lore", "description": "Brief description." },
  ...
]

Only include entities that are clearly named and meaningfully described. If none qualify, respond with an empty array: []`;

  const raw = await callGeminiExtract(prompt);

  let entities: Array<{ name: string; type: string; description: string }> = [];
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    entities = JSON.parse(cleaned);
    if (!Array.isArray(entities)) entities = [];
  } catch {
    return;
  }

  const validTypes = new Set(['character', 'location', 'item', 'mechanic', 'lore']);

  for (const entity of entities.slice(0, 5)) {
    if (!entity.name?.trim() || !validTypes.has(entity.type)) continue;
    try {
      // Upsert via POST with on-conflict ignore (duplicate = already exists, skip)
      await fetch(`${SUPABASE_URL}/rest/v1/game_wiki_entities`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Prefer: 'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify({
          game_id: insight.game_id,
          game_title: insight.game_title,
          name: entity.name.trim(),
          type: entity.type,
          description: entity.description?.trim() ?? '',
          source_insight_id: insight.id,
        }),
      });
    } catch { /* ignore per-entity errors */ }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Server misconfigured' });
  res.setHeader('Cache-Control', 'no-store');

  const token = req.headers['authorization']?.replace('Bearer ', '');

  // GET — fetch insight(s) by insightId, by gameId+status, or by userId
  if (req.method === 'GET') {
    const { gameId, status, insightId: qInsightId, userId } = req.query;

    try {
      let insights: any[];
      if (qInsightId) {
        insights = await sb<any[]>(
          'GET',
          `/game_insights?id=eq.${encodeURIComponent(qInsightId as string)}&limit=1&select=*,author:profiles!user_id(id,handle,display_name,profile_picture)`
        );
      } else if (userId) {
        const statusFilter = status ? `&status=eq.${status}` : '';
        insights = await sb<any[]>(
          'GET',
          `/game_insights?user_id=eq.${encodeURIComponent(userId as string)}${statusFilter}&order=submitted_at.desc&limit=100&select=*,author:profiles!user_id(id,handle,display_name,profile_picture)`
        );
      } else {
        if (!gameId) return res.status(400).json({ error: 'gameId, insightId, or userId is required' });
        const statusFilter = status ? `&status=eq.${status}` : '';
        const { category } = req.query;
        const categoryFilter = category && category !== 'all' ? `&category=eq.${encodeURIComponent(category as string)}` : '';
        insights = await sb<any[]>(
          'GET',
          `/game_insights?game_id=eq.${encodeURIComponent(gameId as string)}${statusFilter}${categoryFilter}&order=submitted_at.desc&limit=50&select=*,author:profiles!user_id(id,handle,display_name,profile_picture)`
        );
      }

      // If authenticated, fetch current user's votes
      let myVotes: Record<string, string> = {};
      if (token) {
        const user = await getAuthUser(token);
        if (user && insights.length > 0) {
          const insightIds = insights.map((i: any) => i.id).join(',');
          const votes = await sb<any[]>('GET', `/game_insight_votes?insight_id=in.(${insightIds})&user_id=eq.${user.id}&select=insight_id,vote`);
          for (const v of votes) myVotes[v.insight_id] = v.vote;
        }
      }

      // Zero-vote auto-approval: pending insights with no votes after 24h get approved on next read
      const now = Date.now();
      for (const i of insights) {
        if (i.status === 'pending' && i.approve_count + i.reject_count === 0) {
          const hours = (now - new Date(i.submitted_at).getTime()) / 3600000;
          if (hours >= 24) {
            const approvedAt = new Date().toISOString();
            sb('PATCH', `/game_insights?id=eq.${i.id}`, {
              status: 'approved',
              approved_at: approvedAt,
              updated_at: approvedAt,
            }).catch(() => {});
            i.status = 'approved';
            i.approved_at = approvedAt;
          }
        }
      }

      const result = insights.map((i: any) => ({ ...i, myVote: myVotes[i.id] ?? null }));
      return res.json(qInsightId ? result[0] ?? null : result);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message ?? 'Failed to fetch insights' });
    }
  }

  // POST — submit a new insight
  if (req.method === 'POST') {
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await getAuthUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId, gameTitle, query, content, title, category } = req.body ?? {};
    if (!gameId || !gameTitle || !query?.trim() || !content?.trim()) {
      return res.status(400).json({ error: 'gameId, gameTitle, query, and content are required' });
    }
    const validCategories = ['characters', 'objects', 'locations', 'extras', 'enemies'];
    const safeCategory = validCategories.includes(category) ? category : 'extras';

    const [insight] = await sbAsUser<any[]>('POST', '/game_insights', token, {
      user_id: user.id,
      game_id: gameId,
      game_title: gameTitle,
      query: query.trim(),
      content: content.trim(),
      title: title?.trim() || null,
      category: safeCategory,
      status: 'pending',
    });

    return res.status(201).json(insight);
  }

  // PATCH — vote on an insight
  if (req.method === 'PATCH') {
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await getAuthUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { insightId, vote, action } = req.body ?? {};
    if (!insightId) return res.status(400).json({ error: 'insightId is required' });

    // Set-category action — owner changes the category of their own insight
    if (action === 'set-category') {
      const { category } = req.body ?? {};
      const validCategories = ['characters', 'objects', 'locations', 'extras', 'enemies'];
      if (!validCategories.includes(category)) return res.status(400).json({ error: 'Invalid category' });
      const [insight] = await sb<any[]>('GET', `/game_insights?id=eq.${insightId}&limit=1`);
      if (!insight) return res.status(404).json({ error: 'Insight not found' });
      if (insight.user_id !== user.id) return res.status(403).json({ error: 'Only the author can change category' });
      await sb('PATCH', `/game_insights?id=eq.${insightId}`, { category, updated_at: new Date().toISOString() });
      return res.json({ success: true });
    }

    // Edit-content action — owner edits a pending insight, clears votes, restarts timer
    if (action === 'edit-content') {
      const { title, content } = req.body ?? {};
      if (!title?.trim() && !content?.trim()) return res.status(400).json({ error: 'title or content is required' });
      const [insight] = await sb<any[]>('GET', `/game_insights?id=eq.${insightId}&limit=1`);
      if (!insight) return res.status(404).json({ error: 'Insight not found' });
      if (insight.user_id !== user.id) return res.status(403).json({ error: 'Only the author can edit this insight' });
      if (insight.status !== 'pending') return res.status(400).json({ error: 'Only pending insights can be edited — use re-review for approved insights' });
      const now = new Date().toISOString();
      await sb('DELETE', `/game_insight_votes?insight_id=eq.${insightId}`);
      const updates: Record<string, any> = { approve_count: 0, reject_count: 0, submitted_at: now, updated_at: now };
      if (title?.trim()) updates.title = title.trim();
      if (content?.trim()) updates.content = content.trim();
      await sb('PATCH', `/game_insights?id=eq.${insightId}`, updates);
      return res.json({ success: true });
    }

    // Re-review action — owner resets an approved insight back to pending
    if (action === 're-review') {
      const [insight] = await sb<any[]>('GET', `/game_insights?id=eq.${insightId}&limit=1`);
      if (!insight) return res.status(404).json({ error: 'Insight not found' });
      if (insight.user_id !== user.id) return res.status(403).json({ error: 'Only the author can request re-review' });
      if (insight.status !== 'approved') return res.status(400).json({ error: 'Only approved insights can be re-reviewed' });
      if (insight.re_review_requested_at) return res.status(400).json({ error: 'Re-review already requested' });

      await sb('DELETE', `/game_insight_votes?insight_id=eq.${insightId}`);
      await sb('PATCH', `/game_insights?id=eq.${insightId}`, {
        status: 'pending',
        approve_count: 0,
        reject_count: 0,
        approved_at: null,
        re_review_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return res.json({ success: true });
    }

    if (vote !== 'approve' && vote !== 'reject') return res.status(400).json({ error: 'vote must be approve or reject' });

    // Fetch the insight
    const [insight] = await sb<any[]>('GET', `/game_insights?id=eq.${insightId}&limit=1`);
    if (!insight) return res.status(404).json({ error: 'Insight not found' });
    if (insight.status !== 'pending') return res.status(400).json({ error: 'Can only vote on pending insights' });
    if (insight.user_id === user.id) return res.status(400).json({ error: 'Cannot vote on your own insight' });

    // Upsert vote (handles vote change)
    const existingVotes = await sb<any[]>('GET', `/game_insight_votes?insight_id=eq.${insightId}&user_id=eq.${user.id}&limit=1`);
    const prevVote = existingVotes[0]?.vote ?? null;

    if (existingVotes.length > 0) {
      await sb('PATCH', `/game_insight_votes?insight_id=eq.${insightId}&user_id=eq.${user.id}`, { vote });
    } else {
      await sb('POST', '/game_insight_votes', { insight_id: insightId, user_id: user.id, vote });
    }

    // Recalculate vote counts
    const allVotes = await sb<any[]>('GET', `/game_insight_votes?insight_id=eq.${insightId}&select=vote`);
    const approveCount = allVotes.filter((v: any) => v.vote === 'approve').length;
    const rejectCount = allVotes.filter((v: any) => v.vote === 'reject').length;
    const total = approveCount + rejectCount;

    let newStatus = insight.status;
    let approvedAt = insight.approved_at;

    // Check approval: 70%+ approve, at least 3 votes, at least 24h after submission
    const submittedAt = new Date(insight.submitted_at).getTime();
    const hoursSinceSubmit = (Date.now() - submittedAt) / 3600000;
    if (
      total >= 3 &&
      approveCount / total >= 0.7 &&
      hoursSinceSubmit >= 24 &&
      insight.status === 'pending'
    ) {
      newStatus = 'approved';
      approvedAt = new Date().toISOString();
    }

    await sb('PATCH', `/game_insights?id=eq.${insightId}`, {
      approve_count: approveCount,
      reject_count: rejectCount,
      status: newStatus,
      ...(approvedAt !== insight.approved_at ? { approved_at: approvedAt } : {}),
      updated_at: new Date().toISOString(),
    });

    // Extract wiki entities from the newly approved insight
    if (newStatus === 'approved' && insight.status === 'pending') {
      extractAndUpsertEntities(insight).catch(() => { /* non-critical */ });
    }

    // Send approval notification to submitter + all voters
    if (newStatus === 'approved' && insight.status === 'pending') {
      // Notify the submitter
      await createNotification(insight.user_id, user.id, 'insight_approved', insightId);
      // Notify all voters
      const voters = await sb<any[]>('GET', `/game_insight_votes?insight_id=eq.${insightId}&select=user_id`);
      for (const voter of voters) {
        if (voter.user_id !== insight.user_id && voter.user_id !== user.id) {
          await createNotification(voter.user_id, user.id, 'insight_approved', insightId);
        }
      }
    }

    return res.json({
      approveCount,
      rejectCount,
      status: newStatus,
      myVote: vote,
    });
  }

  // DELETE — remove own insight
  if (req.method === 'DELETE') {
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await getAuthUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { insightId } = req.query;
    if (!insightId) return res.status(400).json({ error: 'insightId is required' });

    const [insight] = await sb<any[]>('GET', `/game_insights?id=eq.${insightId}&user_id=eq.${user.id}&limit=1`);
    if (!insight) return res.status(404).json({ error: 'Insight not found or not yours' });

    await sb('DELETE', `/game_insights?id=eq.${insightId}`);
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
