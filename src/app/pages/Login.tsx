import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { supabase } from '../utils/supabase';
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

  // Bluesky login
  const [showBlueskyInput, setShowBlueskyInput] = useState(false);
  const [blueskyHandle, setBlueskyHandle] = useState('');
  const [blueskyLoading, setBlueskyLoading] = useState(false);
  const [blueskyError, setBlueskyError] = useState('');

  // Mastodon login
  const [showMastodonInput, setShowMastodonInput] = useState(false);
  const [mastodonInstance, setMastodonInstance] = useState('');
  const [mastodonLoading, setMastodonLoading] = useState(false);
  const [mastodonError, setMastodonError] = useState('');

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

  // Forgot password
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (err: any) {
      setForgotError(err.message || 'Failed to send reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

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
          {showForgot ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <button type="button" onClick={() => { setShowForgot(false); setForgotSent(false); setForgotError(''); setForgotEmail(''); }}
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-semibold">Forgot Password</h2>
              </div>

              {forgotSent ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-accent/15 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-6 h-6 text-accent" />
                  </div>
                  <p className="font-medium mb-2">Check your email</p>
                  <p className="text-sm text-muted-foreground">
                    We sent a password reset link to{' '}
                    <span className="font-medium text-foreground">{forgotEmail}</span>
                  </p>
                  <button type="button" onClick={() => { setShowForgot(false); setForgotSent(false); setForgotError(''); setForgotEmail(''); }}
                    className="mt-6 text-sm text-accent hover:underline">
                    Back to sign in
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-6">
                    Enter your account email and we'll send you a link to reset your password.
                  </p>
                  {forgotError && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                      {forgotError}
                    </div>
                  )}
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                          placeholder="your@email.com" required disabled={forgotLoading} autoFocus
                          className="w-full pl-10 pr-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent" />
                      </div>
                    </div>
                    <button type="submit" disabled={forgotLoading}
                      className="w-full py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium disabled:opacity-50">
                      {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </form>
                </>
              )}
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-6 text-center">Sign In</h2>

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
                      className="px-3 py-2.5 bg-secondary rounded-lg text-muted-foreground hover:text-foreground text-sm">
                      ✕
                    </button>
                  </div>
                </form>
              )}

              {/* Mastodon */}
              {!showMastodonInput ? (
                <button type="button" onClick={() => { setShowMastodonInput(true); setShowBlueskyInput(false); }} disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#6364ff] text-white rounded-lg hover:bg-[#5253e0] transition-colors mb-4 disabled:opacity-50 font-medium">
                  <svg className="w-5 h-5" viewBox="0 0 74 79" fill="currentColor">
                    <path d="M73.7014 17.4323C72.5616 9.05445 65.1095 2.32028 56.254 1.0651C54.7214 0.826088 49.0778 0 36.9817 0H36.9178C24.8166 0 22.1861 0.826088 20.6497 1.0651C11.9703 2.29253 4.14925 8.26853 2.5469 16.7197C1.7558 20.9174 1.6621 25.4968 1.81198 29.7472C2.02372 35.7573 2.06698 41.7536 2.51927 47.7424C2.84058 51.9712 3.43222 56.1717 4.29474 60.3061C5.94592 67.9661 13.0358 74.1945 20.6319 76.5658C28.7803 79.0417 37.5146 79.5049 45.8924 77.9219C46.8352 77.7376 47.7715 77.5182 48.6938 77.2683L48.6151 77.3429C47.7159 77.6034 46.7903 77.8252 45.8541 77.9872C37.5478 79.5476 29.0156 79.0972 20.9327 76.5883C13.0826 74.2126 6.19137 67.9406 4.56904 60.2462C3.70862 56.0954 3.11841 51.8797 2.79719 47.6348C2.33913 41.6174 2.29733 35.5953 2.08414 29.5617C1.92851 25.2871 2.02081 20.6845 2.81592 16.4538C4.46277 8.1014 12.4044 2.22261 21.2267 1.00019C22.7812 0.756765 25.8163 0 36.9178 0H36.9817C48.0776 0 51.3103 0.752563 52.6724 0.987609C61.4197 2.21284 69.2257 8.02252 70.8695 16.3924C71.6767 20.6637 71.7549 25.3157 71.5846 29.6284C71.3591 35.6661 71.3043 41.6993 70.8428 47.7091C70.5183 51.9494 69.9253 56.1628 69.0632 60.3113C67.4395 67.9699 60.3573 74.2132 52.7661 76.5858C44.7146 79.0913 36.1793 79.5626 27.9169 77.9857C27.0063 77.823 26.1063 77.6075 25.2161 77.3417C24.3209 77.0759 23.4341 76.7671 22.5638 76.4161L22.4957 76.3456C30.8571 77.9267 39.59 77.4587 47.7218 74.9612C55.3185 72.5937 62.4116 66.3617 64.0354 58.6987C64.8995 54.5527 65.4938 50.3354 65.8177 46.0896C66.2744 40.0753 66.3306 34.0394 66.5512 27.9988C66.7089 23.671 66.6147 19.0588 65.8048 14.7852C64.186 6.71399 56.9918 1.19087 48.3914 0.0547485C46.923 -0.133348 44.2247 -0.000219345 36.9817 0V0ZM57.9378 66.4979C55.8474 67.7572 53.6069 68.8029 51.2694 69.6208C43.1737 72.4578 34.4437 72.5005 26.3248 69.7538L22.4956 76.3455C22.4956 76.3455 16.8899 74.4655 10.6284 64.3955C11.7536 63.7879 13.0028 63.3955 14.2856 63.259C19.8936 62.649 25.5542 63.1448 31.1234 63.1448C39.7012 63.1448 46.7461 61.0949 51.5286 54.7866C53.4745 52.2281 54.8694 49.3119 55.7199 46.1922C55.7199 46.1922 55.7199 46.1922 55.7199 46.1875L55.7199 46.1875C55.7199 46.1849 55.7199 46.1832 55.72 46.1815L55.7199 46.1875C55.7199 46.1875 55.7199 46.1875 55.7199 46.1875C53.4897 33.5898 53.4423 20.8748 53.4423 20.8748C53.4423 18.0617 51.5099 15.7226 48.7543 15.2285C47.9609 15.0862 47.154 15.0149 46.3458 15.0143H27.5973C24.0888 15.0143 22.2938 17.2393 22.2938 19.9048V37.5C22.2938 46.4413 26.8966 50.5028 34.5626 51.4476C36.4853 51.6735 38.4234 51.8072 40.362 51.8479C46.2659 51.9699 52.3163 51.0477 55.7199 46.1875L55.7199 46.1875Z"/>
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
                      className="px-3 py-2.5 bg-secondary rounded-lg text-muted-foreground hover:text-foreground text-sm">
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Enter your Mastodon server domain</p>
                </form>
              )}

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
                    <button type="button" onClick={() => setShowForgot(true)}
                      className="text-xs text-accent hover:underline">
                      Forgot password?
                    </button>
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
            </>
          )}
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
