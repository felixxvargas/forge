import { useEffect, useState } from 'react';
import { X, Sprout } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase } from '../utils/supabase';
import { ProfileAvatar } from './ProfileAvatar';

interface Props {
  onClose: () => void;
}

export function SproutListModal({ onClose }: Props) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const since = new Date(Date.now() - 91 * 864e5).toISOString();
    supabase
      .from('profiles')
      .select('id, handle, display_name, profile_picture, created_at')
      .gt('created_at', since)
      .neq('account_type', 'topic')
      .order('created_at', { ascending: false })
      .limit(60)
      .then(
        ({ data }) => { setUsers(data ?? []); setLoading(false); },
        () => setLoading(false)
      );
  }, []);

  return (
    <div className="fixed inset-0 z-[400] flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sprout className="w-4 h-4 text-green-400" />
            <span className="font-semibold text-sm">Current Sprouts</span>
            {!loading && <span className="text-xs text-muted-foreground">({users.length})</span>}
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No sprouts yet.</div>
          ) : (
            users.map(u => (
              <button
                key={u.id}
                onClick={() => { onClose(); navigate(`/${(u.handle || '').replace(/^@/, '')}`); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
              >
                <ProfileAvatar
                  username={u.display_name || u.handle || '?'}
                  profilePicture={u.profile_picture}
                  size="sm"
                  userId={u.id}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.display_name || u.handle}</p>
                  <p className="text-xs text-muted-foreground">@{(u.handle || '').replace(/^@/, '')}</p>
                </div>
                <Sprout className="w-3.5 h-3.5 text-green-400 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
