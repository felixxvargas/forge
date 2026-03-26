import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Check, Crown, Sparkles, List, Flame } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

const FEATURES = [
  { icon: <List className="w-5 h-5" />, label: 'Custom Game Lists', description: 'Create unlimited custom lists for any category you want' },
  { icon: <Flame className="w-5 h-5" />, label: 'Unlimited Group Flares', description: 'Post unlimited LFG flares per group — free accounts are limited to 1 active flare per group' },
  { icon: <Sparkles className="w-5 h-5" />, label: 'Profile Badge', description: 'Show off your Premium status with a special crown badge' },
  { icon: <Crown className="w-5 h-5" />, label: 'Early Access', description: 'Get first access to new Forge features before anyone else' },
];

export function Premium() {
  const navigate = useNavigate();
  const { currentUser } = useAppData();
  const isPremium = currentUser?.is_premium;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Forge Premium</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/20 mb-4">
            <Crown className="w-10 h-10 text-accent" />
          </div>
          <h2 className="text-3xl font-bold mb-3">Upgrade to Premium</h2>
          <p className="text-muted-foreground text-lg">
            Unlock the full Forge experience
          </p>
        </div>

        {/* Pricing */}
        <div className="bg-card rounded-2xl p-6 border border-border mb-8 text-center">
          <p className="text-4xl font-bold mb-1">$4.99<span className="text-lg font-normal text-muted-foreground">/month</span></p>
          <p className="text-muted-foreground">or $39.99/year (save 33%)</p>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-8">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-start gap-4 bg-card rounded-xl p-4 border border-border">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
                {f.icon}
              </div>
              <div>
                <p className="font-semibold">{f.label}</p>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
              <Check className="w-5 h-5 text-accent ml-auto shrink-0 mt-2" />
            </div>
          ))}
        </div>

        {isPremium ? (
          <div className="w-full py-4 bg-secondary text-foreground rounded-xl text-center font-semibold flex items-center justify-center gap-2">
            <Crown className="w-5 h-5 text-accent" />
            You're already Premium!
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <p className="font-medium text-sm">Payment details</p>
              <input
                type="text"
                placeholder="Card number"
                maxLength={19}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="MM / YY"
                  maxLength={7}
                  className="flex-1 min-w-0 px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <input
                  type="text"
                  placeholder="CVC"
                  maxLength={4}
                  className="flex-1 min-w-0 px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <input
                type="text"
                placeholder="Name on card"
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <button
              disabled
              className="w-full py-4 bg-accent/50 text-accent-foreground rounded-xl font-semibold text-lg cursor-not-allowed opacity-60"
            >
              Coming Soon
            </button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4">
          Cancel anytime. No hidden fees.
        </p>
      </div>
    </div>
  );
}
