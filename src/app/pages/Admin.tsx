'use client';
import { useEffect, useState } from 'react';
import { useNavigate } from '@/compat/router';
import { supabase } from '../utils/supabase';
import { Users, MessageSquare, Gamepad2, Users2, Flame, TrendingUp, Clock, RefreshCw } from 'lucide-react';

interface AdminStats {
  users: { total: number; last7Days: number; last30Days: number; last90Days: number; last365Days: number };
  posts: { total: number; last30Days: number; last90Days: number; last365Days: number };
  games: { total: number; last30Days: number; last90Days: number; last365Days: number };
  communities: { total: number };
  flares: { total: number; last30Days: number; last90Days: number; last365Days: number };
  recentUsers: { handle: string; display_name: string; created_at: string }[];
  generatedAt: string;
}

type Period = '7d' | '30d' | '90d' | '1y';

function pick<T extends { last30Days: number; last90Days: number; last365Days: number }>(
  stat: T,
  period: Period,
  has7d?: number,
): number {
  if (period === '7d') return has7d ?? 0;
  if (period === '90d') return stat.last90Days;
  if (period === '1y') return stat.last365Days;
  return stat.last30Days;
}

function StatCard({
  icon: Icon,
  label,
  total,
  delta,
  period,
}: {
  icon: React.ElementType;
  label: string;
  total: number;
  delta: number;
  period: Period;
}) {
  return (
    <div className="bg-card rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-3xl font-bold tabular-nums">{total.toLocaleString()}</div>
      <div className="text-sm text-muted-foreground">
        <span className="text-accent font-medium">+{delta.toLocaleString()}</span>{' '}
        last {period}
      </div>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const PERIODS: Period[] = ['7d', '30d', '90d', '1y'];

export function Admin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { navigate('/'); return; }
      const res = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401 || res.status === 403) { navigate('/'); return; }
      if (!res.ok) throw new Error('Failed to load stats');
      setStats(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm animate-pulse">Loading dashboard…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={load} className="text-xs text-muted-foreground underline">Retry</button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Forge Admin</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {fmt(stats.generatedAt)}
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Period toggle */}
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 w-fit">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Users */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Users</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard icon={Users} label="Total Users" total={stats.users.total} delta={pick(stats.users, period, stats.users.last7Days)} period={period} />
            <StatCard icon={TrendingUp} label="New Users" total={pick(stats.users, period, stats.users.last7Days)} delta={stats.users.last7Days} period="7d" />
            <div className="bg-card rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Breakdown</span>
              </div>
              <div className="space-y-1.5 text-sm">
                {([['7d', stats.users.last7Days], ['30d', stats.users.last30Days], ['90d', stats.users.last90Days], ['1y', stats.users.last365Days]] as [string, number][]).map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">Last {label}</span>
                    <span className="font-medium tabular-nums">+{val.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Content</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={MessageSquare}
              label="Posts"
              total={stats.posts.total}
              delta={pick(stats.posts, period)}
              period={period}
            />
            <StatCard
              icon={Gamepad2}
              label="Games Added"
              total={stats.games.total}
              delta={pick(stats.games, period)}
              period={period}
            />
            <StatCard
              icon={Users2}
              label="Communities"
              total={stats.communities.total}
              delta={0}
              period={period}
            />
            <StatCard
              icon={Flame}
              label="LFG Flares"
              total={stats.flares.total}
              delta={pick(stats.flares, period)}
              period={period}
            />
          </div>
        </section>

        {/* Recent sign-ups */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Sign-ups</h2>
          <div className="bg-card rounded-xl overflow-hidden">
            {stats.recentUsers.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">No recent sign-ups.</p>
            ) : (
              <ul className="divide-y divide-border">
                {stats.recentUsers.map(u => (
                  <li key={u.handle} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <span className="font-medium text-sm">{u.display_name || u.handle}</span>
                      <span className="text-muted-foreground text-sm ml-2">@{u.handle}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{fmt(u.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
