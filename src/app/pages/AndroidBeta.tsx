import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Smartphone, CheckCircle, Loader2, Mail } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { supabase } from '../utils/supabase';
import ForgeSVG from '../../assets/forge-logo.svg?react';

// SQL to create the beta_signups table (run once in Supabase SQL editor):
//
// CREATE TABLE IF NOT EXISTS beta_signups (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
//   email text NOT NULL,
//   platform text NOT NULL DEFAULT 'android',
//   status text NOT NULL DEFAULT 'pending',
//   created_at timestamptz NOT NULL DEFAULT now(),
//   UNIQUE(user_id, platform)
// );
// ALTER TABLE beta_signups ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users can insert own beta signup" ON beta_signups
//   FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
// CREATE POLICY "Users can read own beta signup" ON beta_signups
//   FOR SELECT TO authenticated USING (user_id = auth.uid());

export function AndroidBeta() {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAppData();
  const [userEmail, setUserEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
    if (!currentUser?.id) return;
    supabase
      .from('beta_signups')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('platform', 'android')
      .maybeSingle()
      .then(({ data }) => { if (data) setSubmitted(true); })
      .catch(() => {});
  }, [isAuthenticated, currentUser?.id]);

  const handleSubmit = async () => {
    if (!currentUser?.id || !userEmail) return;
    setSubmitting(true);
    setError('');
    try {
      const { error: dbError } = await supabase.from('beta_signups').insert({
        user_id: currentUser.id,
        email: userEmail,
        platform: 'android',
        status: 'pending',
      });
      if (dbError && dbError.code !== '23505') throw new Error(dbError.message);

      fetch('/api/emails/send-beta-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: userEmail,
          recipientName: currentUser.display_name || currentUser.handle || '',
        }),
      }).catch(() => {});

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Android Closed Beta</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Hero */}
        <div className="text-center space-y-3 pb-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10">
            <ForgeSVG width="38" height="30" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <h2 className="text-2xl font-bold">Get Early Access</h2>
              <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-accent/15 text-accent">Beta</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
              Be among the first to use Forge natively on Android. Sign up and we'll send your Google Play invite within a week.
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="bg-card border border-accent/20 rounded-2xl p-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-accent/20 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-accent" />
            </div>
            <h3 className="text-xl font-semibold">You're on the list!</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A confirmation has been sent to <strong className="text-foreground">{userEmail}</strong>. Watch for an email from Google Play — your beta invite usually arrives within a week.
            </p>
          </div>
        ) : !isAuthenticated ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
            <Smartphone className="w-10 h-10 text-accent mx-auto" />
            <p className="font-semibold text-lg">Sign in to request access</p>
            <p className="text-sm text-muted-foreground">You need a Forge account to join the Android closed beta.</p>
            <Link
              to="/login"
              className="inline-block px-6 py-2.5 bg-accent text-accent-foreground rounded-xl font-semibold text-sm hover:bg-accent/90 transition-colors"
            >
              Sign In or Create Account
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
              <p className="text-sm font-semibold">Your invite will be sent to</p>
              <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">{userEmail || 'Loading…'}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Google Play will send a beta invitation to this address. Accept it to install Forge on your Android device.
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !userEmail}
              className="w-full py-4 bg-accent text-accent-foreground rounded-xl font-semibold text-base hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
              ) : (
                <><Smartphone className="w-4 h-4" />Request Beta Access</>
              )}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              You'll receive a Google Play invite within a week.
            </p>
          </div>
        )}

        {/* How it works */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold">How it works</h3>
          <ol className="space-y-3">
            {[
              'Request access using your Forge account email',
              'Receive a beta invitation from Google Play (within a week)',
              'Accept the invite and install Forge from the Play Store',
              'Help shape the Android experience with your feedback',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
