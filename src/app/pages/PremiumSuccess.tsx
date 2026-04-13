import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Crown, Check, List, Headphones, Gamepad2, TrendingUp } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

export function PremiumSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, updateCurrentUser } = useAppData();
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Stripe redirect returns ?payment_intent=pi_xxx&payment_intent_client_secret=...&redirect_status=succeeded
    const redirectStatus = searchParams.get('redirect_status');
    const isSuccess = redirectStatus === 'succeeded' || !redirectStatus; // also handle direct navigation after in-page success

    if (isSuccess && currentUser?.id && !currentUser.is_premium) {
      // Optimistically mark premium locally so UI updates immediately
      // (webhook will confirm in Supabase)
      updateCurrentUser({ is_premium: true }).catch(() => {});
    }

    setConfirmed(true);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      {/* Glow ring */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-accent/30 blur-2xl scale-150" />
        <div className="relative w-24 h-24 rounded-full bg-accent/20 border-2 border-accent/40 flex items-center justify-center">
          <Crown className="w-12 h-12 text-accent" />
        </div>
      </div>

      <h1 className="text-4xl font-black mb-2 text-center">Welcome to Premium!</h1>
      <p className="text-muted-foreground text-center text-lg mb-10 max-w-sm">
        Your account has been upgraded. Here's what's now unlocked:
      </p>

      {/* Unlocked features */}
      <div className="w-full max-w-sm space-y-3 mb-10">
        {[
          { icon: <List className="w-5 h-5" />, label: 'Custom Game Lists' },
          { icon: <Headphones className="w-5 h-5" />, label: 'Priority Support' },
          { icon: <Gamepad2 className="w-5 h-5" />, label: 'Host Indie Games on Forge' },
          { icon: <TrendingUp className="w-5 h-5" />, label: 'Priority Game Placement (coming soon)' },
        ].map((f, i) => (
          <div
            key={i}
            className="flex items-center gap-4 bg-card rounded-xl px-4 py-3 border border-accent/20"
          >
            <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
              {f.icon}
            </div>
            <span className="font-medium">{f.label}</span>
            <Check className="w-4 h-4 text-accent ml-auto shrink-0" />
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={() => navigate('/profile')}
          className="w-full py-4 bg-accent text-accent-foreground rounded-xl font-semibold text-base hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
        >
          <Crown className="w-4 h-4" />
          Go to My Profile
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="w-full py-3 bg-secondary text-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
        >
          Back to Settings
        </button>
      </div>

      <p className="mt-8 text-xs text-muted-foreground text-center max-w-xs">
        A receipt has been sent to your email. If you have questions, reach out via Premium Support in Settings.
      </p>
    </div>
  );
}
