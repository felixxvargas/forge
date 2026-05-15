'use client';
import { useState, useEffect } from 'react';
import { Calendar, Gamepad2 } from 'lucide-react';
import { gameTimelineAPI, type GamingMonthlySummary } from '../utils/supabase';
import { gamesAPI } from '../utils/api';

interface GameCover {
  id: string;
  title: string;
  cover: string | null;
}

function monthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function MonthCard({ summary }: { summary: GamingMonthlySummary }) {
  const [games, setGames] = useState<GameCover[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (summary.game_ids.length === 0) { setLoading(false); return; }
    const ids = summary.game_ids.slice(0, 8);
    gamesAPI.getGames(ids)
      .then((results: any[]) => {
        setGames(results.map((g: any) => ({
          id: String(g.id ?? g.game_id ?? ''),
          title: g.title ?? '',
          cover: g.cover ?? g.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? g.artwork?.[0]?.url ?? null,
        })));
      })
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, [summary.game_ids]);

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-accent ring-2 ring-background" />

      <div className="mb-1 flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{monthLabel(summary.month)}</span>
        <span className="text-xs text-muted-foreground">{summary.game_ids.length} game{summary.game_ids.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: Math.min(4, summary.game_ids.length) }).map((_, i) => (
            <div key={i} className="w-12 h-16 rounded-lg bg-secondary animate-pulse" />
          ))}
        </div>
      ) : games.length > 0 ? (
        <div className="flex gap-2 flex-wrap">
          {games.map(g => (
            <div key={g.id} title={g.title} className="relative group">
              {g.cover ? (
                <img
                  src={g.cover}
                  alt={g.title}
                  className="w-12 h-16 object-cover rounded-lg border border-border group-hover:ring-2 group-hover:ring-accent transition-all"
                />
              ) : (
                <div className="w-12 h-16 rounded-lg bg-secondary border border-border flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {summary.game_ids.length > 8 && (
            <div className="w-12 h-16 rounded-lg bg-secondary border border-border flex items-center justify-center text-xs text-muted-foreground font-medium">
              +{summary.game_ids.length - 8}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No cover art available</p>
      )}
    </div>
  );
}

export function GameTimeline({ userId }: { userId: string }) {
  const [summaries, setSummaries] = useState<GamingMonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gameTimelineAPI.getSummaries(userId)
      .then(setSummaries)
      .catch(() => setSummaries([]))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-6 px-4 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="pl-8 relative">
            <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-secondary animate-pulse" />
            <div className="h-4 w-24 bg-secondary rounded animate-pulse mb-2" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="w-12 h-16 rounded-lg bg-secondary animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground px-4">
        <Calendar className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">No timeline yet</p>
        <p className="text-xs text-center max-w-xs">
          Your gaming timeline will appear here as you update your Recently Played list each month.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {/* Vertical line */}
      <div className="relative border-l-2 border-border ml-1.5 space-y-8 pb-4">
        {summaries.map(s => (
          <MonthCard key={s.month} summary={s} />
        ))}
      </div>
    </div>
  );
}
