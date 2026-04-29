import { useState, useEffect, useRef } from 'react';
import { Check, X, ChevronDown } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { supabase } from '../utils/supabase';

const STORAGE_KEY = 'forge-onboarding-v1';

function getStored(): { dismissCount: number; forceServed: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { dismissCount: 0, forceServed: false };
  } catch {
    return { dismissCount: 0, forceServed: false };
  }
}

function saveStored(state: { dismissCount: number; forceServed: boolean }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function OnboardingTooltip() {
  const { currentUser, isAuthenticated } = useAppData() as any;
  const [visible, setVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const shownThisSession = useRef(false);
  const [hasPosted, setHasPosted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
      .limit(1)
      .then(
        ({ count }) => setHasPosted((count ?? 0) > 0),
        () => setHasPosted(false)
      );
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    if ((currentUser as any).onboarding_complete) return;
    if (shownThisSession.current) return;

    const stored = getStored();
    if (stored.dismissCount >= 3 && stored.forceServed) return;

    if (!stored.forceServed) {
      saveStored({ ...stored, forceServed: true });
    }

    shownThisSession.current = true;
    setVisible(true);
  }, [isAuthenticated, currentUser?.id]);

  const dismiss = () => {
    const stored = getStored();
    saveStored({ ...stored, dismissCount: stored.dismissCount + 1 });
    setVisible(false);
  };

  if (!visible || !currentUser) return null;

  const glCheck = (currentUser as any)?.game_lists ?? {};
  const hasList = ['recentlyPlayed', 'playedBefore', 'favorites', 'wishlist', 'library'].some(
    (k: string) => (glCheck[k] ?? []).length > 0
  );

  const tasks = [
    { label: 'Add a profile picture', done: !!currentUser.profile_picture },
    { label: 'Create a game list', done: hasList },
    { label: 'Post for the first time', done: hasPosted === true },
    { label: 'Join or create a group', done: ((currentUser as any).communities?.length ?? 0) > 0 },
  ];
  const completedCount = tasks.filter(t => t.done).length;

  if (completedCount === tasks.length) return null;

  return (
    <div
      className="fixed left-4 right-4 md:left-auto md:right-4 md:w-72 z-[200] rounded-2xl shadow-2xl"
      style={{
        top: '57px',
        background: 'rgba(45,31,71,0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {/* Header row — always visible */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex gap-1 flex-1">
          {tasks.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i < completedCount ? 'bg-accent' : 'bg-muted/60'}`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
          {completedCount}/{tasks.length}
        </span>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors rounded shrink-0"
          aria-label={collapsed ? 'Expand' : 'Collapse'}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
        <button
          onClick={dismiss}
          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors rounded shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Expandable task list */}
      {!collapsed && (
        <div className="px-3 pb-3 border-t border-white/[0.06]">
          <p className="text-xs text-muted-foreground pt-2.5 pb-2">Get started on Forge</p>
          <div className="space-y-2">
            {tasks.map((t, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 text-sm ${t.done ? 'text-muted-foreground' : 'text-foreground'}`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    t.done ? 'border-accent bg-accent' : 'border-muted-foreground/50'
                  }`}
                >
                  {t.done && <Check className="w-2.5 h-2.5 text-accent-foreground" />}
                </div>
                <span className={t.done ? 'line-through' : ''}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
