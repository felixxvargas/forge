import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Flame, Gamepad2, TrendingUp } from 'lucide-react';
import { Header } from '../components/Header';
import { loadTrendingRankings, type RankedGame } from '../utils/gameRankings';

export function TrendingGames() {
  const navigate = useNavigate();
  const [games, setGames] = useState<RankedGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrendingRankings()
      .then(setGames)
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Top Games on Forge</h1>
            <p className="text-sm text-muted-foreground">Ranked by player lists + tagged posts</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Gamepad2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No ranking data yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {games.map(game => (
              <button
                key={game.id}
                onClick={() => navigate(`/game/${game.id}`)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary transition-colors text-left"
              >
                {/* Rank */}
                <span className={`w-10 shrink-0 text-sm font-bold text-right ${
                  game.rank <= 3 ? 'text-accent' : 'text-muted-foreground'
                }`}>
                  #{game.rank}
                </span>

                {/* Cover */}
                <div className="w-9 h-12 rounded-lg overflow-hidden bg-secondary shrink-0">
                  {game.cover ? (
                    <img src={game.cover} alt={game.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gamepad2 className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Title + year */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{game.title}</p>
                  {game.year && <p className="text-xs text-muted-foreground">{game.year}</p>}
                </div>

                {/* Score indicator */}
                {game.score > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Flame className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs font-semibold text-accent">{game.score}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
