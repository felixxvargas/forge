import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const GEMINI_API_KEY = process.env.GEMINI_API ?? process.env.GEMINI_API_KEY ?? '';
const DAILY_LIMIT = 50;

type ConversationMessage = { role: 'user' | 'assistant'; content: string; timestamp: string };

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

// Single-turn: initial question → headline + category + answer
async function queryGeminiFirst(question: string, gameTitle: string): Promise<{ answer: string; title: string; category: string }> {
  const safeTitle = gameTitle.replace(/"/g, "'");
  const prompt = `You are a gaming expert helping players with the game "${safeTitle}".
Answer the following question concisely and accurately. Focus on practical, actionable information.
If the question is not relevant to gaming or "${safeTitle}", say so briefly.

Question: ${question}

Format your response EXACTLY like this — no deviation:
Line 1: A SHORT HEADLINE for this insight (4-6 words, Title Case — e.g. "Fia's Champions Boss Strategy")
Line 2: ---
Line 3: CATEGORY: characters|objects|locations|extras|enemies
Line 4: ---
Remaining: Your answer in 2-4 paragraphs. Plain text, no markdown.
VIDEOS:
- [optional YouTube URL 1 — only real, verifiable youtube.com/watch?v= or youtu.be/ links]
- [optional YouTube URL 2]
(Leave VIDEOS section empty or omit it entirely if you are not confident the links exist and are relevant.)

Category guide: characters = NPCs, companions, story characters; enemies = enemy types, bosses, hostile NPCs, mob groups, mini-bosses; objects = items, weapons, gear, collectibles; locations = areas, maps, zones, dungeons; extras = mechanics, lore, cinematics, concept art, music, deleted content, everything else.`;

  const raw = await callGeminiAPI(prompt);
  return parseFirstTurnResponse(raw);
}

// Multi-turn: continue a conversation; decide whether the reply warrants updating the main insight
async function queryGeminiContinue(
  newMessage: string,
  gameTitle: string,
  history: ConversationMessage[]
): Promise<{ updatedInsight: string | null; reply: string }> {
  const safeTitle = gameTitle.replace(/"/g, "'");
  const historyText = history
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const prompt = `You are a gaming expert helping develop a lore insight document about "${safeTitle}".

Conversation so far:
${historyText}

User: ${newMessage}

Your task has two parts:

PART 1 — Decide if this follow-up warrants updating the main insight document.
- Update it ONLY if the user's message adds new factual lore, corrects a significant error, or expands the documented information in a meaningful way.
- If the follow-up is conversational ("thanks", "what about X mechanic?", clarifying questions, tangents not useful to document), do NOT update the insight.
- If you update, rewrite the FULL insight body (not just the new part) as a polished, informational lore entry. Plain text, no markdown. 2-5 paragraphs.

PART 2 — A brief conversational reply to the user's message. 1-3 sentences. Acknowledge what changed or answer their question directly. Plain text.

Format your response EXACTLY like this:
UPDATE_INSIGHT: [the complete rewritten insight text, or the word "none" if no update]
---SPLIT---
CHAT_REPLY: [your brief conversational reply]`;

  const raw = await callGeminiAPI(prompt);
  return parseContinueResponse(raw);
}

function parseContinueResponse(raw: string): { updatedInsight: string | null; reply: string } {
  const parts = raw.split('---SPLIT---');
  let updatedInsight: string | null = null;
  let reply = raw.trim();

  if (parts.length >= 2) {
    const insightLine = parts[0].trim();
    const replyLine = parts[1].trim();

    const insightMatch = insightLine.match(/^UPDATE_INSIGHT:\s*([\s\S]*)/i);
    if (insightMatch) {
      const val = insightMatch[1].trim();
      updatedInsight = val.toLowerCase() === 'none' ? null : val;
    }

    const replyMatch = replyLine.match(/^CHAT_REPLY:\s*([\s\S]*)/i);
    reply = replyMatch ? replyMatch[1].trim() : replyLine;
  }

  return { updatedInsight, reply };
}

async function callGeminiAPI(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    }
  );

  if (!res.ok) {
    let friendly = 'Something went wrong with Forge AI. Please try again.';
    try {
      const errData = await res.json();
      const status = errData?.error?.status ?? '';
      if (res.status === 503 || status === 'UNAVAILABLE') {
        friendly = 'Forge AI is experiencing high demand right now. Please try again in a moment.';
      } else if (res.status === 429 || status === 'RESOURCE_EXHAUSTED') {
        friendly = 'Forge AI rate limit reached. Please wait a moment and try again.';
      }
    } catch { /* use default message */ }
    throw new Error(friendly);
  }
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  if (!raw) throw new Error('No response from Gemini');
  return raw;
}

function extractYouTubeLinks(text: string): { text: string; videoLinks: string[] } {
  const videoLinks: string[] = [];
  const videosSectionMatch = text.match(/\nVIDEOS:\s*\n([\s\S]*?)(?:\n\n|$)/i);
  if (videosSectionMatch) {
    const lines = videosSectionMatch[1].split('\n');
    for (const line of lines) {
      const urlMatch = line.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/);
      if (urlMatch) videoLinks.push(urlMatch[0]);
    }
    text = text.replace(/\nVIDEOS:[\s\S]*?(?:\n\n|$)/i, '').trim();
  }
  return { text, videoLinks };
}

function parseFirstTurnResponse(raw: string): { answer: string; title: string; category: string; videoLinks: string[] } {
  // Expected: "Headline\n---\nCATEGORY: xxx\n---\nAnswer...\nVIDEOS:\n- url"
  const parts = raw.split('\n---\n');
  let title = '';
  let category = 'extras';
  let answer = raw;

  if (parts.length >= 3) {
    title = parts[0].trim();
    const categoryLine = parts[1].trim();
    const catMatch = categoryLine.match(/^CATEGORY:\s*(characters|objects|locations|extras|enemies)/i);
    if (catMatch) category = catMatch[1].toLowerCase();
    answer = parts.slice(2).join('\n---\n').trim();
  } else if (parts.length === 2) {
    title = parts[0].trim();
    answer = parts[1].trim();
  }

  const { text: cleanAnswer, videoLinks } = extractYouTubeLinks(answer);
  return { answer: cleanAnswer, title, category, videoLinks };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Server misconfigured' });
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini API key not configured' });

  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const user = await getAuthUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { question, gameId, gameTitle, messages } = req.body ?? {};
  if (!question?.trim()) return res.status(400).json({ error: 'question is required' });
  if (!gameId) return res.status(400).json({ error: 'gameId is required — link a game before searching' });
  if (!gameTitle) return res.status(400).json({ error: 'gameTitle is required' });
  if (question.length > 500) return res.status(400).json({ error: 'Question must be under 500 characters' });
  if (gameTitle.length > 100) return res.status(400).json({ error: 'Game title too long' });

  const isMultiTurn = Array.isArray(messages) && messages.length > 0;

  try {
    const usage = await checkAndIncrementUsage(user.id, token);
    if (!usage.allowed) {
      return res.status(429).json({
        error: `Daily limit reached (${DAILY_LIMIT} queries per day). Try again tomorrow.`,
        used: usage.used,
        limit: DAILY_LIMIT,
      });
    }

    res.setHeader('Cache-Control', 'no-store');

    if (isMultiTurn) {
      const { updatedInsight, reply } = await queryGeminiContinue(question.trim(), gameTitle, messages as ConversationMessage[]);
      return res.json({ updatedInsight, reply, used: usage.used, limit: DAILY_LIMIT, remaining: DAILY_LIMIT - usage.used });
    }

    const { answer, title, category, videoLinks } = await queryGeminiFirst(question.trim(), gameTitle);
    return res.json({ answer, title, category, videoLinks, used: usage.used, limit: DAILY_LIMIT, remaining: DAILY_LIMIT - usage.used });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? 'Internal error' });
  }
}
