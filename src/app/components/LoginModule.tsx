import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { Mail, Eye, EyeOff } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { toast } from 'sonner';
import ForgeSVG from '../../assets/forge-logo.svg?react';

interface Props {
  /** sidebar = compact card without app-store badges; page = full centred view */
  variant?: 'page' | 'sidebar';
  /** Called after successful sign-in (optional override) */
  onSuccess?: () => void;
}

export function LoginModule({ variant = 'page', onSuccess }: Props) {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, currentUser, isAuthenticated, updateCurrentUser, signOut } = useAppData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUnsuspendDialog, setShowUnsuspendDialog] = useState(false);
  const [unsuspendLoading, setUnsuspendLoading] = useState(false);
  const didSignIn = useRef(false);

  // After sign-in attempt resolves: check for suspended account or navigate
  useEffect(() => {
    if (!didSignIn.current || !isAuthenticated || !currentUser) return;
    didSignIn.current = false;
    if (currentUser.suspended) {
      setShowUnsuspendDialog(true);
    } else {
      toast.success('Welcome back!');
      if (onSuccess) onSuccess();
      else navigate('/feed');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUser?.id, currentUser?.suspended]);

  const handleUnsuspend = async () => {
    setUnsuspendLoading(true);
    try {
      await updateCurrentUser({ suspended: false });
      setShowUnsuspendDialog(false);
      toast.success('Account reactivated. Welcome back!');
      if (onSuccess) onSuccess();
      else navigate('/feed');
    } catch {
      setUnsuspendLoading(false);
    }
  };

  const handleStaySuspended = async () => {
    setUnsuspendLoading(true);
    await signOut();
    setShowUnsuspendDialog(false);
    setUnsuspendLoading(false);
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError('');
      didSignIn.current = true;
      await signInWithGoogle();
    } catch (err: any) {
      didSignIn.current = false;
      setError(err.message || 'Google sign-in failed');
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      didSignIn.current = true;
      await signIn(email, password);
      // Suspended check and navigation handled by useEffect above
    } catch (err: any) {
      didSignIn.current = false;
      setError(err.message || 'Sign in failed. Check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Bluesky login (page variant only)
  const [showBlueskyInput, setShowBlueskyInput] = useState(false);
  const [blueskyHandle, setBlueskyHandle] = useState('');
  const [blueskyLoading, setBlueskyLoading] = useState(false);
  const [blueskyError, setBlueskyError] = useState('');

  const handleBlueskyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const handle = blueskyHandle.trim().replace(/^@/, '');
    if (!handle) return;
    setBlueskyLoading(true);
    setBlueskyError('');
    try {
      const { initiateBlueskyLogin } = await import('../utils/blueskyAuth');
      await initiateBlueskyLogin(handle);
    } catch (err: any) {
      setBlueskyError(err.message || 'Bluesky sign-in failed. Check your handle.');
      setBlueskyLoading(false);
    }
  };

  // Mastodon login (page variant only)
  const [showMastodonInput, setShowMastodonInput] = useState(false);
  const [mastodonInstance, setMastodonInstance] = useState('');
  const [mastodonLoading, setMastodonLoading] = useState(false);
  const [mastodonError, setMastodonError] = useState('');

  const handleMastodonLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const instance = mastodonInstance.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!instance) return;
    setMastodonLoading(true);
    setMastodonError('');
    try {
      const { initiateMastodonLogin } = await import('../utils/mastodonAuth');
      await initiateMastodonLogin(instance);
    } catch (err: any) {
      setMastodonError(err.message || 'Mastodon sign-in failed. Check your instance.');
      setMastodonLoading(false);
    }
  };

  const isSidebar = variant === 'sidebar';

  // Suspended account dialog — overlays everything when shown
  if (showUnsuspendDialog) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="w-full max-w-sm bg-card rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-lg font-semibold">Account Suspended</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Your account is currently suspended. Would you like to reactivate it and continue?
            </p>
          </div>
          <button
            onClick={handleUnsuspend}
            disabled={unsuspendLoading}
            className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {unsuspendLoading ? 'Reactivating…' : 'Reactivate Account'}
          </button>
          <button
            onClick={handleStaySuspended}
            disabled={unsuspendLoading}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Stay suspended & sign out
          </button>
        </div>
      </div>
    );
  }

  // ── Sidebar variant (compact card for Feed desktop sidebar) ─────────────────
  if (isSidebar) {
    return (
      <div className="">
        {/* Branding */}
        <div className="text-center mb-5">
          <div className="w-12 h-10 mx-auto mb-2 flex items-center justify-center">
            <ForgeSVG width="48" height="38" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-accent mb-0.5">Forge</h1>
          <p className="text-xs text-muted-foreground">Your gaming social network</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-xl">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}
          <button onClick={handleGoogleSignIn} disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors mb-3 disabled:opacity-50 font-medium shadow-sm border border-gray-200 text-sm">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"/></div>
            <div className="relative flex justify-center text-xs"><span className="px-3 bg-card text-muted-foreground">or</span></div>
          </div>
          <form onSubmit={handleEmailLogin} className="space-y-2.5">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required disabled={isLoading}
                className="w-full pl-8 pr-3 py-2 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent text-xs"/>
            </div>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required disabled={isLoading}
                className="w-full px-3 py-2 pr-8 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent text-xs"/>
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-3.5 h-3.5"/> : <Eye className="w-3.5 h-3.5"/>}
              </button>
            </div>
            <button type="submit" disabled={isLoading} className="w-full py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium disabled:opacity-50 text-xs">
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="mt-3 text-center">
            <p className="text-xs text-muted-foreground">
              No account?{' '}
              <Link to="/signup" className="underline hover:text-foreground font-medium">Sign up free</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Page variant — mobile: full-screen centred; desktop: split branding + form ──
  const formPanel = (
    <div className="w-full max-w-sm mx-auto">
      {/* Logo — shown only on mobile (desktop uses left panel) */}
      <div className="text-center mb-8 md:hidden pt-10">
        <div className="w-20 h-16 mx-auto mb-4 flex items-center justify-center">
          <ForgeSVG width="80" height="64" aria-hidden="true" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-accent mb-1">Forge</h1>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-widest uppercase bg-accent/15 text-accent mt-1 mb-2">Beta</span>
        <p className="text-muted-foreground mt-1">Your gaming social network</p>
      </div>

      {/* Desktop heading (no logo — shown on left panel) */}
      <div className="hidden md:block mb-8">
        <h2 className="text-2xl font-bold">Sign in to Forge</h2>
        <p className="text-muted-foreground mt-1 text-sm">Welcome back. Continue your gaming journey.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      <button onClick={handleGoogleSignIn} disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors mb-3 disabled:opacity-50 font-medium shadow-sm border border-gray-200">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      {/* Bluesky */}
      {!showBlueskyInput ? (
        <button type="button" onClick={() => { setShowBlueskyInput(true); setShowMastodonInput(false); }} disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors mb-3 disabled:opacity-50 font-medium">
          <svg className="w-5 h-5" viewBox="0 0 360 320" fill="currentColor">
            <path d="M180 141.964C163.699 110.262 119.308 51.1 78.0485 32.0987C38.1258 13.5097 0 31.3737 0 71.4946C0 82.5457 4.5 165.613 6 180.5C12.5 239.737 68.5 257.15 123.5 250.5C75.1 258.5 29.5 289.5 29.5 341.5C29.5 393.5 74.0835 413.5 118.5 413.5C173.5 413.5 200 388.5 220 358.5C240 388.5 266.5 413.5 321.5 413.5C365.917 413.5 410.5 393.5 410.5 341.5C410.5 289.5 364.9 258.5 316.5 250.5C371.5 257.15 427.5 239.737 434 180.5C435.5 165.613 440 82.5457 440 71.4946C440 31.3737 401.874 13.5097 361.952 32.0987C320.692 51.1 276.301 110.262 260 141.964V141.964Z"/>
          </svg>
          Continue with Bluesky
        </button>
      ) : (
        <form onSubmit={handleBlueskyLogin} className="mb-3">
          {blueskyError && <p className="text-xs text-destructive mb-1.5">{blueskyError}</p>}
          <div className="flex gap-2">
            <input type="text" value={blueskyHandle} onChange={e => setBlueskyHandle(e.target.value)}
              placeholder="you.bsky.social" autoFocus disabled={blueskyLoading}
              className="flex-1 px-3 py-2.5 bg-secondary rounded-lg border border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm" />
            <button type="submit" disabled={blueskyLoading || !blueskyHandle.trim()}
              className="px-4 py-2.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors font-medium text-sm disabled:opacity-50">
              {blueskyLoading ? '…' : 'Go'}
            </button>
            <button type="button" onClick={() => { setShowBlueskyInput(false); setBlueskyHandle(''); setBlueskyError(''); }}
              className="px-3 py-2.5 bg-secondary rounded-lg text-muted-foreground hover:text-foreground text-sm">✕</button>
          </div>
        </form>
      )}

      {/* Mastodon */}
      {!showMastodonInput ? (
        <button type="button" onClick={() => { setShowMastodonInput(true); setShowBlueskyInput(false); }} disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#6364ff] text-white rounded-lg hover:bg-[#5253e0] transition-colors mb-4 disabled:opacity-50 font-medium">
          <svg className="w-5 h-5" viewBox="0 0 74 79" fill="currentColor">
            <path d="M73.7014 17.4323C72.5616 9.05445 65.1095 2.32028 56.254 1.0651C54.7214 0.826088 49.0778 0 36.9817 0H36.9178C24.8166 0 22.1861 0.826088 20.6497 1.0651C11.9703 2.29253 4.14925 8.26853 2.5469 16.7197C1.7558 20.9174 1.6621 25.4968 1.81198 29.7472C2.02372 35.7573 2.06698 41.7536 2.51927 47.7424C2.84058 51.9712 3.43222 56.1717 4.29474 60.3061C5.94592 67.9661 13.0358 74.1945 20.6319 76.5658C28.7803 79.0417 37.5146 79.5049 45.8924 77.9219C46.8352 77.7376 47.7715 77.5182 48.6938 77.2683L48.6151 77.3429C47.7159 77.6034 46.7903 77.8252 45.8541 77.9872C37.5478 79.5476 29.0156 79.0972 20.9327 76.5883C13.0826 74.2126 6.19137 67.9406 4.56904 60.2462C3.70862 56.0954 3.11841 51.8797 2.79719 47.6348C2.33913 41.6174 2.29733 35.5953 2.08414 29.5617C1.92851 25.2871 2.02081 20.6845 2.81592 16.4538C4.46277 8.1014 12.4044 2.22261 21.2267 1.00019C22.7812 0.756765 25.8163 0 36.9178 0H36.9817C48.0776 0 51.3103 0.752563 52.6724 0.987609C61.4197 2.21284 69.2257 8.02252 70.8695 16.3924C71.6767 20.6637 71.7549 25.3157 71.5846 29.6284C71.3591 35.6661 71.3043 41.6993 70.8428 47.7091C70.5183 51.9494 69.9253 56.1628 69.0632 60.3113C67.4395 67.9699 60.3573 74.2132 52.7661 76.5858C44.7146 79.0913 36.1793 79.5626 27.9169 77.9857C27.0063 77.823 26.1063 77.6075 25.2161 77.3417C24.3209 77.0759 23.4341 76.7671 22.5638 76.4161L22.4957 76.3456C30.8571 77.9267 39.59 77.4587 47.7218 74.9612C55.3185 72.5937 62.4116 66.3617 64.0354 58.6987C64.8995 54.5527 65.4938 50.3354 65.8177 46.0896C66.2744 40.0753 66.3306 34.0394 66.5512 27.9988C66.7089 23.671 66.6147 19.0588 65.8048 14.7852C64.186 6.71399 56.9918 1.19087 48.3914 0.0547485C46.923 -0.133348 44.2247 -0.000219345 36.9817 0V0Z"/>
          </svg>
          Continue with Mastodon
        </button>
      ) : (
        <form onSubmit={handleMastodonLogin} className="mb-4">
          {mastodonError && <p className="text-xs text-destructive mb-1.5">{mastodonError}</p>}
          <div className="flex gap-2">
            <input type="text" value={mastodonInstance} onChange={e => setMastodonInstance(e.target.value)}
              placeholder="mastodon.social" autoFocus disabled={mastodonLoading}
              className="flex-1 px-3 py-2.5 bg-secondary rounded-lg border border-[#6364ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6364ff] text-sm" />
            <button type="submit" disabled={mastodonLoading || !mastodonInstance.trim()}
              className="px-4 py-2.5 bg-[#6364ff] text-white rounded-lg hover:bg-[#5253e0] transition-colors font-medium text-sm disabled:opacity-50">
              {mastodonLoading ? '…' : 'Go'}
            </button>
            <button type="button" onClick={() => { setShowMastodonInput(false); setMastodonInstance(''); setMastodonError(''); }}
              className="px-3 py-2.5 bg-secondary rounded-lg text-muted-foreground hover:text-foreground text-sm">✕</button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Enter your Mastodon server domain</p>
        </form>
      )}

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"/></div>
        <div className="relative flex justify-center text-sm"><span className="px-4 bg-background text-muted-foreground">or</span></div>
      </div>

      <form onSubmit={handleEmailLogin} className="space-y-3">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required disabled={isLoading}
            className="w-full pl-9 pr-4 py-2.5 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent text-sm"/>
        </div>
        <div className="relative">
          <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required disabled={isLoading}
            className="w-full px-4 py-2.5 pr-10 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent text-sm"/>
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
          </button>
        </div>
        <button type="submit" disabled={isLoading}
          className="w-full py-2.5 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium disabled:opacity-50 text-sm">
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/signup" className="underline hover:text-foreground font-medium">Create one for free</Link>
        </p>
      </div>
      <div className="mt-3 text-center">
        <p className="text-xs text-muted-foreground/60">
          By signing in you agree to our{' '}
          <Link to="/terms" className="underline hover:text-muted-foreground">Terms</Link>
          {' '}and{' '}
          <Link to="/privacy" className="underline hover:text-muted-foreground">Privacy Policy</Link>
        </p>
      </div>

      {/* App store badges — mobile only */}
      <div className="md:hidden w-full mt-8 mb-6">
        <p className="text-center text-xs text-muted-foreground/50 mb-4 uppercase tracking-wide font-medium">Also available on</p>
        <div className="flex items-center justify-center gap-6 pb-4">
          <div className="relative opacity-40 cursor-not-allowed" title="Coming soon">
            <img src="/google-play-badge.png" alt="Get it on Google Play" className="h-10" />
            <span className="absolute -bottom-4 left-0 right-0 text-center text-[9px] text-muted-foreground tracking-wide">Coming Soon</span>
          </div>
          <div className="relative opacity-40 cursor-not-allowed" title="Coming soon">
            <img src="/apple-store-badge.svg" alt="Download on the App Store" className="h-10 grayscale" />
            <span className="absolute -bottom-4 left-0 right-0 text-center text-[9px] text-muted-foreground tracking-wide">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — desktop branding (hidden on mobile) */}
      <div className="hidden md:flex flex-col justify-between w-[45%] shrink-0 p-12 bg-card border-r border-border relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/10 pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <ForgeSVG width="36" height="29" aria-hidden="true" />
            <span className="text-2xl font-black tracking-tight text-accent">Forge</span>
            <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-accent/15 text-accent">Beta</span>
          </div>
          <p className="text-muted-foreground text-sm">Your gaming social network</p>
        </div>

        {/* Feature highlights */}
        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold leading-snug">
            Where gamers<br/>
            <span className="text-accent">connect & share</span>
          </h2>
          <ul className="space-y-4">
            {[
              { icon: '🎮', text: 'Connect with gamers across PlayStation, Xbox, Steam, and more' },
              { icon: '📢', text: 'Share gaming moments, reviews, and finds with your community' },
              { icon: '🔍', text: 'Discover groups, LFG flares, and trending games' },
            ].map(({ icon, text }) => (
              <li key={icon} className="flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">{icon}</span>
                <span className="text-muted-foreground text-sm leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* App store badges */}
        <div className="relative z-10">
          <p className="text-xs text-muted-foreground/50 mb-3 uppercase tracking-wide font-medium">Also available on</p>
          <div className="flex items-center gap-3 pb-4">
            <div className="relative opacity-40 cursor-not-allowed" title="Coming soon">
              <img src="/google-play-badge.png" alt="Get it on Google Play" className="h-9" />
              <span className="absolute -bottom-3.5 left-0 right-0 text-center text-[9px] text-muted-foreground tracking-wide">Coming Soon</span>
            </div>
            <div className="relative opacity-40 cursor-not-allowed" title="Coming soon">
              <img src="/apple-store-badge.svg" alt="Download on the App Store" className="h-9 grayscale" />
              <span className="absolute -bottom-3.5 left-0 right-0 text-center text-[9px] text-muted-foreground tracking-wide">Coming Soon</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form (full screen on mobile) */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto">
        {formPanel}
      </div>
    </div>
  );
}
