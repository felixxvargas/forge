import { useState } from 'react';
import { useNavigate, Link } from '@/compat/router';
import { ArrowLeft, MessageCircle, Lock, FileText, User, Filter, Share2, Repeat2, Heart, Crown, ChevronRight } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { supabase } from '../utils/supabase';

function Toggle({ on }: { on: boolean }) {
  return (
    <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${on ? 'bg-purple-500' : 'bg-muted'}`}>
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </div>
  );
}

export function PrivacySettings() {
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useAppData();

  const [allowDMs, setAllowDMs] = useState<boolean>(currentUser?.allow_dms !== false);
  const [profilePublic, setProfilePublic] = useState<boolean>(currentUser?.profile_public !== false);
  const [listsPublic, setListsPublic] = useState<boolean>(currentUser?.lists_public !== false);
  const [postsPublic, setPostsPublic] = useState<boolean>(currentUser?.posts_public !== false);
  const [likesPublic, setLikesPublic] = useState<boolean>(currentUser?.likes_public !== false);
  const [platformTagsVisibility, setPlatformTagsVisibility] = useState<string[]>(
    () => (currentUser as any)?.platform_tags_visibility ?? ['all']
  );
  const [defaultCommentsDisabled, setDefaultCommentsDisabled] = useState(
    () => localStorage.getItem('forge-default-comments-disabled') === 'true'
  );
  const [defaultRepostsDisabled, setDefaultRepostsDisabled] = useState(
    () => localStorage.getItem('forge-default-reposts-disabled') === 'true'
  );

  const handleToggle = async (
    field: 'allow_dms' | 'profile_public' | 'lists_public' | 'posts_public' | 'likes_public',
    setter: (v: boolean) => void,
    current: boolean,
  ) => {
    const next = !current;
    setter(next);
    try {
      await updateCurrentUser({ [field]: next });
    } catch {
      setter(current);
    }
  };

  const handleToggleDefaultComments = () => {
    const next = !defaultCommentsDisabled;
    setDefaultCommentsDisabled(next);
    localStorage.setItem('forge-default-comments-disabled', String(next));
  };

  const handleToggleDefaultReposts = () => {
    const next = !defaultRepostsDisabled;
    setDefaultRepostsDisabled(next);
    localStorage.setItem('forge-default-reposts-disabled', String(next));
  };

  const savePlatformTagsVisibility = async (next: string[]) => {
    setPlatformTagsVisibility(next);
    try {
      await supabase.from('profiles').update({ platform_tags_visibility: next }).eq('id', currentUser?.id ?? '');
    } catch { /* ignore */ }
  };

  const togglePlatformTagsOption = (option: string) => {
    const current = platformTagsVisibility.filter(v => v !== 'all');
    const next = current.includes(option) ? current.filter(v => v !== option) : [...current, option];
    savePlatformTagsVisibility(next.length > 0 ? next : ['all']);
  };

  const isAllCanView = platformTagsVisibility.includes('all');

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="w-full px-4 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Privacy & Security</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Privacy */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Privacy</h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button
              onClick={() => handleToggle('allow_dms', setAllowDMs, allowDMs)}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Direct Messages</p>
                <p className="text-sm text-muted-foreground">
                  {allowDMs ? 'Anyone can message you' : 'Only you can start DMs'}
                </p>
              </div>
              <Toggle on={allowDMs} />
            </button>
          </div>
        </div>

        {/* Visibility */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Visibility</h2>
          <p className="text-xs text-muted-foreground mb-3 -mt-2">Control what people can see without a Forge account.</p>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button
              onClick={() => handleToggle('profile_public', setProfilePublic, profilePublic)}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <User className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Public Profile</p>
                <p className="text-sm text-muted-foreground">{profilePublic ? 'Visible to everyone' : 'Forge members only'}</p>
              </div>
              <Toggle on={profilePublic} />
            </button>
            <button
              onClick={() => handleToggle('lists_public', setListsPublic, listsPublic)}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Filter className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Public Game Lists</p>
                <p className="text-sm text-muted-foreground">{listsPublic ? 'Visible to everyone' : 'Forge members only'}</p>
              </div>
              <Toggle on={listsPublic} />
            </button>
            <button
              onClick={() => handleToggle('posts_public', setPostsPublic, postsPublic)}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Share2 className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Public Posts</p>
                <p className="text-sm text-muted-foreground">{postsPublic ? 'Visible to everyone' : 'Forge members only'}</p>
              </div>
              <Toggle on={postsPublic} />
            </button>
            <button
              onClick={() => handleToggle('likes_public', setLikesPublic, likesPublic)}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Heart className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Show Likes</p>
                <p className="text-sm text-muted-foreground">{likesPublic ? 'Others can see your liked posts' : 'Your likes are hidden'}</p>
              </div>
              <Toggle on={likesPublic} />
            </button>
          </div>
        </div>

        {/* Platform Tags */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Platform Tags</h2>
          <p className="text-xs text-muted-foreground mb-3 -mt-2">Choose who can see your social & gaming handles on your profile.</p>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button
              onClick={() => savePlatformTagsVisibility(['all'])}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isAllCanView ? 'border-accent bg-accent' : 'border-muted-foreground/50'}`}>
                {isAllCanView && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="text-left flex-1">
                <p className="font-medium">All can view</p>
                <p className="text-sm text-muted-foreground">Anyone can see your handles</p>
              </div>
            </button>
            {(['following', 'followers', 'vip_list'] as const).map(option => {
              const labels: Record<string, string> = {
                following: 'People you follow',
                followers: 'People who follow you',
                vip_list: 'My VIP List',
              };
              const checked = !isAllCanView && platformTagsVisibility.includes(option);
              return (
                <button
                  key={option}
                  onClick={() => !isAllCanView && togglePlatformTagsOption(option)}
                  disabled={isAllCanView}
                  className={`w-full px-4 py-4 flex items-center gap-3 transition-colors ${isAllCanView ? 'opacity-40 cursor-not-allowed' : 'hover:bg-secondary'}`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'border-accent bg-accent' : 'border-muted-foreground/50'}`}>
                    {checked && (
                      <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </div>
                  <p className="font-medium">{labels[option]}</p>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => navigate('/vip-list')}
            className="mt-3 w-full px-4 py-3 flex items-center gap-3 bg-card rounded-xl hover:bg-secondary transition-colors"
          >
            <Crown className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-left font-medium text-sm">Manage My VIP List</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Post Defaults */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Post Defaults</h2>
          <p className="text-xs text-muted-foreground mb-3 -mt-2">Applied to all new posts. Can be changed per-post when composing.</p>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button
              onClick={handleToggleDefaultComments}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Allow Comments</p>
                <p className="text-sm text-muted-foreground">{defaultCommentsDisabled ? 'Off by default' : 'On by default'}</p>
              </div>
              <Toggle on={!defaultCommentsDisabled} />
            </button>
            <button
              onClick={handleToggleDefaultReposts}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Repeat2 className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Allow Reposts</p>
                <p className="text-sm text-muted-foreground">{defaultRepostsDisabled ? 'Off by default' : 'On by default'}</p>
              </div>
              <Toggle on={!defaultRepostsDisabled} />
            </button>
          </div>
        </div>

        {/* Legal */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Legal</h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <Link to="/privacy" className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Privacy Policy</p>
              </div>
            </Link>
            <Link to="/terms" className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Terms of Service</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
