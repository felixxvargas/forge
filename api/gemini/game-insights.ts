import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const GEMINI_API_KEY = process.env.GEMINI_API ?? process.env.GEMINI_API_KEY ?? '';
const DAILY_LIMIT = 50;

async function getAuthUser(token: string): Promise<{ id: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function sbFetch(method: string, path: string, authToken: string, body?: object, prefer?: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${authToken}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text ? JSON.parse(text) : (method === 'GET' ? [] : null);
}

async function checkAndIncrementUsage(userId: string, userToken: string): Promise<{ allowed: boolean; used: number }> {
  const today = new Date().toISOString().split('T')[0];
  const rows = await sbFetch('GET', `/gemini_usage?user_id=eq.${userId}&usage_date=eq.${today}&limit=1`, userToken) as Array<{ id: string; query_count: number }>;

  if (rows.length === 0) {
    await sbFetch('POST', '/gemini_usage', userToken, { user_id: userId, usage_date: today, query_count: 1 }, 'return=minimal');
    return { allowed: true, used: 1 };
  }

  const row = rows[0];
  if (row.query_count >= DAILY_LIMIT) {
    return { allowed: false, used: row.query_count };
  }

  await sbFetch('PATCH', `/gemini_usage?user_id=eq.${userId}&usage_date=eq.${today}`, userToken, {
    query_count: row.query_count + 1,
    updated_at: new Date().toISOString(),
  });
  return { allowed: true, used: row.query_count + 1 };
}

async function queryGemini(question: string, gameTitle: string): Promise<string> {
  const prompt = `You are a gaming expert helping players with the game "${gameTitle}".
Answer the following question concisely and accurately. Focus on practical, actionable information.
If the question is not relevant to gaming or "${gameTitle}", say so briefly.

Question: ${question}

Provide a clear, helpful answer in 2-4 paragraphs. Use plain text without markdown formatting.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 512,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response from Gemini');
  return text.trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Server misconfigured' });
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini API key not configured' });

  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const user = await getAuthUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { question, gameId, gameTitle } = req.body ?? {};
  if (!question?.trim()) return res.status(400).json({ error: 'question is required' });
  if (!gameId) return res.status(400).json({ error: 'gameId is required — link a game before searching' });
  if (!gameTitle) return res.status(400).json({ error: 'gameTitle is required' });

  try {
    const usage = await checkAndIncrementUsage(user.id, token);
    if (!usage.allowed) {
      return res.status(429).json({
        error: `Daily limit reached (${DAILY_LIMIT} queries per day). Try again tomorrow.`,
        used: usage.used,
        limit: DAILY_LIMIT,
      });
    }

    const answer = await queryGemini(question.trim(), gameTitle);

    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      answer,
      used: usage.used,
      limit: DAILY_LIMIT,
      remaining: DAILY_LIMIT - usage.used,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? 'Internal error' });
  }
}
