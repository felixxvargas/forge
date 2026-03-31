import { useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { Moon, Sun, Bell, Lock, Info, LogOut, Upload, Heart, Gamepad2, Share2, Filter, Crown, Mail, KeyRound, MessageCircle, QrCode, X, Download, Copy, Check, Bug, Lightbulb, User, UserPlus, Users, ChevronRight, Repeat2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAppData } from '../context/AppDataContext';
import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FeedbackModal } from '../components/FeedbackModal';
import { supabase } from '../utils/supabase';

interface LinkedAccount {
  id: string;
  handle: string;
  display_name: string;
  profile_picture: string | null;
  access_token: string;
  refresh_token: string;
}

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { currentUser, session, updateCurrentUser, signOut } = useAppData();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>(() => {
    try { return JSON.parse(localStorage.getItem('forge-linked-accounts') || '[]'); } catch { return []; }
  });
  const [showManageAccounts, setShowManageAccounts] = useState(false);
  const [toastNotificationsEnabled, setToastNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('forge-toast-notifications');
    return saved !== 'false'; // Default to true
  });
  const [allowDMs, setAllowDMs] = useState<boolean>(currentUser?.allow_dms !== false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [defaultCommentsDisabled, setDefaultCommentsDisabled] = useState(() => localStorage.getItem('forge-default-comments-disabled') === 'true');
  const [defaultRepostsDisabled, setDefaultRepostsDisabled] = useState(() => localStorage.getItem('forge-default-reposts-disabled') === 'true');
  const [emailNotifications, setEmailNotifications] = useState<'off' | 'weekly' | 'all'>(() => {
    const saved = currentUser?.email_notifications;
    if (saved === 'off' || saved === 'all') return saved;
    return 'weekly';
  });
  const [profilePublic, setProfilePublic] = useState<boolean>(currentUser?.profile_public !== false);
  const [listsPublic, setListsPublic] = useState<boolean>(currentUser?.lists_public !== false);
  const [postsPublic, setPostsPublic] = useState<boolean>(currentUser?.posts_public !== false);

  // Delete / suspend account dialogs
  type AccountActionStep = 'none' | 'suspend-confirm1' | 'suspend-confirm2' | 'delete-confirm1' | 'delete-confirm2' | 'delete-confirm3';
  const [accountActionStep, setAccountActionStep] = useState<AccountActionStep>('none');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [accountActionLoading, setAccountActionLoading] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setAllowDMs(currentUser?.allow_dms !== false);
  }, [currentUser?.allow_dms]);

  useEffect(() => {
    localStorage.setItem('forge-toast-notifications', String(toastNotificationsEnabled));
  }, [toastNotificationsEnabled]);

  // After returning from link-account flow, save the newly signed-in account
  useEffect(() => {
    const shouldSave = localStorage.getItem('forge-save-linked-account') === 'true';
    if (shouldSave && currentUser && session) {
      localStorage.removeItem('forge-save-linked-account');
      setLinkedAccounts(prev => {
        if (prev.find(a => a.id === currentUser.id)) return prev;
        const newAccount: LinkedAccount = {
          id: currentUser.id,
          handle: currentUser.handle,
          display_name: currentUser.display_name,
          profile_picture: currentUser.profile_picture,
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        };
        const updated = [...prev, newAccount];
        localStorage.setItem('forge-linked-accounts', JSON.stringify(updated));
        return updated;
      });
    }
  }, [currentUser, session]);

  const handleLinkAccount = () => {
    if (!currentUser || !session) return;
    const linked: LinkedAccount[] = JSON.parse(localStorage.getItem('forge-linked-accounts') || '[]');
    if (!linked.find(a => a.id === currentUser.id)) {
      linked.push({
        id: currentUser.id,
        handle: currentUser.handle,
        display_name: currentUser.display_name,
        profile_picture: currentUser.profile_picture,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      localStorage.setItem('forge-linked-accounts', JSON.stringify(linked));
    }
    localStorage.setItem('forge-linking-account', 'true');
    navigate('/login');
  };

  const handleSwitchAccount = async (account: LinkedAccount) => {
    if (!currentUser || !session) return;
    // Refresh current account's tokens in linked list before switching
    const linked: LinkedAccount[] = JSON.parse(localStorage.getItem('forge-linked-accounts') || '[]');
    const currentData: LinkedAccount = {
      id: currentUser.id,
      handle: currentUser.handle,
      display_name: currentUser.display_name,
      profile_picture: currentUser.profile_picture,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    };
    const idx = linked.findIndex(a => a.id === currentUser.id);
    if (idx >= 0) linked[idx] = currentData; else linked.push(currentData);
    localStorage.setItem('forge-linked-accounts', JSON.stringify(linked));

    const { error } = await supabase.auth.setSession({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
    });
    if (error) {
      // Token expired — remove bad account from list and prompt re-login
      const updated = linked.filter(a => a.id !== account.id);
      setLinkedAccounts(updated.filter(a => a.id !== currentUser.id));
      localStorage.setItem('forge-linked-accounts', JSON.stringify(updated.filter(a => a.id !== currentUser.id)));
      alert('Session expired for that account. Please sign in again to relink it.');
      return;
    }
    navigate('/feed');
  };

  const handleRemoveLinkedAccount = (accountId: string) => {
    setLinkedAccounts(prev => {
      const updated = prev.filter(a => a.id !== accountId);
      localStorage.setItem('forge-linked-accounts', JSON.stringify(updated));
      return updated;
    });
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

  const handleEmailNotificationsChange = async (value: 'off' | 'weekly' | 'all') => {
    setEmailNotifications(value);
    try {
      await updateCurrentUser({ email_notifications: value });
    } catch {
      // non-critical — setting saved optimistically
    }
  };

  const handleToggleAllowDMs = async () => {
    const next = !allowDMs;
    setAllowDMs(next);
    try {
      await updateCurrentUser({ allow_dms: next });
    } catch {
      setAllowDMs(!next); // revert on failure
    }
  };

  const handleToggleVisibility = async (
    field: 'profile_public' | 'lists_public' | 'posts_public',
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

  const profileUrl = currentUser
    ? `https://forge-social.app/profile/${currentUser.id}`
    : 'https://forge-social.app';

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const svg = qrRef.current;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const size = 400;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const a = document.createElement('a');
      a.download = `forge-${currentUser?.handle || 'profile'}-qr.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  const handleSetInterests = () => {
    navigate('/onboarding?step=interests');
  };

  const handleLogout = () => {
    localStorage.removeItem('forge-logged-in');
    localStorage.removeItem('forge-access-token');
    navigate('/login');
  };

  const handleSuspendAccount = async () => {
    if (!currentUser?.id) return;
    setAccountActionLoading(true);
    try {
      await updateCurrentUser({ suspended: true });
      await signOut();
      navigate('/feed');
    } catch {
      setAccountActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser?.id || deleteConfirmText !== 'DELETE') return;
    setAccountActionLoading(true);
    try {
      // Delete the user's auth account via Supabase (triggers cascade deletes via DB)
      await supabase.rpc('delete_user_account');
      await signOut();
      navigate('/feed');
    } catch {
      setAccountActionLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    // TODO: Implement password change API call
    alert('Password change functionality coming soon!');
    setShowChangePassword(false);
  };

  const userEmail = session?.user?.email || currentUser?.email || 'Not available';

  return (
    <div className="min-h-screen pb-20">
      <Header showSettings={false} />
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold mb-6">Settings</h1>

        {/* Accounts Section */}
        <div className="mb-8">
          {/* Active account card */}
          <div className="bg-card rounded-xl p-4 mb-3 flex items-center gap-3">
            {currentUser?.profile_picture ? (
              <img src={currentUser.profile_picture} alt="" className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <User className="w-7 h-7 text-accent" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{currentUser?.display_name || currentUser?.handle || 'You'}</p>
              <p className="text-sm text-muted-foreground">@{(currentUser?.handle || '').replace(/^@/, '')}</p>
            </div>
            <span className="text-xs text-accent bg-accent/10 px-2.5 py-1 rounded-full font-medium shrink-0">Active</span>
          </div>

          {/* Linked accounts list */}
          {linkedAccounts.filter(a => a.id !== currentUser?.id).length > 0 && (
            <div className="bg-card rounded-xl overflow-hidden divide-y divide-border mb-3">
              {linkedAccounts.filter(a => a.id !== currentUser?.id).map(account => (
                <button
                  key={account.id}
                  onClick={() => handleSwitchAccount(account)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors"
                >
                  {account.profile_picture ? (
                    <img src={account.profile_picture} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium truncate">{account.display_name || account.handle}</p>
                    <p className="text-xs text-muted-foreground">@{(account.handle || '').replace(/^@/, '')}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mr-1">Switch</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Link / manage buttons */}
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button
              onClick={handleLinkAccount}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <UserPlus className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">Link another account</span>
            </button>
            {linkedAccounts.filter(a => a.id !== currentUser?.id).length > 0 && (
              <button
                onClick={() => setShowManageAccounts(true)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary transition-colors"
              >
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Manage linked accounts</span>
              </button>
            )}
          </div>
        </div>

        {/* Appearance Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Appearance
          </h2>
          <div className="bg-card rounded-xl overflow-hidden">
            <button
              onClick={toggleTheme}
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Sun className="w-5 h-5 text-muted-foreground" />
                )}
                <div className="text-left">
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">
                    {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-accent">{theme === 'dark' ? 'Dark' : 'Light'}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Account Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Account
          </h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            {/* Email Display */}
            <div className="px-4 py-4 flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
            {/* Change Password */}
            <button
              onClick={() => setShowChangePassword(!showChangePassword)}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <KeyRound className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Change Password</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/gaming-platforms')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Gamepad2 className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Gaming Platforms</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/social-integrations')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Share2 className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Social Media Integrations</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/social-filtering')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Filter className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Third-Party Post Filtering</p>
                <p className="text-sm text-muted-foreground">
                  Control which social media posts you see
                </p>
              </div>
            </button>
            <button
              onClick={handleToggleAllowDMs}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Direct Messages</p>
                <p className="text-sm text-muted-foreground">
                  {allowDMs ? 'Anyone can message you' : 'Only you can start DMs'}
                </p>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative ${allowDMs ? 'bg-accent' : 'bg-muted'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${allowDMs ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
            <button
              onClick={() => setShowQRModal(true)}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <QrCode className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Profile QR Code</p>
                <p className="text-sm text-muted-foreground">Share your profile with others</p>
              </div>
            </button>
            <button
              onClick={() => setToastNotificationsEnabled(!toastNotificationsEnabled)}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Notifications</p>
                <p className="text-sm text-muted-foreground">
                  {toastNotificationsEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </button>
            <button onClick={() => navigate('/privacy-security')} className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Privacy & Security</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Visibility Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Visibility
          </h2>
          <p className="text-xs text-muted-foreground mb-3 -mt-2">Control what people can see without a Forge account.</p>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button
              onClick={() => handleToggleVisibility('profile_public', setProfilePublic, profilePublic)}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <User className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Public Profile</p>
                <p className="text-sm text-muted-foreground">{profilePublic ? 'Visible to everyone' : 'Forge members only'}</p>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative ${profilePublic ? 'bg-accent' : 'bg-muted'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${profilePublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
            <button
              onClick={() => handleToggleVisibility('lists_public', setListsPublic, listsPublic)}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Filter className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Public Game Lists</p>
                <p className="text-sm text-muted-foreground">{listsPublic ? 'Visible to everyone' : 'Forge members only'}</p>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative ${listsPublic ? 'bg-accent' : 'bg-muted'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${listsPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
            <button
              onClick={() => handleToggleVisibility('posts_public', setPostsPublic, postsPublic)}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Share2 className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Public Posts</p>
                <p className="text-sm text-muted-foreground">{postsPublic ? 'Visible to everyone' : 'Forge members only'}</p>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative ${postsPublic ? 'bg-accent' : 'bg-muted'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${postsPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Post Defaults Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Post Defaults
          </h2>
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
              <div className={`w-11 h-6 rounded-full transition-colors relative ${!defaultCommentsDisabled ? 'bg-accent' : 'bg-muted'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${!defaultCommentsDisabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
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
              <div className={`w-11 h-6 rounded-full transition-colors relative ${!defaultRepostsDisabled ? 'bg-accent' : 'bg-muted'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${!defaultRepostsDisabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Email Notifications Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Email Notifications
          </h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            {(['all', 'weekly', 'off'] as const).map((option) => {
              const labels = { all: 'Every notification', weekly: 'Weekly digest', off: 'Off' };
              const descs = { all: 'Get an email for each new notification', weekly: 'One summary email per week', off: 'No notification emails' };
              return (
                <button
                  key={option}
                  onClick={() => handleEmailNotificationsChange(option)}
                  className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
                >
                  <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="text-left flex-1">
                    <p className="font-medium">{labels[option]}</p>
                    <p className="text-sm text-muted-foreground">{descs[option]}</p>
                  </div>
                  {emailNotifications === option && (
                    <Check className="w-4 h-4 text-accent shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferences Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Preferences
          </h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button
              onClick={handleSetInterests}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Heart className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Gaming Interests</p>
                <p className="text-sm text-muted-foreground">
                  Update your gaming preferences
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Subscription Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Subscription
          </h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button
              onClick={() => navigate('/premium')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Crown className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Plan</p>
                <p className="text-sm text-muted-foreground">
                  {currentUser?.is_premium ? 'Forge Premium' : 'Free'}
                </p>
              </div>
              {currentUser?.is_premium && (
                <span className="px-2 py-0.5 text-xs bg-accent/20 text-accent rounded-full font-medium">Pro</span>
              )}
            </button>
          </div>
        </div>

        {/* Indie Games Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Indie Games
          </h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button
              onClick={() => navigate('/submit-indie-game')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Upload className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Submit Indie Game</p>
                <p className="text-sm text-muted-foreground">
                  Submit your game to be featured on Forge
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Feedback
          </h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Lightbulb className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Request a Feature</p>
                <p className="text-sm text-muted-foreground">Suggest something new for Forge</p>
              </div>
            </button>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Bug className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Report a Bug</p>
                <p className="text-sm text-muted-foreground">Let us know what's broken</p>
              </div>
            </button>
          </div>
        </div>

        {/* About Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            About
          </h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors">
              <Info className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">About Forge</p>
                <p className="text-sm text-muted-foreground">Version 1.0.0</p>
              </div>
            </button>
          </div>
        </div>

        {/* Account Actions */}
        <div className="mb-8 space-y-3">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-4 flex items-center justify-center gap-3 bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log Out</span>
          </button>
          <button
            onClick={() => setAccountActionStep('suspend-confirm1')}
            className="w-full px-4 py-4 flex items-center justify-center gap-3 bg-secondary text-muted-foreground rounded-xl hover:bg-secondary/80 transition-colors"
          >
            <span className="font-medium text-sm">Suspend Account</span>
          </button>
          <button
            onClick={() => setAccountActionStep('delete-confirm1')}
            className="w-full px-4 py-4 flex items-center justify-center gap-3 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors"
          >
            <span className="font-medium text-sm">Delete Account</span>
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowQRModal(false)}>
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 flex flex-col items-center gap-5" onClick={e => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between">
              <h2 className="text-xl font-semibold">Profile QR Code</h2>
              <button onClick={() => setShowQRModal(false)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground text-center -mt-1">
              Others can scan this to find your Forge profile
            </p>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl shadow-lg">
              <QRCodeSVG
                ref={qrRef}
                value={profileUrl}
                size={220}
                bgColor="#ffffff"
                fgColor="#1a0533"
                level="M"
                imageSettings={{
                  src: '/forge-icon.png',
                  x: undefined,
                  y: undefined,
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>

            {/* Handle */}
            <div className="text-center">
              <p className="font-semibold text-lg">
                {currentUser?.display_name || currentUser?.handle}
              </p>
              <p className="text-sm text-muted-foreground">
                @{(currentUser?.handle || '').replace(/^@/, '')}
              </p>
            </div>

            {/* URL pill */}
            <div className="w-full bg-secondary rounded-lg px-3 py-2 flex items-center gap-2">
              <p className="text-xs text-muted-foreground flex-1 truncate">{profileUrl}</p>
              <button
                onClick={handleCopyLink}
                className="shrink-0 p-1.5 hover:bg-card rounded transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>

            {/* Actions */}
            <div className="w-full flex gap-3">
              <button
                onClick={handleDownloadQR}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Save Image
              </button>
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground rounded-xl hover:bg-accent/90 transition-colors text-sm font-medium"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  required
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  required
                  minLength={6}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  minLength={6}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFeedbackModal && <FeedbackModal onClose={() => setShowFeedbackModal(false)} />}

      {/* Manage Linked Accounts Modal */}
      {showManageAccounts && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowManageAccounts(false)}>
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Linked Accounts</h2>
              <button onClick={() => setShowManageAccounts(false)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {linkedAccounts.filter(a => a.id !== currentUser?.id).map(account => (
                <div key={account.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                  {account.profile_picture ? (
                    <img src={account.profile_picture} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{account.display_name || account.handle}</p>
                    <p className="text-xs text-muted-foreground">@{(account.handle || '').replace(/^@/, '')}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveLinkedAccount(account.id)}
                    className="p-2 hover:bg-destructive/20 rounded-lg transition-colors text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">Removing an account from this list won't sign it out</p>
          </div>
        </div>
      )}

      {/* Suspend Account — Step 1 */}
      {accountActionStep === 'suspend-confirm1' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Suspend your account?</h2>
            <p className="text-sm text-muted-foreground">
              Your profile, posts, and lists will be hidden. You can unsuspend at any time by signing back in and turning suspension off in Settings.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setAccountActionStep('none')} className="flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm">Cancel</button>
              <button onClick={() => setAccountActionStep('suspend-confirm2')} className="flex-1 px-4 py-2 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors text-sm font-medium">Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Account — Step 2 */}
      {accountActionStep === 'suspend-confirm2' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Are you sure?</h2>
            <p className="text-sm text-muted-foreground">
              You'll be signed out and your account will be suspended until you log back in and re-enable it.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setAccountActionStep('none')} className="flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm">Cancel</button>
              <button
                onClick={handleSuspendAccount}
                disabled={accountActionLoading}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {accountActionLoading ? 'Suspending…' : 'Suspend Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account — Step 1 */}
      {accountActionStep === 'delete-confirm1' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-destructive">Delete your account?</h2>
            <p className="text-sm text-muted-foreground">
              This will permanently delete your profile, posts, game lists, and all activity. <strong>This cannot be undone.</strong>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setAccountActionStep('none')} className="flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm">Cancel</button>
              <button onClick={() => setAccountActionStep('delete-confirm2')} className="flex-1 px-4 py-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 transition-colors text-sm font-medium">I understand</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account — Step 2 */}
      {accountActionStep === 'delete-confirm2' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-destructive">Final warning</h2>
            <p className="text-sm text-muted-foreground">
              Every post, list, follower, and piece of activity tied to your account will be gone forever. There is no recovery option.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setAccountActionStep('none')} className="flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm">Cancel</button>
              <button onClick={() => { setDeleteConfirmText(''); setAccountActionStep('delete-confirm3'); }} className="flex-1 px-4 py-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 transition-colors text-sm font-medium">Yes, delete it</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account — Step 3: type DELETE */}
      {accountActionStep === 'delete-confirm3' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-destructive">Confirm deletion</h2>
            <p className="text-sm text-muted-foreground">
              Type <strong>DELETE</strong> below to permanently delete your account.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-4 py-2.5 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-destructive text-sm"
            />
            <div className="flex gap-3">
              <button onClick={() => setAccountActionStep('none')} className="flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm">Cancel</button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || accountActionLoading}
                className="flex-1 px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors text-sm font-medium disabled:opacity-40"
              >
                {accountActionLoading ? 'Deleting…' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}