'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, Crown, MoreHorizontal, UserMinus } from 'lucide-react';
import { useNavigate } from '@/compat/router';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { vipListAPI } from '../utils/supabase';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

export function VIPList() {
  const navigate = useNavigate();
  const { session, removeFromVIPList } = useAppData() as any;
  const [viewers, setViewers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) { setLoading(false); return; }
    vipListAPI.getViewers(session.user.id)
      .then(setViewers)
      .catch(() => setViewers([]))
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  const handleRemove = async (viewer: any) => {
    setViewers(prev => prev.filter(v => v.id !== viewer.id));
    await removeFromVIPList(viewer.id);
    toast.success(`${viewer.display_name || viewer.handle} removed from your VIP list`);
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="w-full px-4 h-14 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">My VIP List</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-4">
        <p className="text-sm text-muted-foreground mb-5">
          People on your VIP list can see your social & gaming handles on your profile.
        </p>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-xl p-4 flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-muted/50 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted/50 rounded w-32" />
                  <div className="h-3 bg-muted/30 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : viewers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Crown className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Your VIP list is empty</p>
            <p className="text-sm text-muted-foreground mt-1">
              Visit someone's profile and tap ··· to add them to your VIP list.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {viewers.map(viewer => (
              <div key={viewer.id} className="bg-card rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="cursor-pointer shrink-0" onClick={() => navigate(`/profile/${viewer.id}`)}>
                  <ProfileAvatar
                    username={viewer.display_name || viewer.handle || '?'}
                    profilePicture={viewer.profile_picture}
                    userId={viewer.id}
                    size="md"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/profile/${viewer.id}`)}
                    className="font-medium hover:underline block truncate text-left text-sm"
                  >
                    {viewer.display_name || viewer.handle}
                  </button>
                  <p className="text-xs text-muted-foreground truncate">
                    @{(viewer.handle || '').replace(/^@/, '')}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground shrink-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleRemove(viewer)}
                      className="text-destructive focus:text-destructive"
                    >
                      <UserMinus className="w-4 h-4 mr-2" />
                      Remove from VIP list
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
