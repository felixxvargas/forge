import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Mail, Eye, EyeOff } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { toast } from 'sonner';
import ForgeSVG from '../../assets/forge-logo.svg?react';

export function Login() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, isAuthenticated } = useAppData();

  useEffect(() => {
    if (isAuthenticated) {
      const isLinking = localStorage.getItem('forge-linking-account') === 'true';
      if (!isLinking) navigate('/feed', { replace: true });
    }
  }, [isAuthenticated]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError('');
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signIn(email, password);
      const isLinking = localStorage.getItem('forge-linking-account') === 'true';
      if (isLinking) {
        localStorage.removeItem('forge-linking-account');
        localStorage.setItem('forge-save-linked-account', 'true');
        navigate('/settings');
      } else {
        toast.success('Welcome back!');
        navigate('/feed');
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md flex-1 flex flex-col justify-center pt-10 sm:pt-0">
        <div className="text-center mb-8">
          <div className="w-20 h-16 mx-auto mb-4 flex items-center justify-center">
            <ForgeSVG width="80" height="64" aria-hidden="true" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-4xl font-black tracking-tight text-accent">Forge</h1>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tracking-widest uppercase bg-accent/15 text-accent">Beta</span>
          </div>
          <span className="sm:hidden inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-widest uppercase bg-accent/15 text-accent mb-2">Beta</span>
          <p className="text-muted-foreground">Your gaming social network</p>
        </div>

        <div className="bg-card rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold mb-6 text-center">Sign In</h2>

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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"/></div>
            <div className="relative flex justify-center text-sm"><span className="px-4 bg-card text-muted-foreground">or</span></div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"/>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" required disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"/>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Password</label>
              </div>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••" required disabled={isLoading}
                  className="w-full px-4 py-3 pr-11 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"/>
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium disabled:opacity-50">
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="underline hover:text-foreground font-medium">Create one for free</Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground/60">
              By signing in you agree to our{' '}
              <Link to="/terms" className="underline hover:text-muted-foreground">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="underline hover:text-muted-foreground">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>

      {/* App Store Badges */}
      <div className="w-full max-w-md mt-8 mb-6">
        <p className="text-center text-xs text-muted-foreground/50 mb-4 uppercase tracking-wide font-medium">Also available on</p>
        <div className="flex items-center justify-center gap-6 pb-4">
          {/* Google Play — coming soon */}
          <div className="relative opacity-40 cursor-not-allowed" title="Coming soon">
            <img src="/google-play-badge.png" alt="Get it on Google Play" className="h-10" />
            <span className="absolute -bottom-4 left-0 right-0 text-center text-[9px] text-muted-foreground tracking-wide">Coming Soon</span>
          </div>

          {/* Apple App Store — coming soon */}
          <div className="relative opacity-40 cursor-not-allowed" title="Coming soon">
            <img src="/apple-store-badge.svg" alt="Download on the App Store" className="h-10 grayscale" />
            <span className="absolute -bottom-4 left-0 right-0 text-center text-[9px] text-muted-foreground tracking-wide">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
