'use client';
import { useEffect, useState } from 'react';
import { useNavigate } from '@/compat/router';
import { supabase } from '../utils/supabase';
import { Users, MessageSquare, Gamepad2, Users2, Flame, TrendingUp, Clock, RefreshCw, List, ArrowRight, Activity, Smartphone, Globe, UserPlus } from 'lucide-react';

interface OnboardingFunnelData {
  started: number;
  interests_started: number;
  follow_started: number;
  username_started: number;
  completed: number;
  errors: number;
  completion_rate: number;
}

interface AdminStats {
  users: { total: number; last7Days: number; last30Days: number; last90Days: number; last365Days: number };
  posts: { total: number; last30Days: number; last90Days: number; last365Days: number };
  games: { total: number; last30Days: number; last90Days: number; last365Days: number };
  communities: { total: number };
  flares: { total: number; last30Days: number; last90Days: number; last365Days: number };
  lists: { total: number; customTotal: number; updateCount: number };
  onboarding?: { allTime: OnboardingFunnelData; last30Days: OnboardingFunnelData };
  engagement?: { mau: number; wau: number; dau: number; avgSessionDurationS: number; platformSplit: Record<string, number> };
  userActions?: {
    follows: { last30Days: number; last90Days: number; last365Days: number };
    groupJoins: { last30Days: number; last90Days: number; last365Days: number };
    groupCreations: { last30Days: number; last90Days: number; last365Days: number };
    posts: { last30Days: number; last90Days: number; last365Days: number };
  };
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

        {/* Engagement */}
        {stats.engagement && (() => {
          const eng = stats.engagement!;
          const totalSessions = Object.values(eng.platformSplit).reduce((a, b) => a + b, 0);
          const fmtDuration = (s: number) => {
            if (s === 0) return '—';
            if (s < 60) return `${s}s`;
            return `${Math.round(s / 60)}m`;
          };
          return (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Engagement</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-card rounded-xl p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">MAU</span>
                  </div>
                  <div className="text-3xl font-bold tabular-nums">{eng.mau.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Monthly active users</div>
                </div>
                <div className="bg-card rounded-xl p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">WAU / DAU</span>
                  </div>
                  <div className="text-3xl font-bold tabular-nums">{eng.wau.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{eng.dau.toLocaleString()}</span> today
                  </div>
                </div>
                <div className="bg-card rounded-xl p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Avg Session</span>
                  </div>
                  <div className="text-3xl font-bold tabular-nums">{fmtDuration(eng.avgSessionDurationS)}</div>
                  <div className="text-sm text-muted-foreground">Last 30 days</div>
                </div>
                <div className="bg-card rounded-xl p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Smartphone className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Platform Split</span>
                  </div>
                  <div className="space-y-1.5 text-sm pt-1">
                    {[['web', <Globe key="web" className="w-3.5 h-3.5" />], ['android', <Smartphone key="android" className="w-3.5 h-3.5" />]] .map(([platform, icon]) => {
                      const count = eng.platformSplit[platform as string] ?? 0;
                      const pct = totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0;
                      return (
                        <div key={platform as string} className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-1.5 text-muted-foreground">{icon}<span className="capitalize">{platform as string}</span></div>
                          <span className="font-medium tabular-nums">{pct}%</span>
                        </div>
                      );
                    })}
                    {totalSessions === 0 && <p className="text-muted-foreground text-xs">No sessions yet</p>}
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

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

        {/* User Actions */}
        {stats.userActions && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">User Actions</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                icon={UserPlus}
                label="Follows Given"
                total={pick(stats.userActions.follows, period)}
                delta={pick(stats.userActions.follows, period)}
                period={period}
              />
              <StatCard
                icon={MessageSquare}
                label="Posts Created"
                total={pick(stats.userActions.posts, period)}
                delta={pick(stats.userActions.posts, period)}
                period={period}
              />
              <StatCard
                icon={Users}
                label="Groups Joined"
                total={pick(stats.userActions.groupJoins, period)}
                delta={pick(stats.userActions.groupJoins, period)}
                period={period}
              />
              <StatCard
                icon={Users2}
                label="Groups Created"
                total={pick(stats.userActions.groupCreations, period)}
                delta={pick(stats.userActions.groupCreations, period)}
                period={period}
              />
            </div>
          </section>
        )}

        {/* Lists */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Lists</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="bg-card rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <List className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Total Lists</span>
              </div>
              <div className="text-3xl font-bold tabular-nums">{stats.lists?.total ?? 0}</div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{stats.lists?.customTotal ?? 0}</span> custom
              </div>
            </div>
            <div className="bg-card rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">List Updates</span>
              </div>
              <div className="text-3xl font-bold tabular-nums">{(stats.lists?.updateCount ?? 0).toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total edits across all users</div>
            </div>
          </div>
        </section>

        {/* Onboarding Funnel */}
        {stats.onboarding && (() => {
          const funnel = period === '30d' ? stats.onboarding.last30Days : stats.onboarding.allTime;
          const steps = [
            { label: 'Started', count: funnel.started },
            { label: 'Interests', count: funnel.interests_started },
            { label: 'Follow', count: funnel.follow_started },
            { label: 'Username', count: funnel.username_started },
            { label: 'Completed', count: funnel.completed },
          ];
          return (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Onboarding Funnel</h2>
              <div className="bg-card rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  {steps.map((s, i) => (
                    <div key={s.label} className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold tabular-nums">{s.count.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                        {i > 0 && steps[i - 1].count > 0 && (
                          <p className="text-xs text-accent font-medium">
                            {Math.round((s.count / steps[i - 1].count) * 100)}%
                          </p>
                        )}
                      </div>
                      {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm border-t border-border pt-3">
                  <span className="text-muted-foreground">Overall completion rate</span>
                  <span className="font-semibold text-accent">{funnel.completion_rate}%</span>
                </div>
                {funnel.errors > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Errors at username step</span>
                    <span className="font-semibold text-red-400">{funnel.errors.toLocaleString()}</span>
                  </div>
                )}
                {funnel.started === 0 && (
                  <p className="text-xs text-muted-foreground/60 italic">No onboarding data yet — telemetry starts tracking new signups after this deploy.</p>
                )}
              </div>
            </section>
          );
        })()}

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
