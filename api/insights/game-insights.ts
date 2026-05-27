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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Server misconfigured' });
  res.setHeader('Cache-Control', 'no-store');

  const token = req.headers['authorization']?.replace('Bearer ', '');

  // GET — fetch insight(s) by insightId or by gameId+status
  if (req.method === 'GET') {
    const { gameId, status, insightId: qInsightId } = req.query;

    let insights: any[];
    if (qInsightId) {
      insights = await sb<any[]>(
        'GET',
        `/game_insights?id=eq.${encodeURIComponent(qInsightId as string)}&limit=1&select=*,author:profiles!user_id(id,handle,display_name,profile_picture)`
      );
    } else {
      if (!gameId) return res.status(400).json({ error: 'gameId or insightId is required' });
      const statusFilter = status ? `&status=eq.${status}` : '';
      insights = await sb<any[]>(
        'GET',
        `/game_insights?game_id=eq.${encodeURIComponent(gameId as string)}${statusFilter}&order=submitted_at.desc&limit=50&select=*,author:profiles!user_id(id,handle,display_name,profile_picture)`
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

    const result = insights.map((i: any) => ({ ...i, myVote: myVotes[i.id] ?? null }));
    return res.json(qInsightId ? result[0] ?? null : result);
  }

  // POST — submit a new insight
  if (req.method === 'POST') {
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await getAuthUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId, gameTitle, query, content, title } = req.body ?? {};
    if (!gameId || !gameTitle || !query?.trim() || !content?.trim()) {
      return res.status(400).json({ error: 'gameId, gameTitle, query, and content are required' });
    }

    const [insight] = await sbAsUser<any[]>('POST', '/game_insights', token, {
      user_id: user.id,
      game_id: gameId,
      game_title: gameTitle,
      query: query.trim(),
      content: content.trim(),
      title: title?.trim() || null,
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
