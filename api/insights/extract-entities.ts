// Daily cron — extracts named lore entities from approved game insights via Gemini.
// Inserts new records into game_wiki_entities (ignores duplicates via unique index).
// Triggered by GitHub Actions: POST /api/insights/extract-entities  Authorization: Bearer $CRON_SECRET

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const CRON_SECRET = process.env.CRON_SECRET ?? '';
const GEMINI_API_KEY = process.env.GEMINI_API ?? process.env.GEMINI_API_KEY ?? '';

const BATCH_SIZE = 20;

type EntityType = 'character' | 'location' | 'item' | 'mechanic' | 'lore';
type Entity = { name: string; type: EntityType; description: string };

async function sb<T = unknown>(method: string, path: string, body?: object, prefer?: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : ([] as unknown as T);
}

async function extractEntities(gameTitle: string, title: string, content: string): Promise<Entity[]> {
  const safe = (s: string) => s.replace(/"/g, "'");
  const prompt = `You are analyzing a game insight for "${safe(gameTitle)}".

Insight title: "${safe(title)}"
Content: ${content.slice(0, 3000)}

List every specific named entity mentioned: NPCs, characters, bosses, enemies, locations (including sites of grace, dungeons, areas), items (weapons, armor, talismans, consumables, ashes of war), skills and spells (incantations, sorceries, weapon arts), and status effects or game mechanics.

Return ONLY a JSON array. Each object must have exactly:
- "name": the correct full in-game name with official capitalization (e.g. "Black Flame" not "Black Flame DoT", "Ancestral Follower Shaman" not "AFS")
- "type": one of: character, location, item, mechanic, lore
- "description": one sentence describing this entity in the context of the game

Type guide:
- character: NPCs, bosses, enemies, allied characters, summon spirits (Spirit Ashes)
- location: areas, dungeons, sites of grace, landmarks
- item: weapons, armor, talismans, consumables, upgrade materials, ashes of war (if the item, not the skill)
- mechanic: active skills, weapon arts, spells, incantations, sorceries, status effects (Bleed, Rot, etc.)
- lore: factions, groups, in-universe titles/concepts

Return ONLY valid JSON array, no markdown, no other text.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048, responseMimeType: 'application/json' },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini API ${res.status}`);
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const validTypes = new Set<string>(['character', 'location', 'item', 'mechanic', 'lore']);
    return parsed
      .filter((e: any) =>
        typeof e.name === 'string' && e.name.trim() &&
        typeof e.type === 'string' && validTypes.has(e.type) &&
        typeof e.description === 'string'
      )
      .map((e: any): Entity => ({
        name: e.name.trim(),
        type: e.type as EntityType,
        description: e.description.trim(),
      }));
  } catch {
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'];
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!SERVICE_KEY) return res.status(500).json({ error: 'Server misconfigured' });
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini API key not configured' });

  try {
    const now = new Date().toISOString();

    const insights = await sb<Array<{
      id: string;
      game_id: string;
      game_title: string;
      title: string | null;
      content: string | null;
    }>>('GET',
      `/game_insights?status=eq.approved&entities_extracted_at=is.null&select=id,game_id,game_title,title,content&limit=${BATCH_SIZE}`
    );

    if (!insights.length) return res.json({ processed: 0, entities_created: 0 });

    let processed = 0;
    let entities_created = 0;

    for (const insight of insights) {
      const mark = () => sb('PATCH', `/game_insights?id=eq.${insight.id}`, { entities_extracted_at: now }, 'return=minimal');

      const contentText = (insight.content ?? '').trim();
      const titleText = (insight.title ?? '').trim();

      if (!contentText && !titleText) {
        await mark();
        processed++;
        continue;
      }

      let entities: Entity[] = [];
      try {
        entities = await extractEntities(insight.game_title, titleText, contentText);
      } catch (err) {
        console.error(`[extract-entities] Gemini failed for insight ${insight.id}:`, err);
        await mark();
        processed++;
        continue;
      }

      for (const entity of entities) {
        try {
          await sb('POST', '/game_wiki_entities', {
            game_id: insight.game_id,
            game_title: insight.game_title,
            name: entity.name,
            type: entity.type,
            description: entity.description,
            source_insight_id: insight.id,
          }, 'resolution=ignore-duplicates,return=minimal');
          entities_created++;
        } catch (err) {
          console.error(`[extract-entities] Upsert failed for "${entity.name}":`, err);
        }
      }

      await mark();
      processed++;
    }

    return res.json({ processed, entities_created });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
