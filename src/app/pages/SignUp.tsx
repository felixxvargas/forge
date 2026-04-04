import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Mail, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';

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

  const [showBlueskyInput, setShowBlueskyInput] = useState(false);
  const [blueskyHandle, setBlueskyHandle] = useState('');
  const [blueskyLoading, setBlueskyLoading] = useState(false);
  const [blueskyError, setBlueskyError] = useState('');
  const [showMastodonInput, setShowMastodonInput] = useState(false);
  const [mastodonInstance, setMastodonInstance] = useState('');
  const [mastodonLoading, setMastodonLoading] = useState(false);
  const [mastodonError, setMastodonError] = useState('');

  const handleBlueskySignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const handle = blueskyHandle.trim().replace(/^@/, '');
    if (!handle) return;
    setBlueskyLoading(true); setBlueskyError('');
    try {
      const { initiateBlueskyLogin } = await import('../utils/blueskyAuth');
      await initiateBlueskyLogin(handle);
    } catch (err: any) {
      setBlueskyError(err.message || 'Bluesky sign-in failed. Check your handle.');
      setBlueskyLoading(false);
    }
  };

  const handleMastodonSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const instance = mastodonInstance.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!instance) return;
    setMastodonLoading(true); setMastodonError('');
    try {
      const { initiateMastodonLogin } = await import('../utils/mastodonAuth');
      await initiateMastodonLogin(instance);
    } catch (err: any) {
      setMastodonError(err.message || 'Mastodon sign-in failed. Check your instance.');
      setMastodonLoading(false);
    }
  };

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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // Force account picker so user can choose a different Google account
          queryParams: { prompt: 'select_account' },
        },
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

    setIsLoading(true);
    try {
      // Store credentials so the onboarding flow can complete sign-up
      localStorage.setItem('forge-signup-email', email);
      localStorage.setItem('forge-signup-password', password);
      localStorage.setItem('forge-logged-in', 'true');
      toast.success('Account created! Complete your profile.');
      navigate('/splash');
    } catch (err: any) {
      setError(err.message || 'Sign-up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center">
            <svg width="80" height="64" viewBox="0 0 30 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M23.8546 22.0745C23.7979 22.282 23.7454 22.5338 23.5728 22.7707C23.5288 23.1602 15.1934 22.7982 14.7127 22.7861C14.2111 22.7735 14.1341 22.1925 14.2267 21.8101C14.4018 21.0873 14.3769 20.9666 13.4012 20.9113C12.5315 20.862 12.1966 20.8773 11.1815 20.8909C10.5502 20.8993 10.3816 20.9074 10.1126 21.6804C9.99697 22.0128 9.64876 22.8544 9.27062 22.8359C8.44573 22.7954 4.60944 23.0175 3.78419 23.0361C2.63975 23.062 1.45237 23.1342 0.410346 22.9347C-0.760071 22.6379 0.894435 18.5131 1.39725 16.955C1.90006 15.3969 2.56631 12.3622 4.16834 11.5331C6.34674 10.4057 9.05856 10.4719 10.9357 8.62745C11.583 7.99141 11.6584 7.36046 11.7806 6.62056C11.8589 6.14617 11.5027 5.70097 11.0902 5.39449C10.8029 5.18109 10.5792 5.00749 9.59795 4.65701C8.70017 4.33633 8.3743 4.21834 7.18528 4.01055C6.3735 3.86869 4.77876 4.05397 4.77876 3.24283C4.77876 2.87926 5.36739 0.899542 5.47746 0.622489C5.47741 -0.174039 6.13479 0.0211001 9.17101 0.0211077C14.9725 0.0211221 20.6141 0.0731651 26.4059 0.0732023C27.31 0.0732081 28.5337 0.0732023 29.2956 0.0732023C28.8365 2.44179 28.4822 3.21115 27.3705 3.38842C26.0435 3.60001 23.1275 4.35326 21.7334 4.95082C21.1549 5.25938 20.7193 5.52426 20.2956 5.78788C19.4622 6.30628 19.2417 7.64898 19.3112 8.67594C19.4076 10.101 23.3879 10.5443 25.071 11.5331C26.6525 11.8949 25.2559 16.7747 25.071 17.3973C24.5922 19.0097 24.2238 20.7229 23.8546 22.0745Z" fill="#E7FFC4"/>
            </svg>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-widest uppercase bg-accent/15 text-accent mb-3">Beta</span>
          <h1 className="text-4xl font-black tracking-tight text-accent mb-1">Forge</h1>
          <p className="text-muted-foreground">Connect with gamers across all platforms</p>
        </div>

        <div className="bg-card rounded-2xl p-8 shadow-xl">
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

          {/* Bluesky */}
          {!showBlueskyInput ? (
            <button type="button" onClick={() => { setShowBlueskyInput(true); setShowMastodonInput(false); }} disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors mb-3 disabled:opacity-50 font-medium">
              <svg className="w-5 h-5" viewBox="0 0 360 320" fill="currentColor"><path d="M180 141.964C163.699 110.262 119.308 51.1 78.0485 32.0987C38.1258 13.5097 0 31.3737 0 71.4946C0 82.5457 4.5 165.613 6 180.5C12.5 239.737 68.5 257.15 123.5 250.5C75.1 258.5 29.5 289.5 29.5 341.5C29.5 393.5 74.0835 413.5 118.5 413.5C173.5 413.5 200 388.5 220 358.5C240 388.5 266.5 413.5 321.5 413.5C365.917 413.5 410.5 393.5 410.5 341.5C410.5 289.5 364.9 258.5 316.5 250.5C371.5 257.15 427.5 239.737 434 180.5C435.5 165.613 440 82.5457 440 71.4946C440 31.3737 401.874 13.5097 361.952 32.0987C320.692 51.1 276.301 110.262 260 141.964V141.964Z"/></svg>
              Sign up with Bluesky
            </button>
          ) : (
            <form onSubmit={handleBlueskySignUp} className="mb-3">
              {blueskyError && <p className="text-xs text-destructive mb-1.5">{blueskyError}</p>}
              <div className="flex gap-2">
                <input type="text" value={blueskyHandle} onChange={e => setBlueskyHandle(e.target.value)}
                  placeholder="you.bsky.social" autoFocus disabled={blueskyLoading}
                  className="flex-1 px-3 py-2.5 bg-secondary rounded-lg border border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm" />
                <button type="submit" disabled={blueskyLoading || !blueskyHandle.trim()}
                  className="px-4 py-2.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors font-medium text-sm disabled:opacity-50">{blueskyLoading ? '…' : 'Go'}</button>
                <button type="button" onClick={() => { setShowBlueskyInput(false); setBlueskyHandle(''); setBlueskyError(''); }}
                  className="px-3 py-2.5 bg-secondary rounded-lg text-muted-foreground hover:text-foreground text-sm">✕</button>
              </div>
            </form>
          )}

          {/* Mastodon */}
          {!showMastodonInput ? (
            <button type="button" onClick={() => { setShowMastodonInput(true); setShowBlueskyInput(false); }} disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#6364ff] text-white rounded-lg hover:bg-[#5253e0] transition-colors mb-4 disabled:opacity-50 font-medium">
              <svg className="w-5 h-5" viewBox="0 0 74 79" fill="currentColor"><path d="M73.7014 17.4323C72.5616 9.05445 65.1095 2.32028 56.254 1.0651C54.7214 0.826088 49.0778 0 36.9817 0H36.9178C24.8166 0 22.1861 0.826088 20.6497 1.0651C11.9703 2.29253 4.14925 8.26853 2.5469 16.7197C1.7558 20.9174 1.6621 25.4968 1.81198 29.7472C2.02372 35.7573 2.06698 41.7536 2.51927 47.7424C2.84058 51.9712 3.43222 56.1717 4.29474 60.3061C5.94592 67.9661 13.0358 74.1945 20.6319 76.5658C28.7803 79.0417 37.5146 79.5049 45.8924 77.9219C46.8352 77.7376 47.7715 77.5182 48.6938 77.2683L48.6151 77.3429C47.7159 77.6034 46.7903 77.8252 45.8541 77.9872C37.5478 79.5476 29.0156 79.0972 20.9327 76.5883C13.0826 74.2126 6.19137 67.9406 4.56904 60.2462C3.70862 56.0954 3.11841 51.8797 2.79719 47.6348C2.33913 41.6174 2.29733 35.5953 2.08414 29.5617C1.92851 25.2871 2.02081 20.6845 2.81592 16.4538C4.46277 8.1014 12.4044 2.22261 21.2267 1.00019C22.7812 0.756765 25.8163 0 36.9178 0H36.9817C48.0776 0 51.3103 0.752563 52.6724 0.987609C61.4197 2.21284 69.2257 8.02252 70.8695 16.3924C71.6767 20.6637 71.7549 25.3157 71.5846 29.6284C71.3591 35.6661 71.3043 41.6993 70.8428 47.7091C70.5183 51.9494 69.9253 56.1628 69.0632 60.3113C67.4395 67.9699 60.3573 74.2132 52.7661 76.5858C44.7146 79.0913 36.1793 79.5626 27.9169 77.9857C27.0063 77.823 26.1063 77.6075 25.2161 77.3417C24.3209 77.0759 23.4341 76.7671 22.5638 76.4161L22.4957 76.3456C30.8571 77.9267 39.59 77.4587 47.7218 74.9612C55.3185 72.5937 62.4116 66.3617 64.0354 58.6987C64.8995 54.5527 65.4938 50.3354 65.8177 46.0896C66.2744 40.0753 66.3306 34.0394 66.5512 27.9988C66.7089 23.671 66.6147 19.0588 65.8048 14.7852C64.186 6.71399 56.9918 1.19087 48.3914 0.0547485C46.923 -0.133348 44.2247 -0.000219345 36.9817 0V0Z"/></svg>
              Sign up with Mastodon
            </button>
          ) : (
            <form onSubmit={handleMastodonSignUp} className="mb-4">
              {mastodonError && <p className="text-xs text-destructive mb-1.5">{mastodonError}</p>}
              <div className="flex gap-2">
                <input type="text" value={mastodonInstance} onChange={e => setMastodonInstance(e.target.value)}
                  placeholder="mastodon.social" autoFocus disabled={mastodonLoading}
                  className="flex-1 px-3 py-2.5 bg-secondary rounded-lg border border-[#6364ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6364ff] text-sm" />
                <button type="submit" disabled={mastodonLoading || !mastodonInstance.trim()}
                  className="px-4 py-2.5 bg-[#6364ff] text-white rounded-lg hover:bg-[#5253e0] transition-colors font-medium text-sm disabled:opacity-50">{mastodonLoading ? '…' : 'Go'}</button>
                <button type="button" onClick={() => { setShowMastodonInput(false); setMastodonInstance(''); setMastodonError(''); }}
                  className="px-3 py-2.5 bg-secondary rounded-lg text-muted-foreground hover:text-foreground text-sm">✕</button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Enter your Mastodon server domain</p>
            </form>
          )}

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-card text-muted-foreground">or sign up with email</span>
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
                  className="w-full pl-10 pr-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
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
                  className="w-full px-4 py-3 pr-11 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
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
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className={`w-full px-4 py-3 pr-11 bg-secondary rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent ${
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? 'border-accent'
                        : 'border-destructive'
                      : 'border-border'
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
              <Link to="/login" className="underline hover:text-foreground transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          By signing up you agree to our{' '}
          <Link to="/terms" className="underline hover:text-muted-foreground">Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" className="underline hover:text-muted-foreground">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
