import { createClient } from '@supabase/supabase-js';

let client = null;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://svemaxwfzijweupqtuma.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable__WrbASkSE8EQpcBFN-Gmrw_COqT7RJZ';

export async function getSupabaseClient() {
  if (client) return client;
  client = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    }
  );
  return client;
}

export async function getAuthConfig() {
  return {
    url: SUPABASE_URL,
    publishableKey: SUPABASE_ANON_KEY,
    googleEnabled: true,
  };
}
