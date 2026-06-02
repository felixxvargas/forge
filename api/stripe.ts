// Merged: create-payment-intent + webhook
// Routes: POST /api/stripe/create-payment-intent  |  POST /api/stripe/webhook
export const config = { runtime: 'edge' };

const SUPABASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// ─── Payment Intent ───────────────────────────────────────────────────────────
async function handleCreatePaymentIntent(req: Request): Promise<Response> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return json({ error: 'Stripe not configured' }, 500);

  let body: { userId?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!body.userId) return json({ error: 'userId is required' }, 400);

  const res = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': `forge-premium-${body.userId}`,
    },
    body: new URLSearchParams({
      amount: '499',
      currency: 'usd',
      'metadata[user_id]': body.userId,
      'metadata[product]': 'forge_premium',
      description: 'Forge Premium — one-time upgrade',
      'automatic_payment_methods[enabled]': 'true',
    }),
  });
  const data = await res.json() as any;
  if (!res.ok) return json({ error: data.error?.message ?? 'Stripe error' }, res.status);
  return json({ clientSecret: data.client_secret });
}

// ─── Webhook ─────────────────────────────────────────────────────────────────
async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  try {
    const parts = Object.fromEntries(header.split(',').map(p => p.split('=')));
    const timestamp = parts['t'], sig = parts['v1'];
    if (!timestamp || !sig) return false;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const expected = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
    const expectedHex = Array.from(new Uint8Array(expected)).map(b => b.toString(16).padStart(2, '0')).join('');
    return expectedHex === sig;
  } catch { return false; }
}

async function handleWebhook(req: Request): Promise<Response> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!webhookSecret || !serviceRoleKey || !stripeKey) return new Response('Server misconfigured', { status: 500 });

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const rawBody = await req.text();
  if (!await verifyStripeSignature(rawBody, signature, webhookSecret)) return new Response('Invalid signature', { status: 400 });

  const event = JSON.parse(rawBody);
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const userId = intent.metadata?.user_id;
    if (userId && intent.metadata?.product === 'forge_premium') {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ is_premium: true, premium_purchased_at: new Date().toISOString() }),
      });
    }
  }
  return json({ received: true });
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const resource = new URL(req.url).pathname.split('/').pop();
  if (resource === 'create-payment-intent') return handleCreatePaymentIntent(req);
  if (resource === 'webhook') return handleWebhook(req);
  return new Response('Not found', { status: 404 });
}
