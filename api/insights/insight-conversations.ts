import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const GEMINI_API_KEY = process.env.GEMINI_API ?? process.env.GEMINI_API_KEY ?? '';

type ConversationMessage = { role: 'user' | 'assistant'; content: string; timestamp: string };

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

async function callGemini(prompt: string): Promise<string> {
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
  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  if (!raw) throw new Error('No response from Gemini');
  return raw;
}

function buildContinuationPrompt(gameTitle: string, history: ConversationMessage[], newMessage: string): string {
  const safeTitle = gameTitle.replace(/"/g, "'");
  const historyText = history
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  return `You are a gaming expert helping develop a detailed insight about "${safeTitle}".
Help the user refine and expand their insight through conversation. Keep each response focused, factual, and 2-4 paragraphs. Plain text, no markdown. Build naturally on the prior conversation.

${historyText}

User: ${newMessage}

Respond directly:`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Server misconfigured' });
  res.setHeader('Cache-Control', 'no-store');

  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const user = await getAuthUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // GET — list drafting conversations for a game, or fetch one by ID
  if (req.method === 'GET') {
    const { gameId, conversationId } = req.query;
    try {
      if (conversationId) {
        const rows = await sb<any[]>(`GET`, `/insight_conversations?id=eq.${encodeURIComponent(conversationId as string)}&user_id=eq.${user.id}&limit=1`);
        return res.json(rows[0] ?? null);
      }
      if (!gameId) return res.status(400).json({ error: 'gameId or conversationId is required' });
      const rows = await sb<any[]>('GET', `/insight_conversations?user_id=eq.${user.id}&game_id=eq.${encodeURIComponent(gameId as string)}&status=eq.drafting&order=updated_at.desc&limit=10`);
      return res.json(rows);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — create a new conversation (initial message → Gemini first turn)
  if (req.method === 'POST') {
    const { gameId, gameTitle, message } = req.body ?? {};
    if (!gameId || !gameTitle || !message?.trim()) {
      return res.status(400).json({ error: 'gameId, gameTitle, and message are required' });
    }
    if (message.length > 500) return res.status(400).json({ error: 'Message must be under 500 characters' });
    if (gameTitle.length > 100) return res.status(400).json({ error: 'Game title too long' });

    const safeTitle = gameTitle.replace(/"/g, "'");

    try {
      // Build a first-turn prompt (identical to the existing single-turn prompt so the insight can be published from message 1)
      const firstPrompt = `You are a gaming expert helping players with the game "${safeTitle}".
Answer the following question concisely and accurately. Focus on practical, actionable information.

Question: ${message.trim()}

Format your response EXACTLY like this:
Line 1: A SHORT HEADLINE (4-6 words, Title Case)
Line 2: ---
Line 3: CATEGORY: characters|objects|locations|extras
Line 4: ---
Remaining: Your answer in 2-4 paragraphs. Plain text, no markdown.

Category guide: characters = NPCs, enemies, bosses, companions; objects = items, weapons, gear, collectibles; locations = areas, maps, zones, dungeons; extras = mechanics, lore, cinematics, concept art, music, deleted content, everything else.`;

      const raw = await callGemini(firstPrompt);

      // Parse headline + category + answer
      const parts = raw.split('\n---\n');
      let title = '';
      let category = 'extras';
      let answer = raw;
      if (parts.length >= 3) {
        title = parts[0].trim();
        const catMatch = parts[1].trim().match(/^CATEGORY:\s*(characters|objects|locations|extras)/i);
        if (catMatch) category = catMatch[1].toLowerCase();
        answer = parts.slice(2).join('\n---\n').trim();
      } else if (parts.length === 2) {
        title = parts[0].trim();
        answer = parts[1].trim();
      }

      const now = new Date().toISOString();
      const messages: ConversationMessage[] = [
        { role: 'user', content: message.trim(), timestamp: now },
        { role: 'assistant', content: answer, timestamp: now },
      ];

      const [conversation] = await sb<any[]>('POST', '/insight_conversations', {
        user_id: user.id,
        game_id: gameId,
        game_title: gameTitle,
        messages,
        status: 'drafting',
      });

      return res.status(201).json({ ...conversation, latestAnswer: answer, title, category });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PATCH — append a message, OR mark published/abandoned
  if (req.method === 'PATCH') {
    const { conversationId, message, action, insightId } = req.body ?? {};
    if (!conversationId) return res.status(400).json({ error: 'conversationId is required' });

    try {
      const rows = await sb<any[]>('GET', `/insight_conversations?id=eq.${conversationId}&user_id=eq.${user.id}&limit=1`);
      const convo = rows[0];
      if (!convo) return res.status(404).json({ error: 'Conversation not found' });

      // Status transitions: publish or abandon
      if (action === 'publish') {
        if (insightId) {
          const linked = await sb<any[]>('GET', `/game_insights?id=eq.${insightId}&limit=1`);
          if (!linked[0] || linked[0].user_id !== user.id) {
            return res.status(403).json({ error: 'Insight not yours' });
          }
        }
        await sb('PATCH', `/insight_conversations?id=eq.${conversationId}`, {
          status: 'published',
          insight_id: insightId ?? null,
          updated_at: new Date().toISOString(),
        }, 'return=minimal');
        return res.json({ success: true });
      }

      if (action === 'abandon') {
        await sb('PATCH', `/insight_conversations?id=eq.${conversationId}`, {
          status: 'abandoned',
          updated_at: new Date().toISOString(),
        }, 'return=minimal');
        return res.json({ success: true });
      }

      // Default: append a new user message + get Gemini response
      if (!message?.trim()) return res.status(400).json({ error: 'message is required' });

      const history: ConversationMessage[] = convo.messages ?? [];
      const prompt = buildContinuationPrompt(convo.game_title, history, message.trim());
      const answer = await callGemini(prompt);

      const now = new Date().toISOString();
      const updatedMessages: ConversationMessage[] = [
        ...history,
        { role: 'user', content: message.trim(), timestamp: now },
        { role: 'assistant', content: answer, timestamp: now },
      ];

      const [updated] = await sb<any[]>('PATCH', `/insight_conversations?id=eq.${conversationId}`, {
        messages: updatedMessages,
        updated_at: now,
      });

      return res.json({ ...(updated ?? convo), messages: updatedMessages, latestAnswer: answer });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE — abandon and delete a conversation
  if (req.method === 'DELETE') {
    const { conversationId } = req.query;
    if (!conversationId) return res.status(400).json({ error: 'conversationId is required' });
    try {
      await sb('DELETE', `/insight_conversations?id=eq.${conversationId}&user_id=eq.${user.id}`, undefined, 'return=minimal');
      return res.status(204).end();
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
