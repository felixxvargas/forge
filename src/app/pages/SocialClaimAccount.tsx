import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { toast } from 'sonner';
import ForgeSVG from '../../assets/forge-logo.svg?react';

interface ProviderProfile {
  handle: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  provider: 'bluesky' | 'mastodon';
  socialHandle: string;
}

type View = 'choose' | 'link-existing' | 'link-sent';

export function SocialClaimAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [view, setView] = useState<View>('choose');
  const [linkEmail, setLinkEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = searchParams.get('data');
    if (raw) {
      try {
        setProviderProfile(JSON.parse(decodeURIComponent(raw)));
      } catch {
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate]);

  const providerName = providerProfile?.provider === 'bluesky' ? 'Bluesky' : 'Mastodon';

  const handleCreateNew = () => {
    if (!providerProfile) return;
    // Store the social profile data for the onboarding flow
    localStorage.setItem('forge-social-signup', JSON.stringify(providerProfile));
    localStorage.setItem('forge-logged-in', 'true');
    navigate('/onboarding');
  };

  const handleLinkExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerProfile || !linkEmail.trim()) return;
    setError('');
    setIsLoading(true);
    try {
      // Store the pending social link so AuthCallback can apply it after email verification
      localStorage.setItem('forge-pending-social-link', JSON.stringify({
        provider: providerProfile.provider,
        socialHandle: providerProfile.socialHandle,
        handle: providerProfile.handle,
        displayName: providerProfile.displayName,
        avatar: providerProfile.avatar,
      }));

      const { error } = await supabase.auth.signInWithOtp({
        email: linkEmail.trim(),
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setView('link-sent');
    } catch (err: any) {
      localStorage.removeItem('forge-pending-social-link');
      setError(err.message || 'Failed to send verification email. Make sure this email is linked to a Forge account.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!providerProfile) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-16 mx-auto mb-4 flex items-center justify-center">
            <ForgeSVG width="80" height="64" aria-hidden="true" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-accent">Forge</h1>
        </div>

        <div className="bg-card rounded-2xl p-8 shadow-xl">
          {/* Social profile preview */}
          <div className="flex items-center gap-3 mb-6 p-3 bg-secondary/50 rounded-xl">
            {providerProfile.avatar ? (
              <img src={providerProfile.avatar} alt={providerProfile.displayName} className="w-12 h-12 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0 text-lg font-bold text-accent">
                {(providerProfile.displayName || providerProfile.handle).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{providerProfile.displayName || providerProfile.handle}</p>
              <p className="text-sm text-muted-foreground truncate">
                @{providerProfile.handle.replace(/^@/, '')}
                <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  providerProfile.provider === 'bluesky' ? 'bg-sky-500/20 text-sky-400' : 'bg-purple-500/20 text-purple-400'
                }`}>{providerName}</span>
              </p>
            </div>
          </div>

          {view === 'choose' && (
            <>
              <h2 className="text-xl font-semibold mb-2">No Forge account found</h2>
              <p className="text-sm text-muted-foreground mb-6">
                This {providerName} account isn't linked to a Forge profile yet. What would you like to do?
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleCreateNew}
                  className="w-full py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium"
                >
                  Create new Forge account
                </button>
                <button
                  onClick={() => setView('link-existing')}
                  className="w-full py-3 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
                >
                  Link to my existing Forge account
                </button>
              </div>
              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
                  Back to sign in
                </Link>
              </div>
            </>
          )}

          {view === 'link-existing' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <button type="button" onClick={() => setView('choose')} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-semibold">Link to existing account</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Enter the email address for your existing Forge account. We'll send a verification link — once you click it, your {providerName} account will be linked.
              </p>
              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleLinkExisting} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={linkEmail}
                      onChange={e => setLinkEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      disabled={isLoading}
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
                <button type="submit" disabled={isLoading}
                  className="w-full py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium disabled:opacity-50">
                  {isLoading ? 'Sending…' : 'Send verification link'}
                </button>
              </form>
            </>
          )}

          {view === 'link-sent' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-accent/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-accent" />
              </div>
              <p className="font-medium mb-2">Check your email</p>
              <p className="text-sm text-muted-foreground">
                We sent a verification link to <span className="font-medium text-foreground">{linkEmail}</span>. Click it to link your {providerName} account to Forge.
              </p>
              <button type="button" onClick={() => { setView('link-existing'); setLinkEmail(''); }}
                className="mt-6 text-sm text-accent hover:underline">
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
