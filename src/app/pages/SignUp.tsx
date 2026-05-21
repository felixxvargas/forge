import { useState, useRef } from 'react';
import { useNavigate, Link } from '@/compat/router';
import { Mail, Eye, EyeOff, CheckCircle2, XCircle, ArrowLeft, Gamepad2, Users, Tv2, Flame, Search } from 'lucide-react';
import { BetaTag } from '../components/ui/BetaTag';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import ForgeSVG from '../../assets/forge-logo.svg?react';

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string;

function PasswordRule({ met, text }: { met: boolean; text: string }) {
  return (
    <li className="flex items-center gap-1.5 text-xs">
      {met ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
      ) : (
        <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      )}
      <span className={met ? 'text-accent' : 'text-muted-foreground'}>{text}</span>
    </li>
  );
}

export function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const captchaRef = useRef<HCaptcha>(null);

  const rules = {
    length: password.length >= 8 && password.length <= 64,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const passwordValid = Object.values(rules).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true);
      setError('');
      const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);
      // Mark this as a sign-up intent so AuthCallback can detect existing accounts
      localStorage.setItem('forge-oauth-intent', 'signup');
      const { Capacitor } = await import('@capacitor/core');
      const redirectTo = Capacitor.isNativePlatform()
        ? 'app.forge.social://auth/callback'
        : `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { prompt: 'select_account' } },
      });
      if (error) {
        localStorage.removeItem('forge-oauth-intent');
        setError(`Google sign-up failed: ${error.message}`);
      }
    } catch (err: any) {
      localStorage.removeItem('forge-oauth-intent');
      setError(err.message || 'Google sign-up failed');
    } finally {
      setIsLoading(false);
    }
  };

  const doSignUp = (token: string | null) => {
    setIsLoading(true);
    try {
      sessionStorage.setItem('forge-signup-email', email);
      sessionStorage.setItem('forge-signup-password', password);
      if (token) sessionStorage.setItem('forge-signup-captcha', token);
      navigate('/splash');
    } catch (err: any) {
      setError(err.message || 'Sign-up failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!passwordValid) {
      setError('Please fix the password issues below.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      setShowCaptcha(true);
      return;
    }

    doSignUp(captchaToken);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 relative">

      {/* Close / back button */}
      <Link
        to="/feed"
        className="fixed top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors inline-flex items-center justify-center"
        aria-label="Back to feed"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </Link>

      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden="true">
        <div className="absolute top-[-15%] left-[5%] w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-[-10%] right-[0%] w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.28) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[35%] right-[15%] w-[450px] h-[450px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)', filter: 'blur(100px)' }} />
        <div className="absolute bottom-[15%] left-[-5%] w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(88,28,135,0.22) 0%, transparent 70%)', filter: 'blur(70px)' }} />
      </div>

      {/* Desktop feature points + form side-by-side */}
      <div className="w-full lg:max-w-4xl flex-1 flex flex-col lg:flex-row lg:items-center lg:gap-16 pt-20 sm:pt-0 relative z-10 lg:px-4">

        {/* Feature points — full width on mobile, left column on desktop */}
        <div className="flex flex-col gap-4 lg:gap-6 flex-1 max-w-sm rounded-2xl p-5 lg:p-6" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <h2 className="text-xl lg:text-3xl font-black text-foreground leading-tight mb-2">
              The social network<br/>built for gamers.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Track your library, connect with the community, and share what you're playing.
            </p>
          </div>
          <div className="space-y-3 lg:space-y-4">
            {[
              { icon: Gamepad2, title: 'Track your game library', desc: 'Organize games you\'ve played, want to play, and your all-time favorites.' },
              { icon: Users, title: 'Connect with gamers', desc: 'Follow friends, join communities, and see what everyone is playing.' },
              { icon: Search, title: 'Discover new games', desc: 'Get recommendations from people with the same gaming taste as you.' },
              { icon: Flame, title: 'Find teammates with LFG', desc: 'Post a flare when you need a squad and get matched instantly.' },
              { icon: Tv2, title: 'Auto Twitch stream archives', desc: 'Your Twitch VODs are automatically saved and shared to your profile.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4.5 h-4.5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-md flex-1 lg:flex-none flex flex-col justify-center">

        {/* Logo section */}
        <div className="text-center mb-8">
          <div className="relative flex items-center justify-center gap-2.5 mb-2">
            <ForgeSVG width="32" height="26" aria-hidden="true" />
            <span className="font-black text-2xl text-accent tracking-tight">Forge</span>
            <BetaTag size="sm" />
          </div>
          <p className="text-sm text-muted-foreground">Your gaming social network</p>
        </div>

        {/* Glass card */}
        <div className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.11)',
          }}>
          <h2 className="text-xl font-semibold mb-6 text-center">Create your account</h2>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Google */}
          <button onClick={handleGoogleSignUp} disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors mb-3 disabled:opacity-50 font-medium shadow-sm border border-gray-200">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign up with Google
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.12]"/></div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 text-muted-foreground" style={{ background: 'transparent' }}>or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailSignUp} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.07] rounded-lg border border-white/[0.12] focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full px-4 py-3 pr-11 bg-white/[0.07] rounded-lg border border-white/[0.12] focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password.length > 0 && (
                <ul className="mt-2 space-y-1 ml-1">
                  <PasswordRule met={rules.length} text="8–64 characters" />
                  <PasswordRule met={rules.upper} text="One uppercase letter" />
                  <PasswordRule met={rules.lower} text="One lowercase letter" />
                  <PasswordRule met={rules.number} text="One number" />
                </ul>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className={`w-full px-4 py-3 pr-11 bg-white/[0.07] rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent ${
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? 'border-accent/60'
                        : 'border-destructive'
                      : 'border-white/[0.12]'
                  }`}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-1 text-xs text-destructive">Passwords don't match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !passwordValid || !passwordsMatch}
              className="w-full py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium disabled:opacity-50"
            >
              {isLoading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="underline hover:text-foreground transition-colors">Sign in</Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground/60">
              By signing up you agree to our{' '}
              <Link to="/terms" className="underline hover:text-muted-foreground">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="underline hover:text-muted-foreground">Privacy Policy</Link>
            </p>
          </div>

          <div className="mt-3 text-center">
            <Link to="/blog" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors underline">
              Forge Blog
            </Link>
          </div>
        </div>
      </div>
      </div>

      {/* App Store Badges */}
      <div className="w-full max-w-md mt-8 mb-6 relative z-10">
        <p className="text-center text-xs text-muted-foreground/50 mb-4 uppercase tracking-wide font-medium">Also available on</p>
        <div className="flex items-center justify-center gap-6 pb-4">
          <Link to="/android-beta" className="relative group">
            <img src="/google-play-badge.png" alt="Get it on Google Play" className="h-10 group-hover:opacity-80 transition-opacity" />
            <span className="absolute -bottom-4 left-0 right-0 text-center text-[9px] text-accent tracking-wide font-medium">Join Beta</span>
          </Link>
          <div className="relative opacity-40 cursor-not-allowed" title="Coming soon">
            <img src="/apple-store-badge.svg" alt="Download on the App Store" className="h-7 grayscale" />
            <span className="absolute -bottom-4 left-0 right-0 text-center text-[9px] text-muted-foreground tracking-wide">Coming Soon</span>
          </div>
        </div>
      </div>

      {/* hCaptcha overlay — slides up after user submits valid form */}
      {showCaptcha && HCAPTCHA_SITE_KEY && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCaptcha(false)}
          />
          <div className="relative w-full max-w-sm mx-4 bg-card rounded-t-2xl sm:rounded-2xl p-6 pb-10 sm:pb-6 flex flex-col items-center gap-4 shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="w-10 h-1 bg-border rounded-full sm:hidden" />
            <h3 className="text-lg font-semibold">Quick verification</h3>
            <p className="text-sm text-muted-foreground text-center">
              Complete the challenge to create your account.
            </p>
            <HCaptcha
              ref={captchaRef}
              sitekey={HCAPTCHA_SITE_KEY}
              onVerify={(token) => {
                setCaptchaToken(token);
                setShowCaptcha(false);
                doSignUp(token);
              }}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
              theme="dark"
            />
            <button
              type="button"
              onClick={() => setShowCaptcha(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
