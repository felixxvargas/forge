import { Flame } from 'lucide-react';

interface GameTileProps {
  game: any;
  postCount?: number;
  showPostCount?: boolean;
  onClick?: () => void;
}

export function GameTile({ game, postCount = 0, showPostCount = false, onClick }: GameTileProps) {
  const coverArt = game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url
    ?? game.artwork?.[0]?.url
    ?? game.coverArt;

  return (
    <div
      className="group cursor-pointer relative hover:z-10 hover:bg-secondary/40 rounded-lg transition-colors duration-200"
      onClick={onClick}
    >
      <div className="relative aspect-[3/4] rounded-lg mb-2 bg-muted/20">
        {coverArt && (
          <img
            src={coverArt}
            alt={game.title}
            className="w-full h-full object-cover rounded-lg transition-transform duration-300 ease-out group-hover:scale-[1.06]"
            style={{ opacity: 0, transition: 'opacity 0.25s ease, transform 0.3s ease-out' }}
            onLoad={e => { (e.currentTarget as HTMLImageElement).style.opacity = '1'; }}
          />
        )}
        {!coverArt && (
          <div className="w-full h-full rounded-lg flex items-center justify-center text-muted-foreground/30">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
        {showPostCount && postCount > 0 && (
          <div className="absolute top-1.5 left-1.5 bg-accent/80 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <Flame className="w-2.5 h-2.5" />{postCount}
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium line-clamp-2 group-hover:text-accent transition-colors">{game.title}</h3>
      {game.year && <p className="text-xs text-muted-foreground mt-1">{game.year}</p>}
    </div>
  );
}
