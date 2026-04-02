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
      <div className="text-center mb-8 md:hidden">
        <div className="w-20 h-16 mx-auto mb-3 flex items-center justify-center">
          <svg width="80" height="64" viewBox="0 0 30 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23.8546 22.0745C23.7979 22.282 23.7454 22.5338 23.5728 22.7707C23.5288 23.1602 15.1934 22.7982 14.7127 22.7861C14.2111 22.7735 14.1341 22.1925 14.2267 21.8101C14.4018 21.0873 14.3769 20.9666 13.4012 20.9113C12.5315 20.862 12.1966 20.8773 11.1815 20.8909C10.5502 20.8993 10.3816 20.9074 10.1126 21.6804C9.99697 22.0128 9.64876 22.8544 9.27062 22.8359C8.44573 22.7954 4.60944 23.0175 3.78419 23.0361C2.63975 23.062 1.45237 23.1342 0.410346 22.9347C-0.760071 22.6379 0.894435 18.5131 1.39725 16.955C1.90006 15.3969 2.56631 12.3622 4.16834 11.5331C6.34674 10.4057 9.05856 10.4719 10.9357 8.62745C11.583 7.99141 11.6584 7.36046 11.7806 6.62056C11.8589 6.14617 11.5027 5.70097 11.0902 5.39449C10.8029 5.18109 10.5792 5.00749 9.59795 4.65701C8.70017 4.33633 8.3743 4.21834 7.18528 4.01055C6.3735 3.86869 4.77876 4.05397 4.77876 3.24283C4.77876 2.87926 5.36739 0.899542 5.47746 0.622489C5.47741 -0.174039 6.13479 0.0211001 9.17101 0.0211077C14.9725 0.0211221 20.6141 0.0731651 26.4059 0.0732023C27.31 0.0732081 28.5337 0.0732023 29.2956 0.0732023C28.8365 2.44179 28.4822 3.21115 27.3705 3.38842C26.0435 3.60001 23.1275 4.35326 21.7334 4.95082C21.1549 5.25938 20.7193 5.52426 20.2956 5.78788C19.4622 6.30628 19.2417 7.64898 19.3112 8.67594C19.4076 10.101 23.3879 10.5443 25.071 11.5331C26.6525 11.8949 25.2559 16.7747 25.071 17.3973C24.5922 19.0097 24.2238 20.7229 23.8546 22.0745Z" fill="#E7FFC4"/>
          </svg>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-widest uppercase bg-accent/15 text-accent mb-3">Beta</span>
        <h1 className="text-4xl font-black tracking-tight text-accent mb-1">Forge</h1>
        <p className="text-muted-foreground">Your gaming social network</p>
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
        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors mb-4 disabled:opacity-50 font-medium shadow-sm border border-gray-200">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

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
        <div className="flex items-center justify-center gap-4">
          <a href="https://play.google.com/store/apps/details?id=app.forge.social" target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-105">
            <img src="/google-play-badge.png" alt="Get it on Google Play" className="h-10" />
          </a>
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
          <div className="flex items-center gap-3">
            <a href="https://play.google.com/store/apps/details?id=app.forge.social" target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-105">
              <img src="/google-play-badge.png" alt="Get it on Google Play" className="h-9" />
            </a>
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
