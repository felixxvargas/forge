import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Mail, ZapIcon } from 'lucide-react';
import { authAPI } from '../utils/api';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password validation
  const passwordMinLength = 8;
  const passwordMaxLength = 64;
  
  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < passwordMinLength) {
      return `Password must be at least ${passwordMinLength} characters`;
    }
    if (pwd.length > passwordMaxLength) {
      return `Password must be less than ${passwordMaxLength} characters`;
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      
      // Clear any stale mock data before OAuth flow
      const keysToRemove = ['forge-user-id', 'forge-current-user'];
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );
      
      console.log('Initiating Google OAuth with redirect to:', `${window.location.origin}/auth/callback`);
      
      // Initiate Google OAuth flow
      const { error, data } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        console.error('Google OAuth error:', error);
        setError(`Google OAuth Error: ${error.message}. Please check:\n1. Google OAuth is enabled in Supabase Dashboard → Authentication → Providers\n2. Redirect URL is configured: ${window.location.origin}/auth/callback\n3. Site URL is set in Supabase Dashboard → Settings → URL Configuration`);
      } else {
        console.log('Google OAuth initiated successfully', data);
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate passwords match on signup
    if (isSignUp) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
      
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        setIsLoading(false);
        return;
      }
    }
    
    setIsLoading(true);

    try {
      if (isSignUp) {
        // For signup, redirect to onboarding to collect profile info
        localStorage.setItem('forge-signup-email', email);
        localStorage.setItem('forge-signup-password', password);
        localStorage.setItem('forge-logged-in', 'true');
        navigate('/splash');
      } else {
        // Sign in with existing account
        console.log('Attempting to sign in with email:', email);
        const data = await authAPI.signin(email, password);
        console.log('Sign in response:', data);
        console.log('Session data:', data.session);
        console.log('Access token:', data.session?.access_token);
        
        // Double-check token was stored
        const storedToken = localStorage.getItem('forge-access-token');
        console.log('Token stored in localStorage:', !!storedToken);
        
        if (data.profile) {
          console.log('User profile found:', data.profile);
          // Check if onboarding is complete
          const onboardingComplete = data.profile.interests && data.profile.interests.length > 0;
          
          if (onboardingComplete) {
            console.log('Onboarding complete, redirecting to feed');
            localStorage.setItem('forge-onboarding-complete', 'true');
            navigate('/feed');
          } else {
            console.log('Onboarding incomplete, redirecting to splash');
            navigate('/splash');
          }
        } else {
          console.warn('No profile data returned from signin');
          setError('Sign in successful but profile not found. Please contact support.');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <ZapIcon className="w-16 h-16 fill-current" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Forge</h1>
          <p className="text-muted-foreground">
            Connect with gamers across all platforms
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold mb-6 text-center">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Google Login */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors mb-4 disabled:opacity-50 font-medium shadow-sm border border-gray-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isSignUp ? 'Sign up with Google' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-card text-muted-foreground">or</span>
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
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

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                required
                disabled={isLoading}
                minLength={passwordMinLength}
                maxLength={passwordMaxLength}
              />
              {isSignUp && (
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  <p>Password requirements:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li>{passwordMinLength}-{passwordMaxLength} characters</li>
                    <li>At least one uppercase letter</li>
                    <li>At least one lowercase letter</li>
                    <li>At least one number</li>
                  </ul>
                </div>
              )}
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                  disabled={isLoading}
                  minLength={passwordMinLength}
                  maxLength={passwordMaxLength}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium disabled:opacity-50"
            >
              {isLoading ? 'Please wait...' : (isSignUp ? 'Continue to Sign Up' : 'Sign In')}
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              disabled={isLoading}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp ? (
                <>Already have an account? <span className="underline">Sign in</span></>
              ) : (
                <>Don't have an account? <span className="underline">Sign up</span></>
              )}
            </button>
          </div>
        </div>

        {/* Info Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            {isSignUp 
              ? 'You\'ll complete your profile after signing up' 
              : 'Your gaming social network awaits'}
          </p>
        </div>
      </div>
    </div>
  );
}