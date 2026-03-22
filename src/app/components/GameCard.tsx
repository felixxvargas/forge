import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { Game } from '../data/data';

interface GameCardProps {
  game: Game;
  showHours?: boolean;
}

export function GameCard({ game, showHours = false }: GameCardProps) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  // Support both old local Game format (coverArt) and IGDB DB format (artwork[])
  const coverUrl = (game as any).artwork?.find((a: any) => a.artwork_type === 'cover')?.url
    ?? (game as any).artwork?.[0]?.url
    ?? game.coverArt;

  return (
    <div
      className="flex-shrink-0 w-32 group cursor-pointer"
      onClick={() => navigate(`/game/${game.id}`)}
    >
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-2 bg-secondary">
        {coverUrl && !imgError ? (
          <img
            src={coverUrl}
            alt={game.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
        )}
      </div>
      <h4 className="text-sm font-medium line-clamp-2 mb-1">{game.title}</h4>
      {showHours && game.hoursPlayed && (
        <p className="text-xs text-muted-foreground">{game.hoursPlayed}h played</p>
      )}
    </div>
  );
}