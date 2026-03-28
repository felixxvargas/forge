import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Mail, Eye, EyeOff, Zap, CheckCircle2, XCircle } from 'lucide-react';
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
          <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Zap className="w-16 h-16 fill-current text-accent" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Join Forge</h1>
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
          <button
            onClick={handleGoogleSignUp}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors mb-4 disabled:opacity-50 font-medium shadow-sm border border-gray-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign up with Google
          </button>

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

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing up you agree to Forge's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
