// Vercel Edge Function — handles Stripe webhook events.
// On payment_intent.succeeded, marks the paying user as premium in Supabase.
//
// Required env vars:
//   STRIPE_SECRET_KEY         — Stripe secret key
//   STRIPE_WEBHOOK_SECRET     — Stripe → Webhooks → your endpoint → Signing secret
//   SUPABASE_SERVICE_ROLE_KEY — Supabase → Project Settings → API → service_role key
//
// Stripe Dashboard setup:
//   1. Add endpoint: https://forge-social.app/api/stripe/webhook
//   2. Select event: payment_intent.succeeded
//   3. Copy the signing secret into STRIPE_WEBHOOK_SECRET

export const config = { runtime: 'edge' };

const SUPABASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !serviceRoleKey || !stripeKey) {
    return new Response('Server misconfigured', { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  const rawBody = await req.text();

  // Verify Stripe signature (HMAC-SHA256)
  const verified = await verifyStripeSignature(rawBody, signature, webhookSecret);
  if (!verified) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const userId = intent.metadata?.user_id;
    const product = intent.metadata?.product;

    if (userId && product === 'forge_premium') {
      // Update profiles table: mark user as premium
      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            is_premium: true,
            premium_purchased_at: new Date().toISOString(),
          }),
        },
      );

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        console.error('Supabase update failed:', errText);
        return new Response('DB update failed', { status: 500 });
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Edge-compatible Stripe webhook signature verification
async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
): Promise<boolean> {
  try {
    const parts = Object.fromEntries(header.split(',').map(p => p.split('=')));
    const timestamp = parts['t'];
    const sig = parts['v1'];
    if (!timestamp || !sig) return false;

    const signed = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const expected = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed));
    const expectedHex = Array.from(new Uint8Array(expected))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedHex === sig;
  } catch {
    return false;
  }
}
