import { useState } from 'react';
import { Edit2, ChevronRight, Trash2, Users, GripVertical, MoreHorizontal, Flame, EyeOff } from 'lucide-react';
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
  onAddGame?: () => void;
  onDelete?: () => void;
  onHide?: () => void;
  listType?: GameListType;
  showFirstOnly?: boolean;
  dragHandle?: boolean;
  onGripPointerDown?: (e: React.PointerEvent) => void;
  onGripPointerMove?: (e: React.PointerEvent) => void;
  onGripPointerUp?: (e: React.PointerEvent) => void;
  onGripPointerCancel?: (e: React.PointerEvent) => void;
}

export function GameList({ title, games, showHours = false, badges, sortable = false, onEdit, onAddGame, onDelete, onHide, listType, showFirstOnly = false, dragHandle = false, onGripPointerDown, onGripPointerMove, onGripPointerUp, onGripPointerCancel }: GameListProps) {
  const navigate = useNavigate();
  const [sortOrder, setSortOrder] = useState<'a-z' | 'z-a'>('a-z');
  const [showActionTray, setShowActionTray] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sortedGames = sortable
    ? [...games].sort((a, b) =>
        sortOrder === 'a-z'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
      )
    : games;

  const PREVIEW_LIMIT = 10;
  const displayGames = showFirstOnly ? sortedGames.slice(0, PREVIEW_LIMIT) : sortedGames;
  const overflowCount = showFirstOnly ? Math.max(0, sortedGames.length - PREVIEW_LIMIT) : 0;

  const handleViewAll = () => {
    if (listType) navigate(`/list?type=${listType}`);
  };

  const handleViewOtherUsers = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (listType) navigate(`/list?type=${listType}&browse=true`);
  };

  const hasActions = onEdit || onDelete || onHide || (listType && games.length > 0);

  if (games.length === 0 && !onEdit) return null;

  const isLFG = listType === 'lfg';

  return (
    <div className={`mb-6 ${isLFG ? 'rounded-xl border-2 border-orange-400/40 bg-gradient-to-r from-orange-500/8 to-red-500/8 p-3' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {dragHandle && (
            <GripVertical
              className="w-4 h-4 text-muted-foreground/50 cursor-grab active:cursor-grabbing shrink-0 touch-none select-none"
              onPointerDown={onGripPointerDown}
              onPointerMove={onGripPointerMove}
              onPointerUp={onGripPointerUp}
              onPointerCancel={onGripPointerCancel}
            />
          )}
          {isLFG && <Flame className="w-4 h-4 text-orange-400 shrink-0" />}
          <h3 className={`font-medium ${isLFG ? 'text-orange-300' : ''}`}>{title}</h3>
          {badges && badges.map((badge) => (
            <span
              key={badge}
              className="px-2 py-0.5 text-xs rounded-full bg-accent/20 text-accent uppercase tracking-wide"
            >
              {badge}
            </span>
          ))}
        </div>
        {hasActions && (
          <button
            onClick={() => { setShowActionTray(true); setConfirmDelete(false); }}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
            aria-label="List options"
          >
            <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {displayGames.map((game) => (
          <GameCard key={game.id} game={game} showHours={showHours} />
        ))}
        {/* +X more overflow card */}
        {overflowCount > 0 && listType && (
          <button
            onClick={handleViewAll}
            className="flex-shrink-0 w-32 flex flex-col items-center justify-center rounded-lg bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer gap-1"
            style={{ aspectRatio: '3/4' }}
          >
            <span className="text-2xl font-bold text-accent">+{overflowCount}</span>
            <span className="text-xs text-muted-foreground">more</span>
          </button>
        )}
      </div>

      {/* View All link */}
      {games.length > PREVIEW_LIMIT && showFirstOnly && listType && (
        <button
          onClick={handleViewAll}
          className="flex items-center gap-1 text-sm text-accent hover:text-accent/80 transition-colors mt-2"
        >
          View All ({games.length})
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Action tray */}
      {showActionTray && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => { setShowActionTray(false); setConfirmDelete(false); }}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-card/95 backdrop-blur-xl rounded-t-2xl shadow-xl safe-area-bottom">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-1" />
            {confirmDelete ? (
              <div className="p-4 space-y-3 pb-8">
                <p className="text-center font-semibold">Delete "{title}"?</p>
                <p className="text-center text-sm text-muted-foreground">All games in this list will be removed.</p>
                <button
                  onClick={() => { onDelete?.(); setShowActionTray(false); setConfirmDelete(false); }}
                  className="w-full py-3.5 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm"
                >
                  Delete List
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="w-full py-3.5 rounded-xl bg-secondary text-foreground font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="p-2 pb-8">
                {listType && games.length > 0 && (
                  <button
                    onClick={(e) => { handleViewOtherUsers(e); setShowActionTray(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary transition-colors text-left"
                  >
                    <Users className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="text-sm">See others with this list</span>
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => { onEdit(); setShowActionTray(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary transition-colors text-left"
                  >
                    <Edit2 className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="text-sm">Edit list</span>
                  </button>
                )}
                {onHide && (
                  <button
                    onClick={() => { onHide(); setShowActionTray(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary transition-colors text-left"
                  >
                    <EyeOff className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-sm">Hide list</span>
                      <span className="text-xs text-muted-foreground">Remove from profile. Games are kept.</span>
                    </div>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary transition-colors text-left"
                  >
                    <Trash2 className="w-5 h-5 text-destructive shrink-0" />
                    <span className="text-sm text-destructive">Delete list</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
