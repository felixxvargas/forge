import { useNavigate } from '@/compat/router';
import { Header } from '../components/Header';
import { Moon, Sun, Lock, Info, LogOut, Upload, Heart, Gamepad2, Share2, Filter, Crown, QrCode, X, Download, Copy, Check, Bug, Lightbulb, User, UserPlus, Users, ChevronRight, Bell, Sparkles, Headphones, Bookmark, BookOpen, ExternalLink } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { getStoredLinkPreference, storeLinkPreference, clearLinkPreference, type LinkPreference } from '../utils/openExternalLink';
import TwitchIcon from '../../assets/icons/twitch.svg?react';
import { useTheme } from '../context/ThemeContext';
import { useAppData } from '../context/AppDataContext';
import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../utils/supabase';
import { analytics } from '../utils/analytics';
import { RELEASES } from '../components/WhatsNew';

interface LinkedAccount {
  id: string;
  handle: string;
  display_name: string;
  profile_picture: string | null;
}

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { currentUser, session, signOut } = useAppData();
  const navigate = useNavigate();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>(() => {
    try { return JSON.parse(localStorage.getItem('forge-linked-accounts') || '[]'); } catch { return []; }
  });
  const [showManageAccounts, setShowManageAccounts] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkPref, setLinkPref] = useState<LinkPreference | null>(() => getStoredLinkPreference());
  const qrRef = useRef<SVGSVGElement>(null);
  const [onboardingDismissCount, setOnboardingDismissCount] = useState(() => {
    try { return JSON.parse(localStorage.getItem('forge-onboarding-v1') ?? '{}').dismissCount ?? 0; } catch { return 0; }
  });
  const [hasPosted, setHasPosted] = useState<boolean | null>(null);
  const [profileUrl, setProfileUrl] = useState('');

  useEffect(() => {
    setProfileUrl(`${window.location.origin}/profile/${(currentUser?.handle || '').replace(/^@/, '')}`);
  }, [currentUser?.handle]);

  // Load hasPosted for onboarding task check
  useEffect(() => {
    if (!currentUser?.id) return;
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

  // After returning from link-account flow, save the newly signed-in account (display data only)
  useEffect(() => {
    const shouldSave = localStorage.getItem('forge-save-linked-account') === 'true';
    if (shouldSave && currentUser) {
      localStorage.removeItem('forge-save-linked-account');
      setLinkedAccounts(prev => {
        if (prev.find(a => a.id === currentUser.id)) return prev;
        const newAccount: LinkedAccount = {
          id: currentUser.id,
          handle: currentUser.handle,
          display_name: currentUser.display_name,
          profile_picture: currentUser.profile_picture,
        };
        const updated = [...prev, newAccount];
        localStorage.setItem('forge-linked-accounts', JSON.stringify(updated));
        return updated;
      });
    }
  }, [currentUser]);

  const handleLinkAccount = () => {
    if (!currentUser) return;
    const linked: LinkedAccount[] = JSON.parse(localStorage.getItem('forge-linked-accounts') || '[]');
    if (!linked.find(a => a.id === currentUser.id)) {
      linked.push({
        id: currentUser.id,
        handle: currentUser.handle,
        display_name: currentUser.display_name,
        profile_picture: currentUser.profile_picture,
      });
      localStorage.setItem('forge-linked-accounts', JSON.stringify(linked));
    }
    localStorage.setItem('forge-linking-account', 'true');
    navigate('/login');
  };

  const handleSwitchAccount = async (_account: LinkedAccount) => {
    // Sign out current session and go to login to re-authenticate as the other account.
    // Tokens are no longer stored locally; re-auth is required for every account switch.
    localStorage.setItem('forge-linking-account', 'true');
    try { await signOut(); } catch { /* ignore */ }
    navigate('/login');
  };

  const handleRemoveLinkedAccount = (accountId: string) => {
    setLinkedAccounts(prev => {
      const updated = prev.filter(a => a.id !== accountId);
      localStorage.setItem('forge-linked-accounts', JSON.stringify(updated));
      return updated;
    });
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/feed');
    } catch {
      navigate('/feed');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownloadQR = () => {
    const svg = qrRef.current;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const size = 300;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      const a = document.createElement('a');
      a.download = `forge-${(currentUser?.handle || 'profile').replace(/^@/, '')}-qr.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

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
                  <span className="text-xs text-muted-foreground mr-1">Sign in</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}

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

        {/* Appearance */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Appearance</h2>
          <div className="bg-card rounded-xl overflow-hidden">
            <button
              onClick={() => { toggleTheme(); analytics.settingsFeatureToggled('theme', theme === 'dark' ? 'light' : 'dark'); }}
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

        {/* Account */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Account</h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button
              onClick={() => navigate('/settings/account')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <User className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Account</p>
                <p className="text-sm text-muted-foreground">Email, password, account actions</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate('/settings/notifications')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Notifications</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate('/privacy-security')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Lock className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Privacy & Security</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate('/gaming-platforms')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Gamepad2 className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Gaming Platforms</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate('/social-integrations', { state: { from: 'settings' } })}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Share2 className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Social Media Integrations</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate('/social-filtering')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Filter className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Third-Party Post Filtering</p>
                <p className="text-sm text-muted-foreground">Control which social media posts you see</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate('/settings/twitch-archive')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <TwitchIcon className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Twitch Stream Archive</p>
                <p className="text-sm text-muted-foreground">Auto-save your streams to Forge</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate('/saved')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Bookmark className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Saved Posts</p>
                <p className="text-sm text-muted-foreground">Posts you've bookmarked</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
          </div>
        </div>

        {/* App Behavior */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">App Behavior</h2>
          <div className="bg-card rounded-xl overflow-hidden">
            <div className="px-4 py-4">
              <div className="flex items-center gap-3 mb-3">
                <ExternalLink className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">External Links</p>
                  <p className="text-sm text-muted-foreground">How platform profile links open</p>
                </div>
              </div>
              <div className="flex rounded-lg overflow-hidden border border-border text-sm">
                {(['ask', 'inapp', 'browser'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => {
                      if (opt === 'ask') { clearLinkPreference(); setLinkPref(null); }
                      else { storeLinkPreference(opt as LinkPreference); setLinkPref(opt as LinkPreference); }
                    }}
                    className={`flex-1 py-2 font-medium transition-colors ${
                      (opt === 'ask' ? linkPref === null : linkPref === opt)
                        ? 'bg-accent text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt === 'ask' ? 'Ask me' : opt === 'inapp' ? 'In Forge' : 'Browser'}
                  </button>
                ))}
              </div>
              {Capacitor.isNativePlatform() ? (
                <p className="text-xs text-muted-foreground/60 mt-2">"In Forge" uses Chrome Custom Tabs — keeps you in the app.</p>
              ) : (
                <p className="text-xs text-muted-foreground/60 mt-2">"In Forge" uses Chrome Custom Tabs on the Android app.</p>
              )}
            </div>
          </div>
        </div>

        {/* Gaming Interests */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Gaming Interests</h2>
          <div className="bg-card rounded-xl overflow-hidden">
            <button
              onClick={() => navigate('/onboarding?step=interests')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Heart className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Gaming Interests</p>
                <p className="text-sm text-muted-foreground">Update your gaming preferences</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Getting Started */}
        {currentUser && (() => {
          const glCheck = (currentUser as any)?.game_lists ?? {};
          const hasList = ['recentlyPlayed', 'playedBefore', 'favorites', 'wishlist', 'library'].some(
            (k: string) => (glCheck[k] ?? []).length > 0
          );
          const tasks = [
            { label: 'Add a profile picture', done: !!(currentUser as any).profile_picture },
            { label: 'Create a game list', done: hasList },
            { label: 'Post for the first time', done: hasPosted === true },
            { label: 'Join or create a group', done: ((currentUser as any).communities?.length ?? 0) > 0 },
          ];
          const completedCount = tasks.filter(t => t.done).length;
          if (completedCount === tasks.length) return null;
          return (
            <div className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Getting Started</h2>
              <div className="bg-card rounded-xl p-4">
                <div className="flex gap-1 mb-2">
                  {tasks.map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i < completedCount ? 'bg-accent' : 'bg-muted'}`} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mb-4">{completedCount} of {tasks.length} complete</p>
                <div className="space-y-3">
                  {tasks.map((t, i) => (
                    <div key={i} className={`flex items-center gap-2.5 text-sm ${t.done ? 'text-muted-foreground' : 'text-foreground'}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${t.done ? 'border-accent bg-accent' : 'border-muted-foreground/50'}`}>
                        {t.done && <Check className="w-2.5 h-2.5 text-accent-foreground" />}
                      </div>
                      <span className={t.done ? 'line-through' : ''}>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Subscription */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Subscription</h2>
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
            {currentUser?.is_premium && (
              <a
                href="mailto:support@forge-social.app?subject=Premium Support"
                className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
              >
                <Headphones className="w-5 h-5 text-accent" />
                <div className="text-left flex-1">
                  <p className="font-medium">Premium Support</p>
                  <p className="text-sm text-muted-foreground">Direct help from the Forge team</p>
                </div>
                <span className="px-2 py-0.5 text-xs bg-accent/20 text-accent rounded-full font-medium shrink-0">Premium</span>
              </a>
            )}
          </div>
        </div>

        {/* Indie Games */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Indie Games</h2>
          <div className="bg-card rounded-xl overflow-hidden">
            <button
              onClick={() => navigate('/submit-indie-game')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Upload className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Submit Indie Game</p>
                <p className="text-sm text-muted-foreground">Submit your game to be featured on Forge</p>
              </div>
            </button>
          </div>
        </div>

        {/* Send Feedback */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Feedback</h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button
              onClick={() => navigate('/settings/feedback')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Lightbulb className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Request a Feature</p>
                <p className="text-sm text-muted-foreground">Suggest something new for Forge</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate('/settings/feedback?type=bug')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Bug className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Report a Bug</p>
                <p className="text-sm text-muted-foreground">Let us know what's broken</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* AI Insights */}
        <AIInsightsToggle />

        {/* About */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">About</h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <div className="w-full px-4 py-4 flex items-center gap-3">
              <Info className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Forge</p>
                <p className="text-sm text-muted-foreground">Version {RELEASES[0].version}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/settings/whats-new')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Sparkles className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">What's New</p>
                <p className="text-sm text-muted-foreground">See the latest features and fixes</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <a
              href="/blog"
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <BookOpen className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Blog</p>
                <p className="text-sm text-muted-foreground">Updates, roadmap, and announcements</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>
          </div>
        </div>

        {/* Get the App */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Get the App</h2>
          <div className="bg-card rounded-xl overflow-hidden">
            <button
              onClick={() => navigate('/android-beta')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Download className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Android Closed Beta</p>
                <p className="text-sm text-muted-foreground">Sign up to test Forge on Android</p>
              </div>
              <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-accent/15 text-accent shrink-0">Beta</span>
            </button>
          </div>
        </div>

        {/* Sign Out */}
        <div className="mb-8">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-4 flex items-center justify-center gap-3 bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowQRModal(false)}>
          <div className="bg-sidebar rounded-2xl w-full max-w-sm p-6 flex flex-col items-center gap-5" onClick={e => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between">
              <h2 className="text-xl font-semibold">Profile QR Code</h2>
              <button onClick={() => setShowQRModal(false)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground text-center -mt-1">
              Others can scan this to find your Forge profile
            </p>

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

            <div className="text-center">
              <p className="font-semibold text-lg">
                {currentUser?.display_name || currentUser?.handle}
              </p>
              <p className="text-sm text-muted-foreground">
                @{(currentUser?.handle || '').replace(/^@/, '')}
              </p>
            </div>

            <div className="w-full bg-secondary rounded-lg px-3 py-2 flex items-center gap-2">
              <p className="text-xs text-muted-foreground flex-1 truncate">{profileUrl}</p>
              <button
                onClick={handleCopyLink}
                className="shrink-0 p-1.5 hover:bg-card rounded transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>

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
    </div>
  );
}

function AIInsightsToggle() {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem('forge-auto-gemini') === 'true'; } catch { return false; }
  });
  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('forge-auto-gemini', String(next));
  };
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">AI Insights</h2>
      <div className="bg-card rounded-xl overflow-hidden">
        <button
          onClick={toggle}
          className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
        >
          <Sparkles className="w-5 h-5 text-muted-foreground" />
          <div className="text-left flex-1">
            <p className="font-medium">Auto Gemini Search</p>
            <p className="text-sm text-muted-foreground">
              Always show "Search with Forge AI" in Explore results
            </p>
          </div>
          <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${enabled ? 'bg-accent' : 'bg-muted'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-2 px-1">
        50 AI queries per day · requires a linked game
      </p>
    </div>
  );
}
