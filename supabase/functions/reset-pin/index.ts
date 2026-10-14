// Smriti · Edge Function `reset-pin` (F18).
// Supabase → Edge Functions → Deploy a new function → name it `reset-pin` → paste this file → Deploy.
//
// Body: { phone: "+919876543210", code: "123456", pin: "135790" }.
// The code comes from a manager (People → Reset PIN). The function runs with the
// project's secret key, which never reaches the app. Errors are deliberately
// generic: they never reveal whether a phone number has an account.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Same mapping as the app (src/cloud/phone.ts): PIN → password.
const pinToPassword = (pin: string) => `smriti:${pin}`;

function secretKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
    const first = Object.values(keys)[0];
    if (first) return first;
  } catch {
    // fall back to the legacy key
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ ok: false, error: 'bad_request' }, 405);

  let body: { phone?: string; code?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return reply({ ok: false, error: 'bad_request' }, 400);
  }
  const phone = String(body.phone ?? '');
  const code = String(body.code ?? '').replace(/\D/g, '');
  const pin = String(body.pin ?? '');
  if (!/^\+91[6-9]\d{9}$/.test(phone) || code.length !== 6 || !/^\d{6}$/.test(pin)) {
    return reply({ ok: false, error: 'bad_request' }, 400);
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile } = await admin.from('profiles').select('id').eq('phone', phone).maybeSingle();
  if (!profile) return reply({ ok: false, error: 'invalid_code' });

  const { data: ok, error } = await admin.rpc('consume_pin_reset', { member: profile.id, reset_code: code });
  if (error || ok !== true) return reply({ ok: false, error: 'invalid_code' });

  const { error: updateError } = await admin.auth.admin.updateUserById(profile.id, { password: pinToPassword(pin) });
  if (updateError) return reply({ ok: false, error: 'server' }, 500);
  return reply({ ok: true });
});
