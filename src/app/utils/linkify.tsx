import { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useAppData } from '../context/AppDataContext';

interface LinkifyMentionsProps {
  text: string;
  onMentionClick?: (handle: string) => void;
  /** If provided, @GameTitle occurrences will link to the game page */
  gameId?: string;
  gameTitle?: string;
}

export function LinkifyMentions({ text, onMentionClick, gameId, gameTitle }: LinkifyMentionsProps) {
  const navigate = useNavigate();
  const { getUserByHandle } = useAppData();

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
        // URL
        const url = match[1];
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
      } else {
        // @mention
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

  // If a game is tagged, extract both "@GameTitle" (old posts) and bare "GameTitle" (new posts)
  if (gameTitle && gameId) {
    const escapedTitle = gameTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const gameRegex = new RegExp(`@?${escapedTitle}`, 'g');
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = gameRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(...processSegment(text.substring(lastIndex, match.index), `pre-${match.index}`));
      }
      parts.push(
        <button
          key={`game-${match.index}`}
          onClick={(e) => { e.stopPropagation(); navigate(`/game/${gameId}`); }}
          className="text-accent hover:underline font-bold"
        >
          {match[0]}
        </button>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(...processSegment(text.substring(lastIndex), 'post'));
    }

    return <>{parts}</>;
  }

  // No game — process URLs and @mentions
  const parts = processSegment(text, 'u');
  return <>{parts.length > 0 ? parts : text}</>;
}
