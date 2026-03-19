import { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useAppData } from '../context/AppDataContext';

interface LinkifyMentionsProps {
  text: string;
  onMentionClick?: (handle: string) => void;
}

export function LinkifyMentions({ text, onMentionClick }: LinkifyMentionsProps) {
  const navigate = useNavigate();
  const { getUserByHandle } = useAppData();
  
  // Regex to match @handles (alphanumeric and underscores)
  const mentionRegex = /@(\w+)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Add the mention as a clickable link
    const handle = match[0]; // includes @
    const handleWithoutAt = match[1]; // without @
    parts.push(
      <button
        key={match.index}
        onClick={(e) => {
          e.stopPropagation();
          if (onMentionClick) {
            onMentionClick(handle);
          } else {
            // Look up user by handle and navigate to their profile
            const user = getUserByHandle(handleWithoutAt);
            if (user) {
              navigate(`/profile/${user.id}`);
            }
          }
        }}
        className="text-accent hover:underline font-medium"
      >
        {handle}
      </button>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts.length > 0 ? parts : text}</>;
}