import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Check, Crown, TrendingUp, List, Headphones, Gamepad2, Tv2, Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAppData } from '../context/AppDataContext';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

const FEATURES = [
  {
    icon: <List className="w-5 h-5" />,
    label: 'Custom Game Lists',
    description: 'Create unlimited custom lists with any name and any games',
  },
  {
    icon: <Headphones className="w-5 h-5" />,
    label: 'Priority Support',
    description: 'Direct support line — get help from the Forge team fast',
  },
  {
    icon: <Gamepad2 className="w-5 h-5" />,
    label: 'Host Indie Games on Forge',
    description: 'Upload your indie game directly to Forge for the community to discover',
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    label: 'Priority Game Placement',
    description: 'Your games get priority placement in Forge\'s game module — coming soon',
  },
  {
    icon: <Tv2 className="w-5 h-5" />,
    label: 'Unlimited Twitch Stream Archives',
    description: 'Up to 6-hour streams, saved forever — no deletion prompts, ever',
  },
];

// ─── Checkout form (rendered inside <Elements>) ──────────────────────────────

function CheckoutForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [ready, setReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError('');

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? 'Something went wrong.');
      setProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/premium/success`,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed. Please try again.');
      setProcessing(false);
    } else {
      // Payment succeeded without redirect (e.g. card)
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={`transition-opacity duration-300 ${ready ? 'opacity-100' : 'opacity-0'}`}>
        <PaymentElement
          onReady={() => setReady(true)}
          options={{
            layout: 'tabs',
            fields: { billingDetails: { name: 'auto' } },
          }}
        />
      </div>

      {!ready && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || processing || !ready}
        className="w-full py-4 bg-accent text-accent-foreground rounded-xl font-semibold text-base hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <Crown className="w-4 h-4" />
            Pay $4.99 — Unlock Premium
          </>
        )}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        One-time payment · No subscription · No hidden fees
      </p>
    </form>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Premium() {
  const navigate = useNavigate();
  const { currentUser } = useAppData();
  const isPremium = currentUser?.is_premium;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [intentError, setIntentError] = useState('');
  const [paymentDone, setPaymentDone] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const initPayment = useCallback(async () => {
    if (!currentUser?.id || !STRIPE_PK) return;
    setLoadingIntent(true);
    setIntentError('');
    try {
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to initialize payment');
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      setIntentError(err.message ?? 'Failed to load payment form.');
    } finally {
      setLoadingIntent(false);
    }
  }, [currentUser?.id]);

  const stripeAppearance = {
    theme: 'night' as const,
    variables: {
      colorPrimary: '#a3e635',
      colorBackground: '#1c1228',
      colorText: '#ffffff',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '10px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': { border: '1px solid rgba(255,255,255,0.1)', padding: '12px 14px' },
      '.Input:focus': { border: '1px solid #a3e635', boxShadow: 'none' },
      '.Label': { color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
      '.Tab': { border: '1px solid rgba(255,255,255,0.1)' },
      '.Tab--selected': { border: '1px solid #a3e635', color: '#a3e635' },
    },
  };

  if (paymentDone) {
    navigate('/premium/success', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Forge Premium</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/20 mb-4">
            <Crown className="w-10 h-10 text-accent" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Upgrade to Premium</h2>
          <p className="text-muted-foreground">One-time payment. Yours forever.</p>
        </div>

        {/* Price */}
        <div className="bg-card rounded-2xl p-6 border border-accent/30 text-center">
          <p className="text-5xl font-black mb-1">$4.99</p>
          <p className="text-muted-foreground text-sm">one-time · no subscription</p>
        </div>

        {/* Features */}
        <div className="space-y-3">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-start gap-4 bg-card rounded-xl p-4 border border-border">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
                {f.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{f.label}</p>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
              <Check className="w-5 h-5 text-accent ml-auto shrink-0 mt-2" />
            </div>
          ))}
        </div>

        {/* CTA / Payment */}
        {isPremium ? (
          <div className="w-full py-4 bg-secondary text-foreground rounded-xl text-center font-semibold flex items-center justify-center gap-2">
            <Crown className="w-5 h-5 text-accent" />
            You're already Premium!
          </div>
        ) : !STRIPE_PK ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
            Payment not available yet — check back soon.
          </div>
        ) : clientSecret ? (
          <div className="bg-card border border-border rounded-2xl p-6">
            <p className="font-semibold mb-5 text-base">Payment Details</p>
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: stripeAppearance }}
            >
              <CheckoutForm onSuccess={() => setPaymentDone(true)} />
            </Elements>
          </div>
        ) : (
          <div className="space-y-3">
            {intentError && (
              <p className="text-sm text-destructive text-center">{intentError}</p>
            )}
            <button
              onClick={initPayment}
              disabled={loadingIntent}
              className="w-full py-4 bg-accent text-accent-foreground rounded-xl font-semibold text-base hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingIntent ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading…
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4" />
                  Get Premium for $4.99
                </>
              )}
            </button>
            <p className="text-center text-xs text-muted-foreground">One-time payment · No subscription · No hidden fees</p>
          </div>
        )}
      </div>
    </div>
  );
}
