/**
 * Shared utilities for rich-text mention highlighting in compose screens.
 * Uses the "mirror div" technique: the textarea renders with transparent text
 * while an absolutely-positioned div behind it renders the same content with
 * @mentions and @game-titles highlighted in accent green.
 */

/** In-session game search cache so repeated queries are instant. */
export const gameSearchCache = new Map<string, any[]>();

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Converts plain post text into HTML where:
 *  - @KnownHandle (matching a user in `users`) → bold accent span
 *  - @GameTitle   (matching selectedGame.title, may contain spaces) → bold accent span
 *  - everything else → escaped plain text (displayed in the container's foreground color)
 */
export function buildHighlightedHtml(
  text: string,
  users: any[],
  selectedGame: { id: string; title: string } | null,
): string {
  type Range = { start: number; end: number };
  const ranges: Range[] = [];

  // 1. Highlight @GameTitle (may have spaces — must run first)
  if (selectedGame?.title) {
    const escaped = selectedGame.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`@${escaped}`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      ranges.push({ start: m.index, end: m.index + m[0].length });
    }
  }

  // 2. Highlight @userHandle (single-word, not already covered)
  const handleRe = /@(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = handleRe.exec(text)) !== null) {
    const start = m.index;
    const end = m.index + m[0].length;
    const alreadyCovered = ranges.some(r => start < r.end && end > r.start);
    if (!alreadyCovered) {
      const handle = m[1].toLowerCase();
      const isKnown = users.some(
        u => (u.handle || '').replace(/^@/, '').toLowerCase() === handle,
      );
      if (isKnown) ranges.push({ start, end });
    }
  }

  ranges.sort((a, b) => a.start - b.start);

  let html = '';
  let cursor = 0;
  for (const { start, end } of ranges) {
    html += escapeHtml(text.slice(cursor, start));
    html += `<strong style="color:var(--accent)">${escapeHtml(text.slice(start, end))}</strong>`;
    cursor = end;
  }
  html += escapeHtml(text.slice(cursor));
  // Trailing zero-width space ensures last line has correct height in the mirror
  return html + '\u200B';
}
