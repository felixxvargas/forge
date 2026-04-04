import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PERSPECTIVE_API_URL =
  'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = Deno.env.get('PERSPECTIVE_API_KEY');

  if (!apiKey) {
    return new Response(JSON.stringify({ flagged: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let content: string;
  try {
    const body = await req.json();
    content = body.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      return new Response(JSON.stringify({ flagged: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response(JSON.stringify({ flagged: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const perspectiveRes = await fetch(
      `${PERSPECTIVE_API_URL}?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: { text: content },
          languages: ['en'],
          doNotStore: true,
          requestedAttributes: {
            TOXICITY: {},
            SEVERE_TOXICITY: {},
            IDENTITY_ATTACK: {},
            THREAT: {},
          },
        }),
      }
    );

    if (!perspectiveRes.ok) {
      return new Response(JSON.stringify({ flagged: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await perspectiveRes.json();
    const scores = data?.attributeScores ?? {};

    const toxicity = scores?.TOXICITY?.summaryScore?.value ?? 0;
    const severeToxicity = scores?.SEVERE_TOXICITY?.summaryScore?.value ?? 0;
    const identityAttack = scores?.IDENTITY_ATTACK?.summaryScore?.value ?? 0;
    const threat = scores?.THREAT?.summaryScore?.value ?? 0;

    if (toxicity > 0.85) {
      return new Response(
        JSON.stringify({ flagged: true, reason: 'This content was flagged for toxic language.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (severeToxicity > 0.75) {
      return new Response(
        JSON.stringify({ flagged: true, reason: 'This content was flagged for severely toxic language.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (identityAttack > 0.80) {
      return new Response(
        JSON.stringify({ flagged: true, reason: 'This content was flagged for identity-based attacks.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (threat > 0.80) {
      return new Response(
        JSON.stringify({ flagged: true, reason: 'This content was flagged for threatening language.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ flagged: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ flagged: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
