// Daily email with new matches for paying users' saved searches (packages/shared/src/alerts/notify.ts). Called by
// pg_cron (notify_matches_run) with x-cron-secret. Secrets: CRON_SECRET, RESEND_API_KEY, NOTIFY_FROM, SITE_URL.
import { createClient } from '@supabase/supabase-js';
import { notifyMatches } from '../../../packages/shared/src/alerts/notify.ts';
import { stockholmToday } from '../../../packages/shared/src/domain/dates.ts';

const env = (k: string) => Deno.env.get(k) ?? '';

Deno.serve(async req => {
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return new Response('forbidden', { status: 403 });
  if (!env('RESEND_API_KEY')) return new Response('RESEND_API_KEY not set, nothing sent');
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const send = async (to: string, subject: string, html: string) => {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env('RESEND_API_KEY')}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env('NOTIFY_FROM'), to, subject, html }),
    });
    if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
  };
  try {
    const result = await notifyMatches({ db, send, today: stockholmToday(), siteUrl: env('SITE_URL').replace(/\/$/, '') });
    console.log('notify-matches', result);
    return Response.json(result);
  } catch (e) {
    console.error('notify-matches', e);
    return new Response('failed', { status: 500 });
  }
});
