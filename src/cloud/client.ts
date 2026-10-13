import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { kv } from '@/services/kv';

/**
 * The one Supabase client. URL + publishable key come from .env
 * (EXPO_PUBLIC_*, inlined at build time; RLS protects the data). The session
 * is kept in the device key-value store, so the phone stays signed in across
 * restarts and while offline. Created lazily so tests never touch it.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const cloudConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (client) return client;
  if (!url || !key) throw new Error('Supabase is not configured: add EXPO_PUBLIC_SUPABASE_URL/ANON_KEY to .env');
  const c = createClient(url, key, {
    auth: {
      storage: kv.storage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  // Mobile: only refresh tokens while the app is in the foreground (Supabase guidance).
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') c.auth.startAutoRefresh();
      else c.auth.stopAutoRefresh();
    });
  }
  client = c;
  return c;
}
