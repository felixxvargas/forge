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

  // Process a segment of text for @user mentions (single-word handles only)
  const processUserMentions = (segment: string, keyPrefix: string): ReactNode[] => {
    const mentionRegex = /@(\w+)/g;
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(segment)) !== null) {
      if (match.index > lastIndex) {
        parts.push(segment.substring(lastIndex, match.index));
      }
      const handle = match[0];
      const handleWithoutAt = match[1];
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
      // Process any text before this match for user mentions
      if (match.index > lastIndex) {
        parts.push(...processUserMentions(text.substring(lastIndex, match.index), `pre-${match.index}`));
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

    // Process remaining text for user mentions
    if (lastIndex < text.length) {
      parts.push(...processUserMentions(text.substring(lastIndex), 'post'));
    }

    return <>{parts}</>;
  }

  // No game — just process user mentions
  const parts = processUserMentions(text, 'u');
  return <>{parts.length > 0 ? parts : text}</>;
}
