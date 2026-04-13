// Vercel Edge Function — creates a Stripe PaymentIntent for Forge Premium ($4.99 one-time).
//
// Required env vars:
//   STRIPE_SECRET_KEY  — from dashboard.stripe.com → Developers → API Keys
//
// POST /api/stripe/create-payment-intent
// Body: { userId: string }

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return json({ error: 'Stripe not configured' }, 500);
  }

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (!body.userId) {
    return json({ error: 'userId is required' }, 400);
  }

  // Idempotency key prevents duplicate charges if the client retries.
  // Scoped to userId so re-submitting the same form doesn't double-charge.
  const idempotencyKey = `forge-premium-${body.userId}`;

  const res = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': idempotencyKey,
    },
    body: new URLSearchParams({
      amount: '499',            // $4.99 in cents
      currency: 'usd',
      'metadata[user_id]': body.userId,
      'metadata[product]': 'forge_premium',
      description: 'Forge Premium — one-time upgrade',
      'automatic_payment_methods[enabled]': 'true',
    }),
  });

  const data = await res.json() as any;

  if (!res.ok) {
    return json({ error: data.error?.message ?? 'Stripe error' }, res.status);
  }

  return json({ clientSecret: data.client_secret });
}

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
