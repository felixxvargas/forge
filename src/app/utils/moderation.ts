import { projectId, publicAnonKey } from '/utils/supabase/info';

export async function checkContent(content: string): Promise<{ ok: boolean; reason?: string }> {
  // Skip very short content (under 3 chars)
  if (!content || content.trim().length < 3) return { ok: true };
  try {
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/moderate-content`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ content: content.trim() }),
      }
    );
    if (!res.ok) return { ok: true }; // fail open if service unavailable
    const data = await res.json();
    if (data.flagged) {
      return { ok: false, reason: data.reason || 'This content violates our community guidelines.' };
    }
    return { ok: true };
  } catch {
    return { ok: true }; // fail open
  }
}
