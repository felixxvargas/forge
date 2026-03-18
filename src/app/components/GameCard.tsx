import { useNavigate } from 'react-router';
import type { Game } from '../data/data';
import { PlatformIcon } from './PlatformIcon';

interface GameCardProps {
  game: Game;
  showHours?: boolean;
}

export function GameCard({ game, showHours = false }: GameCardProps) {
  const navigate = useNavigate();
  
  return (
    <div 
      className="flex-shrink-0 w-32 group cursor-pointer"
      onClick={() => navigate(`/game/${game.id}`)}
    >
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-2 bg-secondary">
        <img 
          src={game.coverArt} 
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
        <div className="absolute top-2 right-2">
          <PlatformIcon platform={game.platform} className="w-8 h-8 bg-card/80 backdrop-blur-sm" />
        </div>
      </div>
      <h4 className="text-sm font-medium line-clamp-2 mb-1">{game.title}</h4>
      {showHours && game.hoursPlayed && (
        <p className="text-xs text-muted-foreground">{game.hoursPlayed}h played</p>
      )}
    </div>
  );
}