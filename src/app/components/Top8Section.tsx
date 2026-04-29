import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Star, Plus, X, Search, Loader2, Gamepad2 } from 'lucide-react';
import { ProfileAvatar } from './ProfileAvatar';
import { UserBadgeIcons } from './UserBadgeIcons';
import { top8API } from '../utils/supabase';
import { supabase } from '../utils/supabase';
import { useAppData } from '../context/AppDataContext';

interface Top8FriendsProps {
  friendIds: string[];
  isOwnProfile: boolean;
  onRemove?: (id: string) => void;
  onAdd?: () => void;
  canAdd: boolean;
}

export function Top8Friends({ friendIds, isOwnProfile, onRemove, onAdd, canAdd }: Top8FriendsProps) {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    if (!friendIds.length) return;
    top8API.getTopFriendProfiles(friendIds).then(setProfiles).catch(() => {});
  }, [friendIds.join(',')]);

  if (!isOwnProfile && friendIds.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-yellow-400" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top Friends</h3>
      </div>
      <div className="flex flex-wrap gap-3">
        {profiles.map(profile => (
          <div key={profile.id} className="relative group/tf">
            <button
              onClick={() => navigate(`/profile/${profile.id}`)}
              className="flex flex-col items-center gap-1 w-14"
            >
              <ProfileAvatar
                username={profile.display_name || profile.handle || '?'}
                profilePicture={profile.profile_picture}
                userId={profile.id}
                size="md"
              />
              <span className="text-xs text-center truncate w-full leading-tight text-muted-foreground">
                {profile.display_name || profile.handle?.replace(/^@/, '') || '?'}
              </span>
            </button>
            {isOwnProfile && onRemove && (
              <button
                onClick={e => { e.stopPropagation(); onRemove(profile.id); }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white opacity-0 group-hover/tf:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        ))}
        {isOwnProfile && canAdd && (
          <button
            onClick={onAdd}
            className="flex flex-col items-center gap-1 w-14"
          >
            <div className="w-10 h-10 rounded-full bg-muted/40 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-accent/60 transition-colors">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Add</span>
          </button>
        )}
        {isOwnProfile && friendIds.length === 0 && !canAdd && (
          <p className="text-sm text-muted-foreground">No top friends yet.</p>
        )}
      </div>
    </div>
  );
}

interface Top8GamesProps {
  gameIds: string[];
  isOwnProfile: boolean;
  onManage?: () => void;
}

export function Top8Games({ gameIds, isOwnProfile, onManage }: Top8GamesProps) {
  const [games, setGames] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!gameIds.length) return;
    (async () => {
      try {
        const { data } = await supabase.from('games').select('id, title, artwork').in('id', gameIds);
        if (!data?.length) return;
        const ordered = gameIds.map(id => data.find((g: any) => g.id === id || g.id === parseInt(id))).filter(Boolean);
        setGames(ordered);
      } catch {}
    })();
  }, [gameIds.join(',')]);


  if (!isOwnProfile && gameIds.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-yellow-400" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex-1">Top Games</h3>
        {isOwnProfile && onManage && (
          <button onClick={onManage} className="text-xs text-accent hover:underline">Edit</button>
        )}
      </div>
      {gameIds.length === 0 ? (
        isOwnProfile ? (
          <button
            onClick={onManage}
            className="flex items-center gap-2 px-3 py-2 border border-dashed border-muted-foreground/30 rounded-lg text-sm text-muted-foreground hover:border-accent/60 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add top games
          </button>
        ) : null
      ) : (
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
          {games.map(game => {
            const cover = game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? game.coverArt;
            return (
              <button
                key={game.id}
                onClick={() => navigate(`/game/${game.id}`)}
                className="shrink-0 w-14 group/tg"
              >
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted/50 mb-1">
                  {cover ? (
                    <img src={cover} alt={game.title} className="w-full h-full object-cover group-hover/tg:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-xs">?</div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate leading-tight">{game.title}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Game search + selector for Top 8 Games
interface ManageTopGamesPanelProps {
  currentUserId: string;
  currentTopGameIds: string[];
  onClose: () => void;
  onUpdate: (newIds: string[]) => void;
}

export function ManageTopGamesPanel({ currentUserId, currentTopGameIds, onClose, onUpdate }: ManageTopGamesPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>(currentTopGameIds.map(String));
  const [selectedGames, setSelectedGames] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load selected game metadata for display
  useEffect(() => {
    if (!selected.length) { setSelectedGames([]); return; }
    (async () => {
      const { data } = await supabase.from('games').select('id, title, artwork').in('id', selected);
      if (data) setSelectedGames(selected.map(id => data.find((g: any) => String(g.id) === String(id))).filter(Boolean));
    })();
  }, [selected.join(',')]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase.from('games').select('id, title, artwork').ilike('title', `%${query}%`).limit(6);
        setResults(data ?? []);
      } catch {} finally { setSearching(false); }
    }, 300);
  }, [query]);

  const toggle = (game: any) => {
    const id = String(game.id);
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 8 ? [...prev, id] : prev);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await top8API.updateTopGames(currentUserId, selected);
      onUpdate(selected);
      onClose();
    } catch (e: any) { alert(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="bg-card/80 border border-border rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">Manage Top Games <span className="text-xs text-muted-foreground">({selected.length}/8)</span></p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>
      {selectedGames.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-2">
          {selectedGames.map((game: any) => {
            const cover = game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url;
            return (
              <div key={game.id} className="relative group/sg">
                <div className="w-10 aspect-[3/4] rounded-md overflow-hidden bg-muted/50">
                  {cover ? <img src={cover} alt={game.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Gamepad2 className="w-3 h-3 text-muted-foreground/40" /></div>}
                </div>
                <button
                  onClick={() => toggle(game)}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive text-white opacity-0 group-hover/sg:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X className="w-2 h-2" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search games…"
          className="w-full pl-8 pr-3 py-2 text-sm bg-secondary rounded-lg border border-border focus:outline-none focus:border-accent/60"
        />
        {searching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />}
      </div>
      {results.length === 0 && query.trim() && !searching && (
        <p className="text-xs text-muted-foreground text-center py-2">No games found</p>
      )}
      <div className="space-y-1 max-h-40 overflow-y-auto mb-3">
        {results.map((game: any) => {
          const id = String(game.id);
          const cover = game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url;
          const isAdded = selected.includes(id);
          return (
            <div key={game.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50">
              <div className="w-7 aspect-[3/4] rounded overflow-hidden bg-muted/50 shrink-0">
                {cover ? <img src={cover} alt={game.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted" />}
              </div>
              <p className="text-sm flex-1 truncate">{game.title}</p>
              <button
                onClick={() => toggle(game)}
                disabled={!isAdded && selected.length >= 8}
                className={`px-2 py-1 text-xs font-medium rounded-lg shrink-0 disabled:opacity-40 ${isAdded ? 'bg-destructive/20 text-destructive hover:bg-destructive/30' : 'bg-accent text-accent-foreground hover:bg-accent/90'}`}
              >
                {isAdded ? 'Remove' : 'Add'}
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2 bg-accent text-accent-foreground text-sm font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
      </button>
    </div>
  );
}

// Inline user search + request sender used in the Add Content module
interface AddTopFriendPanelProps {
  currentUserId: string;
  existingFriendIds: string[];
  onClose: () => void;
}

export function AddTopFriendPanel({ currentUserId, existingFriendIds, onClose }: AddTopFriendPanelProps) {
  const { users } = useAppData() as any;
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  const filtered = query.trim().length > 0
    ? (users as any[]).filter((u: any) => {
        const q = query.toLowerCase();
        const name = ((u.display_name || u.displayName || '') as string).toLowerCase();
        const handle = ((u.handle || '') as string).toLowerCase();
        return (name.includes(q) || handle.includes(q)) && u.id !== currentUserId && !existingFriendIds.includes(u.id);
      }).slice(0, 6)
    : [];

  const handleSend = async (userId: string) => {
    setSending(userId);
    try {
      await top8API.sendFriendRequest(currentUserId, userId);
      setSent(prev => new Set([...prev, userId]));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="bg-card/80 border border-border rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">Add to Top Friends</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search users…"
          className="w-full pl-8 pr-3 py-2 text-sm bg-secondary rounded-lg border border-border focus:outline-none focus:border-accent/60"
        />
      </div>
      {filtered.length === 0 && query.trim() && (
        <p className="text-xs text-muted-foreground text-center py-2">No users found</p>
      )}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {filtered.map((u: any) => (
          <div key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50">
            <ProfileAvatar
              username={u.display_name || u.displayName || u.handle || '?'}
              profilePicture={u.profile_picture || u.profilePicture}
              userId={u.id}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{u.display_name || u.displayName || u.handle}</p>
              <p className="text-xs text-muted-foreground">@{(u.handle || '').replace(/^@/, '')}</p>
            </div>
            {sent.has(u.id) ? (
              <span className="text-xs text-accent">Sent</span>
            ) : (
              <button
                onClick={() => handleSend(u.id)}
                disabled={sending === u.id}
                className="px-2 py-1 bg-accent text-accent-foreground text-xs font-medium rounded-lg disabled:opacity-50 shrink-0"
              >
                {sending === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Invite'}
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">They'll receive a notification to accept</p>
    </div>
  );
}
