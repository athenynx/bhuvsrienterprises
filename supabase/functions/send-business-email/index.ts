// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { event, to, subject, text } = await request.json();

    if (!event || !to || !subject || !text) {
      return new Response(JSON.stringify({ error: 'event, to, subject, and text are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailApiUrl = Deno.env.get('EMAIL_API_URL');
    const emailApiKey = Deno.env.get('EMAIL_API_KEY');
    const emailFrom = Deno.env.get('EMAIL_FROM');
    const businessEmail = Deno.env.get('BUSINESS_EMAIL');

    if (!emailApiUrl || !emailApiKey || !emailFrom) {
      return new Response(JSON.stringify({ error: 'Email provider is not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const providerResponse = await fetch(emailApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${emailApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [event === 'order_confirmation' && businessEmail ? businessEmail : to],
        subject,
        text,
        metadata: { event },
      }),
    });

    if (!providerResponse.ok) {
      const providerError = await providerResponse.text();
      return new Response(JSON.stringify({ error: providerError }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ sent: true, event }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
