import { ReactNode } from 'react';
import { useNavigate } from '@/compat/router';
import { useAppData } from '../context/AppDataContext';

interface LinkifyMentionsProps {
  text: string;
  onMentionClick?: (handle: string) => void;
  /** Single tagged game (legacy / single-tag posts) */
  gameId?: string;
  gameTitle?: string;
  /** Multi-game tagged posts — parallel arrays */
  gameIds?: string[];
  gameTitles?: string[];
}

export function LinkifyMentions({ text, onMentionClick, gameId, gameTitle, gameIds, gameTitles }: LinkifyMentionsProps) {
  const navigate = useNavigate();
  const { getUserByHandle } = useAppData();

  // Build a unified list of { id, title } for all tagged games
  const games: { id: string; title: string }[] = (() => {
    const ids = (gameIds?.length ?? 0) > 0 ? gameIds! : gameId ? [gameId] : [];
    const titles = (gameTitles?.length ?? 0) > 0 ? gameTitles! : gameTitle ? [gameTitle] : [];
    return ids.map((id, i) => ({ id, title: titles[i] ?? '' })).filter(g => g.id && g.title);
  })();

  // Process a text segment for URLs and @mentions
  const processSegment = (segment: string, keyPrefix: string): ReactNode[] => {
    const re = /(https?:\/\/[^\s<>"'\])}]+)|(@\w+)/g;
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = re.exec(segment)) !== null) {
      if (match.index > lastIndex) {
        parts.push(segment.substring(lastIndex, match.index));
      }
      if (match[1]) {
        const url = match[1];
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          parts.push(url);
        } else {
          const displayUrl = url.length > 60 ? url.slice(0, 57) + '...' : url;
          parts.push(
            <a
              key={`${keyPrefix}-url-${match.index}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="font-bold text-accent hover:underline break-all"
            >
              {displayUrl}
            </a>
          );
        }
      } else {
        const handle = match[0];
        const handleWithoutAt = match[2];
        parts.push(
          <button
            key={`${keyPrefix}-${match.index}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onMentionClick) {
                onMentionClick(handle);
              } else {
                const user = getUserByHandle(handleWithoutAt);
                if (user) navigate(`/profile/${user.id}`);
              }
            }}
            className="text-accent hover:underline font-bold"
          >
            {handle}
          </button>
        );
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < segment.length) parts.push(segment.substring(lastIndex));
    return parts;
  };

  // With tagged games: split the text on every game title (supports @GameTitle and bare GameTitle),
  // then process remaining segments for URLs/@mentions.
  if (games.length > 0) {
    // Build one regex that matches any game title (with optional leading @)
    const escapedTitles = games.map(g => g.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const gameRegex = new RegExp(`(@?(?:${escapedTitles.join('|')}))`, 'g');

    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = gameRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(...processSegment(text.substring(lastIndex, match.index), `pre-${match.index}`));
      }
      // Find which game this matched (strip leading @ for lookup)
      const matchedText = match[0];
      const stripped = matchedText.startsWith('@') ? matchedText.slice(1) : matchedText;
      const game = games.find(g => g.title === stripped);
      if (game) {
        parts.push(
          <button
            key={`game-${match.index}`}
            onClick={(e) => { e.stopPropagation(); navigate(`/game/${encodeURIComponent(game.id)}`); }}
            className="inline align-baseline p-0 text-accent hover:underline font-bold"
          >
            {matchedText}
          </button>
        );
      } else {
        parts.push(matchedText);
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(...processSegment(text.substring(lastIndex), 'post'));
    }

    return <>{parts}</>;
  }

  // No games — process URLs and @mentions only
  const parts = processSegment(text, 'u');
  return <>{parts.length > 0 ? parts : text}</>;
}
