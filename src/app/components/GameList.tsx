import { useState } from 'react';
import { Edit2, ChevronRight, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { Game, GameListType } from '../data/data';
import { GameCard } from './GameCard';

interface GameListProps {
  title: string;
  games: Game[];
  showHours?: boolean;
  badges?: string[];
  sortable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  listType?: GameListType;
  showFirstOnly?: boolean;
}

export function GameList({ title, games, showHours = false, badges, sortable = false, onEdit, onDelete, listType, showFirstOnly = false }: GameListProps) {
  const navigate = useNavigate();
  const [sortOrder, setSortOrder] = useState<'a-z' | 'z-a'>('a-z');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sortedGames = sortable
    ? [...games].sort((a, b) =>
        sortOrder === 'a-z'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
      )
    : games;

  const displayGames = showFirstOnly ? sortedGames.slice(0, 5) : sortedGames;

  const handleViewAll = () => {
    if (listType) navigate(`/list?type=${listType}`);
  };

  const handleViewOtherUsers = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (listType) navigate(`/list?type=${listType}&browse=true`);
  };

  if (games.length === 0 && !onEdit) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{title}</h3>
          {badges && badges.map((badge) => (
            <span
              key={badge}
              className="px-2 py-0.5 text-xs rounded-full bg-accent/20 text-accent uppercase tracking-wide"
            >
              {badge}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {listType && games.length > 0 && (
            <button
              onClick={handleViewOtherUsers}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
              title="See other users with this list"
            >
              <Users className="w-4 h-4 text-muted-foreground hover:text-accent" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
              title="Edit list"
            >
              <Edit2 className="w-4 h-4 text-muted-foreground hover:text-accent" />
            </button>
          )}
          {onDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { onDelete(); setConfirmDelete(false); }}
                  className="text-xs text-destructive hover:underline px-1"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-muted-foreground hover:underline px-1"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                title="Delete list"
              >
                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {displayGames.map((game) => (
          <GameCard key={game.id} game={game} showHours={showHours} />
        ))}
      </div>

      {/* View All link */}
      {games.length > 5 && showFirstOnly && listType && (
        <button
          onClick={handleViewAll}
          className="flex items-center gap-1 text-sm text-accent hover:text-accent/80 transition-colors mt-2"
        >
          View All ({games.length})
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
